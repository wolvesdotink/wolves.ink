/**
 * usePawTrail — the footer paw is a per-pageload reveal. On a fresh
 * page the footer renders the idle paw; clicking it runs the stamp
 * animation and turns on a subtle grey paw print that follows the
 * cursor. After the animation the paw stays in the footer in a
 * dormant state — clicking it again toggles the trail off (and on
 * again). Reloading any page resets everything to idle so the
 * discovery moment returns each visit.
 *
 * Storage:
 *   - None. State lives in module-level refs and is intentionally
 *     in-memory only — a full page reload re-arms the idle paw.
 *     SPA route navigation is preserved because module state
 *     survives Nuxt route transitions.
 *
 * Singleton state:
 *   - `active`, `prints`, the cursor cadence trackers, and the
 *     cleanup-timer handle all live at module scope so that the
 *     AppFooter (which calls `claim()` and `setActive()`) and the
 *     PawTrail overlay (which renders `prints` and owns `attach()`)
 *     share the same source of truth without prop drilling or a
 *     Pinia dependency.
 *   - `attach()` is idempotent — only the first call wires
 *     listeners. Layout HMR or accidental double-mount won't
 *     double-fire.
 *
 * SSR:
 *   - `active` defaults to `false` on the server; PawTrail self-gates
 *     on `active` so nothing renders server-side either way.
 *   - `attach()` is a no-op outside the browser and on coarse
 *     pointers / reduced-motion preferences (matching the gate that
 *     RisoCursor uses, so the two effects pair).
 */

export interface TrailPrint {
  /** Monotonic id for v-for keying. */
  id: number
  /** Stamp position in viewport coords. */
  x: number
  y: number
  /**
   * Rotation in degrees, aligned with the motion vector so the toes
   * face the direction of travel. A small random jitter is layered on
   * top so consecutive prints don't look stamped by machinery.
   */
  rotation: number
  /** `performance.now()` at creation; the sweep timer evicts at +PRINT_LIFETIME_MS. */
  bornAt: number
}

const POOL_SIZE = 16
const DROP_DISTANCE_PX = 70
const PRINT_LIFETIME_MS = 1200
const PERPENDICULAR_OFFSET_PX = 10
const ROTATION_JITTER_DEG = 8

// Module-level singletons — every call to `usePawTrail()` returns the
// same `active` and `prints` refs so footer and overlay see the same
// state. In-memory only: a page reload resets them to defaults.
const active = ref(false)
const prints = ref<TrailPrint[]>([])

let lastDropX = 0
let lastDropY = 0
let primed = false
let nextId = 0
let attached = false
let cleanupTimer: ReturnType<typeof setInterval> | null = null

function dropPrintFromPointer(e: PointerEvent) {
  // Trail toggled off — stay attached (cheap passive listener) but
  // skip the work entirely. Re-enabling via setActive(true) re-primes
  // the cadence tracker so the first print after a toggle still
  // lands at a sensible distance.
  if (!active.value) return

  if (!primed) {
    lastDropX = e.clientX
    lastDropY = e.clientY
    primed = true
    return
  }

  const dx = e.clientX - lastDropX
  const dy = e.clientY - lastDropY
  const distSq = dx * dx + dy * dy
  if (distSq < DROP_DISTANCE_PX * DROP_DISTANCE_PX) return

  // Perpendicular offset to the motion vector — alternates sign per
  // print so consecutive stamps suggest a left-right padding gait
  // rather than a single-line drag.
  const dist = Math.sqrt(distSq)
  const perpX = -dy / dist
  const perpY = dx / dist
  const sign = (nextId & 1) ? 1 : -1

  // Direction-of-travel rotation. The paw SVG's toes sit at the top of
  // its viewBox (cy=6.5), so its default heading is "up" — the (0,-1)
  // screen vector. `atan2(dy, dx)` returns the motion vector's angle
  // from +x in the screen's coordinate space (y grows downward); add
  // 90° to align "up" with that direction. A small jitter on top keeps
  // a straight cursor pull from looking like a printer's repeat.
  const motionAngleDeg = Math.atan2(dy, dx) * 180 / Math.PI + 90
  const jitter = (Math.random() * 2 - 1) * ROTATION_JITTER_DEG

  const id = ++nextId
  const print: TrailPrint = {
    id,
    x: e.clientX + perpX * PERPENDICULAR_OFFSET_PX * sign,
    y: e.clientY + perpY * PERPENDICULAR_OFFSET_PX * sign,
    rotation: motionAngleDeg + jitter,
    bornAt: performance.now(),
  }

  // Cap the pool at POOL_SIZE — drop the oldest when full so we never
  // accumulate detached DOM after long mouse runs.
  if (prints.value.length >= POOL_SIZE) prints.value.shift()
  prints.value.push(print)

  lastDropX = e.clientX
  lastDropY = e.clientY
}

export function usePawTrail() {
  /**
   * Mark the trail active and seed the cadence tracker at the click
   * origin so the very next mouse move can drop a print without a
   * ~70px dead zone from the previous (unset) state.
   */
  function claim(originX: number, originY: number) {
    active.value = true
    lastDropX = originX
    lastDropY = originY
    primed = true
  }

  /**
   * Toggle the trail. `false` clears any prints currently on screen
   * (instant visual confirmation of the off state). `true` un-primes
   * the cadence tracker so the next pointermove re-seeds at the
   * cursor's current position rather than wherever the user disabled.
   */
  function setActive(next: boolean) {
    if (!next) {
      prints.value = []
    }
    else {
      primed = false
    }
    active.value = next
  }

  /**
   * Wire the pointermove listener and start the sweep timer that
   * evicts expired prints. Call from `<PawTrail>`'s onMounted.
   * Returns a cleanup fn for onBeforeUnmount.
   *
   * No-op on SSR, coarse pointers, and reduced-motion. Idempotent —
   * a second call while attached returns a no-op cleanup.
   */
  function attach(): () => void {
    if (typeof window === 'undefined') return () => {}
    if (attached) return () => {}

    const fine = window.matchMedia('(pointer: fine)').matches
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!fine || reduced) return () => {}

    attached = true
    window.addEventListener('pointermove', dropPrintFromPointer, { passive: true })

    // Sweep at 200ms — coarser than the per-print 1.2s lifetime so we
    // don't spin a tight rAF loop just to remove faded elements. CSS
    // handles the visual fade; this just drains the array.
    cleanupTimer = setInterval(() => {
      const now = performance.now()
      prints.value = prints.value.filter(p => now - p.bornAt < PRINT_LIFETIME_MS)
    }, 200)

    return () => {
      window.removeEventListener('pointermove', dropPrintFromPointer)
      if (cleanupTimer) {
        clearInterval(cleanupTimer)
        cleanupTimer = null
      }
      attached = false
    }
  }

  return { active, prints, claim, setActive, attach }
}
