/**
 * useRichFired — whether the counting-to-a-billion egg has fired this
 * visit (it swaps the homepage's manifesto marquee to the eat-the-rich
 * variant).
 *
 * Module-level so the swap survives SPA route navigation — discovered
 * politics don't un-discover; the stat cell may reset, the marquee
 * doesn't. In-memory only: a full reload re-hides the egg, the same
 * per-pageload rule the paw trail and the pride pins follow.
 *
 * SSR-safe: only ever mutated client-side (post-click), so the server
 * always renders the base slogan.
 */
const richFired = ref(false)

export function useRichFired() {
  return richFired
}
