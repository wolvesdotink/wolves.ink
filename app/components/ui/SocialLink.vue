<script setup lang="ts">
/**
 * SocialLink — the icon + label + sublabel + arrow row used in the
 * homepage outro section.
 *
 * Repeated 3x on /index.vue (lines ~348-390) before extraction. The
 * footer Calls grid and the impressum contact rows look superficially
 * similar but each has bespoke chrome (smaller icon / hover-only "open"
 * reveal, or chevron-suffix with scoped CSS); folding either of those
 * into this component would inflate the API for one consumer apiece.
 *
 * The hover color is driven by the `tone` prop, mapped through
 * Tailwind classes inline so the JIT scanner picks them up. The
 * `external` prop adds the `target="_blank" rel="noreferrer noopener"`
 * pair that external links need (mailto: / tel: links should pass
 * `external: false`).
 */

import type { AccentTone } from '~/utils/accent'

const props = withDefaults(
  defineProps<{
    /** Destination — `mailto:`, `tel:`, or `https://...`. */
    href: string
    /** Iconify name, e.g. `'mdi:github'`. */
    icon: string
    /** Big line — e.g. "GitHub". */
    label: string
    /** Small line under the label — e.g. "github.com/wolvesdotink". */
    sublabel: string
    /** Hover accent. Defaults to `'yellow'`. */
    tone?: AccentTone
    /** External link — adds `target="_blank" rel="noreferrer noopener"`. */
    external?: boolean
    /**
     * Border utility. Defaults to `'border-t'`. Pass `'border-y'` for
     * the last item in a stack (so the bottom rule renders too).
     */
    border?: string
  }>(),
  { tone: 'yellow', external: false, border: 'border-t' },
)

/**
 * Tailwind hover-color class. Listed inline so the JIT scanner extracts
 * each variant; do NOT compose this string dynamically.
 */
const hoverClass = computed(() => {
  switch (props.tone) {
    case 'magenta': return 'hover:text-pop-magenta'
    case 'yellow':  return 'hover:text-pop-yellow'
    case 'orange':  return 'hover:text-pop-orange'
    case 'blue':    return 'hover:text-pop-blue'
    case 'cream':   return 'hover:text-cream'
    case 'ink':     return 'hover:text-ink'
  }
})
</script>

<template>
  <a
    :href="href"
    :target="external ? '_blank' : undefined"
    :rel="external ? 'noreferrer noopener' : undefined"
    class="group flex items-center justify-between gap-6 py-6 text-cream transition-colors border-cream/15"
    :class="[border, hoverClass]"
  >
    <span class="flex items-center gap-4">
      <Icon :name="icon" class="text-3xl" />
      <span class="flex flex-col">
        <span class="text-display-md">{{ label }}</span>
        <span class="text-mono-eyebrow opacity-60">{{ sublabel }}</span>
      </span>
    </span>
    <Icon
      name="lucide:arrow-up-right"
      class="text-2xl transition-transform group-hover:-translate-y-1 group-hover:translate-x-1"
    />
  </a>
</template>
