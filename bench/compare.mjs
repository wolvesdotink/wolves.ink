#!/usr/bin/env node
/**
 * Print a markdown comparison of two benchmark result files.
 *
 *   node compare.mjs results/before.json results/after.json
 */
import { readFileSync } from 'node:fs'

const [aPath = 'results/before.json', bPath = 'results/after.json'] = process.argv.slice(2)
const a = JSON.parse(readFileSync(aPath, 'utf8'))
const b = JSON.parse(readFileSync(bPath, 'utf8'))

const fmt = (v, unit) => {
  if (unit === 'ms') return `${Math.round(v)} ms`
  if (unit === 'KB') return `${v.toFixed(1)} KB`
  if (unit === '%') return `${v.toFixed(1)}%`
  if (unit === 'ms/s') return `${v.toFixed(0)} ms/s`
  if (unit === 'cls') return v.toFixed(3)
  return String(Math.round(v * 10) / 10)
}

const delta = (x, y, higherIsBetter = false) => {
  if (x === 0 && y === 0) return '±0'
  if (x === 0) return 'n/a'
  if (y === 0) return '−100% ✅'
  const pct = ((y - x) / x) * 100
  const good = higherIsBetter ? pct > 0 : pct < 0
  const sign = pct > 0 ? '+' : ''
  const mark = Math.abs(pct) < 2 ? '' : good ? ' ✅' : ' ⚠️'
  return `${sign}${pct.toFixed(0)}%${mark}`
}

const row = (label, x, y, unit, higherIsBetter) =>
  `| ${label} | ${fmt(x, unit)} | ${fmt(y, unit)} | ${delta(x, y, higherIsBetter)} |`

const out = []
const header = (title) => out.push('', `#### ${title}`, '', `| Metric | ${a.label} | ${b.label} | Δ |`, '|---|---:|---:|---:|')

if (a.lighthouse && b.lighthouse) {
  out.push(`### Lighthouse — mobile, simulated throttling (median of ${a.runs} runs)`)
  for (const page of Object.keys(a.lighthouse)) {
    const x = a.lighthouse[page]
    const y = b.lighthouse[page]
    if (!y) continue
    header(`\`${page}\``)
    out.push(
      row('Performance score', x.score, y.score, '', true),
      row('First Contentful Paint', x.fcp, y.fcp, 'ms'),
      row('Largest Contentful Paint', x.lcp, y.lcp, 'ms'),
      row('Speed Index', x.si, y.si, 'ms'),
      row('Total Blocking Time', x.tbt, y.tbt, 'ms'),
      row('Cumulative Layout Shift', x.cls, y.cls, 'cls'),
      row('JS execution (bootup)', x.bootupMs, y.bootupMs, 'ms'),
      row('Main-thread work', x.mainThreadMs, y.mainThreadMs, 'ms'),
      row('Transfer — total', x.totalKB, y.totalKB, 'KB'),
      row('Transfer — JS', x.scriptKB, y.scriptKB, 'KB'),
      row('Transfer — CSS', x.cssKB, y.cssKB, 'KB'),
    )
  }
}

if (a.runtime && b.runtime) {
  const x = a.runtime
  const y = b.runtime
  out.push('', `### Runtime — desktop 1440×900, ${x.cpuThrottle}× CPU throttle (median)`, '', '| Metric | ' + a.label + ' | ' + b.label + ' | Δ |', '|---|---:|---:|---:|')
  out.push(
    row('Idle homepage — main-thread busy', x.idle.taskMsPerSec, y.idle.taskMsPerSec, 'ms/s'),
    row('Idle homepage — style + layout', x.idle.styleLayoutMsPerSec, y.idle.styleLayoutMsPerSec, 'ms/s'),
    row('Idle homepage — rAF callbacks (trace)', x.idle.rafMsPerSec, y.idle.rafMsPerSec, 'ms/s'),
    row('Idle homepage — style recalc (trace)', x.idle.styleMsPerSec, y.idle.styleMsPerSec, 'ms/s'),
    row('Idle homepage — paint (trace)', x.idle.paintMsPerSec, y.idle.paintMsPerSec, 'ms/s'),
    row('Idle homepage — layerize (trace)', x.idle.layerizeMsPerSec, y.idle.layerizeMsPerSec, 'ms/s'),
    row('Pointer sweep — main-thread busy', x.pointer.taskMsPerSec, y.pointer.taskMsPerSec, 'ms/s'),
    row('Pointer sweep — script', x.pointer.scriptMsPerSec, y.pointer.scriptMsPerSec, 'ms/s'),
    row('Scroll — main-thread busy', x.scroll.taskMsPerSec, y.scroll.taskMsPerSec, 'ms/s'),
    row('Scroll — p95 frame time', x.scroll.p95FrameMs, y.scroll.p95FrameMs, 'ms'),
    row('Scroll — dropped frames (>34 ms)', x.scroll.droppedFramePct, y.scroll.droppedFramePct, '%'),
    row('Client nav / → /field-notes', x.navigation.medianMs, y.navigation.medianMs, 'ms'),
  )
}

console.log(out.join('\n'))
