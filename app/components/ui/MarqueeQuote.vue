<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    text: string
    /** glyph between repeats — default is a star */
    separator?: string
    /** Reverse direction (right→left default; reverse = left→right) */
    reverse?: boolean
    /** Tone — sets bg & fg */
    tone?: 'cream-on-ink' | 'ink-on-cream' | 'yellow-on-ink' | 'magenta-on-ink' | 'orange-on-ink'
    /** Outline (text-stroke) instead of solid fill */
    outline?: boolean
    /** Override the text size class */
    sizeClass?: string
  }>(),
  {
    separator: '✺',
    reverse: false,
    tone: 'cream-on-ink',
    outline: false,
    sizeClass: 'text-display-lg',
  },
)

const toneClass = computed(() => {
  switch (props.tone) {
    case 'ink-on-cream':
      return 'bg-cream text-ink'
    case 'yellow-on-ink':
      return 'bg-ink text-pop-yellow'
    case 'magenta-on-ink':
      return 'bg-ink text-pop-magenta'
    case 'orange-on-ink':
      return 'bg-ink text-pop-orange'
    case 'cream-on-ink':
    default:
      return 'bg-ink text-cream'
  }
})

// Repeat enough copies to cover at least 2x viewport width even at large fonts
const repeat = 8
</script>

<template>
  <div class="relative overflow-hidden border-y border-cream/10" :class="toneClass">
    <div
      class="flex w-max whitespace-nowrap will-change-transform py-4"
      :class="reverse ? 'animate-marquee-rev' : 'animate-marquee'"
    >
      <div
        v-for="n in 2"
        :key="n"
        class="flex items-center gap-10 pr-10"
      >
        <template v-for="i in repeat" :key="`${n}-${i}`">
          <span
            :class="[sizeClass, outline ? 'text-stroke' : '']"
            class="inline-block"
            :style="outline ? { WebkitTextFillColor: 'transparent', WebkitTextStroke: '1.5px currentColor' } : {}"
          >
            {{ text }}
          </span>
          <span
            class="text-mono-eyebrow opacity-60 text-display-md"
            aria-hidden="true"
          >
            {{ separator }}
          </span>
        </template>
      </div>
    </div>
  </div>
</template>
