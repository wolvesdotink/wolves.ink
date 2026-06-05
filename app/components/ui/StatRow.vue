<script setup lang="ts">
/**
 * StatRow — the 4-up grid of <AnimatedStat>s used at the bottom of
 * each masthead (homepage cover, /projects index, /field-notes index).
 *
 * Before extraction the same `mt-16 grid grid-cols-2 gap-x-6 gap-y-8
 * border-t border-cream/15 pt-8 md:grid-cols-4` chain was repeated
 * three times with only the contents changing.
 *
 * The `topRule` prop toggles the rule + spacing above the row. Index
 * pages want it (default true); future stat rows that aren't preceded
 * by other masthead content can pass `:top-rule="false"`.
 */

import type { AnimatedStatProps } from '~/components/ui/AnimatedStat.vue'

/** Each item is an AnimatedStat's props plus the slot text it renders. */
export type StatItem = AnimatedStatProps & { label: string }

withDefaults(
  defineProps<{
    items: StatItem[]
    /** Render the top border + `mt-16 pt-8` spacing. Defaults true. */
    topRule?: boolean
  }>(),
  { topRule: true },
)

// Interactive stats (see AnimatedStatProps.interactive) bubble their
// activation up with the item index, so the page owning the items
// array can route the click without per-item callbacks.
const emit = defineEmits<{ activate: [index: number] }>()
</script>

<template>
  <div
    class="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4"
    :class="topRule ? 'mt-16 border-t border-cream/15 pt-8' : ''"
  >
    <AnimatedStat
      v-for="(s, i) in items"
      :key="i"
      :value="s.value"
      :display="s.display"
      :tone="s.tone"
      :pad="s.pad"
      :duration="s.duration"
      :interactive="s.interactive"
      :aria-label="s.ariaLabel"
      :riso-label="s.risoLabel"
      :symbol="s.symbol"
      :agitation="s.agitation"
      :jam="s.jam"
      :slam="s.slam"
      @activate="emit('activate', i)"
    >
      {{ s.label }}
    </AnimatedStat>
  </div>
</template>
