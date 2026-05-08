<script setup lang="ts">
import { site } from '~/data/site'

const { list, featured } = useProjects()

const rest = computed(() => list.filter((p) => !p.featured))

const stats = computed(() => ({
  total: list.length,
  featured: featured.length,
  live: list.filter((p) => p.status.tone === 'live').length,
  wip: list.filter((p) => p.status.tone === 'wip' || p.status.tone === 'beta').length,
}))

// `title` stays short — the global `titleTemplate` in nuxt.config
// appends " — Wolves" automatically.
useSeoMeta({
  title: 'Workbench',
  description:
    'Every project, every spread, every late-night sketch — the Wolves workbench. Featured shipping work plus the trail behind, kept on the same ground.',
  ogTitle: 'Workbench — Wolves',
  ogDescription: 'The pack runs three at the front. The workbench keeps going.',
  ogType: 'website',
  twitterCard: 'summary_large_image',
})

defineOgImage('Wolves', {
  title: 'Workbench',
  eyebrow: 'Every spread, on the workbench',
  description: 'Featured projects, the trail behind, retired tools.',
  accent: 'yellow',
})

// Schema.org — tell crawlers this page is a curated CollectionPage of
// CreativeWorks (each project is one), and emit a BreadcrumbList so
// "Home › Workbench" appears in search results.
useSchemaOrg([
  defineBreadcrumb({
    itemListElement: [
      { name: 'Home', item: '/' },
      { name: 'Workbench', item: '/projects' },
    ],
  }),
  {
    '@type': 'CollectionPage',
    name: 'Workbench — Wolves',
    description: 'Featured projects and the trail behind from the Wolves studio.',
    isPartOf: { '@id': '#website' },
    hasPart: list.map((p) => ({
      '@type': 'CreativeWork',
      name: p.name,
      url: p.description?.length ? `/projects/${p.slug}` : (p.links.live?.href ?? p.links.github?.href ?? '/projects'),
      abstract: p.tagline,
    })),
  },
])
</script>

<template>
  <div class="grain">
    <!-- ======================================================================
         MASTHEAD — Workbench
    ====================================================================== -->
    <PageMasthead eyebrow="Range · Workbench">
      <template #title>
        Every spread,<br>
        <span class="text-pop-magenta">on the workbench.</span>
      </template>

      <template #body>
        <div class="mt-10 grid grid-cols-12 gap-x-6 gap-y-6">
          <p class="text-editorial col-span-12 max-w-[44ch] text-balance text-2xl text-cream/85 lg:col-span-7 lg:text-3xl">
            The pack runs three at the front. The workbench keeps going — sketches,
            shipping work, things in pieces, things on shelves. Everything we've put
            our paws on lives here.
          </p>
          <aside class="col-span-12 flex flex-row flex-wrap items-start gap-3 lg:col-span-5 lg:flex-col lg:items-start lg:gap-4">
            <StickerBadge tone="yellow" :tilt="-5" eyebrow="Browsing" jiggle>
              All spreads
            </StickerBadge>
            <StickerBadge tone="magenta" :tilt="4" eyebrow="Featured">
              Pack of three
            </StickerBadge>
            <StickerBadge tone="cream" :tilt="-3" eyebrow="Updated">
              Continuously
            </StickerBadge>
          </aside>
        </div>
      </template>

      <template #stats>
        <!-- Stat row — count-up + riso slam landing -->
        <StatRow
          :items="[
            { value: stats.total, tone: 'yellow', label: 'Spreads in total' },
            { value: stats.featured, tone: 'magenta', label: 'Lead pack' },
            { value: stats.live, tone: 'orange', label: 'Live in the wild' },
            { value: stats.wip, tone: 'cream', label: 'Beta / in progress' },
          ]"
        />
      </template>
    </PageMasthead>

    <!-- ======================================================================
         FEATURED — the same magazine spread as the homepage
    ====================================================================== -->
    <section class="border-y border-cream/10">
      <div class="mx-auto max-w-[1600px] px-4 pt-20 pb-10 md:px-8">
        <div class="grid grid-cols-12 items-end gap-x-6 gap-y-6">
          <div class="col-span-12 lg:col-span-7">
            <span class="text-mono-eyebrow text-cream/60">The pack · three at the front</span>
            <h2 class="text-display-xl mt-4 text-cream">
              The lead<br>
              <span class="text-pop-yellow">pack.</span>
            </h2>
          </div>
          <div class="col-span-12 lg:col-span-5">
            <p class="text-editorial text-balance text-xl text-cream/85 md:text-2xl">
              The three at the front — kept here so the workbench is the whole pack,
              not just the trail behind.
            </p>
          </div>
        </div>
      </div>

      <ProjectGuide :projects="featured" />
    </section>

    <!-- ======================================================================
         THE WIDER WORKBENCH — compact grid for non-featured projects
    ====================================================================== -->
    <section class="relative border-b border-cream/10">
      <div class="mx-auto max-w-[1600px] px-4 py-20 md:px-8 md:py-28">
        <div class="grid grid-cols-12 items-end gap-x-6 gap-y-6 mb-12">
          <div class="col-span-12 lg:col-span-7">
            <span class="text-mono-eyebrow text-cream/60">Range II — Further afield</span>
            <h2 class="text-display-xl mt-4 text-cream">
              The trail<br>
              <span class="text-pop-orange">behind.</span>
            </h2>
          </div>
          <div class="col-span-12 lg:col-span-5">
            <p class="text-editorial text-balance text-xl text-cream/85 md:text-2xl">
              Smaller experiments, retired tools, and ongoing tinkering. Some lead off-trail,
              some open onto a fuller spread.
            </p>
          </div>
        </div>

        <!-- Empty state when no extras yet -->
        <div
          v-if="rest.length === 0"
          class="border border-dashed border-cream/15 bg-ink-soft p-10 text-center md:p-16"
        >
          <span class="text-display-md text-3xl text-cream/40">The trail goes quiet here — for now.</span>
          <p class="text-editorial mt-4 max-w-[42ch] mx-auto text-cream/65">
            New entries land in <code class="text-mono-meta text-cream/85">app/data/projects.ts</code>
            with <code class="text-mono-meta text-cream/85">featured: false</code>.
          </p>
        </div>

        <!-- Grid -->
        <!--
          The first card is the only one reliably above the fold on most
          viewports (especially mobile, where the grid collapses to one
          column). Marking it `priority` flips its cover image to eager
          + fetchpriority="high" so it lands inside the LCP window;
          every other card stays lazy.
        -->
        <div
          v-else
          class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          <ProjectIndexCard
            v-for="(p, i) in rest"
            :key="p.slug"
            :project="p"
            :priority="i === 0"
          />
        </div>
      </div>
    </section>

    <!-- ======================================================================
         CLOSING MARQUEE — bookend in the homepage rhythm
    ====================================================================== -->
    <MarqueeQuote
      text="Every project, every spread, every late-night sketch"
      tone="magenta-on-ink"
      separator="✺"
      size-class="text-display-lg"
    />
  </div>
</template>
