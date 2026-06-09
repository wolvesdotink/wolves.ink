<script setup lang="ts">
/**
 * RewildPlot — "The Fence Comes Down" (nature / rewilding egg).
 *
 * Sits in the cover section's right column, where four floating sticker
 * cards used to live. At rest it's a small riso plot of land, enclosed:
 * a wire fence (a "∅" sign hung on it), neat identical rows of a
 * monoculture behind it, a couple of tilled furrows under a cold
 * starlit night. Quiet, orderly, lifeless — captioned "A fenced plot —
 * for now."
 *
 * Tear the fence down — one click, or Enter/Space on the plot — and the
 * land comes back: the fence topples, the rows wither, grass draws up,
 * wildflowers open, a forest grows, the moon sets as the sun rises, and
 * birds drift in. A short set of house rules for the wild then prints
 * over the reclaimed land:
 *
 *     Tear down the fence — the land knows the way home.
 *       · Keep the forests standing.
 *       · Eat lower. Go vegan.
 *       · Take only what grows back.
 *     Rewild the rest.
 *
 * It's a wolf studio making a vegan point — the irony is the argument:
 * a wolf kills because it must; we have a choice. The single magenta
 * full stop on "Rewild the rest." is the whole color budget on the
 * payoff line, the same restraint the not-all-men plate uses.
 *
 * DESIGN NOTES — patterns borrowed from the other eggs on this page:
 *
 * - One-way, and persistent for the visit. `useRewilded()` is a
 *   module-level ref (see useRichFired / usePridePins): wander to
 *   /projects and back and the fence stays down. Discovered politics
 *   don't un-discover; the land doesn't re-fence itself. A full reload
 *   re-arms the fence so the discovery returns next visit.
 *
 * - SSR / hydration safe. The server always renders the fenced rest
 *   state; `rewilded` only ever flips client-side, post-click. On a
 *   return navigation where it's already true, the scene renders in its
 *   grown end-state with NO entrance replay: the cascade is driven by
 *   CSS *transitions* (which never fire on initial mount, only on the
 *   class flip), and the statement plate's reveal delay is gated behind
 *   `is-playing` (set only when THIS mount tore the fence down) so a
 *   return visit shows the plate at once instead of waiting on it.
 *
 * - Reduced motion. The whole cascade is CSS — transitions on the scene,
 *   a keyframe stagger on the statement lines — so a single media query
 *   cuts straight to the grown field + full statement, no JS branch. The
 *   click still does its thing; only the theatrics are skipped.
 *
 * - A real <button> carries the gesture (keyboard + click for free, no
 *   synthetic keydown handlers), labelled for AT; the SVG is decorative
 *   (aria-hidden) and the statement is announced once through a polite
 *   live region. `data-riso-label` feeds the custom cursor its hint.
 */

import { site } from '~/data/site'

/** Copy lives in site.ts alongside the other house statements. */
const copy = site.quotes.rewild

const rewilded = useRewilded()

/**
 * True only for the mount that performed the teardown — gates the
 * statement's entrance choreography so a return navigation (where
 * `rewilded` is already true) shows the words at rest instead of
 * re-developing them. The scene itself needs no such guard: its
 * transitions can't fire on an already-`is-wild` initial mount.
 */
const justRewilded = ref(false)
const statementEl = ref<HTMLElement | null>(null)
const live = ref('')

function teardown(ev?: MouseEvent) {
  if (rewilded.value) return
  // A pointer click that ends a text-selection drag across the plot is
  // not a teardown — let the selection stand. Keyboard/AT activation
  // arrives as a click with detail === 0 and must always fire, even if
  // some unrelated selection exists elsewhere on the page (mirrors the
  // guard in HeroDisplay's pin ritual).
  if (ev && ev.detail !== 0) {
    const sel = typeof window !== 'undefined' ? window.getSelection() : null
    if (sel && !sel.isCollapsed) return
  }

  rewilded.value = true
  justRewilded.value = true
  // One combined line — the headline and every rule reach a screen
  // reader together, in reading order, the moment the fence drops.
  live.value = copy.live
  nextTick(() => statementEl.value?.focus({ preventScroll: true }))
}

/* ----------------------------------------------------------------------
   Scene data — kept here rather than as 30 hand-typed SVG nodes so the
   template stays legible and the stagger delays read as a sequence.
   Coordinates live in the 0 0 400 280 viewBox; the ground line is y=188.
   `d` is the per-element animation delay in ms (--d), tuned so the fence
   falls first and the growth climbs in; the statement plate prints after.
   ---------------------------------------------------------------------- */

interface Blade { x: number, h: number, bend: number, green?: boolean, d: number }
const grasses: Blade[] = [
  { x: 22, h: 30, bend: 5, d: 220 },
  { x: 40, h: 44, bend: -4, green: true, d: 300 },
  { x: 92, h: 26, bend: 4, d: 360 },
  { x: 110, h: 38, bend: 6, green: true, d: 420 },
  { x: 134, h: 30, bend: -5, d: 320 },
  { x: 178, h: 46, bend: 4, green: true, d: 500 },
  { x: 200, h: 28, bend: -4, d: 560 },
  { x: 224, h: 36, bend: 5, d: 460 },
  { x: 286, h: 32, bend: -5, green: true, d: 620 },
  { x: 308, h: 44, bend: 4, d: 540 },
  { x: 336, h: 26, bend: 6, d: 700 },
  { x: 374, h: 36, bend: -5, green: true, d: 660 },
]
/** Quadratic blade — base on the ground line, leaning into its bend. */
function blade(g: Blade): string {
  return `M ${g.x} 188 Q ${g.x + g.bend} ${188 - g.h * 0.55} ${g.x + g.bend} ${188 - g.h}`
}

// `cls` is a fill class (paint via CSS, not a presentation attribute —
// var() doesn't resolve inside SVG attributes).
interface Flower { x: number, h: number, cls: string, d: number }
const flowers: Flower[] = [
  { x: 78, h: 30, cls: 'f-magenta', d: 720 },
  { x: 126, h: 24, cls: 'f-yellow', d: 820 },
  { x: 196, h: 34, cls: 'f-orange', d: 900 },
  { x: 264, h: 26, cls: 'f-magenta', d: 980 },
  { x: 300, h: 32, cls: 'f-yellow', d: 880 },
  { x: 360, h: 24, cls: 'f-orange', d: 1060 },
]

interface Bird { x: number, y: number, d: number }
const birds: Bird[] = [
  { x: 96, y: 54, d: 1240 },
  { x: 132, y: 44, d: 1380 },
  { x: 156, y: 62, d: 1320 },
]
</script>

<template>
  <figure
    class="rewild-plot"
    :class="{ 'is-wild': rewilded, 'is-playing': justRewilded }"
  >
    <!-- The plot. Crop-mark corners frame it like the rest of the
         print-shop motif (footer, held-plate). The SVG is decorative;
         the button over it carries the gesture and the label. -->
    <div class="rw-frame">
      <span class="rw-corner rw-corner--tl" aria-hidden="true" />
      <span class="rw-corner rw-corner--tr" aria-hidden="true" />
      <span class="rw-corner rw-corner--bl" aria-hidden="true" />
      <span class="rw-corner rw-corner--br" aria-hidden="true" />

      <svg
        class="rw-svg"
        viewBox="0 0 400 280"
        fill="none"
        aria-hidden="true"
      >
        <!-- SKY (wild) — a sun that rises, then birds. -->
        <g class="w-sun wild-el" style="--d: 150">
          <circle cx="322" cy="60" r="22" class="f-sun" />
          <g class="rw-rays s-yellow" stroke-width="2.4" stroke-linecap="round">
            <line x1="322" y1="22" x2="322" y2="30" />
            <line x1="356" y1="40" x2="350" y2="45" />
            <line x1="288" y1="40" x2="294" y2="45" />
            <line x1="364" y1="74" x2="356" y2="74" />
            <line x1="280" y1="74" x2="288" y2="74" />
          </g>
        </g>
        <path
          v-for="(b, i) in birds"
          :key="`bird-${i}`"
          class="w-bird wild-el s-bird"
          :style="{ '--d': b.d }"
          :d="`M ${b.x} ${b.y} q 5 -5 10 0 q 5 -5 10 0`"
          stroke-width="2"
          stroke-linecap="round"
        />

        <!-- REST sky — a cold moon and a scatter of stars fill the night
             over the enclosed plot; they set as the sun rises on rewild. -->
        <g class="t-sky tame-el">
          <circle cx="314" cy="58" r="13" class="f-cream-dim" />
          <circle cx="320" cy="53" r="11" class="f-ink" />
          <g class="f-cream-dim">
            <circle cx="56" cy="46" r="2.1" />
            <circle cx="118" cy="72" r="1.5" />
            <circle cx="172" cy="38" r="2.3" />
            <circle cx="236" cy="64" r="1.6" />
            <circle cx="96" cy="106" r="1.6" />
            <circle cx="206" cy="100" r="2" />
            <circle cx="270" cy="42" r="1.5" />
          </g>
        </g>

        <!-- A forest comes back — keep the forests standing. -->
        <g class="w-tree wild-el rw-grow" style="--d: 300">
          <rect x="61" y="146" width="6" height="42" rx="2" class="f-trunk" />
          <circle cx="64" cy="138" r="22" class="f-leaf" />
          <circle cx="49" cy="150" r="14" class="f-leaf" />
          <circle cx="80" cy="150" r="15" class="f-leaf" />
        </g>
        <g class="w-tree wild-el rw-grow" style="--d: 520">
          <rect x="345" y="160" width="5" height="28" rx="2" class="f-trunk" />
          <circle cx="347" cy="150" r="15" class="f-leaf" />
          <circle cx="336" cy="159" r="10" class="f-leaf" />
        </g>

        <!-- Ground line — neutral, present in both states. -->
        <line x1="8" y1="188" x2="392" y2="188" class="s-ground" stroke-width="1.4" />

        <!-- TAME — the furrows, the monoculture, the fence. All fade and
             fall away as the wild comes in. -->
        <g class="t-furrow tame-el s-furrow" stroke-width="1.4" stroke-dasharray="4 7">
          <line x1="40" y1="196" x2="360" y2="196" />
          <line x1="64" y1="204" x2="336" y2="204" />
        </g>
        <g class="t-crops tame-el">
          <g v-for="cx in [60, 108, 156, 204, 252, 300]" :key="`crop-${cx}`">
            <line :x1="cx" y1="186" :x2="cx" y2="156" class="s-cream-dim" stroke-width="2" stroke-linecap="round" />
            <ellipse :cx="cx" cy="152" rx="3.5" ry="7.5" class="f-cream-dim" />
          </g>
        </g>
        <g class="t-fence tame-el">
          <!-- posts -->
          <g class="f-cream">
            <rect v-for="px in [28, 126, 224, 322]" :key="`post-${px}`" :x="px" y="206" width="4" height="52" rx="1" />
          </g>
          <!-- wires -->
          <g class="s-cream" stroke-width="1.6">
            <line x1="22" y1="216" x2="358" y2="216" />
            <line x1="22" y1="230" x2="358" y2="230" />
            <line x1="22" y1="244" x2="358" y2="244" />
          </g>
          <!-- barbs — a twist of wire on each strand -->
          <g class="s-cream" stroke-width="1.4" opacity="0.85">
            <path d="M67 213 l6 6 M73 213 l-6 6" />
            <path d="M183 227 l6 6 M189 227 l-6 6" />
            <path d="M283 241 l6 6 M289 241 l-6 6" />
          </g>
          <!-- a "keep out" sign — the land, declared off-limits -->
          <g class="rw-sign">
            <rect x="156" y="208" width="34" height="24" rx="2" class="f-ink-soft s-cream" stroke-width="1.4" />
            <circle cx="173" cy="220" r="7" fill="none" class="s-magenta" stroke-width="2" />
            <line x1="168" y1="225" x2="178" y2="215" class="s-magenta" stroke-width="2" />
          </g>
        </g>

        <!-- WILD growth — grass draws up, wildflowers open. -->
        <path
          v-for="(g, i) in grasses"
          :key="`grass-${i}`"
          class="w-grass wild-el"
          :class="g.green ? 's-leaf' : 's-cream'"
          :style="{ '--d': g.d }"
          :d="blade(g)"
          stroke-width="2.2"
          stroke-linecap="round"
        />
        <g
          v-for="(f, i) in flowers"
          :key="`flower-${i}`"
          class="w-flower wild-el rw-grow"
          :style="{ '--d': f.d }"
        >
          <line :x1="f.x" y1="188" :x2="f.x" :y2="188 - f.h" class="s-leaf" stroke-width="1.8" stroke-linecap="round" />
          <circle :cx="f.x" :cy="188 - f.h" r="4.2" :class="f.cls" />
          <circle :cx="f.x" :cy="188 - f.h" r="1.6" class="f-ink" />
        </g>

      </svg>

      <!-- The statement develops as a plate OVER the rewilded land (the
           not-all-men plate's move) — so it adds NO height to the figure
           and the teardown can't shift anything below it. role="group" +
           a short name means handing focus here announces only that name;
           the full statement is read once, by the polite live region. -->
      <div
        ref="statementEl"
        class="rw-overlay"
        tabindex="-1"
        role="group"
        aria-label="The land, rewilded"
        :aria-hidden="rewilded ? undefined : 'true'"
      >
        <p class="rw-headline">
          {{ copy.headline }}
          <span class="rw-headline-soft text-editorial">{{ copy.headlineSoft }}</span>
        </p>
        <ul class="rw-rules">
          <li v-for="(rule, i) in copy.rules" :key="i" class="text-mono-meta">{{ rule }}</li>
        </ul>
        <p class="rw-slogan text-editorial">
          {{ copy.slogan }}<span class="text-pop-magenta">.</span>
        </p>
      </div>

      <!-- The gesture. Removed once the fence is down — it's one-way, so
           there's nothing left to press. Focus is handed to the
           statement in `teardown()`. -->
      <button
        v-if="!rewilded"
        type="button"
        class="rw-trigger"
        data-riso-target
        data-riso-label="tear it down"
        aria-label="A fenced monoculture plot. Activate to tear down the fence and let the land rewild."
        @click="teardown"
      />
    </div>

    <!-- Resting caption — one line, always present (fades out as the plate
         develops) so the figure's height is identical in both states. -->
    <div class="rw-caption">
      <p
        class="rw-hint text-editorial"
        :aria-hidden="rewilded ? 'true' : undefined"
      >
        {{ copy.hintPre }} <span class="rw-hint-soft">{{ copy.hintSoft }}</span>
      </p>
    </div>

    <!-- The teardown narrates itself once, in reading order. -->
    <span class="sr-only" aria-live="polite">{{ live }}</span>
  </figure>
</template>

<style scoped>
.rewild-plot {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  /* A prominent plate that fills the margin column. The statement
     develops OVER the scene (see .rw-overlay), so this width drives the
     scene size without ever adding height for the words. */
  max-width: 30rem;
}

/* ── Frame + crop marks ──────────────────────────────────────────── */
.rw-frame {
  position: relative;
  padding: 0.4rem;
  /* Floor so the statement plate still fits on very narrow screens, where
     the width-driven SVG height would otherwise fall below it. No effect
     on desktop (the aspect-driven height is taller than this). */
  min-height: 13rem;
}
.rw-svg {
  display: block;
  width: 100%;
  height: auto;
}
.rw-corner {
  position: absolute;
  width: 12px;
  height: 12px;
  border-color: rgb(241 233 216 / 0.28);
  border-style: solid;
  border-width: 0;
  transition: border-color 480ms var(--ease-pop);
}
.rw-corner--tl { top: 0; left: 0; border-top-width: 1.5px; border-left-width: 1.5px; }
.rw-corner--tr { top: 0; right: 0; border-top-width: 1.5px; border-right-width: 1.5px; }
.rw-corner--bl { bottom: 0; left: 0; border-bottom-width: 1.5px; border-left-width: 1.5px; }
.rw-corner--br { bottom: 0; right: 0; border-bottom-width: 1.5px; border-right-width: 1.5px; }
.is-wild .rw-corner { border-color: rgb(0 169 92 / 0.4); }

/* The trigger sits over the picture only (not the caption). Transparent;
   the global :focus-visible ring frames the plot on keyboard focus. */
.rw-trigger {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}

/* SVG paint via classes — var() does NOT resolve inside SVG presentation
   attributes (fill="…"/stroke="…"), only inside CSS declarations, so all
   colour lives here. Geometry (stroke-width, dash, opacity) stays on the
   elements as plain attributes. */
.f-cream { fill: var(--color-cream); }
.f-cream-dim { fill: var(--color-cream-dim); }
.f-ink { fill: var(--color-ink); }
.f-ink-soft { fill: var(--color-ink-soft); }
.f-trunk { fill: var(--color-bone); }
.f-leaf { fill: var(--color-pop-green); }
.f-sun { fill: rgb(255 233 78 / 0.92); }
.f-magenta { fill: var(--color-pop-magenta); }
.f-yellow { fill: var(--color-pop-yellow); }
.f-orange { fill: var(--color-pop-orange); }

.s-cream { stroke: var(--color-cream); }
.s-cream-dim { stroke: var(--color-cream-dim); }
.s-leaf { stroke: var(--color-pop-green); }
.s-yellow { stroke: var(--color-pop-yellow); }
.s-magenta { stroke: var(--color-pop-magenta); }
.s-ground { stroke: rgb(241 233 216 / 0.28); }
.s-furrow { stroke: rgb(241 233 216 / 0.16); }
.s-bird { stroke: rgb(241 233 216 / 0.7); }

/* ── The cascade ─────────────────────────────────────────────────────
   Driven by CSS transitions on the `.is-wild` flip, so nothing fires on
   an already-wild initial mount (return navigation). Per-element
   `--d` (ms) staggers the sequence. ──────────────────────────────── */

/* Wild elements: hidden at rest, revealed on teardown. The shared rule
   sets opacity + the transition; per-type rules below set the resting
   transform (grow-from-base, walk-in, rise). */
.wild-el {
  opacity: 0;
  transition:
    opacity 700ms var(--ease-pop),
    transform 900ms var(--ease-pop);
  transition-delay: calc(var(--d, 0) * 1ms);
}
.is-wild .wild-el {
  opacity: 1;
  transform: none;
}

/* Grow from the ground line. transform-box: fill-box resolves the origin
   against each element's own bbox — rock-solid on <path> (grass) for
   years, and on <g> groups (trees/flowers/crops) from Safari/iOS 16.4
   (Mar 2023) on. That 16.4 floor is the intentional support target: the
   cascade is the only thing that relies on it, and it fires solely on the
   teardown click — the SSR rest state and the return-nav end-state both
   render transform:none and anchor correctly on every browser. */
.w-grass,
.w-flower,
.rw-grow {
  transform-box: fill-box;
  transform-origin: 50% 100%;
}
.w-grass { transform: scaleY(0); }
.w-flower,
.rw-grow { transform: scale(0); }

/* Sun rises; birds drift in from the left (translate in the SVG's own
   user units). */
.w-sun { transform: translateY(20px); }
.w-bird { transform: translateX(-10px); }

/* Tame elements: fall and fade as the wild arrives. */
.tame-el {
  transition:
    opacity 620ms var(--ease-pop),
    transform 760ms var(--ease-pop);
}
.t-crops {
  transform-box: fill-box;
  transform-origin: 50% 100%;
}
.is-wild .t-sky { opacity: 0; }
.is-wild .t-furrow { opacity: 0; }
.is-wild .t-crops { opacity: 0; transform: scaleY(0.25); }
.t-fence {
  transform-box: fill-box;
  transform-origin: 0% 100%;
}
.is-wild .t-fence {
  opacity: 0;
  transform: translateY(24px) rotate(-6deg);
}

/* Affordance: while still fenced, hovering or focusing the plot tips the
   fence — it wants to come down. */
.rewild-plot:not(.is-wild) .rw-frame:hover .t-fence,
.rewild-plot:not(.is-wild):focus-within .t-fence {
  transform: rotate(-1.6deg) translateY(2px);
}

/* ── Statement overlay — the plate that develops over the land ────────
   Absolutely positioned over the scene, so it adds no flow height: the
   figure is the same height fenced or rewilded, and a teardown never
   reflows the page. Ink scrim over the (still faintly visible) wild
   scene, cream text — the page's own palette, printed over the land. */
.rw-overlay {
  position: absolute;
  inset: 0.4rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 1rem 1.15rem;
  background: rgb(13 12 10 / 0.85);
  opacity: 0;
  pointer-events: none;
  transition: opacity 700ms var(--ease-pop);
}
.is-wild .rw-overlay {
  opacity: 1;
  pointer-events: auto;
}
/* Fresh teardown: hold the plate back so the land visibly rewilds first,
   THEN the words print over it. A return visit (not is-playing) shows the
   plate immediately. */
.is-wild.is-playing .rw-overlay {
  transition-delay: 1200ms;
}
.rw-overlay:focus { outline: none; } /* focus target for choreography */

/* ── Resting caption ──────────────────────────────────────────────────
   One line, always present (fades out as the plate develops) so the
   figure height never changes. */
.rw-hint {
  font-size: 1rem;
  color: rgb(241 233 216 / 0.6);
  transition: opacity 420ms var(--ease-pop);
}
.is-wild .rw-hint { opacity: 0; }
/* 0.55 alpha clears WCAG AA on ink (~5.4:1) while staying dimmer than
   the 0.6 lead-in, so the hierarchy holds. */
.rw-hint-soft { color: rgb(241 233 216 / 0.55); }

.rw-headline {
  font-family: var(--font-display);
  text-transform: uppercase;
  letter-spacing: -0.015em;
  line-height: 0.98;
  font-size: clamp(1.2rem, 2.8vw, 1.6rem);
  color: var(--color-cream);
}
.rw-headline-soft {
  display: block;
  margin-top: 0.25rem;
  text-transform: none;
  font-size: clamp(0.95rem, 2.1vw, 1.15rem);
  line-height: 1.12;
  color: rgb(241 233 216 / 0.78);
}

.rw-rules {
  margin-top: 0.7rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.rw-rules li {
  position: relative;
  padding-left: 1.1rem;
  color: rgb(241 233 216 / 0.85);
}
/* A small riso "leaf" bullet, instead of a disc. */
.rw-rules li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.28em;
  width: 0.55rem;
  height: 0.55rem;
  background: var(--color-pop-green);
  border-radius: 0 100% 0 100%;
  transform: rotate(-12deg);
}

.rw-slogan {
  margin-top: 0.7rem;
  font-size: clamp(1.1rem, 2.5vw, 1.4rem);
  line-height: 1;
  color: var(--color-cream);
}

/* ── Reduced motion ──────────────────────────────────────────────────
   The teardown still happens; only the theatrics are skipped. The scene
   snaps to its grown end-state, the lines land at once, the fence-tip
   affordance is dropped. ─────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .wild-el,
  .tame-el,
  .rw-hint,
  .rw-overlay {
    transition: none;
  }
  .rewild-plot:not(.is-wild) .rw-frame:hover .t-fence,
  .rewild-plot:not(.is-wild):focus-within .t-fence {
    transform: none;
  }
}
</style>
