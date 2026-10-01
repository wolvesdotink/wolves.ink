#!/usr/bin/env node
/**
 * Performance benchmark for a production build of wolves.ink.
 *
 * Boots the real Nitro server from a `.output` directory, then measures:
 *
 *   1. Lighthouse (mobile preset, simulated throttling) on the main
 *      routes — FCP, LCP, TBT, Speed Index, CLS, transfer bytes.
 *   2. Runtime "feel" with Playwright + CDP on a desktop viewport with
 *      4× CPU throttling — main-thread time while idle, while the
 *      pointer moves, while scrolling, and client-side navigation
 *      latency from the homepage to /field-notes.
 *
 * Usage:
 *   node run.mjs --output ../.output --label after [--runs 5]
 *
 * Results are written to `results/<label>.json`; compare two runs with
 * `node compare.mjs results/before.json results/after.json`.
 *
 * Chrome: set CHROME_PATH, otherwise the newest Playwright-cached
 * Chrome for Testing is used.
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { homedir, tmpdir } from 'node:os'
import { parseArgs } from 'node:util'
import lighthouse from 'lighthouse'
import * as chromeLauncher from 'chrome-launcher'
import { chromium } from 'playwright-core'

const { values: args } = parseArgs({
  options: {
    output: { type: 'string', default: '../.output' },
    label: { type: 'string', default: 'run' },
    runs: { type: 'string', default: '5' },
    port: { type: 'string', default: '4177' },
    'skip-lighthouse': { type: 'boolean', default: false },
    'skip-runtime': { type: 'boolean', default: false },
  },
})

const RUNS = Number(args.runs)
const PORT = Number(args.port)
const ORIGIN = `http://localhost:${PORT}`
const OUTPUT_DIR = resolve(args.output)

const LIGHTHOUSE_PAGES = [
  '/',
  '/projects',
  '/field-notes',
  '/field-notes/autocomplete-all-the-way-down',
]

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH
  const cache = join(homedir(), 'Library/Caches/ms-playwright')
  const dirs = existsSync(cache)
    ? readdirSync(cache).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse()
    : []
  for (const d of dirs) {
    for (const arch of ['chrome-mac-arm64', 'chrome-mac']) {
      const p = join(cache, d, arch, 'Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
      if (existsSync(p)) return p
    }
  }
  throw new Error('No Chrome found — set CHROME_PATH')
}

const CHROME = findChrome()

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

// ── Server ──────────────────────────────────────────────────────────────
async function startServer() {
  const entry = join(OUTPUT_DIR, 'server/index.mjs')
  if (!existsSync(entry)) throw new Error(`No build at ${entry}`)
  const proc = spawn(process.execPath, [entry], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      NITRO_PORT: String(PORT),
      NITRO_HOST: '127.0.0.1',
      NUXT_OG_IMAGE_SECRET: process.env.NUXT_OG_IMAGE_SECRET || 'bench',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(`${ORIGIN}/`, { redirect: 'manual' })
      if (r.status === 200) return proc
      throw new Error(`GET / returned ${r.status} ${r.headers.get('location') ?? ''}`)
    }
    catch (e) {
      if (String(e.message).startsWith('GET /')) { proc.kill(); throw e }
      await new Promise((r) => setTimeout(r, 100))
    }
  }
  proc.kill()
  throw new Error('Server did not start')
}

// ── Lighthouse ──────────────────────────────────────────────────────────
async function runLighthouse() {
  const results = {}
  const chrome = await chromeLauncher.launch({
    chromePath: CHROME,
    chromeFlags: ['--headless=new', '--no-first-run', '--disable-extensions'],
  })
  try {
    for (const path of LIGHTHOUSE_PAGES) {
      const runs = []
      for (let i = 0; i < RUNS; i++) {
        const { lhr } = await lighthouse(`${ORIGIN}${path}`, {
          port: chrome.port,
          output: 'json',
          logLevel: 'error',
          onlyCategories: ['performance'],
        })
        const a = lhr.audits
        const requests = a['network-requests']?.details?.items ?? []
        const sumBy = (type) => requests
          .filter((r) => !type || r.resourceType === type)
          .reduce((n, r) => n + (r.transferSize || 0), 0)
        runs.push({
          score: Math.round(lhr.categories.performance.score * 100),
          fcp: a['first-contentful-paint'].numericValue,
          lcp: a['largest-contentful-paint'].numericValue,
          tbt: a['total-blocking-time'].numericValue,
          si: a['speed-index'].numericValue,
          cls: a['cumulative-layout-shift'].numericValue,
          bootupMs: a['bootup-time']?.numericValue ?? 0,
          mainThreadMs: a['mainthread-work-breakdown']?.numericValue ?? 0,
          totalKB: sumBy() / 1024,
          scriptKB: sumBy('Script') / 1024,
          cssKB: sumBy('Stylesheet') / 1024,
          docKB: sumBy('Document') / 1024,
          requests: requests.length,
        })
        process.stdout.write('.')
      }
      const keys = Object.keys(runs[0])
      results[path] = Object.fromEntries(keys.map((k) => [k, median(runs.map((r) => r[k]))]))
      console.log(` ${path}`)
    }
  }
  finally {
    await chrome.kill()
  }
  return results
}

// ── Runtime (Playwright + CDP) ──────────────────────────────────────────
const CPU_THROTTLE = 4

async function metricsDelta(cdp, fn) {
  const read = async () => Object.fromEntries(
    (await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]),
  )
  const before = await read()
  const t0 = performance.now()
  await fn()
  const elapsed = (performance.now() - t0) / 1000
  const after = await read()
  const d = (k) => (after[k] - before[k]) * 1000
  return {
    seconds: elapsed,
    // ms of main-thread work per wall-clock second
    taskMsPerSec: d('TaskDuration') / elapsed,
    scriptMsPerSec: d('ScriptDuration') / elapsed,
    styleLayoutMsPerSec: (d('RecalcStyleDuration') + d('LayoutDuration')) / elapsed,
  }
}

async function newPage(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  const cdp = await context.newCDPSession(page)
  await cdp.send('Performance.enable')
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_THROTTLE })
  return { context, page, cdp }
}

async function settleHome(page) {
  await page.goto(`${ORIGIN}/`, { waitUntil: 'load' })
  // Let idle hydration (RisoCursor, lazy islands) finish.
  await page.waitForTimeout(2500)
  await page.mouse.move(720, 450)
  await page.waitForTimeout(1500)
}

/** Main-thread work with the page open, cursor resting, nothing happening. */
async function benchIdle(browser) {
  const { context, page, cdp } = await newPage(browser)
  await settleHome(page)
  const m = await metricsDelta(cdp, () => page.waitForTimeout(5000))

  // Where idle frames go: rAF callbacks vs style vs paint vs layerize,
  // from a 3s trace (ms per second).
  const tracePath = join(tmpdir(), `wolves-bench-idle-${process.pid}.json`)
  await browser.startTracing(page, {
    path: tracePath,
    categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'blink'],
  })
  await page.waitForTimeout(3000)
  await browser.stopTracing()
  const sums = {}
  for (const e of JSON.parse(readFileSync(tracePath, 'utf8')).traceEvents) {
    if (e.ph === 'X' && e.dur) sums[e.name] = (sums[e.name] ?? 0) + e.dur / 1000
  }
  rmSync(tracePath, { force: true })
  await context.close()
  return {
    ...m,
    rafMsPerSec: (sums.FireAnimationFrame ?? 0) / 3,
    styleMsPerSec: (sums.UpdateLayoutTree ?? 0) / 3,
    paintMsPerSec: (sums['LocalFrameView::RunPaintLifecyclePhase'] ?? 0) / 3,
    layerizeMsPerSec: (sums.Layerize ?? 0) / 3,
  }
}

/** Main-thread work while the pointer sweeps across the hero. */
async function benchPointer(browser) {
  const { context, page, cdp } = await newPage(browser)
  await settleHome(page)
  const m = await metricsDelta(cdp, async () => {
    for (let i = 0; i < 180; i++) {
      const t = i / 180
      await page.mouse.move(200 + 1000 * t, 300 + 200 * Math.sin(t * Math.PI * 4))
      await page.waitForTimeout(16)
    }
  })
  await context.close()
  return m
}

/** Scroll the homepage top to bottom; record frame intervals in-page. */
async function benchScroll(browser) {
  const { context, page, cdp } = await newPage(browser)
  await settleHome(page)
  await page.evaluate(() => {
    window.__frames = []
    let last = performance.now()
    const loop = (t) => {
      window.__frames.push(t - last)
      last = t
      if (!window.__stopFrames) requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
  })
  const m = await metricsDelta(cdp, async () => {
    for (let i = 0; i < 80; i++) {
      await page.mouse.wheel(0, 160)
      await page.waitForTimeout(40)
    }
  })
  const frames = await page.evaluate(() => {
    window.__stopFrames = true
    return window.__frames.slice(1)
  })
  await context.close()
  const long = frames.filter((f) => f > 34).length
  return {
    ...m,
    frames: frames.length,
    p95FrameMs: [...frames].sort((a, b) => a - b)[Math.floor(frames.length * 0.95)],
    droppedFramePct: (long / frames.length) * 100,
  }
}

/** Click the header "Field Notes" link and time until the new page paints. */
async function benchNavigation(browser) {
  const times = []
  for (let i = 0; i < RUNS; i++) {
    const { context, page } = await newPage(browser)
    await settleHome(page)
    const link = page.locator('header nav a[href="/field-notes"]').first()
    const ms = await page.evaluate(async () => {
      const a = document.querySelector('header nav a[href="/field-notes"]')
      const t0 = performance.now()
      a.click()
      while (location.pathname !== '/field-notes') {
        await new Promise((r) => setTimeout(r, 2))
      }
      // Wait for the next painted frame after the route commit.
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      return performance.now() - t0
    }).catch(async () => {
      // Fallback for builds where the nav link is hidden on this viewport.
      const t0 = Date.now()
      await link.click()
      await page.waitForURL('**/field-notes')
      return Date.now() - t0
    })
    times.push(ms)
    await context.close()
  }
  return { medianMs: median(times), runs: times }
}

async function runRuntime() {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true })
  try {
    const probe = await newPage(browser)
    await settleHome(probe.page)
    const cursorEnabled = await probe.page.evaluate(
      () => document.documentElement.classList.contains('riso-cursor-active'),
    )
    await probe.context.close()

    const collect = async (name, fn) => {
      const rs = []
      for (let i = 0; i < Math.max(3, Math.ceil(RUNS / 2)); i++) rs.push(await fn(browser))
      const keys = Object.keys(rs[0]).filter((k) => typeof rs[0][k] === 'number')
      console.log(`  ${name}`)
      return Object.fromEntries(keys.map((k) => [k, median(rs.map((r) => r[k]))]))
    }

    return {
      cpuThrottle: CPU_THROTTLE,
      cursorEnabled,
      idle: await collect('idle', benchIdle),
      pointer: await collect('pointer', benchPointer),
      scroll: await collect('scroll', benchScroll),
      navigation: await benchNavigation(browser),
    }
  }
  finally {
    await browser.close()
  }
}

// ── Main ────────────────────────────────────────────────────────────────
const server = await startServer()
console.log(`Benchmarking ${OUTPUT_DIR} as "${args.label}" (${RUNS} runs, Chrome: ${CHROME})`)
try {
  const result = {
    label: args.label,
    date: new Date().toISOString(),
    runs: RUNS,
    lighthouse: args['skip-lighthouse'] ? null : await runLighthouse(),
    runtime: args['skip-runtime'] ? null : await runRuntime(),
  }
  mkdirSync('results', { recursive: true })
  const file = join('results', `${args.label}.json`)
  writeFileSync(file, JSON.stringify(result, null, 2))
  console.log(`Wrote ${file}`)
}
finally {
  server.kill()
}
