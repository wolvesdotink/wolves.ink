<script setup lang="ts">
import { site } from '~/data/site'

/**
 * /field-notes — the studio's writing.
 *
 * Field-journal table of contents in the same register as `/projects`:
 * a masthead with a halftone backplate, a "lead note" spread, then the
 * earlier notes laid out as a numbered, riso-printed reading list.
 */

const { list, latest } = useFieldNotes()

const rest = computed(() => list.filter((n) => n.slug !== latest.slug))

useSeoMeta({
  title: 'Field Notes',
  description:
    'Writing from the workbench — what we shipped, what we broke, and what we learned. Field notes from the Wolves studio.',
  ogTitle: 'Field Notes — Wolves',
  ogDescription: 'Notes written while the work is still warm.',
  ogType: 'website',
  twitterCard: 'summary_large_image',
})

defineOgImage('Wolves', {
  title: 'Field Notes',
  eyebrow: 'Writing from the workbench',
  description: 'What we shipped, what we broke, and what we learned.',
  accent: 'yellow',
})

// `Blog` schema with each note as a `BlogPosting` lets Google's
// rich results pick this up as a publication archive instead of a
// generic listing page.
useSchemaOrg([
  defineBreadcrumb({
    itemListElement: [
      { name: 'Home', item: '/' },
      { name: 'Field Notes', item: '/field-notes' },
    ],
  }),
  {
    '@type': 'Blog',
    name: 'Field Notes — Wolves',
    description: 'Writing from the workbench at the Wolves studio.',
    publisher: { '@id': '#identity' },
    isPartOf: { '@id': '#website' },
    blogPost: list.map((n) => ({
      '@type': 'BlogPosting',
      headline: n.title,
      description: n.blurb,
      datePublished: n.date,
      url: `/field-notes/${n.slug}`,
      keywords: (n.tags ?? []).join(', '),
    })),
  },
])

</script>

<template>
  <div class="grain">
    <!-- ══════════════════════════════════════════════════════════════════
         MASTHEAD — Field Notes
    ══════════════════════════════════════════════════════════════════ -->
    <PageMasthead
      eyebrow="Logbook · Field Notes"
      :left-orb="{ tone: 'text-pop-yellow' }"
      :right-orb="{ tone: 'text-pop-magenta' }"
    >
      <template #title>
        Writing from<br>
        <span class="text-pop-yellow">the workbench.</span>
      </template>

      <template #body>
        <div class="mt-10 grid grid-cols-12 gap-x-6 gap-y-6">
          <p class="text-editorial col-span-12 max-w-[44ch] text-balance text-2xl text-cream/85 lg:col-span-7 lg:text-3xl">
            Notes written while the work is still warm — what we shipped, what we
            broke, and the small details we want to remember the next time we
            sit down at the desk.
          </p>
          <aside class="col-span-12 flex flex-row flex-wrap items-start gap-3 lg:col-span-5 lg:flex-col lg:items-start lg:gap-4">
            <StickerBadge tone="yellow" :tilt="-5" eyebrow="Cadence" jiggle>
              When it's worth saying
            </StickerBadge>
            <StickerBadge tone="magenta" :tilt="4" eyebrow="Voice">
              Studio, not blogger
            </StickerBadge>
            <StickerBadge tone="cream" :tilt="-3" eyebrow="Length">
              As long as it earns
            </StickerBadge>
          </aside>
        </div>
      </template>

      <template #stats>
        <!-- Stat row -->
        <StatRow
          :items="[
            { value: list.length, pad: 2, tone: 'yellow', label: 'Field notes logged' },
            { display: '∞', tone: 'magenta', label: 'Notes mid-trail' },
            { value: 3, tone: 'orange', label: 'Projects covered' },
            { value: 0, tone: 'cream', label: 'Glossy pitches' },
          ]"
        />
      </template>
    </PageMasthead>

    <!-- ══════════════════════════════════════════════════════════════════
         LEAD NOTE — the latest, full bleed
    ══════════════════════════════════════════════════════════════════ -->
    <section class="relative isolate border-y border-cream/10 overflow-hidden">
      <div
        class="pointer-events-none absolute inset-0 -z-10 opacity-[0.035]"
        aria-hidden="true"
      >
        <div class="absolute inset-0 halftone text-cream" />
      </div>

      <div class="mx-auto max-w-[1600px] px-4 py-20 md:px-8 md:py-28">
        <div class="flex flex-wrap items-center gap-x-3 gap-y-2 text-mono-eyebrow text-cream/55">
          <span class="grid h-2 w-2 place-items-center">
            <span class="absolute h-2 w-2 rounded-full bg-pop-magenta pulse-dot" />
          </span>
          <span class="text-pop-magenta">Lead note</span>
          <span class="opacity-40">·</span>
          <span>{{ formatDispatchDate(latest.date) }}</span>
          <span class="opacity-40">·</span>
          <span>{{ latest.readTime }}</span>
        </div>

        <NuxtLink :to="`/field-notes/${latest.slug}`" class="lead group mt-6 block">
          <div class="grid grid-cols-12 items-end gap-x-8 gap-y-8">
            <div class="col-span-12 lg:col-span-9">
              <span
                class="text-mono-eyebrow"
                :class="accentClasses(latest.accent).text"
              >
                {{ latest.eyebrow }}
              </span>
              <h2
                class="lead__title text-display-xl mt-3 text-cream leading-[0.86] transition-colors duration-500"
              >
                {{ latest.title }}
              </h2>
              <p
                v-if="latest.deck"
                class="text-editorial mt-6 max-w-[60ch] text-2xl text-cream/85 md:text-3xl"
              >
                {{ latest.deck }}
              </p>
            </div>

            <div class="col-span-12 lg:col-span-3">
              <div
                class="lead__num inline-grid place-items-center rounded-full border-2 border-cream/15 px-6 py-5 text-center transition-colors duration-500 group-hover:border-cream/40"
              >
                <span class="text-mono-eyebrow text-cream/55">Note</span>
                <span
                  class="text-display-md mt-1 text-5xl"
                  :class="accentClasses(latest.accent).text"
                >
                  №{{ latest.number }}
                </span>
              </div>
            </div>
          </div>

          <div class="mt-12 flex items-center justify-between gap-6 border-t border-cream/15 pt-6 text-mono-eyebrow text-cream/55">
            <span>Follow the trail</span>
            <span class="lead__arrow text-2xl transition-transform">→</span>
          </div>
        </NuxtLink>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════════════
         EARLIER NOTES — the reading list
    ══════════════════════════════════════════════════════════════════ -->
    <section class="relative border-b border-cream/10">
      <div class="mx-auto max-w-[1600px] px-4 py-20 md:px-8 md:py-28">
        <div class="grid grid-cols-12 items-end gap-x-6 gap-y-6 mb-12">
          <div class="col-span-12 lg:col-span-7">
            <span class="text-mono-eyebrow text-cream/60">Logbook II — Earlier notes</span>
            <h2 class="text-display-xl mt-4 text-cream">
              Earlier<br>
              <span class="text-pop-magenta">notes.</span>
            </h2>
          </div>
          <div class="col-span-12 lg:col-span-5">
            <p class="text-editorial text-balance text-xl text-cream/85 md:text-2xl">
              Logged in chronological order, newest stays on top. We don't
              prune — the half-formed notes live next to the polished ones,
              with the dates to prove which came first.
            </p>
          </div>
        </div>

        <ol class="border-t border-cream/15">
          <li v-for="note in rest" :key="note.slug" class="back-issue">
            <NuxtLink
              :to="`/field-notes/${note.slug}`"
              class="back-issue__link group grid grid-cols-12 items-baseline gap-x-6 gap-y-3 border-b border-cream/10 px-1 py-8 transition-colors duration-500 md:py-10"
            >
              <!-- Number + date column -->
              <span class="col-span-3 flex flex-col gap-1 md:col-span-2">
                <span
                  class="text-display-md text-3xl tabular-nums leading-none transition-colors duration-500 md:text-5xl"
                  :class="`back-issue__num ${accentClasses(note.accent).text}`"
                >
                  {{ note.number }}
                </span>
                <span class="text-mono-eyebrow text-cream/45">
                  {{ formatDispatchDate(note.date) }}
                </span>
              </span>

              <!-- Title + blurb -->
              <div class="col-span-9 md:col-span-7">
                <span class="text-mono-eyebrow text-cream/55">{{ note.eyebrow }}</span>
                <h3
                  class="text-display-md mt-2 text-2xl text-cream transition-colors duration-500 md:text-4xl group-hover:text-pop-yellow"
                >
                  {{ note.title }}
                </h3>
                <p class="text-editorial mt-3 max-w-[58ch] text-cream/70 md:text-lg">
                  {{ note.blurb }}
                </p>
              </div>

              <!-- Meta + arrow -->
              <span class="col-span-12 mt-2 flex items-center justify-between gap-3 text-mono-eyebrow text-cream/45 md:col-span-3 md:mt-0 md:flex-col md:items-end md:gap-2">
                <span>{{ note.readTime }}</span>
                <span
                  class="back-issue__arrow flex items-center gap-2 text-cream/40 transition-all duration-500 group-hover:text-pop-yellow"
                >
                  Follow
                  <span class="back-issue__chev text-base">→</span>
                </span>
              </span>
            </NuxtLink>
          </li>
        </ol>

        <p
          v-if="rest.length === 0"
          class="mt-12 text-editorial text-cream/55"
        >
          No earlier notes yet — the lead is the only one in the logbook.
        </p>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════════════════════════
         CLOSING MARQUEE — bookend in the homepage rhythm
    ══════════════════════════════════════════════════════════════════ -->
    <MarqueeQuote
      text="Write it down · Ship anyway · Try again on Monday"
      tone="yellow-on-ink"
      separator="✺"
      size-class="text-display-lg"
    />
  </div>
</template>

<style scoped>
/* Lead note — title gets the riso underline on hover */
.lead__title {
  background-image: linear-gradient(transparent calc(100% - 6px), var(--color-pop-yellow) 6px);
  background-size: 0% 100%;
  background-repeat: no-repeat;
  transition: background-size 600ms var(--ease-pop), color 320ms ease;
}
.lead:hover .lead__title,
.lead:focus-visible .lead__title {
  background-size: 100% 100%;
}
.lead:hover .lead__arrow {
  transform: translateX(6px);
  color: var(--color-pop-yellow);
}

/* Earlier notes — number rotates and shifts colour on hover */
.back-issue__link:hover .back-issue__num,
.back-issue__link:focus-visible .back-issue__num {
  transform: rotate(-3deg);
  display: inline-block;
}
.back-issue__num {
  display: inline-block;
  transition: transform 480ms var(--ease-pop);
}
.back-issue__chev {
  transition: transform 320ms var(--ease-pop);
}
.back-issue__link:hover .back-issue__chev,
.back-issue__link:focus-visible .back-issue__chev {
  transform: translateX(4px);
}

@media (prefers-reduced-motion: reduce) {
  .lead__title,
  .back-issue__num,
  .back-issue__chev,
  .lead__arrow {
    transition: none;
  }
}
</style>
