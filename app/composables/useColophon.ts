import { useInkProof } from './useInkProof'

/**
 * useColophon — the whisper capstone: true once all the hero value-words have
 * been opened this visit (UX-driven, open source, learning AND teaching —
 * "both ways" taken literally). See InkHighlight.vue, which on `allFound`
 * swaps each word's riso-cursor hover label from its imperative ("ship it" /
 * "fork it" / "pass it on") to a knowing "you already did", and index.vue,
 * which fades in one quiet colophon line under the sentence.
 *
 * No extra surface — the reward for reading every card is being seen, not
 * blasted. It stays found for the visit for free: `seen` (useInkProof) only
 * ever flips true, so a plain computed over it is already monotonic — no latch
 * needed. Deriving from `seen`'s own key set (rather than naming the four
 * keys) means a fifth value-word is counted automatically, and SSR reads false
 * with nothing seen, so a reload re-arms.
 */
export function useColophon() {
  const { seen } = useInkProof()
  const allFound = computed(() => Object.values(seen).every(Boolean))
  return { allFound }
}
