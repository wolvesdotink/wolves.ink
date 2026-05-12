<script setup lang="ts">
/**
 * HalftoneOrb — a big halftone-dot circle that drifts toward / away from
 * the mouse and breathes on its own. Replaces the plain
 * `pointer-events-none halftone` divs we had baked into the masthead and
 * catalogue pages, with no functional regression for users on coarse
 * pointers or with reduced motion (it just sits where it would have).
 *
 * The cursor-tracking is delegated to `useHalftoneParallax`, which runs
 * a single rAF + a single pointermove listener for every orb on the
 * page. Each orb instance subscribes with its `range` and `influence`
 * and gets back reactive `{ dx, dy }` to bind to its transform. Keeps
 * INP low even when the homepage mounts 4-6 orbs at once.
 */

const props = withDefaults(
  defineProps<{
    /** Tailwind color class (e.g. "text-pop-magenta") for the dots */
    tone?: string
    /** Diameter, e.g. "h-72 w-72" — passed straight through */
    sizeClass?: string
    /** Distance the orb is allowed to drift, in px */
    range?: number
    /** Direction of cursor influence: "toward" pulls in, "away" pushes off. */
    influence?: 'toward' | 'away'
    /** Resting opacity (0..1) */
    opacity?: number
  }>(),
  {
    tone: 'text-pop-magenta',
    sizeClass: 'h-72 w-72',
    range: 18,
    influence: 'toward',
    opacity: 0.18,
  },
)

const root = ref<HTMLElement | null>(null)

const { dx, dy } = useHalftoneParallax({
  el: root as Ref<HTMLElement | null>,
  range: props.range,
  influence: props.influence,
})
</script>

<template>
  <div
    ref="root"
    class="halftone-orb pointer-events-none rounded-full halftone"
    :class="[sizeClass, tone]"
    :style="{
      opacity: props.opacity,
      transform: `translate3d(${dx}px, ${dy}px, 0)`,
    }"
    aria-hidden="true"
  />
</template>

<style scoped>
.halftone-orb {
  will-change: transform;
  /* The breathing scale is independent from the cursor parallax — it
     gently inhales/exhales so the orbs feel alive even when the mouse
     is still. */
  animation: halftone-breathe 9s ease-in-out infinite;
}

@keyframes halftone-breathe {
  0%, 100% { filter: blur(0.2px) contrast(1); }
  50% { filter: blur(0.6px) contrast(1.15); }
}

@media (prefers-reduced-motion: reduce) {
  .halftone-orb {
    animation: none;
    transform: none !important;
  }
}
</style>
