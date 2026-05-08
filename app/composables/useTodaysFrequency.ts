/**
 * useTodaysFrequency — single source of truth for the daily "frequency"
 * shown in the masthead (`index.vue` line 83) and locked-onto by the radio
 * dial easter egg at the bottom of the homepage.
 *
 * The value is deterministic per UTC day so every visitor sees the same
 * MHz on the same day, and it changes at midnight UTC. Range 88.0–108.0
 * MHz on 0.1 MHz steps (FM-band feel).
 *
 * SSR-safe: pure date math, no `window` access. Mirrors the pattern used
 * by `issue` in `index.vue` and `issueLabel` in `AppFooter.vue`.
 *
 * The FNV-1a hash and UTC date helpers used here live in `~/utils/hash.ts`
 * (auto-imported) — extracted once `useTodaysShot` arrived as a third caller.
 */

/**
 * Map a UTC date to a frequency in tenths-of-MHz (e.g. 973 → 97.3 MHz).
 * Exposed as a helper so the lock-line picker in `site.ts` /
 * `RadioDial.vue` can re-derive the same daily integer if needed.
 */
export function frequencyTenthsForDate(d: Date): number {
  const h = fnv1a(utcDateKey(d))
  // 880..1080 inclusive — i.e. 88.0..108.0 MHz on 0.1 MHz steps.
  // 1080 - 880 = 200 → 201 possible values.
  return 880 + (h % 201)
}

export function useTodaysFrequency() {
  const tenths = computed(() => frequencyTenthsForDate(new Date()))
  const mhz = computed(() => tenths.value / 10)
  const label = computed(() => `${mhz.value.toFixed(1)} MHz`)
  return { mhz, label, tenths }
}
