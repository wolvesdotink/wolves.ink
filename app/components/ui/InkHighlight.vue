<script setup lang="ts">
/**
 * InkHighlight — a wrapper for the inline highlights in the Editor's
 * Note. Three flavours, each with its own micro-interaction:
 *
 *   - "stamp"   → solid block highlight (the magenta UX-driven pill).
 *                 On hover it cycles through the pop palette and a chunky
 *                 riso shadow stack snaps in behind it.
 *   - "wavy"    → wavy underline on text. The underline shimmies and the
 *                 text gets a tiny riso ghost on hover.
 *   - "lift"    → a flat-coloured word that lifts and gains a riso ghost
 *                 on hover, used for "learning" / "teaching".
 *
 * All three respect prefers-reduced-motion (no animations, just a clean
 * resting style).
 */

type Mode = 'stamp' | 'wavy' | 'lift'

const props = withDefaults(
  defineProps<{
    mode?: Mode
    tone?: 'magenta' | 'yellow' | 'orange' | 'cream'
  }>(),
  { mode: 'stamp', tone: 'magenta' },
)

const toneVar = computed(() => {
  switch (props.tone) {
    case 'yellow':  return 'var(--color-pop-yellow)'
    case 'orange':  return 'var(--color-pop-orange)'
    case 'cream':   return 'var(--color-cream)'
    case 'magenta':
    default:        return 'var(--color-pop-magenta)'
  }
})

// Anchor for the riso cursor's optional label
const labelText = computed(() => {
  if (props.mode === 'stamp') return 'Stamp'
  if (props.mode === 'wavy') return 'Open it'
  return 'Pick'
})
</script>

<template>
  <span
    class="ink-highlight"
    :class="[`ink-highlight--${mode}`, `ink-highlight--${tone}`]"
    :style="{ '--ink-tone': toneVar }"
    data-riso-target
    :data-riso-label="labelText"
    tabindex="0"
  >
    <span class="ink-highlight__inner"><slot /></span>
  </span>
</template>

<style scoped>
.ink-highlight {
  display: inline-block;
  position: relative;
  cursor: pointer;
  outline: none;
  transition: transform 320ms var(--ease-pop);
}

.ink-highlight__inner {
  position: relative;
  display: inline-block;
  transition:
    color 280ms ease-out,
    text-shadow 280ms var(--ease-pop),
    background-color 280ms ease-out;
}

/* ──────────────────────────────────────────────────────────────────
   STAMP — block-highlight pill (e.g. UX-driven on magenta)
   ────────────────────────────────────────────────────────────────── */

.ink-highlight--stamp .ink-highlight__inner {
  background: var(--ink-tone);
  color: var(--color-ink);
  padding: 0 0.35em;
  /* Tiny riso offset baseline so it always feels printed, not flat */
  box-shadow: 0.08em 0.08em 0 rgba(13, 12, 10, 0.18);
}

.ink-highlight--stamp:hover .ink-highlight__inner,
.ink-highlight--stamp:focus-visible .ink-highlight__inner {
  animation: stamp-flip 900ms steps(1, jump-none) infinite;
  box-shadow:
     0.18em  0.18em 0 var(--color-cream),
    -0.10em -0.10em 0 #5ec8e5,
     0.10em -0.06em 0 var(--color-pop-yellow);
  transform: translate(-1px, -1px);
}
.ink-highlight--stamp:hover,
.ink-highlight--stamp:focus-visible {
  transform: rotate(-1.2deg) scale(1.02);
}

@keyframes stamp-flip {
  0%   { background: var(--color-pop-magenta); color: var(--color-ink); }
  25%  { background: var(--color-pop-yellow);  color: var(--color-ink); }
  50%  { background: var(--color-pop-orange);  color: var(--color-ink); }
  75%  { background: #5ec8e5;                  color: var(--color-ink); }
  100% { background: var(--color-pop-magenta); color: var(--color-ink); }
}

/* ──────────────────────────────────────────────────────────────────
   WAVY — wavy-underlined text (e.g. open source)
   ────────────────────────────────────────────────────────────────── */

.ink-highlight--wavy .ink-highlight__inner {
  color: var(--ink-tone);
  /* Re-create the wavy underline so we can animate it (vs. relying on
     the static CSS text-decoration). 12px wide SVG tile = ~1 wave. */
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='6' viewBox='0 0 12 6'><path d='M0 3 Q 3 0 6 3 T 12 3' fill='none' stroke='currentColor' stroke-width='1.5'/></svg>");
  background-repeat: repeat-x;
  background-position: 0 100%;
  background-size: 12px 6px;
  padding-bottom: 8px;
}

.ink-highlight--wavy:hover .ink-highlight__inner,
.ink-highlight--wavy:focus-visible .ink-highlight__inner {
  animation: wavy-shimmy 1.4s linear infinite;
  text-shadow:
    -0.04em 0 0 var(--color-pop-magenta),
     0.04em 0 0 #5ec8e5;
}

@keyframes wavy-shimmy {
  from { background-position: 0 100%; }
  to   { background-position: 12px 100%; }
}

/* ──────────────────────────────────────────────────────────────────
   LIFT — a coloured word that lifts + ghosts on hover (learning /
   teaching). Solid colour at rest, riso ghost on hover.
   ────────────────────────────────────────────────────────────────── */

.ink-highlight--lift .ink-highlight__inner {
  color: var(--ink-tone);
}

.ink-highlight--lift:hover,
.ink-highlight--lift:focus-visible {
  transform: translateY(-2px) rotate(-1deg);
}
.ink-highlight--lift:hover .ink-highlight__inner,
.ink-highlight--lift:focus-visible .ink-highlight__inner {
  text-shadow:
     0.06em  0.06em 0 var(--color-pop-magenta),
    -0.04em -0.04em 0 #5ec8e5,
     0.06em -0.04em 0 var(--color-pop-yellow);
}

/* ──────────────────────────────────────────────────────────────────
   Reduced motion
   ────────────────────────────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .ink-highlight,
  .ink-highlight:hover,
  .ink-highlight:focus-visible,
  .ink-highlight__inner,
  .ink-highlight:hover .ink-highlight__inner,
  .ink-highlight:focus-visible .ink-highlight__inner {
    animation: none;
    transform: none;
  }
}
</style>
