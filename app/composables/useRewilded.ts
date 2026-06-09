/**
 * useRewilded — whether the fence-comes-down egg has fired this visit.
 *
 * The cover section's right column holds a small riso plot: a fenced
 * monoculture at rest. Tear down the fence (one click / Enter / Space on
 * the plot) and the rows go wild — grass, wildflowers, a forest, and a
 * lone wolf returning to the land. A short set of house rules for the
 * wild develops underneath. See `RewildPlot.vue`.
 *
 * Module-level so the rewilding survives SPA route navigation — like the
 * eat-the-rich marquee swap (see useRichFired) and the pride flood, the
 * land doesn't re-fence itself just because you wandered to /projects and
 * back. The fence is down for the visit; discovered politics don't
 * un-discover.
 *
 * In-memory only: a full reload re-arms the fence so the discovery moment
 * returns each visit — the same per-pageload rule the paw trail and the
 * pride pins follow.
 *
 * SSR-safe: only ever mutated client-side (post-click), so the server
 * always renders the fenced plot.
 */
const rewilded = ref(false)

export function useRewilded() {
  return rewilded
}
