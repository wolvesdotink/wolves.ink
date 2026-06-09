<script setup lang="ts">
/**
 * InkHighlight — the inline highlights in the hero's "Editor's Note", and
 * the studio VALUES you can click. Three hover flavours, and a click payoff:
 *
 *   - "stamp"  → the magenta UX-driven pill. Hover cycles the pop palette.
 *   - "wavy"   → the yellow "open source." underline that shimmies.
 *   - "lift"   → the orange "learning" / "teaching." words that lift.
 *
 * CLICK opens a small ValueCard right beside the word — one short, memorable
 * line about that value (copy in site.ts → quotes.values). A click first
 * fires the tactile "ka-chunk" (press punch + chromatic registration kick +
 * ring bloom); the card blooms out of the dissipating ring. Only ONE card is
 * open at a time (useInkProof); open all four this visit and the hover labels
 * turn knowing ("you already did" — useColophon).
 *
 * Conflict-safe: the punch lives on the `.ink-highlight__press` layer and the
 * kick/ring on a separate `.ink-burst` layer (neither touches the hover-owned
 * animation/text-shadow/transform); the card is a third sibling. SSR-safe:
 * the burst and the card only mount post-click. Reduced motion: the punch +
 * burst are swapped for a quiet tone flash, but the card still develops (in
 * its printed end-state).
 */
import { site } from '~/data/site'

type Mode = 'stamp' | 'wavy' | 'lift'

const props = withDefaults(
  defineProps<{
    mode?: Mode
    tone?: 'magenta' | 'yellow' | 'orange' | 'cream'
    /** Override the riso-cursor hover label; defaults to a per-mode line. */
    label?: string
    /** For mode="lift": picks the learning vs teaching card. */
    relay?: 'learn' | 'teach'
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

const inkProof = useInkProof()
const { allFound } = useColophon()

/** Which value this word is — keys the single-open slot and the card copy. */
const proofKey = computed<'ux' | 'open' | 'learn' | 'teach'>(() => {
  if (props.mode === 'stamp') return 'ux'
  if (props.mode === 'wavy') return 'open'
  return (props.relay ?? 'learn') === 'teach' ? 'teach' : 'learn'
})
const isOpen = computed(() => inkProof.openId.value === proofKey.value)
const card = computed(() => site.quotes.values[proofKey.value])

/**
 * The riso cursor's hover label. House voice: punchy lowercase imperatives,
 * each themed to the word and inviting the click. Once you've read all four
 * value cards this visit, every label turns knowing.
 */
const labelText = computed(() => {
  if (allFound.value) return site.quotes.labelDone
  if (props.label) return props.label
  if (props.mode === 'wavy') return 'fork it'
  if (props.mode === 'lift') return 'pass it on'
  return 'ship it'
})

/* ----------------------------------------------------------------------
   The click "ka-chunk" (the trigger beat) + the card placement.
   pressTick alternates two identical keyframes for a clean restart;
   burstKey remounts the burst layer so it replays. proofX is a measured
   horizontal offset so the word-anchored card never spills past the
   viewport edge (the cover section is overflow-hidden).
   ---------------------------------------------------------------------- */
const rootEl = ref<HTMLElement | null>(null)
const pressTick = ref(0)
const isBursting = ref(false)
const burstKey = ref(0)
const acked = ref(false)
const proofX = ref(0)
let burstTimer: ReturnType<typeof setTimeout> | undefined
let ackTimer: ReturnType<typeof setTimeout> | undefined

const pressClass = computed(() => {
  if (pressTick.value === 0) return ''
  return pressTick.value % 2 === 1 ? 'is-press-a' : 'is-press-b'
})

/** Keep the card inside the viewport: shift it left by any right overflow. */
function placeCard() {
  const root = rootEl.value
  if (!root || typeof window === 'undefined') return
  const r = root.getBoundingClientRect()
  const vw = window.innerWidth
  const pad = 16
  const cardW = Math.min(18 * 16, vw - 2 * pad)
  let x = 0
  if (r.left + cardW > vw - pad) x = vw - pad - cardW - r.left
  if (r.left + x < pad) x = pad - r.left
  proofX.value = x
}

function fire() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    flash() // quiet tactile ack instead of the press/burst theatrics
  }
  else {
    pressTick.value++
    isBursting.value = true
    burstKey.value++
    clearTimeout(burstTimer)
    burstTimer = setTimeout(() => { isBursting.value = false }, 520)
  }
  placeCard()
  inkProof.open(proofKey.value) // the card develops in both motion modes
}

function closeCard() {
  inkProof.close(proofKey.value)
  nextTick(() => rootEl.value?.focus({ preventScroll: true }))
}

/** Reduced-motion path: a single, brief brighten of the word's ink. */
function flash() {
  acked.value = true
  clearTimeout(ackTimer)
  ackTimer = setTimeout(() => { acked.value = false }, 220)
}

function onKey(e: KeyboardEvent) {
  if (e.repeat) return // a held key shouldn't machine-gun the stamp
  if (e.key === 'Enter') {
    fire()
  }
  else if (e.key === ' ' || e.key === 'Spacebar') {
    e.preventDefault() // Space would otherwise scroll the page
    fire()
  }
}

onBeforeUnmount(() => {
  clearTimeout(burstTimer)
  clearTimeout(ackTimer)
  // Release the slot if we own it, so navigating away never strands it open.
  inkProof.close(proofKey.value)
})
</script>

<template>
  <span
    ref="rootEl"
    class="ink-highlight"
    :class="[`ink-highlight--${mode}`, `ink-highlight--${tone}`, { 'is-acked': acked, 'is-open': isOpen }]"
    :style="{ '--ink-tone': toneVar }"
    data-riso-target
    :data-riso-label="labelText"
    role="button"
    :aria-expanded="isOpen"
    tabindex="0"
    @click="fire"
    @keydown="onKey"
  >
    <span class="ink-highlight__press" :class="pressClass">
      <span class="ink-highlight__inner"><slot /></span>
    </span>

    <!-- Click-only riso impact: registration kick (two screen-blended ink
         bars) + a blooming registration ring. Mounts only after a click,
         keyed so it replays every time. Decorative + SSR-inert. -->
    <span
      v-if="isBursting"
      :key="burstKey"
      class="ink-burst"
      aria-hidden="true"
    >
      <span class="ink-burst__reg ink-burst__reg--y" />
      <span class="ink-burst__reg ink-burst__reg--c" />
      <span class="ink-burst__ring" />
    </span>

    <!-- The payoff: a small card right beside this word. -->
    <ValueCard
      v-if="isOpen"
      :eyebrow="card.eyebrow"
      :line="card.line"
      :accent="toneVar"
      :style="{ '--proof-x': `${proofX}px` }"
      @close="closeCard"
    />
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
    background-color 280ms ease-out,
    /* drives the reduced-motion click acknowledgement (.is-acked) */
    filter 180ms ease-out;
}

/* While this word's card is open: lift its stacking context above the
   sibling words so the card (an absolute child) can't be trapped underneath
   a later word, and hold the word still (drop the hover wobble) so the card
   sits straight rather than inheriting the tilt/scale. The `:hover` /
   `:focus-visible` variants out-specify the per-mode hover transforms. */
.ink-highlight.is-open {
  z-index: 40;
}
.ink-highlight.is-open,
.ink-highlight.is-open:hover,
.ink-highlight.is-open:focus-visible {
  transform: none;
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
   CLICK — the press "ka-chunk"

   PRESS LAYER. A new transform context between the outer (hover
   transform) and the inner (hover animation), so the punch never
   collides with either. Two identical keyframes alternated by pressTick
   guarantee a clean restart on every click; both rest at scale(1).
   ────────────────────────────────────────────────────────────────── */
.ink-highlight__press {
  display: inline-block;
}
.ink-highlight__press.is-press-a { animation: ink-press-a 360ms var(--ease-pop) both; }
.ink-highlight__press.is-press-b { animation: ink-press-b 360ms var(--ease-pop) both; }

@keyframes ink-press-a {
  0%   { transform: scale(1) translateY(0); }
  22%  { transform: scale(0.9) translateY(1px); }   /* the plate hits */
  55%  { transform: scale(1.05) translateY(-0.5px); } /* the "ka" rebound */
  100% { transform: scale(1) translateY(0); }
}
/* Byte-identical to -a — a second name is the cheapest reliable way to
   force the animation to restart on a repeat click. */
@keyframes ink-press-b {
  0%   { transform: scale(1) translateY(0); }
  22%  { transform: scale(0.9) translateY(1px); }
  55%  { transform: scale(1.05) translateY(-0.5px); }
  100% { transform: scale(1) translateY(0); }
}

/* BURST LAYER — registration kick + ring, painted above the inner. */
.ink-burst {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
}
.ink-burst__reg {
  position: absolute;
  inset: 0;
  border-radius: 0.12em;
  opacity: 0;
  mix-blend-mode: screen;
}
.ink-burst__reg--y {
  background: var(--color-pop-yellow);
  animation: ink-reg-y 380ms var(--ease-pop) both;
}
.ink-burst__reg--c {
  background: #5ec8e5;
  animation: ink-reg-c 380ms var(--ease-pop) both;
}
@keyframes ink-reg-y {
  0%   { opacity: 0;   transform: translate(0, 0); }
  16%  { opacity: 0.6; transform: translate(3px, 2px); }
  100% { opacity: 0;   transform: translate(0, 0); }
}
@keyframes ink-reg-c {
  0%   { opacity: 0;   transform: translate(0, 0); }
  16%  { opacity: 0.6; transform: translate(-3px, -1px); }
  100% { opacity: 0;   transform: translate(0, 0); }
}

.ink-burst__ring {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 1.4em;
  height: 1.4em;
  border-radius: 999px;
  border: 2px solid var(--ink-tone);
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.4);
  animation: ink-ring-bloom 460ms var(--ease-pop) both;
}
@keyframes ink-ring-bloom {
  0%   { opacity: 0.7; transform: translate(-50%, -50%) scale(0.4); box-shadow: 0 0 0 0 transparent; }
  55%  { opacity: 0.5; box-shadow: 0 0 0 6px color-mix(in srgb, var(--ink-tone) 16%, transparent); }
  100% { opacity: 0;   transform: translate(-50%, -50%) scale(1.3); box-shadow: 0 0 0 0 transparent; }
}

/* Reduced-motion click acknowledgement: a brief brighten of the word's
   ink (a tone change, not motion) — only ever set on the reduced path. */
.ink-highlight.is-acked .ink-highlight__inner {
  filter: brightness(1.35);
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
  /* The click skips the punch + burst entirely; neutralise defensively. */
  .ink-highlight__press.is-press-a,
  .ink-highlight__press.is-press-b {
    animation: none;
    transform: none;
  }
  .ink-burst,
  .ink-burst__reg,
  .ink-burst__ring {
    animation: none;
    opacity: 0;
  }
}
</style>
