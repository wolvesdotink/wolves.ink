/**
 * useInkProof — the single "value card" slot shared by the hero value-words
 * (see InkHighlight.vue + ValueCard.vue).
 *
 * Clicking a highlighted value-word (UX-driven / open source / learning /
 * teaching) opens a small riso card anchored right beside that word, with a
 * short line about the value. Only ONE card may be open at a time — opening
 * any word's card dismisses the others — so the hero never turns into a
 * corkboard. `openId` is the shared latch; each word opens with its own key
 * ('ux' | 'open' | 'learn' | 'teach').
 *
 * `seen` records which cards have been opened this visit; useColophon reads
 * it for the whisper capstone (open all four → the hover labels turn knowing
 * and a quiet colophon line prints). In-memory only and never mutated at
 * module scope, so SSR renders with no card open and a reload re-arms.
 */
const openId = ref<string | null>(null)
const seen = reactive<Record<string, boolean>>({
  ux: false,
  open: false,
  learn: false,
  teach: false,
})

export function useInkProof() {
  function open(id: string) {
    openId.value = id
    if (id in seen) seen[id] = true
  }
  /** Close — no-op unless we still own the slot (avoids races on re-open). */
  function close(id?: string) {
    if (!id || openId.value === id) openId.value = null
  }
  return { openId, seen, open, close }
}
