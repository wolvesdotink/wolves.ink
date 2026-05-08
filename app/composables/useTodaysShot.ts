/**
 * useTodaysShot — single source of truth for the daily "field shot"
 * served by `FieldPolaroid.vue` (the visual sibling to the radio dial
 * at the bottom of the homepage).
 *
 * Pattern mirrors `useTodaysFrequency.ts` deliberately — same FNV-1a
 * hash of the UTC date string, same SSR-safe pure date math, no
 * `window` access. The two small helpers (`fnv1a`, `utcDateKey`) now
 * live in `~/utils/hash.ts` and are auto-imported here — extracted
 * once this composable became the third caller.
 *
 * The value is deterministic per UTC day, so every visitor sees the
 * same Polaroid on the same day, and it changes at midnight UTC. A
 * `printNumber` is also exposed: a stable per-date integer used as
 * the small "Print #073" caption below the camera, so the artifact
 * feels like a numbered limited-edition print rather than a random
 * file pull.
 */

import { site } from '~/data/site'

export interface FieldShot {
  /** Path under `/public/shots/`, e.g. `/shots/2026-04-29.jpg`. */
  image: string
  /** One-line front caption — what's in the frame. */
  caption: string
  /** Hidden line revealed when the print is flipped. */
  backNote: string
  /** Optional location stamp printed on the back of the print. */
  location?: string
}

export function useTodaysShot() {
  const today = computed(() => new Date())
  const dateKey = computed(() => utcDateKey(today.value))
  const hash = computed(() => fnv1a(dateKey.value))

  // Index into the curated shot pool. Modulo gives natural cycling
  // when the array has fewer entries than days in a year.
  //
  // We widen `site.shots` to `readonly FieldShot[]` here. Without the
  // cast, `as const` in `site.ts` narrows the array's `.length` to a
  // literal type (e.g. `12`), which makes the empty-pool guard
  // statically unreachable and trips TS2367. The widening keeps the
  // safety check meaningful — a future refactor that empties the
  // array won't surprise the runtime.
  const pool = computed<readonly FieldShot[]>(() => site.shots as readonly FieldShot[])

  const index = computed(() => {
    const list = pool.value
    if (list.length === 0) return 0
    return hash.value % list.length
  })

  const shot = computed<FieldShot | null>(() => {
    const list = pool.value
    if (list.length === 0) return null
    return list[index.value] ?? null
  })

  // "Print #073" — three-digit, ever-incrementing-feel number derived
  // from the same hash. Capped at 999 so the caption stays compact.
  // Not actually a serial — just a stamp that cycles, but it reads as
  // one and that's all the artifact needs to feel collectible.
  const printNumber = computed(() => (hash.value % 999) + 1)
  const printLabel = computed(() => `№ ${String(printNumber.value).padStart(3, '0')}`)

  return {
    shot,
    dateKey,
    index,
    printNumber,
    printLabel,
  }
}
