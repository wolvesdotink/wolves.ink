<script setup lang="ts">
/**
 * ScrollProgress — the hazard-tape rule under the header. The track holds
 * a low-opacity copy of the tape pattern so the rule reads as a fully
 * patterned line at any scroll position, while the foreground stripe
 * fills horizontally as the page scrolls.
 *
 * Designed to slot in wherever a thin horizontal rule belongs — the
 * parent owns positioning. The header places it as its bottom rule.
 */

const progress = ref(0)
let raf = 0

function update() {
  const h = document.documentElement
  const total = h.scrollHeight - h.clientHeight
  if (total <= 0) {
    progress.value = 0
    return
  }
  const next = Math.min(1, Math.max(0, h.scrollTop / total))
  progress.value = next
}

function onScroll() {
  cancelAnimationFrame(raf)
  raf = requestAnimationFrame(update)
}

onMounted(() => {
  update()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
})
</script>

<template>
  <div
    class="scroll-progress relative h-1 w-full overflow-hidden"
    role="progressbar"
    aria-label="Page scroll progress"
    :aria-valuenow="Math.round(progress * 100)"
    aria-valuemin="0"
    aria-valuemax="100"
  >
    <!-- Track: dim tape, always visible so the line never disappears -->
    <div class="scroll-progress__track absolute inset-0 tape-stripes" aria-hidden="true" />
    <!-- Fill: bright tape that scales from the left as you scroll -->
    <div
      class="scroll-progress__fill absolute inset-0 tape-stripes"
      :style="{ transform: `scaleX(${progress})` }"
      aria-hidden="true"
    />
  </div>
</template>

<style scoped>
.scroll-progress {
  /* Establishes the stacking context for the two layers */
  background: var(--color-ink-deep);
}

.scroll-progress__track {
  /* Dim version of the tape pattern — the rule still reads as a tape
     stripe even when scroll progress is at 0. */
  opacity: 0.18;
}

.scroll-progress__fill {
  transform-origin: 0 50%;
  will-change: transform;
  transition: transform 80ms linear;
  opacity: 0.95;
}

@media (prefers-reduced-motion: reduce) {
  .scroll-progress__fill {
    transition: transform 0ms;
  }
}
</style>
