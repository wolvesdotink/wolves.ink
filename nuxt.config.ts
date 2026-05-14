import type { PluginOption } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: process.env.NODE_ENV !== 'production' },

  modules: [
    '@nuxt/fonts',
    '@nuxt/image',
    '@nuxt/icon',
    '@vueuse/nuxt',
    // Bundles: nuxt-site-config, robots, sitemap, og-image, schema-org,
    // link-checker, seo-utils. One install, every meta tag handled.
    '@nuxtjs/seo',
  ],

  components: [
    { path: '~/components/app', pathPrefix: false },
    { path: '~/components/ui', pathPrefix: false },
    { path: '~/components/project', pathPrefix: false },
    { path: '~/components/page', pathPrefix: false },
    { path: '~/components', pathPrefix: false },
  ],

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss() as PluginOption],
  },

  /**
   * Site-wide SEO config — consumed by every nuxt-seo sub-module
   * (robots, sitemap, og-image, schema-org, seo-utils). Setting it once
   * here means every <link rel="canonical">, <meta og:url>, sitemap entry
   * and JSON-LD `@id` resolves to the production origin without a
   * per-call argument. Overridable per-environment via NUXT_SITE_URL.
   */
  site: {
    url: 'https://wolves.ink',
    name: 'Wolves',
    description:
      "Wolves — a small studio shipping UX-driven applications, mostly open source. Where learning meets teaching. Ideas are meaningless if you don't execute them.",
    defaultLocale: 'en',
    indexable: true,
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      // `titleTemplate` lets per-page `useSeoMeta({ title: '…' })` calls
      // stay short — the studio suffix is appended automatically. Pages
      // that need a fully custom title (e.g. the homepage) can opt out
      // by returning a string that already contains "Wolves".
      titleTemplate: '%s %separator %siteName',
      templateParams: {
        separator: '—',
      },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#0d0c0a' },
        // Apple-specific: dark UI when added to home screen.
        { name: 'apple-mobile-web-app-title', content: 'Wolves' },
        { name: 'format-detection', content: 'telephone=no' },
      ],
      link: [
        // Modern browsers prefer the SVG (crisp at any DPR, themeable);
        // the .ico stays as a fallback for older user-agents that ignore
        // the SVG `type`. Order matters — browsers pick the first format
        // they recognise, so the SVG must come first.
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        // iOS home-screen icon. Modern iOS rasterises the SVG; older iOS
        // falls back to the favicon.ico via the rule above.
        { rel: 'apple-touch-icon', href: '/favicon.svg' },
        // Safari pinned-tab mark — single-colour mask cut from the W
        // glyph. `color` sets the tint Safari applies in the tab strip.
        { rel: 'mask-icon', href: '/logo.svg', color: '#f1e9d8' },
      ],
    },
  },

  /**
   * Font payload — audited against actual usage in components/CSS:
   *
   *   Anton 400       — every `text-display*` utility renders at 400.
   *                     The single `font-weight: 600` on `.hunt__pop__num`
   *                     in error.vue synthesises bold from 400, intentional.
   *   Fraunces 400    — `text-editorial` and every `font-serif italic` use
   *                     defaults to 400. No `font-medium`/`font-semibold`
   *                     applied to serif text anywhere in the codebase.
   *                     (italic + normal both shipped — italic is the
   *                     dominant style; normal covers `not-italic` overrides
   *                     in the impressum + dial copy.)
   *   Geist 400 / 600 — body copy is 400; artist-name strings in
   *                     `MiniRadio` and `RadioDial` (`.brand-np__artist`,
   *                     `.mini-radio__artist`) explicitly request 600.
   *                     No `font-light` (300) or `font-bold` (700) usage.
   *   Geist Mono 400 / 500 — `text-mono-eyebrow` runs at 400; `font-medium`
   *                     on `StickerBadge` and various component overlays
   *                     bump it to 500.
   *
   * Result: 7 font files instead of 14. ~50% drop in font bytes-on-wire.
   * `@nuxt/fonts` already adds `font-display: swap` and a size-adjusted
   * fallback, so CLS stays at 0.
   */
  fonts: {
    families: [
      // Anton renders every `text-display*` headline — the LCP element on
      // the homepage, both index pages, and every field-note detail.
      // `preload: true` emits a `<link rel="preload" as="font">` tag in
      // <head> so the font fetch starts in parallel with the document
      // rather than waiting for CSS parse. On `/projects/[slug]` the LCP
      // is the hero image; browsers schedule the preloaded font alongside
      // the `fetchpriority="high"` image, so the H1 lands without
      // serialised blocking.
      { name: 'Anton', provider: 'google', weights: [400], preload: true },
      { name: 'Fraunces', provider: 'google', weights: [400], styles: ['italic', 'normal'] },
      { name: 'Geist', provider: 'google', weights: [400, 600] },
      { name: 'Geist Mono', provider: 'google', weights: [400, 500] },
    ],
  },

  image: {
    provider: 'unsplash',
    unsplash: {
      baseURL: 'https://images.unsplash.com',
    },
    format: ['avif', 'webp'],
  },

  icon: {
    // Only `mdi:*` and `lucide:*` icons are referenced in the codebase
    // (verified via grep). `simple-icons` was carrying ~4.6MB of glyphs
    // for nothing — dropped from the server bundle and the devDependency
    // tree.
    serverBundle: { collections: ['mdi', 'lucide'] },
  },

  /**
   * Robots — production: allow everything (default). Dev/preview deploys
   * automatically get `Disallow: /` thanks to nuxt-seo's env detection,
   * which is exactly what we want — no accidental indexing of staging.
   *
   * We don't disallow `/api/` here because nuxt-sitemap and nuxt-og-image
   * serve content from `/api/__sitemap__` and `/__og-image__/`. Bots
   * already won't index JSON endpoints — and over-disallowing would
   * trigger nuxt-robots' "may prevent indexing" warning.
   */
  robots: {
    // Reserved for future bot-traps; otherwise inherit module defaults.
    disallow: [],
  },

  /**
   * Sitemap — the catalogue and field-notes slug pages are pulled from
   * static data, so we register a server source that enumerates them.
   * Top-level routes (`/`, `/projects`, `/field-notes`) are auto-detected
   * from the file-based router.
   */
  sitemap: {
    sources: ['/api/__sitemap__/urls'],
    // The homepage is the most important entry — boost its priority and
    // mark it as the canonical entry point for crawlers.
    defaults: {
      changefreq: 'weekly',
      priority: 0.7,
    },
  },

  /**
   * Runtime config — values bound from `NUXT_*` env vars at runtime.
   *
   * `ogImageSecret` populates from `NUXT_OG_IMAGE_SECRET` automatically
   * (Nuxt camelCases the env-var suffix). `@nuxtjs/og-image` reads it
   * via runtimeConfig to sign image URLs cryptographically. Strict
   * mode is intentionally NOT enabled — signing is available but
   * unsigned URLs still render so previews don't break while paths are
   * being audited.
   */
  runtimeConfig: {
    // Bound automatically from NUXT_OG_IMAGE_SECRET at runtime.
    ogImageSecret: '',
  },

  /**
   * OG Image — share previews use the riso-aesthetic component
   * defined in `components/OgImage/OgImageWolves.takumi.vue`. The
   * site-wide default is registered via `defineOgImage` in app.vue
   * so every page gets a fallback even before per-page overrides.
   *
   * Renderer is derived from the component filename suffix
   * (`.takumi.vue` ⇒ Takumi, the v6-recommended Rust/WASM renderer).
   * The legacy `defaults.renderer` key was removed in v6.
   */
  ogImage: {
    defaults: {
      // nuxt-og-image v6 omits `component` from the typed `defaults`
      // surface even though it's the documented way to pin the global
      // template. Cast to bypass the stale type until the module fixes it.
      component: 'Wolves',
      width: 1200,
      height: 630,
    } as never,
  },

  /**
   * SEO Utils — automatic last-modified headers, fallback titles, etc.
   * Defaults are sensible; we just enable the canonical-link auto-fill
   * which pairs naturally with our `site.url` above.
   */
  seo: {
    automaticDefaults: true,
    fallbackTitle: true,
    redirectToCanonicalSiteUrl: true,
  },

  /**
   * Route rules — every page on this site is content-static (pulled from
   * `data/projects.ts`, `data/field-notes.ts`, etc.), so SSR would pay a
   * server-render cost on every request for HTML that never changes
   * between deploys. `prerender: true` emits the routes as static HTML at
   * build time; the matching `Cache-Control` keeps revisits cheap without
   * serving stale UI past the next deploy.
   *
   * Header strategy:
   *   - `/_nuxt/**` and `/_fonts/**` are content-addressed (hash in the
   *     filename), so they can be cached for a year with `immutable`.
   *     Browsers skip the conditional revalidation entirely.
   *   - Prerendered HTML uses `max-age=0, must-revalidate` so each
   *     navigation sends a conditional GET and gets a `304` for unchanged
   *     HTML. New deploys are visible immediately.
   *   - OG image responses and sitemap get a longer max-age with SWR so
   *     bots and social-card unfurlers don't hammer the renderer.
   *
   * The OG image and sitemap endpoints intentionally stay dynamic — they
   * have their own internal caching and rendering them at build would
   * either bloat the artifact or break date-based content (the homepage
   * `Issue MM/YYYY` stamp).
   */
  routeRules: {
    // Hashed bundles: cache forever, skip revalidation.
    '/_nuxt/**': {
      headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
    },
    '/_fonts/**': {
      headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
    },
    // Prerendered HTML: revalidate every navigation, send `304` when
    // unchanged. Keeps users on the latest deploy with near-zero revisit
    // cost.
    '/': {
      prerender: true,
      headers: { 'Cache-Control': 'public, max-age=0, must-revalidate' },
    },
    '/projects': {
      prerender: true,
      headers: { 'Cache-Control': 'public, max-age=0, must-revalidate' },
    },
    '/projects/**': {
      prerender: true,
      headers: { 'Cache-Control': 'public, max-age=0, must-revalidate' },
    },
    '/field-notes': {
      prerender: true,
      headers: { 'Cache-Control': 'public, max-age=0, must-revalidate' },
    },
    '/field-notes/**': {
      prerender: true,
      headers: { 'Cache-Control': 'public, max-age=0, must-revalidate' },
    },
    // OG image renderer — has its own internal cache; the HTTP layer
    // keeps social-card unfurlers from re-requesting on every share.
    '/__og-image__/**': {
      headers: {
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    },
    '/sitemap.xml': {
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    },
    '/robots.txt': {
      headers: { 'Cache-Control': 'public, max-age=86400' },
    },
  },

  nitro: {
    /**
     * Dev-only payload cache override.
     *
     * Nuxt's default Nitro `cache` mount uses the unstorage fs driver,
     * which maps cache keys directly to filesystem paths. That breaks for
     * routes where a collection page and a detail page share a base path:
     *
     *   /field-notes          -> .nuxt/cache/nuxt/payload/field-notes  (file)
     *   /field-notes/<slug>   -> .nuxt/cache/nuxt/payload/field-notes/<slug>
     *
     * The file and the directory cannot coexist; whichever writes first
     * wins and the other throws ENOTDIR. Same shape applies to /projects.
     *
     * Swapping just the `cache` mount to `memory` in dev removes the fs
     * and therefore the collision. Production (`nuxt build`) writes
     * payloads to `.output/public/<route>/_payload.json` via a different
     * path and is unaffected.
     */
    devStorage: {
      cache: { driver: 'memory' },
    },

    /**
     * Prerender — `routeRules['/projects/**']: { prerender: true }` is a
     * matcher, not an enumerator. Without `crawlLinks: true`, Nitro never
     * discovers the concrete `/projects/<slug>` URLs and they fall
     * through to cold SSR at request time (verified: pre-fix builds
     * emitted exactly 3 index.html files in .output/public).
     *
     * The seed `routes` guarantees the four entry pages even if a
     * `<NuxtLink>` is broken; `crawlLinks` then walks every `<a>`/<link>
     * from those pages and prerenders the slug pages too. `failOnError`
     * stays false so a transient 4xx in one route doesn't poison the
     * whole build.
     */
    prerender: {
      crawlLinks: true,
      routes: ['/', '/projects', '/field-notes', '/impressum'],
      failOnError: false,
    },

    /**
     * Precompress static assets at build time. Emits `.br` and `.gz`
     * siblings under `.output/public`; Traefik 2.x/3.x in front of the
     * Coolify deployment serves them automatically when the client's
     * `Accept-Encoding` matches. Build-time brotli runs at level 11
     * (versus the on-the-fly default of 4), so the wire payload is
     * meaningfully smaller and there's no per-request CPU cost.
     */
    compressPublicAssets: { brotli: true, gzip: true },
  },

  experimental: {
    viewTransition: true,
  },
})
