import type { RouterConfig } from '@nuxt/schema'

/**
 * Custom Nuxt router options.
 *
 * Hash navigation strategy:
 *  - Cross-page (e.g. /projects → /#manifesto): the homepage isn't
 *    mounted yet, so we defer one tick (~320ms) past the page enter
 *    transition before letting Vue Router scroll.
 *  - Same-page (e.g. / → /#manifesto): scroll immediately.
 *  - In both cases we return the target as `{ el, behavior, top }` so
 *    Vue Router does ONE smooth scroll. Returning `{ left: 0, top: 0 }`
 *    here is what was snapping the page to top mid-animation: Vue
 *    Router applies the resolved value as the FINAL scroll position,
 *    so resolving with (0,0) instructs an instant jump to top that
 *    cancels any in-flight smooth scroll.
 *
 * Offset 64px matches both the sticky header (`h-16`) and the section's
 * Tailwind `scroll-mt-16` utility.
 */
export default <RouterConfig>{
  scrollBehavior(to, from, savedPosition) {
    // Restore on back/forward.
    if (savedPosition) return savedPosition

    if (to.hash) {
      const target = { el: to.hash, behavior: 'smooth' as const, top: 64 }
      const samePage = from && from.path === to.path
      if (samePage) return target
      return new Promise((resolve) => {
        setTimeout(() => resolve(target), 320)
      })
    }

    // Plain navigation — top of the new page.
    return { left: 0, top: 0 }
  },
}
