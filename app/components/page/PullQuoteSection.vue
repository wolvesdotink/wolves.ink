<script setup lang="ts">
/**
 * PullQuoteSection — the full-bleed riso slab used on /projects/[slug]
 * and /field-notes/[slug] for the big quote.
 *
 * Repeated nearly verbatim before extraction. Both consumers used a
 * different container width (`1400` for projects, `1200` for notes), so
 * `width` is exposed as a prop. The `accent.bgWithFg` from the shared
 * accent map handles the only previous divergence — pop-blue keeps
 * `text-cream` while the others flip to `text-ink`.
 */

import type { ProjectAccent } from '~/data/projects'

const props = withDefaults(
  defineProps<{
    /** The serif quote. Renders inside `<p class="text-display-lg">`. */
    quote: string
    /** Small eyebrow under the quote — e.g. `"— Workbench notes"`. */
    attribution: string
    /** Drives bg + readable fg via the shared accent map. */
    accent: ProjectAccent
    /** Container width — `'spread'` (1400, projects) or `'note'` (1200). */
    width?: 'spread' | 'note'
  }>(),
  { width: 'spread' },
)

const accentMap = useAccentColor(() => props.accent)
</script>

<template>
  <section
    class="relative overflow-hidden border-y border-cream/10 py-20 md:py-32"
    :class="accentMap.bgWithFg"
  >
    <div
      class="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full opacity-20 halftone text-ink"
      aria-hidden="true"
    />
    <div
      class="pointer-events-none absolute -left-20 bottom-0 h-64 w-64 rounded-full opacity-20 halftone text-ink"
      aria-hidden="true"
    />
    <div class="relative section-container md:px-10" :data-width="width">
      <span class="text-display-mega leading-[0.7] text-[clamp(4rem,12vw,12rem)] opacity-50">"</span>
      <p class="text-display-lg leading-[0.95] text-balance">
        {{ quote }}
      </p>
      <p class="text-mono-eyebrow mt-8 opacity-70">{{ attribution }}</p>
    </div>
  </section>
</template>
