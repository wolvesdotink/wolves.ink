/**
 * useHalftoneParallax — shared rAF + pointermove driver for every
 * `<HalftoneOrb>` instance on the page.
 *
 * Why this exists
 * ---------------
 * The naïve implementation gave each orb its own `requestAnimationFrame`
 * loop and its own `pointermove` / `scroll` / `resize` listeners. The
 * homepage mounts 4–6 orbs, so we ended up with 4–6 rAFs and 4–6
 * listeners doing the same cursor read on every move event. That's wasted
 * main-thread time that lands directly in INP.
 *
 * This composable consolidates the work: ONE shared rAF, ONE shared set
 * of listeners, and a Set of subscribers. Each subscriber gets back a
 * reactive `{ dx, dy }` it can bind to its own transform. When the last
 * subscriber unmounts, the rAF and listeners shut down so we don't leak.
 *
 * The rAF only runs while an orb is still easing toward its target: it
 * parks once every orb has settled and the next pointermove wakes it, so
 * a resting cursor costs nothing per frame. Scroll/resize don't touch
 * layout — they mark the cached centers stale, and the next pointermove
 * (the only place targets are computed) re-measures them.
 *
 * Behaviour mirrors the original `HalftoneOrb` 1:1:
 *   - Same LERP factor (0.06) toward the cursor target.
 *   - Same projection math: distance-normalised "strength" along the
 *     unit vector from cursor to orb center, scaled by the orb's `range`.
 *   - Same `influence: 'toward' | 'away'` semantics.
 *   - Same `prefers-reduced-motion` and `pointer: fine` guards — on
 *     coarse-pointer or reduced-motion clients the orbs sit at rest.
 */

import type { Ref } from 'vue'

interface Subscriber {
  el: Ref<HTMLElement | null>
  range: number
  influence: 'toward' | 'away'
  // Live target the rAF LERPs toward, computed from cursor each frame.
  targetX: number
  targetY: number
  // Current eased position — what consumers bind to via the returned refs.
  dx: Ref<number>
  dy: Ref<number>
  // Per-orb center, recomputed lazily on scroll/resize.
  centerX: number
  centerY: number
}

// Module-level shared state. Lives for the lifetime of the page; safe
// because all orbs render in the same window.
const subscribers = new Set<Subscriber>()
let raf = 0
let mouseX = 0
let mouseY = 0
let active = false
let centersStale = false

function recomputeCenter(sub: Subscriber) {
  if (!sub.el.value) return
  const r = sub.el.value.getBoundingClientRect()
  sub.centerX = r.left + r.width / 2
  sub.centerY = r.top + r.height / 2
}

function recomputeAll() {
  for (const sub of subscribers) recomputeCenter(sub)
}

function markCentersStale() {
  centersStale = true
}

function onMove(e: PointerEvent) {
  mouseX = e.clientX
  mouseY = e.clientY

  if (centersStale) {
    centersStale = false
    recomputeAll()
  }

  // Recompute targets for every subscriber. This is cheap arithmetic per
  // orb (no DOM reads — centers are cached); the rAF below will LERP.
  for (const sub of subscribers) {
    const dxM = mouseX - sub.centerX
    const dyM = mouseY - sub.centerY
    const norm = Math.min(1, Math.hypot(dxM, dyM) / Math.max(window.innerWidth, window.innerHeight))
    const strength = (1 - norm) * sub.range
    const sign = sub.influence === 'toward' ? 1 : -1
    const len = Math.hypot(dxM, dyM) || 1
    sub.targetX = sign * (dxM / len) * strength
    sub.targetY = sign * (dyM / len) * strength
  }

  if (!raf) raf = requestAnimationFrame(tick)
}

function tick() {
  let moving = false
  for (const sub of subscribers) {
    const ex = sub.targetX - sub.dx.value
    const ey = sub.targetY - sub.dy.value
    // Under a twentieth of a pixel the orb can't visibly move anymore.
    if (Math.abs(ex) < 0.05 && Math.abs(ey) < 0.05) continue
    sub.dx.value += ex * 0.06
    sub.dy.value += ey * 0.06
    moving = true
  }
  raf = moving ? requestAnimationFrame(tick) : 0
}

function start() {
  if (active) return
  active = true
  window.addEventListener('pointermove', onMove, { passive: true })
  window.addEventListener('scroll', markCentersStale, { passive: true })
  window.addEventListener('resize', markCentersStale, { passive: true })
}

function stop() {
  if (!active) return
  active = false
  cancelAnimationFrame(raf)
  raf = 0
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('scroll', markCentersStale)
  window.removeEventListener('resize', markCentersStale)
}

/**
 * Subscribe an orb to the shared parallax driver. Returns reactive
 * `{ dx, dy }` refs the consumer should bind to its transform. The
 * subscription auto-tears down on component unmount.
 *
 * No-ops on coarse-pointer or reduced-motion clients — the returned
 * refs stay at 0 so the orb sits at rest, matching the original
 * per-instance guards.
 */
export function useHalftoneParallax(opts: {
  el: Ref<HTMLElement | null>
  range: number
  influence: 'toward' | 'away'
}) {
  const dx = ref(0)
  const dy = ref(0)

  onMounted(() => {
    // SSR-safe guards. `matchMedia` only exists in the browser; these
    // checks mirror the original component-level behaviour exactly.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const fine = window.matchMedia('(pointer: fine)').matches
    if (reduced || !fine) return

    const sub: Subscriber = {
      el: opts.el,
      range: opts.range,
      influence: opts.influence,
      targetX: 0,
      targetY: 0,
      dx,
      dy,
      centerX: 0,
      centerY: 0,
    }
    recomputeCenter(sub)
    subscribers.add(sub)
    start()

    onBeforeUnmount(() => {
      subscribers.delete(sub)
      // Last orb out turns the lights off. Without this we'd leave a rAF
      // loop running after navigating away from a page that had orbs.
      if (subscribers.size === 0) stop()
    })
  })

  return { dx, dy }
}
