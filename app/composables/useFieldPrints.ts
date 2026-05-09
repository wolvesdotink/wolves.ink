/**
 * useFieldPrints — persisted archive of riso-filtered cam selfies, plus
 * the daily-limit gate that lets `FieldPolaroid.vue` allow exactly one
 * cam capture per UTC day. Curated fallback prints are not persisted —
 * they're already deterministic per day via `useTodaysShot`.
 *
 * Storage:
 *   - localStorage key `wolves:field-prints:v1`. The `:v1` suffix gates
 *     a future schema migration; bump to `:v2` and add a one-shot
 *     reader for `:v1` if the persisted shape changes.
 *   - Shape: `{ schema, prints, lastCamUtcDate }`. `prints` is newest-
 *     first so the consumer can `slice(0, n)` straight into the visible
 *     stack without re-sorting.
 *
 * Daily-limit:
 *   - `lastCamUtcDate` is the source of truth, not derived from
 *     `prints[0].takenAt`. Cheaper compare, survives manual deletion
 *     of a single print, and a backwards-skewed clock still gates.
 *
 * Quota:
 *   - localStorage caps at ~5MB per origin. Each riso JPEG data URL is
 *     ~30-80KB, so ~50-150 prints fit before pressure. On
 *     QuotaExceededError we drop the oldest 25% and retry; if that
 *     still won't fit, dehydrate the image data on everything past the
 *     newest 5 (empty `image` is a tombstone the UI renders as a
 *     placeholder).
 *
 * SSR:
 *   - `useStorage` returns the typed default during SSR and hydrates
 *     reactively on client mount. `hasCamShotToday` is therefore
 *     `false` server-side — the lockout never blocks a server-rendered
 *     shutter, which then re-resolves correctly once hydrated.
 */

// `useStorage` isn't part of Nuxt's default auto-imports even with
// `@vueuse/nuxt` registered — only the composables surface area marked
// for auto-import is exposed. Keep this explicit so the SSR runtime
// resolves it without relying on the discovery heuristics.
import { useStorage } from '@vueuse/core'

export interface PersistedPrint {
  id: string
  takenAt: number
  /** Riso-filtered JPEG data URL. Empty string = quota-evicted tombstone. */
  image: string
  backNote: string
}

export interface PersistedArchive {
  schema: 1
  prints: PersistedPrint[]
  lastCamUtcDate: string | null
}

const STORAGE_KEY = 'wolves:field-prints:v1'

const DEFAULT_ARCHIVE: PersistedArchive = {
  schema: 1,
  prints: [],
  lastCamUtcDate: null,
}

function isQuotaError(err: unknown): boolean {
  if (!(err instanceof DOMException)) return false
  // Modern engines name it; Safari's legacy code path is `QUOTA_EXCEEDED_ERR === 22`.
  return err.name === 'QuotaExceededError' || err.code === 22
}

export function useFieldPrints() {
  // `mergeDefaults: true` lets us add fields in a future schema without
  // crashing existing visitors — missing keys fall back to the default.
  const archive = useStorage<PersistedArchive>(
    STORAGE_KEY,
    DEFAULT_ARCHIVE,
    undefined,
    { mergeDefaults: true },
  )

  const hasCamShotToday = computed(() => {
    const stamp = archive.value.lastCamUtcDate
    if (!stamp) return false
    return stamp === utcDateKey(new Date())
  })

  function writeWithEviction(next: PersistedArchive) {
    try {
      archive.value = next
      return
    }
    catch (err) {
      if (!isQuotaError(err)) throw err
    }

    // Stage 1 — drop the oldest 25% of prints, retry once.
    const trimmed = next.prints.slice(0, Math.max(1, Math.ceil(next.prints.length * 0.75)))
    try {
      archive.value = { ...next, prints: trimmed }
      return
    }
    catch (err) {
      if (!isQuotaError(err)) throw err
    }

    // Stage 2 — keep the newest 5 with image data, dehydrate the rest.
    const dehydrated = trimmed.map((p, i) => i < 5 ? p : { ...p, image: '' })
    archive.value = { ...next, prints: dehydrated }
  }

  function recordCamPrint(p: PersistedPrint) {
    const next: PersistedArchive = {
      ...archive.value,
      prints: [p, ...archive.value.prints],
      lastCamUtcDate: utcDateKey(new Date()),
    }
    writeWithEviction(next)
  }

  function getRecentForStack(n: number): PersistedPrint[] {
    return archive.value.prints.slice(0, n)
  }

  function clearAll() {
    archive.value = { ...DEFAULT_ARCHIVE }
  }

  return {
    archive,
    hasCamShotToday,
    recordCamPrint,
    getRecentForStack,
    clearAll,
  }
}
