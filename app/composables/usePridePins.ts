/**
 * usePridePins — shared state for the six-pins easter egg.
 *
 * The hero wordmark's six letters can each be "pinned" with a small
 * enamel pin-back button (HeroDisplay.vue owns the rendering and the
 * click/keyboard ritual). When all six wear a pin, the wordmark floods
 * stripe-by-stripe into the six pride-flag colors and `html.egg-pride`
 * turns on the ambient second pass (selection ink, tape stripes, riso
 * cursor, paw-trail gait, footer colophon, second marquee).
 *
 * Why a composable and not component state: the completion effects live
 * far outside HeroDisplay — AppFooter re-labels its colophon, PawTrail
 * re-inks its prints, index.vue swaps its ticker and second marquee.
 * Module-level refs let every consumer read the same source of truth
 * without prop drilling, exactly like `usePawTrail`.
 *
 * Storage: none, intentionally. In-memory only — a reload re-hides the
 * egg so the discovery moment returns each visit (the PawTrail rule).
 * SSR-safe: state starts empty on both server and client, and the
 * `html.egg-pride` class is only ever toggled from a client-side watch
 * (see `attachPrideClass`), mirroring how RisoCursor manages
 * `html.riso-cursor-active`.
 *
 * The flag, in riso inks. Four of the six stripes were already site
 * tokens (pop-red is a hair off pop-magenta on purpose — a flag should
 * read red, not pink); pride only adds green and violet, both actual
 * Risograph ink-chart colors. Indexed by letter position W-O-L-V-E-S.
 */
export const PRIDE_STRIPES = [
  'var(--color-pop-red)',
  'var(--color-pop-orange)',
  'var(--color-pop-yellow)',
  'var(--color-pop-green)',
  'var(--color-pop-blue)',
  'var(--color-pop-violet)',
] as const

/**
 * Trail-print variants of the stripes with the paw trail's whisper
 * alpha (~0.55) baked in — the rainbow gait should stay quiet on the
 * ink canvas, never neon.
 */
export const PRIDE_TRAIL = [
  'rgb(241 80 96 / 0.55)',
  'rgb(255 108 47 / 0.55)',
  'rgb(255 233 78 / 0.55)',
  'rgb(0 169 92 / 0.55)',
  'rgb(61 93 201 / 0.55)',
  'rgb(118 91 167 / 0.55)',
] as const

// Module-level singletons — every caller shares the same pin board.
const pinned = ref<boolean[]>([false, false, false, false, false, false])
let classAttached = false

export function usePridePins() {
  const pinnedCount = computed(() => pinned.value.filter(Boolean).length)
  const prideOn = computed(() => pinnedCount.value === 6)

  function togglePin(index: number) {
    if (index < 0 || index > 5) return
    const next = pinned.value.slice()
    next[index] = !next[index]
    pinned.value = next
  }

  function pinAll() {
    pinned.value = [true, true, true, true, true, true]
  }

  function unpinAll() {
    pinned.value = [false, false, false, false, false, false]
  }

  /**
   * Mirror `prideOn` onto `html.egg-pride` so global CSS (selection,
   * tape stripes, riso cursor) can re-ink. Call from a component's
   * onMounted — never at module scope, so SSR stays untouched.
   *
   * The watch lives in a DETACHED effectScope: created inside a
   * component's onMounted it would otherwise bind to that component's
   * scope and be disposed on unmount (route navigation away from the
   * homepage), leaving the html class stuck in whatever state it held
   * — while the module-level `classAttached` flag blocked any
   * re-attachment. Detaching makes it genuinely module-lifetime, so
   * the class tracks pin state across route transitions.
   */
  function attachPrideClass() {
    if (typeof document === 'undefined' || classAttached) return
    classAttached = true
    const scope = effectScope(true)
    scope.run(() => {
      watch(prideOn, (on) => {
        document.documentElement.classList.toggle('egg-pride', on)
      }, { immediate: true })
    })
  }

  return { pinned, pinnedCount, prideOn, togglePin, pinAll, unpinAll, attachPrideClass }
}
