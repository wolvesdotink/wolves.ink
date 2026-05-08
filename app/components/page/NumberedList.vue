<script setup lang="ts">
/**
 * NumberedList — magazine-style ordered list of `{ title, body }` items
 * with a big two-digit numeral marker per row.
 *
 * Consolidates the "Section II — small stuff" details list on the
 * project detail page. The first item's number gets the page accent;
 * subsequent items dim to `text-cream/35`. Pass `:accent-first="false"`
 * to keep all numerals dim (no first-item highlight).
 *
 * Note: this component is for `{ title, body }` shapes only. The
 * "earlier notes" reading list on /field-notes (which has number, date,
 * blurb, read-time, arrow per row) is a different layout — keep that
 * inline.
 */

import type { ProjectAccent } from '~/data/projects'

const props = withDefaults(
  defineProps<{
    items: { title: string; body: string }[]
    /** Optional accent — required if `accentFirst` is true. */
    accent?: ProjectAccent
    /** Highlight the FIRST item's numeral with the page accent. */
    accentFirst?: boolean
  }>(),
  { accentFirst: false },
)

/** First-item numeral class — accent if requested, otherwise dim. */
const firstNumClass = computed<string>(() => {
  if (!props.accentFirst || !props.accent) return 'text-cream/35'
  return accentClasses(props.accent).text
})
</script>

<template>
  <ol class="space-y-12">
    <li
      v-for="(item, i) in items"
      :key="i"
      class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-t border-cream/15 pt-6"
    >
      <span
        class="text-display-md text-5xl leading-none"
        :class="i === 0 ? firstNumClass : 'text-cream/35'"
      >
        {{ String(i + 1).padStart(2, '0') }}
      </span>
      <div class="row-span-2 col-start-2 space-y-3">
        <h3 class="text-2xl font-serif italic text-cream">{{ item.title }}</h3>
        <p class="text-pretty leading-relaxed text-cream/75">{{ item.body }}</p>
      </div>
    </li>
  </ol>
</template>
