<script setup lang="ts">
import { site } from '~/data/site'

/**
 * Site-wide head + structured data — runs once at the root, so every
 * route inherits these defaults. Per-page calls (`useSeoMeta`,
 * `useSchemaOrg`, `defineOgImage`) merge over the top.
 *
 * What lives here:
 *   1. `useHead` for non-meta tags (manifest, generator) that don't
 *      belong inside SeoMeta.
 *   2. A site-wide default OG image so even pages without an explicit
 *      `defineOgImage` call get the riso card.
 *   3. The Organization schema — the studio identity that anchors the
 *      whole knowledge graph. WebSite and WebPage are emitted
 *      automatically by nuxt-schema-org based on `site.url`/`site.name`.
 */

useHead({
  link: [
    // @nuxt/fonts self-hosts the Google fonts at build time, so a preconnect
    // to fonts.googleapis.com / gstatic.com would just burn a TLS handshake
    // for nothing. The preconnect that *does* matter is to the image CDN —
    // every project hero/card image is served by `images.unsplash.com` via
    // the @nuxt/image provider configured in `nuxt.config.ts`. Warming the
    // socket here shaves ~100-200ms off the LCP image's first byte.
    //
    // `dns-prefetch` is the older fallback for browsers that ignore
    // preconnect (Safari < 14, ancient Firefox). Cheap belt-and-braces.
    { rel: 'preconnect', href: 'https://images.unsplash.com', crossorigin: '' },
    { rel: 'dns-prefetch', href: 'https://images.unsplash.com' },
  ],
})

defineOgImage('Wolves', {
  title: 'Wolves',
  eyebrow: 'A note from the den',
  description: site.manifesto,
  accent: 'magenta',
})

useSchemaOrg([
  defineOrganization({
    name: 'Wolves',
    alternateName: 'wolves.ink',
    description: site.positioning,
    url: 'https://wolves.ink',
    logo: 'https://wolves.ink/logo.svg',
    sameAs: [site.socials.github, site.socials.twitch],
    founder: {
      '@type': 'Person',
      name: site.founder,
    },
    slogan: site.manifesto,
  }),
  defineWebSite({
    name: site.name,
    description: site.positioning,
  }),
  defineWebPage(),
])
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
