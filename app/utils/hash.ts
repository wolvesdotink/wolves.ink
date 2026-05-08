/**
 * Tiny deterministic hashing helpers shared by the daily-rotating
 * easter eggs (`useTodaysFrequency`, `useTodaysShot`). Kept here so
 * each composable doesn't have to re-define them — auto-imported via
 * Nuxt 4's `app/utils/` convention.
 *
 * SSR-safe: pure date math and pure string hashing, no `window`.
 */

/**
 * FNV-1a 32-bit string hash. Tiny, deterministic, no deps. We only need
 * a stable integer fingerprint of an arbitrary string — cryptographic
 * strength is not required.
 */
export function fnv1a(input: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    // 32-bit FNV-1a prime multiply, kept in unsigned 32-bit space
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash >>> 0
}

/** UTC date as YYYY-MM-DD — same string for every visitor on a given day. */
export function utcDateKey(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
