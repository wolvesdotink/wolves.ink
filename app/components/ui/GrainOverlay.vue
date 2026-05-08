<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    /** 0–100 — overlay opacity in percent */
    intensity?: number
  }>(),
  { intensity: 18 },
)

const overlayStyle = computed(() => {
  const svg =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      "<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.92' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='matrix' values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>",
    )
  return {
    opacity: props.intensity / 100,
    backgroundImage: `url("${svg}")`,
    backgroundSize: '200px 200px',
  }
})
</script>

<template>
  <div
    class="pointer-events-none fixed inset-0 z-[60] mix-blend-overlay"
    :style="overlayStyle"
    aria-hidden="true"
  />
</template>
