<script setup lang="ts">
withDefaults(
  defineProps<{
    href: string
    icon: string
    label: string
    /** When true, opens in a new tab */
    external?: boolean
    size?: 'sm' | 'md' | 'lg'
    tone?: 'cream' | 'magenta' | 'yellow' | 'orange'
  }>(),
  { external: true, size: 'md', tone: 'cream' },
)

const sizeClass = {
  sm: 'h-9 w-9 text-base',
  md: 'h-11 w-11 text-lg',
  lg: 'h-14 w-14 text-2xl',
} as const

const toneHover = {
  cream: 'hover:bg-cream hover:text-ink',
  magenta: 'hover:bg-pop-magenta hover:text-ink',
  yellow: 'hover:bg-pop-yellow hover:text-ink',
  orange: 'hover:bg-pop-orange hover:text-ink',
} as const
</script>

<template>
  <a
    :href="href"
    :target="external ? '_blank' : undefined"
    :rel="external ? 'noreferrer noopener' : undefined"
    :aria-label="label"
    class="group relative inline-grid place-items-center rounded-full border border-cream/25 text-cream transition-colors duration-300 ease-out"
    :class="[sizeClass[size], toneHover[tone]]"
  >
    <Icon :name="icon" class="transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6" />
    <span class="sr-only">{{ label }}</span>
  </a>
</template>
