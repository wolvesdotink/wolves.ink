<script setup lang="ts">
/**
 * HalftoneOrbBackdrop — the parallax orb pair that decorates the
 * mastheads on /projects, /field-notes, /impressum, and /field-notes/[slug].
 *
 * Two HalftoneOrbs, absolutely positioned on either side of the parent
 * (which must be `relative isolate overflow-hidden`). The orbs default to
 * the magenta-toward-yellow-away pairing used by /projects; pages can
 * override per-call by passing `left` or `right` partials.
 *
 * The right orb sits flush to the top so it pokes above the section bound;
 * the left orb hides at mobile breakpoints (the parent's px-4 doesn't
 * leave room for it). These rules match the inline markup that used to
 * be repeated on every masthead.
 */

interface OrbConfig {
  tone?: string
  sizeClass?: string
  range?: number
  influence?: 'toward' | 'away'
}

const props = defineProps<{
  left?: OrbConfig
  right?: OrbConfig
}>()

const leftCfg = computed<Required<OrbConfig>>(() => ({
  tone: 'text-pop-magenta',
  sizeClass: 'h-72 w-72',
  range: 22,
  influence: 'toward',
  ...props.left,
}))

const rightCfg = computed<Required<OrbConfig>>(() => ({
  tone: 'text-pop-yellow',
  sizeClass: 'h-40 w-40',
  range: 14,
  influence: 'away',
  ...props.right,
}))
</script>

<template>
  <div class="pointer-events-none absolute -left-12 top-32 hidden md:block">
    <HalftoneOrb v-bind="leftCfg" />
  </div>
  <div class="pointer-events-none absolute right-12 -top-8">
    <HalftoneOrb v-bind="rightCfg" />
  </div>
</template>
