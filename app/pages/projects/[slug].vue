<script setup lang="ts">
import { site } from '~/data/site'

const route = useRoute()
const { bySlug, next, prev } = useProjects()

const slug = computed(() => String(route.params.slug))
const project = computed(() => bySlug(slug.value))

if (!project.value) {
  throw createError({ statusCode: 404, statusMessage: 'Project not found', fatal: true })
}

// If a project exists but doesn't have a rich spread written yet, send the
// reader somewhere useful instead of rendering a half-empty page.
if (!project.value.description?.length) {
  const fallback =
    project.value.links.live?.href
    ?? project.value.links.github?.href
    ?? '/projects'
  await navigateTo(fallback, { external: fallback.startsWith('http') })
}

const nextProject = computed(() => next(project.value!.slug))
const prevProject = computed(() => prev(project.value!.slug))

// Each project spread sets its own meta — note the function form so
// the values stay reactive when the slug changes (useful for the
// view-transition driven nav between spreads).
useSeoMeta({
  title: () => project.value!.name,
  description: () => project.value!.tagline,
  ogTitle: () => `${project.value!.name} — ${project.value!.tagline}`,
  ogDescription: () => project.value!.blurb,
  ogType: 'article',
  twitterCard: 'summary_large_image',
  twitterTitle: () => project.value!.name,
  twitterDescription: () => project.value!.tagline,
  // Article-level Open Graph extensions — surface tech tags as keywords.
  articleSection: () => project.value!.type,
  articleTag: () => project.value!.tech ?? [],
})

// Reactive accent map — drives drop cap, pull-quote bg+fg, "small stuff"
// headline, and numbered-list first-item accent.
const accent = useAccentColor(() => project.value!.accent)
// OG card accent name — derived from the same lookup table so the share
// image and the page never disagree on what "magenta" means.
const ogAccent = computed(() => accent.value.og)

defineOgImage('Wolves', {
  title: () => project.value!.name,
  eyebrow: () => `Spread ${project.value!.index} · ${project.value!.type}`,
  description: () => project.value!.tagline,
  accent: ogAccent,
})

// Structured data — `CreativeWork` so Google's knowledge graph can
// connect each spread to the parent Organization. BreadcrumbList
// powers the "Home › Workbench › Hinterland" rich result.
useSchemaOrg([
  defineBreadcrumb({
    itemListElement: [
      { name: 'Home', item: '/' },
      { name: 'Workbench', item: '/projects' },
      { name: () => project.value!.name, item: () => `/projects/${project.value!.slug}` },
    ],
  }),
  {
    '@type': 'CreativeWork',
    name: () => project.value!.name,
    headline: () => project.value!.tagline,
    description: () => project.value!.blurb,
    url: () => `/projects/${project.value!.slug}`,
    keywords: () => (project.value!.tech ?? []).join(', '),
    creator: { '@id': '#identity' },
    publisher: { '@id': '#identity' },
    isPartOf: { '@id': '#website' },
  },
])

</script>

<template>
  <article v-if="project" class="grain">
    <ProjectHero :project="project" />

    <!-- ======================================================================
         BLURB + DESCRIPTION SPREAD
    ====================================================================== -->
    <section class="relative mx-auto max-w-[1600px] px-4 py-20 md:px-10 md:py-28">
      <div class="grid grid-cols-12 gap-x-8 gap-y-10">
        <!-- Left margin — drop cap "blurb" -->
        <div class="col-span-12 lg:col-span-4">
          <span class="text-mono-eyebrow text-cream/55">Spread {{ project.index }} · The story</span>
          <p class="text-editorial mt-6 text-2xl leading-snug text-cream/85 md:text-3xl">
            {{ project.blurb }}
          </p>
        </div>
        <!-- Description body -->
        <div class="col-span-12 space-y-6 lg:col-span-7 lg:col-start-6">
          <p
            v-for="(para, i) in project.description"
            :key="i"
            class="text-pretty leading-relaxed text-cream/85 first:text-lg first:text-cream"
          >
            <span
              v-if="i === 0"
              class="float-left mr-3 mt-1 text-display-md text-5xl leading-none"
              :class="accent.text"
            >
              {{ para[0] }}
            </span>
            <span v-if="i === 0">{{ para.slice(1) }}</span>
            <span v-else>{{ para }}</span>
          </p>
        </div>
      </div>
    </section>

    <!-- ======================================================================
         PULL QUOTE — full bleed
    ====================================================================== -->
    <PullQuoteSection
      :quote="project.pullQuote ?? ''"
      attribution="— Workbench notes"
      :accent="project.accent"
      width="spread"
    />

    <!-- ======================================================================
         DETAILS — small touches
    ====================================================================== -->
    <section class="mx-auto max-w-[1600px] px-4 py-24 md:px-10 md:py-32">
      <div class="grid grid-cols-12 gap-x-8 gap-y-12">
        <div class="col-span-12 lg:col-span-4 lg:sticky lg:top-24 lg:self-start">
          <span class="text-mono-eyebrow text-cream/60">Section II</span>
          <h2 class="text-display-xl mt-4 text-cream leading-[0.85]">
            The small<br>
            <span :class="accent.text">stuff.</span>
          </h2>
          <p class="text-editorial mt-6 max-w-[28ch] text-xl text-cream/75">
            The decisions you don't see in screenshots — but feel in the using.
          </p>
        </div>

        <div class="col-span-12 lg:col-span-7 lg:col-start-6">
          <NumberedList
            :items="project.details ?? []"
            :accent="project.accent"
            accent-first
          />
        </div>
      </div>
    </section>

    <!-- ======================================================================
         TECH STACK + CREDITS
    ====================================================================== -->
    <section class="border-t border-cream/10 bg-ink-soft">
      <div class="mx-auto grid max-w-[1600px] gap-12 px-4 py-20 md:grid-cols-12 md:gap-x-8 md:px-10 md:py-28">
        <div class="md:col-span-4">
          <span class="text-mono-eyebrow text-cream/60">Materials</span>
          <h3 class="text-display-md mt-4 text-3xl text-cream">Built with</h3>
          <p class="text-editorial mt-3 max-w-[26ch] text-lg text-cream/70">
            Boring tech, used carefully. The sharp edges go in the design, not the stack.
          </p>
        </div>
        <div class="md:col-span-8">
          <ul class="flex flex-wrap gap-2">
            <li
              v-for="t in project.tech"
              :key="t"
              class="rounded-full border border-cream/25 px-4 py-2 text-mono-meta text-cream/80 transition-colors hover:border-cream hover:bg-cream hover:text-ink"
            >
              {{ t }}
            </li>
          </ul>

          <div class="mt-12 grid gap-y-3 gap-x-12 md:grid-cols-2">
            <a
              v-if="project.links.live"
              :href="project.links.live.href"
              target="_blank"
              rel="noreferrer noopener"
              class="group flex items-center justify-between gap-4 border-t border-cream/15 py-4 text-cream transition-colors hover:text-pop-yellow"
            >
              <span class="text-mono-eyebrow opacity-65">Visit live</span>
              <span class="flex items-center gap-2 font-serif italic">
                {{ project.links.live.label }}
                <Icon name="lucide:arrow-up-right" class="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </span>
            </a>
            <a
              v-if="project.links.github"
              :href="project.links.github.href"
              target="_blank"
              rel="noreferrer noopener"
              class="group flex items-center justify-between gap-4 border-t border-cream/15 py-4 text-cream transition-colors hover:text-pop-magenta"
            >
              <span class="text-mono-eyebrow opacity-65">View source</span>
              <span class="flex items-center gap-2 font-serif italic">
                {{ project.links.github.label }}
                <Icon name="lucide:arrow-up-right" class="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </span>
            </a>
            <a
              v-if="project.links.download"
              :href="project.links.download.href"
              download
              class="group flex items-center justify-between gap-4 border-t border-cream/15 py-4 text-cream transition-colors hover:text-pop-orange"
            >
              <span class="text-mono-eyebrow opacity-65">Download</span>
              <span class="flex items-center gap-2 font-serif italic">
                {{ project.links.download.label }}
                <Icon name="lucide:download" class="transition-transform group-hover:translate-y-0.5" />
              </span>
            </a>
          </div>

          <p v-if="project.cover.credit" class="mt-12 text-mono-eyebrow text-cream/40">
            Cover · {{ project.cover.credit }}
          </p>
        </div>
      </div>
    </section>

    <!-- ======================================================================
         NEXT / PREV — turn the page
    ====================================================================== -->
    <PageNavigation
      :prev="{ slug: prevProject.slug, title: prevProject.name, meta: prevProject.tagline }"
      :next="{ slug: nextProject.slug, title: nextProject.name, meta: nextProject.tagline }"
      :href-builder="(s) => `/projects/${s}`"
      prev-label="← Previous spread"
      next-label="Next spread →"
    />
  </article>
</template>
