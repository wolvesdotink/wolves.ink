<script setup lang="ts">
import { site } from '~/data/site'

const route = useRoute()
const { bySlug, next, prev } = useFieldNotes()

const slug = computed(() => String(route.params.slug))
const note = computed(() => bySlug(slug.value))

if (!note.value) {
  throw createError({ statusCode: 404, statusMessage: 'Field note not found', fatal: true })
}

const nextNote = computed(() => next(note.value!.slug))
const prevNote = computed(() => prev(note.value!.slug))

// Function form keeps reactivity alive for view-transition nav between
// notes. The global title template appends "— Wolves" — we only
// add the "Field Notes" mid-segment manually.
useSeoMeta({
  title: () => `${note.value!.title} · Field Notes`,
  description: () => note.value!.blurb,
  ogTitle: () => note.value!.title,
  ogDescription: () => note.value!.blurb,
  ogType: 'article',
  twitterCard: 'summary_large_image',
  twitterTitle: () => note.value!.title,
  twitterDescription: () => note.value!.blurb,
  // Article-level OG metadata — fully dated and tagged, so LinkedIn
  // and Mastodon can pick up the publication date for clean previews.
  articlePublishedTime: () => note.value!.date,
  articleSection: () => note.value!.eyebrow,
  articleTag: () => note.value!.tags ?? [],
  articleAuthor: [site.founder],
})

// Reactive accent map — drives eyebrow text, drop cap, issue stamp bg,
// and pull-quote bg+fg via the shared accent system.
const accent = useAccentColor(() => note.value!.accent)
// OG card accent name — derived from the shared accent map so the
// share image and the page never disagree on what "yellow" means.
const ogAccent = computed(() => accent.value.og)

defineOgImage('Wolves', {
  title: () => note.value!.title,
  eyebrow: () => `Field Notes № ${note.value!.number} · ${note.value!.eyebrow}`,
  description: () => note.value!.deck ?? note.value!.blurb,
  accent: ogAccent,
})

// Article schema is the high-leverage one — it's how Google decides
// whether to show the publication date, author and headline in rich
// results. We point `mainEntityOfPage` back to the canonical URL so
// Schema.org doesn't accidentally promote the OG image as the article.
useSchemaOrg([
  defineBreadcrumb({
    itemListElement: [
      { name: 'Home', item: '/' },
      { name: 'Field Notes', item: '/field-notes' },
      { name: () => note.value!.title, item: () => `/field-notes/${note.value!.slug}` },
    ],
  }),
  defineArticle({
    '@type': 'BlogPosting',
    headline: () => note.value!.title,
    description: () => note.value!.blurb,
    datePublished: () => note.value!.date,
    dateModified: () => note.value!.date,
    author: {
      '@type': 'Person',
      name: site.founder,
      url: 'https://wolves.ink',
    },
    publisher: { '@id': '#identity' },
    isPartOf: { '@id': '#website' },
    mainEntityOfPage: `/field-notes/${note.value!.slug}` as never,
    keywords: (note.value!.tags ?? []).join(', ') as never,
    articleSection: note.value!.eyebrow as never,
    wordCount: () => (note.value!.body ?? []).reduce((sum, p) => sum + p.split(/\s+/).length, 0),
  }),
])

</script>

<template>
  <article
    v-if="note"
    class="grain"
  >
    <!-- ══════════════════════════════════════════════════════════════════
         HEAD — note stamp + title

         Intentionally NOT migrated to <PageMasthead>: this section uses
         a NuxtLink breadcrumb instead of a string eyebrow, places its
         orbs at custom positions (right corner top, left corner bottom),
         and floats an absolute issue stamp inside. Forcing it into the
         shared masthead would require multiple escape-hatch slots that
         outweigh the consolidation win.
    ══════════════════════════════════════════════════════════════════ -->
    <section class="relative isolate overflow-hidden border-b border-cream/10">
      <div class="pointer-events-none absolute -right-16 -top-12 hidden md:block">
        <HalftoneOrb
          tone="text-pop-yellow"
          size-class="h-72 w-72"
          :range="22"
          influence="away"
        />
      </div>
      <div class="pointer-events-none absolute -left-12 bottom-0">
        <HalftoneOrb
          tone="text-pop-magenta"
          size-class="h-56 w-56"
          :range="14"
          influence="toward"
        />
      </div>

      <div
        class="relative section-container pt-20 pb-16 md:pt-32 md:pb-24"
        data-width="note"
      >
        <!-- Breadcrumb -->
        <div class="flex items-center gap-3 text-mono-eyebrow text-cream/50">
          <NuxtLink
            to="/field-notes"
            class="hover:text-cream"
          >Field Notes</NuxtLink>
          <span class="opacity-40">/</span>
          <span class="text-cream/75">№{{ note.number }}</span>
        </div>

        <!-- Eyebrow + meta -->
        <div class="mt-12 flex flex-wrap items-center gap-x-4 gap-y-2 text-mono-eyebrow">
          <span :class="accent.text">{{ note.eyebrow }}</span>
          <span class="text-cream/30">·</span>
          <span class="text-cream/55">{{ formatDispatchDate(note.date) }}</span>
          <span class="text-cream/30">·</span>
          <span class="text-cream/55">{{ note.readTime }}</span>
        </div>

        <h1 class="text-display-xl mt-6 text-cream leading-[0.86]">
          {{ note.title }}
        </h1>
        <p
          v-if="note.deck"
          class="text-editorial mt-8 max-w-[58ch] text-balance text-2xl text-cream/85 md:text-3xl"
        >
          {{ note.deck }}
        </p>

        <!-- Issue stamp — sticker, jiggling -->
        <div
          class="absolute right-6 top-12 z-10 hidden md:block"
          style="--tilt: -8deg"
        >
          <div
            class="sticker-jiggle sticker-shadow relative grid h-28 w-28 place-items-center rounded-full border-2 border-ink text-ink"
            :class="accent.bg"
          >
            <span class="text-mono-eyebrow absolute top-3.5 left-1/2 -translate-x-1/2 text-[0.6rem]">
              Note
            </span>
            <span class="text-display flex items-start text-4xl tabular-nums leading-none">
              <span class="text-2xl leading-none mt-0.5 mr-px">№</span>{{ note.number }}
            </span>
            <span
              class="text-mono-eyebrow absolute bottom-3.5 left-1/2 -translate-x-1/2 text-[0.6rem] tabular-nums tracking-[0.14em]"
            >
              {{ note.date.slice(0, 7).replace('-', '.') }}
            </span>
          </div>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════════════
         BODY — long form with drop cap
    ══════════════════════════════════════════════════════════════════ -->
    <section class="relative">
      <div class="mx-auto max-w-[820px] px-4 py-20 md:px-8 md:py-28">
        <div
          v-if="note.body && note.body.length"
          class="space-y-7 text-pretty leading-relaxed text-lg text-cream/85"
        >
          <p
            v-for="(para, i) in note.body"
            :key="i"
            :class="i === 0 ? 'first-para text-xl text-cream' : ''"
          >
            <span
              v-if="i === 0"
              class="float-left mr-3 mt-1 text-display-md text-6xl leading-none"
              :class="accent.text"
            >
              {{ para[0] }}
            </span>
            <span v-if="i === 0">{{ para.slice(1) }}</span>
            <span v-else>{{ para }}</span>
          </p>
        </div>

        <p
          v-else
          class="text-editorial text-xl text-cream/55"
        >
          This note is in the logbook. The long-form hasn't landed yet.
        </p>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════════════
         PULL QUOTE — full-bleed riso slab
    ══════════════════════════════════════════════════════════════════ -->
    <PullQuoteSection
      v-if="note.pullQuote"
      :quote="note.pullQuote"
      :attribution="`Field Notes № ${note.number}`"
      :accent="note.accent"
      width="note"
    />

    <!-- ══════════════════════════════════════════════════════════════════
         TAGS + colophon
    ══════════════════════════════════════════════════════════════════ -->
    <section
      v-if="note.tags?.length"
      class="border-t border-cream/10 bg-ink-soft"
    >
      <div class="mx-auto max-w-[1200px] px-4 py-12 md:px-8 md:py-16">
        <div class="flex flex-wrap items-center gap-3">
          <span class="text-mono-eyebrow text-cream/55">Tagged</span>
          <ul class="flex flex-wrap gap-2">
            <li
              v-for="t in note.tags"
              :key="t"
              class="rounded-full border border-cream/25 px-4 py-1.5 text-mono-meta text-cream/80 transition-colors hover:border-cream hover:bg-cream hover:text-ink"
            >
              {{ t }}
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════════════
         NEXT / PREV — turn the page
    ══════════════════════════════════════════════════════════════════ -->
    <PageNavigation
      :prev="{
        slug: prevNote.slug,
        title: prevNote.title,
        meta: `${prevNote.eyebrow} · ${formatDispatchDate(prevNote.date)}`,
      }"
      :next="{
        slug: nextNote.slug,
        title: nextNote.title,
        meta: `${nextNote.eyebrow} · ${formatDispatchDate(nextNote.date)}`,
      }"
      :href-builder="(s) => `/field-notes/${s}`"
      prev-label="← Previous note"
      next-label="Next note →"
    />
  </article>
</template>
