<script setup lang="ts">
/**
 * PawTrail — fixed overlay that renders the active cursor paw prints
 * once the user has claimed the footer paw. Mounted once at the layout
 * root so the trail survives route transitions within a session.
 *
 * State and the pointermove listener live in `usePawTrail`. This
 * component owns mount/unmount of the listener and renders the array;
 * everything else is module-level so the footer button and this overlay
 * share the same source of truth.
 *
 * Layering:
 *   - z-60 sits above page content but below `<RisoCursor>` (z-70) so
 *     the registration-ring cursor stays sharp on top of the trail.
 *
 * SSR / a11y:
 *   - `<ClientOnly>` so we don't render anything server-side, matching
 *     how RisoCursor handles SSR.
 *   - The whole overlay is `aria-hidden` and `pointer-events: none` —
 *     decorative paper texture, not interactive content.
 */

const { active, prints, attach } = usePawTrail()

let detach: (() => void) | null = null

onMounted(() => {
  detach = attach()
})

onBeforeUnmount(() => {
  detach?.()
  detach = null
})
</script>

<template>
  <ClientOnly>
    <div
      v-if="active"
      class="paw-trail-root pointer-events-none fixed inset-0 z-[60]"
      aria-hidden="true"
    >
      <span
        v-for="p in prints"
        :key="p.id"
        class="paw-trail-print"
        :style="{
          '--paw-x': `${p.x}px`,
          '--paw-y': `${p.y}px`,
          '--paw-r': `${p.rotation}deg`,
        }"
      >
        <svg viewBox="0 0 28 28" width="28" height="28" aria-hidden="true">
          <ellipse cx="14" cy="20" rx="6.2" ry="5" fill="currentColor" />
          <ellipse cx="6" cy="11.5" rx="2.4" ry="3" fill="currentColor" />
          <ellipse cx="11" cy="6.5" rx="2.4" ry="3" fill="currentColor" />
          <ellipse cx="17" cy="6.5" rx="2.4" ry="3" fill="currentColor" />
          <ellipse cx="22" cy="11.5" rx="2.4" ry="3" fill="currentColor" />
        </svg>
      </span>
    </div>
  </ClientOnly>
</template>

<style scoped>
.paw-trail-print {
  position: absolute;
  top: 0;
  left: 0;
  display: block;
  /* Subtle warm grey — same cream token the footer crop marks use for
     ghost UI, dialed up slightly because the prints are smaller and
     transient. Peak ~45% opacity, animated to/from 0. */
  color: rgb(241 233 216 / 0.5);
  transform: translate3d(var(--paw-x), var(--paw-y), 0) translate(-50%, -50%) rotate(var(--paw-r));
  animation: paw-trail-fade 1200ms var(--ease-pop) both;
  will-change: opacity;
}

@keyframes paw-trail-fade {
  0%   { opacity: 0; }
  18%  { opacity: 1; }
  47%  { opacity: 1; }
  100% { opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  /* `attach()` already self-gates on reduced-motion, but if a print
     somehow lands on a user who toggled the preference mid-session,
     skip the animation entirely instead of holding it at peak opacity. */
  .paw-trail-print { animation: none; opacity: 0; }
}
</style>
