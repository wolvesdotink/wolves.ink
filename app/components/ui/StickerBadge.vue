<script setup lang="ts">
type Tone = 'magenta' | 'yellow' | 'orange' | 'cream' | 'ink'

const props = withDefaults(
  defineProps<{
    tone?: Tone
    /** Tilt in degrees — random-ish, applied to the sticker shape */
    tilt?: number
    /** When true, the sticker subtly jiggles */
    jiggle?: boolean
    /** Optional eyebrow line above the main label */
    eyebrow?: string
  }>(),
  { tone: 'cream', tilt: -4, jiggle: false },
)

const toneClass = computed(() => {
  switch (props.tone) {
    case 'magenta':
      return 'bg-pop-magenta text-ink'
    case 'yellow':
      return 'bg-pop-yellow text-ink'
    case 'orange':
      return 'bg-pop-orange text-ink'
    case 'ink':
      return 'bg-ink text-cream border border-cream/20'
    case 'cream':
    default:
      return 'bg-cream text-ink'
  }
})
</script>

<template>
  <span
    data-sticker
    class="inline-flex flex-col items-start sticker-shadow text-mono-eyebrow font-medium select-none"
    :class="[toneClass, jiggle ? 'sticker-jiggle' : '']"
    :style="{ '--tilt': `${tilt}deg`, transform: jiggle ? undefined : `rotate(${tilt}deg)` }"
  >
    <span class="px-2.5 py-1.5 leading-none flex flex-col gap-0.5">
      <span v-if="eyebrow" class="opacity-70 text-[0.6rem]">{{ eyebrow }}</span>
      <span class="flex items-center gap-1.5"><slot /></span>
    </span>
  </span>
</template>
