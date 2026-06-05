<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    /** The whole word, e.g. "WOLVES" */
    word?: string
  }>(),
  {
    word: 'WOLVES',
  },
)

const letters = computed(() => props.word.split(''))

// Mouse-tracked highlight. No letter is highlighted at rest —
// the bold color slam only appears on the hovered/focused letter.
const hoveredIndex = ref<number | null>(null)
const activeIndex = computed(() => hoveredIndex.value)

/**
 * Six pins — the pride easter egg.
 *
 * Each letter can be pinned like a jacket: click (or Enter/Space — the
 * letters already carry tabindex=0) pushes a small enamel pin-back
 * button into the letter's shoulder, one flag stripe per letter, any
 * order. The sixth pin fires the second ink pass: a quick CMYK
 * misregistration shimmer crosses the wordmark and WOLVES floods
 * stripe-by-stripe into the six flag colors. Four of those inks the
 * site already owned — pride only adds riso green and riso violet.
 * Unpinning any letter folds the takeover back; celebratory,
 * reversible, never a trap.
 *
 * Shared state lives in `usePridePins` because the completion effects
 * reach far outside this component (footer colophon, paw trail gait,
 * ticker, second marquee, html.egg-pride ambient pass).
 */
const { pinned, pinnedCount, prideOn, togglePin, pinAll, unpinAll, attachPrideClass } = usePridePins()

/** Deterministic per-letter pin tilts — like they went through denim. */
const PIN_TILTS = [-12, 9, -8, 14, -10, 11] as const

/** Pin SVGs inherit their stripe via --pin-color (see PRIDE_STRIPES). */
const pinStyle = (i: number) => ({
  '--pin-color': PRIDE_STRIPES[i],
  transform: `rotate(${PIN_TILTS[i]}deg)`,
})

// Visually-hidden live region — pins narrate themselves to screen
// readers ('Pinned O — 2 of 6'), and completion gets its own line.
const liveText = ref('')

function announcePin(index: number) {
  if (prideOn.value) {
    liveText.value = 'All six pinned. Happy Pride.'
  }
  else if (pinned.value[index]) {
    liveText.value = `Pinned ${letters.value[index]} — ${pinnedCount.value} of 6.`
  }
  else {
    liveText.value = `Unpinned — ${pinnedCount.value} of 6.`
  }
}

function onLetterActivate(index: number, ev?: Event) {
  // A click that ends a text-selection drag across the wordmark is not
  // a pin — let the selection stand. Pointer clicks only: keyboard
  // activation must always toggle, even if some unrelated selection
  // exists elsewhere on the page.
  if (ev?.type === 'click') {
    const sel = window.getSelection()
    if (sel && !sel.isCollapsed) return
  }
  togglePin(index)
  announcePin(index)
  // On touch there's no mouseleave, so the focus-driven hover state
  // would lock the tapped letter's active animation. Release it.
  if (ev?.type === 'click' && window.matchMedia('(hover: none)').matches) {
    hoveredIndex.value = null
  }
}

/**
 * Flood choreography. `is-flooding` applies the stripe-by-stripe
 * transition-delay stagger only around the flip (both directions —
 * the fold-back deserves the same calm), then drops so hover
 * transitions return to their normal timing. `pride-slam` is the
 * one-shot misregistration shimmer on completion; skipped under
 * reduced motion (the colors then swap via the component's existing
 * 200ms reduced-motion transitions, simultaneously).
 */
const isFlooding = ref(false)
const prideSlam = ref(false)
let floodTimer: ReturnType<typeof setTimeout> | undefined
let slamTimer: ReturnType<typeof setTimeout> | undefined

watch(prideOn, (on) => {
  const reduced = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) return

  isFlooding.value = true
  if (floodTimer) clearTimeout(floodTimer)
  floodTimer = setTimeout(() => { isFlooding.value = false }, 1600)

  if (on) {
    prideSlam.value = true
    if (slamTimer) clearTimeout(slamTimer)
    slamTimer = setTimeout(() => { prideSlam.value = false }, 900)
  }
})

/**
 * The incantation — typing `p r i d e` anywhere on the page pins all
 * six letters at once (a second door for keyboard-first visitors; the
 * pins remain the discoverable path). Esc unpins everything, but only
 * if nothing else claimed the key (FieldPolaroid's deployed camera
 * also listens for Esc and preventDefaults it).
 */
let typedBuffer = ''
let typedTimer: ReturnType<typeof setTimeout> | undefined

function onWindowKeydown(e: KeyboardEvent) {
  if (e.metaKey || e.ctrlKey || e.altKey) return
  const t = e.target as HTMLElement | null
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return

  if (e.key === 'Escape') {
    // This listener registers FIRST (child component, mounts before
    // the page's plate handler and long before the lazily-hydrated
    // FieldPolaroid), so checking defaultPrevented synchronously would
    // always see false. Defer one task: the flag persists on the event
    // object, so after dispatch completes we can tell whether an
    // overlay (plate, camera) claimed the key — Esc should close one
    // thing, not collapse the takeover as a side effect.
    if (prideOn.value) {
      setTimeout(() => {
        if (e.defaultPrevented || !prideOn.value) return
        unpinAll()
        liveText.value = 'Unpinned all.'
      }, 0)
    }
    return
  }

  if (e.key.length !== 1) return
  typedBuffer = (typedBuffer + e.key.toLowerCase()).slice(-5)
  if (typedTimer) clearTimeout(typedTimer)
  typedTimer = setTimeout(() => { typedBuffer = '' }, 2000)

  if (typedBuffer === 'pride' && !prideOn.value) {
    typedBuffer = ''
    pinAll()
    liveText.value = 'All six pinned. Happy Pride.'
  }
}

/**
 * Replay-safe entrance.
 *
 * The original implementation declared `animation: hero-letter-in ... both`
 * directly on `.hero-letter`, then overrode the whole `animation` shorthand
 * inside `.hero-letter.is-active`. The fallout: every time you hovered then
 * unhovered, the cascade restored the entrance animation and the letter
 * faded back in from opacity 0 — i.e. it briefly disappeared.
 *
 * Fix: scope the entrance to a one-shot `.entering` class that is dropped
 * once the staggered fade-in is done. After that, toggling `.is-active`
 * cannot re-fire the entrance, and the letter never blanks out.
 */
const isEntering = ref(true)
onMounted(() => {
  // 720ms duration + (n - 1) * 70ms stagger + a small tail for safety.
  const totalMs = 720 + (letters.value.length - 1) * 70 + 80
  setTimeout(() => {
    isEntering.value = false
  }, totalMs)
})

/**
 * W stripe scroll — driven from JS, NOT CSS animations.
 *
 * Why JS: three CSS approaches in a row failed to actually paint motion
 * in this stack (Nuxt 4 + Vue 3 SFC scoped + Tailwind v4 / Lightning CSS):
 *   1. animating `background-position` on a 100%-sized repeating gradient
 *      → no visible shift.
 *   2. animating `background-position` with a fixed-px `background-size`
 *      tile → still no visible shift.
 *   3. registering `--hero-w-stripe-shift` via `@property` and animating
 *      the gradient stops directly through it → variable either isn't
 *      registered through the build pipeline or doesn't interpolate;
 *      animation runs but stops never visibly move.
 *
 * Driving the variable from `requestAnimationFrame` sidesteps every one
 * of those failure modes: we write `--hero-w-stripe-shift` directly to
 * the W's inline `style` each frame as a real `<length>` string. The
 * gradient `calc(Npx + var(--hero-w-stripe-shift))` resolves to a fresh
 * length per frame and the browser repaints unconditionally.
 *
 * 11px = one full stripe period (5px stripe + 6px gap), so wrapping the
 * shift modulo 11px keeps the loop seamless — endpoints map to the same
 * pattern phase, no visual snap.
 */
const W_PERIOD_PX = 11
const W_PERIOD_MS = 900
const wStripeShift = ref(0)
let wRafId: number | null = null

function startWStripeLoop() {
  let start: number | null = null
  const tick = (time: number) => {
    if (start === null) start = time
    const elapsed = time - start
    wStripeShift.value = ((elapsed / W_PERIOD_MS) * W_PERIOD_PX) % W_PERIOD_PX
    wRafId = requestAnimationFrame(tick)
  }
  wRafId = requestAnimationFrame(tick)
}

function stopWStripeLoop() {
  if (wRafId !== null) {
    cancelAnimationFrame(wRafId)
    wRafId = null
  }
  wStripeShift.value = 0
}

watch(activeIndex, (idx) => {
  if (idx === 0) startWStripeLoop()
  else stopWStripeLoop()
})

onMounted(() => {
  // Pride egg wiring — client-only by construction (SSR renders the
  // unpinned wordmark; pin state only ever mutates post-interaction).
  attachPrideClass()
  window.addEventListener('keydown', onWindowKeydown)
})

onBeforeUnmount(() => {
  stopWStripeLoop()
  window.removeEventListener('keydown', onWindowKeydown)
  if (floodTimer) clearTimeout(floodTimer)
  if (slamTimer) clearTimeout(slamTimer)
  if (typedTimer) clearTimeout(typedTimer)
})
</script>

<template>
  <h1
    class="hero-wordmark text-display-mega flex flex-wrap items-stretch justify-center leading-[0.78]"
    :class="{ 'is-pride': prideOn, 'is-flooding': isFlooding, 'pride-slam': prideSlam }"
    aria-label="wolves"
    style="view-transition-name: site-wordmark"
    @mouseleave="hoveredIndex = null"
  >
    <span
      v-for="(letter, i) in letters"
      :key="i"
      class="hero-letter relative inline-block cursor-default"
      :class="[
        `pos-${i}`,
        { 'is-active': i === activeIndex, entering: isEntering, 'is-pinned': pinned[i] },
      ]"
      :style="{
        '--i': i,
        // Drive the W's stripe shift from JS — only the W (i === 0)
        // reads this variable in its gradient stops; other letters ignore it.
        ...(i === 0 ? { '--hero-w-stripe-shift': `${wStripeShift}px` } : {}),
      }"
      tabindex="0"
      role="button"
      :aria-pressed="pinned[i] ? 'true' : 'false'"
      :aria-label="pinned[i] ? `Unpin the ${letter}` : `Pin the ${letter}`"
      :data-riso-label="pinnedCount > 0 ? `${pinnedCount} of 6 pinned` : undefined"
      @mouseenter="hoveredIndex = i"
      @focus="hoveredIndex = i"
      @click="onLetterActivate(i, $event)"
      @keydown.enter.prevent="onLetterActivate(i)"
      @keydown.space.prevent="onLetterActivate(i)"
    >{{ letter }}<!--
      Enamel pin-back button — pushed into the letter's shoulder when
      pinned. Decorative; the letter itself carries the a11y semantics.
    --><span
        v-if="pinned[i]"
        class="letter-pin"
        :style="pinStyle(i)"
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 27" aria-hidden="true">
          <!-- clasp shadow under the disc — it sits ON the letter -->
          <ellipse cx="12" cy="24.5" rx="6" ry="1.8" fill="rgb(13 12 10 / 0.3)" />
          <!-- enamel disc in the stripe color -->
          <circle cx="12" cy="12" r="10" fill="var(--pin-color)" stroke="rgb(13 12 10 / 0.4)" stroke-width="1.2" />
          <!-- metal-rim specular crescent -->
          <path d="M 5.5 8.5 A 8 8 0 0 1 11 4.2" fill="none" stroke="rgb(255 255 255 / 0.6)" stroke-width="1.8" stroke-linecap="round" />
        </svg>
      </span></span>
  </h1>
  <span class="sr-only" aria-live="polite">{{ liveText }}</span>
</template>

<style scoped>
/* The `--hero-w-stripe-shift` custom property is registered globally
   in app/assets/css/main.css via @property — that registration is what
   makes the variable interpolate as a real <length> instead of jumping
   discretely. It MUST live globally; Vue 3's scoped style processor
   silently drops @property declarations, which is what was preventing
   the W's stripes from animating in earlier passes. */

.hero-wordmark {
  /* Each letter composites independently — keeps blur/drop-shadow cheap */
  contain: layout paint;

  /* Trim Anton's intrinsic ascender/descender space so the H1's bounding box
     hugs cap-top → alphabetic baseline. Without this, the font metrics leak
     more empty space above the visible caps than below — symmetric container
     padding then reads as visually unbalanced (top gap > bottom gap). */
  text-box: trim-both cap alphabetic;
}

/* Bigger on phones — the default text-display-mega clamp floors at 5rem
   (~80px), which sits small on phones. Raise the floor to 7rem and
   steepen vw scaling so the wordmark commands the viewport. The 10.5rem
   cap meets the desktop clamp's value at 768px (22vw of 768 ≈ 10.56rem)
   so there's no visible jump at the md breakpoint. */
@media (max-width: 767px) {
  .hero-wordmark {
    font-size: clamp(7rem, 27vw, 10.5rem);
  }
}

/* ============================================================
   BASE LETTER
   Resting baseline + transitions. Per-letter resting looks live
   in `.pos-N` blocks below; per-letter hover moves live in
   `.pos-N.is-active`.
   ============================================================ */
.hero-letter {
  /* Slight breathing space — Anton is condensed, but at this size letters
     were touching. 0.02em ≈ 8-9px at hero size, ≈ 1.6px at 5rem. */
  padding: 0 0.02em;

  /* Smooth ALL the visual properties that change between resting/active.
     Each letter keeps the same visual *mode* on both sides of the toggle
     (O stays stroked, E stays halftone, etc.) so these transitions only
     morph colors and intensities — never visibility. */
  transition:
    transform 540ms var(--ease-pop),
    filter 540ms var(--ease-pop),
    color 320ms ease-out,
    text-shadow 320ms ease-out,
    -webkit-text-stroke 320ms ease-out,
    background-size 480ms var(--ease-pop),
    background-position 480ms var(--ease-pop);

  transform: translateZ(0) scale(1);

  /* The base resting opacity matches the END of the entrance animation,
     so when the .entering class is removed the letter doesn't jump. */
  opacity: 1;
}

/* One-shot entrance. JS removes `.entering` after the staggered run, so the
   active-state animations below can't accidentally re-trigger this. */
.hero-letter.entering {
  animation: hero-letter-in 720ms var(--ease-pop) both;
  animation-delay: calc(var(--i, 0) * 70ms);
}

/* ============================================================
   PER-LETTER RESTING STATES
   Each letter is its own little typographic exhibit:

     W → diagonal stripe pattern (riso screen-print stripes)
     O → hollow / outlined      (negative-space breath)
     L → solid cream            (clean anchor — the W's old role)
     V → solid pop-yellow       (bright pivot in the middle)
     E → halftone dot fill      (printer's dots through letterform)
     S → solid orange + cream offset shadow (screen-print drop)
   ============================================================ */

/* W — diagonal stripe pattern via bg-clip-text.
   Same screen-print logic as the E (background-image clipped to the
   letter shape, transparent fill so the resting/active toggle morphs
   the gradient instead of the visibility), only the gradient is a
   `repeating-linear-gradient` of stripes instead of dots.

   Like the E, sizes are in px not em — at clamp(5rem, 22vw, 28rem)
   an em-based stripe period would explode to dozens of pixels at
   desktop and read as solid blocks. A fixed pixel period keeps the
   stripes reading as stripes at any viewport.

   Two knobs the active state animates:
     --stripe-color → cycles the riso palette (slow, ~5s)
     --hero-w-stripe-shift → slides the gradient stops to scroll the
       stripes (fast, ~1s). Adding the same offset to every stop
       translates the whole repeating pattern along the gradient axis
       without changing its period; sweeping the offset from 0 to one
       full period (11px) makes the stripes flow seamlessly. */
.hero-letter.pos-0 {
  --stripe-color: var(--color-cream);
  --hero-w-stripe-shift: 0px;
  background-image: repeating-linear-gradient(
    45deg,
    var(--stripe-color) calc(0px + var(--hero-w-stripe-shift)),
    var(--stripe-color) calc(5px + var(--hero-w-stripe-shift)),
    transparent calc(5px + var(--hero-w-stripe-shift)),
    transparent calc(11px + var(--hero-w-stripe-shift))
  );
  background-size: 100% 100%;
  background-position: 0 0;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 0 0 transparent;
  -webkit-text-stroke: 0 transparent;
}

/* O — hollow / outlined */
.hero-letter.pos-1 {
  color: transparent;
  -webkit-text-stroke: clamp(1.5px, 0.35vw, 4px) var(--color-cream);
  text-shadow: 0 0 0 transparent;
}

/* L — solid cream anchor (the W's old resting-state role, now the L's). */
.hero-letter.pos-2 {
  color: var(--color-cream);
  text-shadow: 0 0 0 transparent;
}

/* V — solid pop-yellow */
.hero-letter.pos-3 {
  color: var(--color-pop-yellow);
  text-shadow: 0 0 0 transparent;
}

/* E — halftone dot fill via bg-clip-text.
   NOTE: tile size is in px, NOT em. With clamp(5rem, 22vw, 28rem) an
   em-based tile balloons to ~80px at desktop sizes and the dots disappear
   into negative space. A fixed pixel tile keeps the halftone reading as a
   halftone at any viewport.

   `--halftone-color` and `--halftone-tile` are knobs the active state
   tweaks — keeping the gradient live on both sides of the toggle means
   the letter never goes invisible during the transition. */
.hero-letter.pos-4 {
  --halftone-color: var(--color-cream);
  --halftone-tile: 8px;
  background-image: radial-gradient(
    circle at center,
    var(--halftone-color) 1.4px,
    transparent 1.9px
  );
  background-size: var(--halftone-tile) var(--halftone-tile);
  background-position: 0 0;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 0 0 transparent;
  -webkit-text-stroke: 0 transparent;
}

/* S — orange with cream offset */
.hero-letter.pos-5 {
  color: var(--color-pop-orange);
  text-shadow: 0.04em 0.04em 0 var(--color-cream);
}

/* ============================================================
   PER-LETTER ACTIVE STATES
   Six different riso-press moves, one per letter. Each preserves
   its letter's visual mode (stroked / halftone / filled) so the
   resting ⇄ active transition only animates colors and sizes,
   never visibility.
   ============================================================ */

/* shared lift for any active letter */
.hero-letter.is-active {
  z-index: 1;
}

/* W — stripe scroll + shear.
   The stripes themselves SCROLL diagonally across the letter like a
   paper-feed through a press roller — that's the W's headline move,
   and it's what separates it from the O (which only cycles colour on
   a static ring). The scroll itself is driven from `<script setup>`
   via `requestAnimationFrame` writing `--hero-w-stripe-shift` to the
   W's inline style every frame; CSS-only attempts to drive it (via
   bg-position keyframes, then via @property + keyframes) all failed
   to paint motion in this stack, so JS owns the loop. Two CSS
   animations remain on this rule: the stripe colour cycle (slow
   palette walk) and the skew shear (the W's unique dialect of motion;
   nobody else uses skewX). The stripe pattern is preserved on both
   sides of the toggle so the letter never blanks out.
   No drop-shadow here — the W lets its motion do the talking. */
.hero-letter.pos-0.is-active {
  transform: translateZ(0) scale(1.06);
  animation:
    hero-w-stripe-color 4500ms steps(1, jump-none) infinite,
    hero-w-shear 540ms var(--ease-pop) infinite alternate;
}

/* O — registration ring.
   Stroke fattens and cycles riso while a chunky riso ghost halo pulses
   outward and the whole letter shimmies. The fill stays transparent, so
   the letter is always rendered via the stroke — it cannot wink out
   during the transition. */
.hero-letter.pos-1.is-active {
  -webkit-text-stroke-width: clamp(3px, 0.7vw, 9px);
  transform: translateZ(0) scale(1.08);
  filter: drop-shadow(0 0 32px rgba(94, 200, 229, 0.45));
  animation:
    hero-o-stroke-cycle 1200ms steps(1, jump-none) infinite,
    hero-o-shadow-pulse 520ms var(--ease-pop) infinite alternate,
    hero-o-shimmy 360ms var(--ease-pop) infinite alternate;
}

/* L — rubber-stamp slam (inherited from the W's previous identity).
   Solid color hard-snaps to magenta with chunky cream offset plus riso
   ghost shadows; a 1px shimmy keeps the press feeling alive. */
.hero-letter.pos-2.is-active {
  color: var(--color-pop-magenta);
  text-shadow:
    0.07em 0.07em 0 var(--color-cream),
    -0.05em -0.05em 0 var(--color-pop-yellow),
    0.10em -0.04em 0 #5ec8e5;
  transform: translateZ(0) scale(1.06);
  filter: drop-shadow(0 0 24px rgba(255, 233, 78, 0.32));
  animation: hero-l-shimmy 460ms var(--ease-pop) infinite alternate;
}

/* V — color flip + shadow slam.
   Fill hard-cycles the pop palette while a stack of chunky riso offset
   shadows cycles out-of-phase against it. A faster shimmy kicks the
   whole letter around so adjacent neighbours feel the pulse. */
.hero-letter.pos-3.is-active {
  transform: translateZ(0) scale(1.10) rotate(-3deg);
  filter: drop-shadow(0 0 32px rgba(255, 233, 78, 0.48));
  animation:
    hero-v-flip 700ms steps(1, jump-none) infinite,
    hero-v-shadow-flip 700ms steps(1, jump-none) infinite,
    hero-v-shimmy 280ms var(--ease-pop) infinite alternate;
}

/* E — halftone zoom.
   Dot tile gets bigger, dot color cycles, and the background-position
   scrolls so the pattern looks alive. The letter stays in halftone mode
   the whole time, so it's always visible via the gradient. */
.hero-letter.pos-4.is-active {
  --halftone-tile: 14px;
  transform: translateZ(0) scale(1.06);
  filter: drop-shadow(0 0 26px rgba(255, 233, 78, 0.30));
  animation:
    hero-e-halftone-color 1600ms steps(1, jump-none) infinite,
    hero-e-halftone-scroll 2400ms linear infinite;
}

/* S — over-print stack.
   More registration layers in riso pile up around the orange core,
   shifting position over time like a misaligned screen-print. */
.hero-letter.pos-5.is-active {
  transform: translateZ(0) scale(1.06);
  filter: drop-shadow(0 0 26px rgba(255, 156, 30, 0.36));
  animation: hero-s-overprint 1500ms steps(1, jump-none) infinite;
}

/* ============================================================
   KEYFRAMES
   ============================================================ */

@keyframes hero-letter-in {
  from {
    opacity: 0;
    filter: blur(4px);
  }
  to {
    opacity: 1;
    filter: blur(0);
  }
}

/* W — stripe colour hard-cycles riso. Drives a CSS variable so the
   bg-clip-text mode is preserved end-to-end (same trick as the E's
   --halftone-color cycle). */
@keyframes hero-w-stripe-color {
  0%   { --stripe-color: var(--color-cream); }
  25%  { --stripe-color: var(--color-pop-magenta); }
  50%  { --stripe-color: var(--color-pop-yellow); }
  75%  { --stripe-color: #5ec8e5; }
  100% { --stripe-color: var(--color-cream); }
}

/* No CSS @keyframes for the W's stripe scroll — see <script setup>;
   the shift is driven from JS via requestAnimationFrame, writing
   `--hero-w-stripe-shift` directly to the W's inline style each frame.
   That sidesteps the CSS-animation issues that prevented earlier
   keyframe-based approaches from painting motion in this stack. */

/* W — skew shear under the fixed scale. Unique to the W: every other
   active letter's transform animates translate/rotate; this one drags
   the whole glyph off-axis on the X like a mis-pulled press roller. */
@keyframes hero-w-shear {
  from {
    transform: translateZ(0) scale(1.06) skewX(0deg);
  }
  to {
    transform: translateZ(0) scale(1.06) skewX(-7deg);
  }
}

/* O — stroke colour cycles riso; fill stays transparent, so the
   letter is always drawn by the stroke. */
@keyframes hero-o-stroke-cycle {
  0%   { -webkit-text-stroke-color: var(--color-cream); }
  25%  { -webkit-text-stroke-color: var(--color-pop-magenta); }
  50%  { -webkit-text-stroke-color: var(--color-pop-yellow); }
  75%  { -webkit-text-stroke-color: #5ec8e5; }
  100% { -webkit-text-stroke-color: var(--color-cream); }
}

/* O — text-shadow renders the glyph silhouette even with a transparent
   fill, so we can pulse a chunky riso halo around the stroked O. Three
   layers each side of the toggle keeps the registration loud. */
@keyframes hero-o-shadow-pulse {
  from {
    text-shadow:
       0.05em  0.05em 0 var(--color-pop-yellow),
      -0.05em -0.05em 0 #5ec8e5,
       0.06em -0.05em 0 var(--color-pop-magenta);
  }
  to {
    text-shadow:
       0.13em  0.13em 0 var(--color-pop-yellow),
      -0.13em -0.13em 0 #5ec8e5,
       0.12em -0.11em 0 var(--color-pop-magenta);
  }
}

/* O — 1.5px shimmy under the fixed scale so the ring throbs in space */
@keyframes hero-o-shimmy {
  from {
    transform: translateZ(0) scale(1.08) translate(0, 0) rotate(0);
  }
  to {
    transform: translateZ(0) scale(1.08) translate(1.5px, -1px) rotate(0.5deg);
  }
}

/* L — 1px shimmy under a fixed scale (the W's old shimmy, now living on
   the L). Chunky offset shadows do the press read; the shimmy just keeps
   the impression alive. */
@keyframes hero-l-shimmy {
  from {
    transform: translateZ(0) scale(1.06) translate(0, 0) rotate(0);
  }
  to {
    transform: translateZ(0) scale(1.06) translate(-1px, -1px) rotate(-0.4deg);
  }
}

/* V — flat colour flip through the pop palette */
@keyframes hero-v-flip {
  0%   { color: var(--color-pop-yellow); }
  25%  { color: var(--color-pop-magenta); }
  50%  { color: #5ec8e5; }
  75%  { color: var(--color-pop-orange); }
  100% { color: var(--color-pop-yellow); }
}

/* V — chunky riso offsets cycling out-of-phase with the fill flip, so
   the V is *never* the same colour as any of its three ghost layers. */
@keyframes hero-v-shadow-flip {
  0% {
    text-shadow:
       0.10em  0.10em 0 var(--color-pop-magenta),
      -0.07em -0.07em 0 #5ec8e5,
       0.10em -0.07em 0 var(--color-pop-orange);
  }
  25% {
    text-shadow:
       0.10em  0.10em 0 #5ec8e5,
      -0.07em -0.07em 0 var(--color-pop-orange),
       0.10em -0.07em 0 var(--color-pop-yellow);
  }
  50% {
    text-shadow:
       0.10em  0.10em 0 var(--color-pop-orange),
      -0.07em -0.07em 0 var(--color-pop-yellow),
       0.10em -0.07em 0 var(--color-pop-magenta);
  }
  75% {
    text-shadow:
       0.10em  0.10em 0 var(--color-pop-yellow),
      -0.07em -0.07em 0 var(--color-pop-magenta),
       0.10em -0.07em 0 #5ec8e5;
  }
  100% {
    text-shadow:
       0.10em  0.10em 0 var(--color-pop-magenta),
      -0.07em -0.07em 0 #5ec8e5,
       0.10em -0.07em 0 var(--color-pop-orange);
  }
}

/* V — fast 1.5px shimmy under the static rotate(-3deg) lift */
@keyframes hero-v-shimmy {
  from {
    transform: translateZ(0) scale(1.10) rotate(-3deg) translate(0, 0);
  }
  to {
    transform: translateZ(0) scale(1.10) rotate(-3deg) translate(-1.5px, 1px);
  }
}

/* E — halftone dot colour cycles. We drive a CSS variable rather than the
   gradient itself so the bg-clip-text mode is preserved end-to-end. */
@keyframes hero-e-halftone-color {
  0%   { --halftone-color: var(--color-pop-magenta); }
  25%  { --halftone-color: var(--color-pop-yellow); }
  50%  { --halftone-color: #5ec8e5; }
  75%  { --halftone-color: var(--color-pop-orange); }
  100% { --halftone-color: var(--color-pop-magenta); }
}

/* E — slow drift of the dot tile so the halftone reads as alive */
@keyframes hero-e-halftone-scroll {
  from { background-position: 0 0; }
  to   { background-position: 14px 14px; }
}

/* S — stacked riso offsets shuffle around the orange core */
@keyframes hero-s-overprint {
  0% {
    text-shadow:
       0.04em  0.04em 0 var(--color-cream),
       0.08em  0.08em 0 var(--color-pop-magenta),
      -0.04em -0.04em 0 #5ec8e5,
       0.10em -0.04em 0 var(--color-pop-yellow);
  }
  33% {
    text-shadow:
       0.04em  0.04em 0 var(--color-cream),
       0.08em  0.08em 0 #5ec8e5,
      -0.04em -0.04em 0 var(--color-pop-yellow),
       0.10em -0.04em 0 var(--color-pop-magenta);
  }
  66% {
    text-shadow:
       0.04em  0.04em 0 var(--color-cream),
       0.08em  0.08em 0 var(--color-pop-yellow),
      -0.04em -0.04em 0 var(--color-pop-magenta),
       0.10em -0.04em 0 #5ec8e5;
  }
  100% {
    text-shadow:
       0.04em  0.04em 0 var(--color-cream),
       0.08em  0.08em 0 var(--color-pop-magenta),
      -0.04em -0.04em 0 #5ec8e5,
       0.10em -0.04em 0 var(--color-pop-yellow);
  }
}

/* ============================================================
   SCROLL PARALLAX — riso pull-apart
   As the document scrolls past the hero, the wordmark behaves
   like a sheet of paper being lifted off a misaligned press:

     1. it sinks into the page slightly first (a beat of weight,
        scaleY > 1, like the ink is biting harder),
     2. then peels up — translating, shrinking, tilting,
     3. and as it peels it splits into riso registration ghosts
        (magenta + yellow + cyan drop-shadows that grow apart),
     4. finally blurring and fading out.

   Three keyframes give the motion a beat, an arc, and a tail
   instead of a flat from→to slide. The chromatic split peaks
   mid-scroll so the wordmark's "departure" is the visual climax,
   not the "vanish."

   Independent of the per-letter active transforms — those live on
   .hero-letter spans, this lives on the parent .hero-wordmark, so
   they multiply through the cascade without fighting each other.

   Pure CSS via animation-timeline: scroll(). Safari (no support
   as of 2026-05) gracefully falls back to no animation — the
   entrance + hover motion already carries the wordmark.
   ============================================================ */
@keyframes hero-scroll-parallax {
  /* 0% — at rest. Drop-shadows are stated as transparent
     same-shape filters so they interpolate cleanly to the
     coloured riso ghosts at 55%. */
  0% {
    transform: translateY(0) scale(1) rotate(0deg);
    opacity: 1;
    filter:
      blur(0)
      drop-shadow(0 0 0 rgba(255, 72, 105, 0))
      drop-shadow(0 0 0 rgba(255, 233, 78, 0))
      drop-shadow(0 0 0 rgba(94, 200, 229, 0));
  }
  /* 12% — beat of weight before the lift.
     Subtle vertical squish + tiny downward translate, like the
     press cycle sinks the sheet into the platen for one frame
     before it gets pulled. Keeps the exit from feeling like a
     flat slide. */
  12% {
    transform: translateY(2%) scale(1.02, 0.97) rotate(0deg);
    opacity: 1;
    filter:
      blur(0)
      drop-shadow(0 0 0 rgba(255, 72, 105, 0))
      drop-shadow(0 0 0 rgba(255, 233, 78, 0))
      drop-shadow(0 0 0 rgba(94, 200, 229, 0));
  }
  /* 55% — peak chromatic split.
     The riso layers spread off the wordmark in three directions
     (magenta down-right, yellow up-left, cyan down-left). Wordmark
     itself is mid-lift — translated up, shrunk, slightly tilted. */
  55% {
    transform: translateY(-22%) scale(0.86) rotate(-1.2deg);
    opacity: 0.72;
    filter:
      blur(1.2px)
      drop-shadow(0.14em 0.14em 0 rgba(255, 72, 105, 0.85))
      drop-shadow(-0.11em -0.11em 0 rgba(255, 233, 78, 0.7))
      drop-shadow(0.10em -0.09em 0 rgba(94, 200, 229, 0.55));
  }
  /* 100% — peeled away. Riso ghosts fade their alpha back to 0
     while spreading further; combined with opacity:0 on the base
     it reads as the whole stack dissolving into the page. */
  100% {
    transform: translateY(-62%) scale(0.5) rotate(-3deg);
    opacity: 0;
    filter:
      blur(7px)
      drop-shadow(0.24em 0.24em 0 rgba(255, 72, 105, 0))
      drop-shadow(-0.20em -0.20em 0 rgba(255, 233, 78, 0))
      drop-shadow(0.18em -0.16em 0 rgba(94, 200, 229, 0));
  }
}

@supports (animation-timeline: scroll()) {
  .hero-wordmark {
    animation: hero-scroll-parallax linear both;
    animation-timeline: scroll(root block);
    /* 65vh of scroll runway — gives the riso split time to peak
       (mid-range) before the wordmark fully departs. */
    animation-range: 0 65vh;
    /* Origin above the geometric centre so the shrink reads as a lift,
       not a pinch toward the middle. */
    transform-origin: 50% 35%;
    /* Compositor-only animation; hint the browser we'll mutate these. */
    will-change: transform, opacity, filter;
  }
}

/* ============================================================
   SIX PINS — enamel pin-back buttons + the pride flood
   Pins sit inside the letter spans' own bounding boxes (the
   wordmark has `contain: layout paint`, so anything outside the
   h1's paint box would clip). The flood is pure recolor: each
   letter keeps its visual mode (striped / stroked / filled /
   halftone) and only its ink changes — the same morph-not-blink
   contract the hover states honor.
   ============================================================ */

.letter-pin {
  position: absolute;
  top: 8%;
  right: 2%;
  width: 0.17em;
  aspect-ratio: 24 / 27;
  z-index: 2;
  pointer-events: none;
  filter: drop-shadow(0 1px 1px rgb(13 12 10 / 0.45));
  /* `scale` (the standalone property) composes with the inline
     rotate tilt instead of clobbering it. */
  animation: pin-press-in 320ms var(--ease-pop) both;
}
.letter-pin svg {
  display: block;
  width: 100%;
  height: 100%;
}

@keyframes pin-press-in {
  0%   { opacity: 0; scale: 1.5; }
  55%  { opacity: 1; scale: 0.9; }
  100% { opacity: 1; scale: 1; }
}

/* Stripe-by-stripe stagger — only while the flood (or fold-back) is
   in flight, so normal hover transitions keep their timing. */
.hero-wordmark.is-flooding .hero-letter {
  transition-delay: calc(var(--i, 0) * 110ms);
}

/* W — stripes re-ink flag red. The hover rAF scroll keeps marching
   (it only drives the shift variable); the riso color-cycle is
   locked off so the stripe holds its color. */
.hero-wordmark.is-pride .hero-letter.pos-0 {
  --stripe-color: var(--color-pop-red);
}
.hero-wordmark.is-pride .hero-letter.pos-0.is-active {
  animation: hero-w-shear 540ms var(--ease-pop) infinite alternate;
}

/* O — stroke re-inks orange; stroke-cycle locked off, halo + shimmy stay */
.hero-wordmark.is-pride .hero-letter.pos-1 {
  -webkit-text-stroke-color: var(--color-pop-orange);
}
.hero-wordmark.is-pride .hero-letter.pos-1.is-active {
  -webkit-text-stroke-color: var(--color-pop-orange);
  animation:
    hero-o-shadow-pulse 520ms var(--ease-pop) infinite alternate,
    hero-o-shimmy 360ms var(--ease-pop) infinite alternate;
}

/* L — fills yellow; the magenta stamp-slam yields to the stripe */
.hero-wordmark.is-pride .hero-letter.pos-2 {
  color: var(--color-pop-yellow);
}
.hero-wordmark.is-pride .hero-letter.pos-2.is-active {
  color: var(--color-pop-yellow);
}

/* V — green; the color-flip is locked off, ghost shadows + shimmy stay */
.hero-wordmark.is-pride .hero-letter.pos-3 {
  color: var(--color-pop-green);
}
.hero-wordmark.is-pride .hero-letter.pos-3.is-active {
  color: var(--color-pop-green);
  animation:
    hero-v-shadow-flip 700ms steps(1, jump-none) infinite,
    hero-v-shimmy 280ms var(--ease-pop) infinite alternate;
}

/* E — halftone dots re-ink blue; dot color-cycle locked off, drift stays */
.hero-wordmark.is-pride .hero-letter.pos-4 {
  --halftone-color: var(--color-pop-blue);
}
.hero-wordmark.is-pride .hero-letter.pos-4.is-active {
  --halftone-color: var(--color-pop-blue);
  animation: hero-e-halftone-scroll 2400ms linear infinite;
}

/* S — violet core; the cream offset and overprint shuffle stay */
.hero-wordmark.is-pride .hero-letter.pos-5 {
  color: var(--color-pop-violet);
}

/* The second ink pass — a one-shot CMYK misregistration shimmer as
   the sixth pin lands. Lives on the letters, not the h1, so it can't
   fight the scroll-timeline parallax animation on .hero-wordmark. */
.hero-wordmark.pride-slam .hero-letter {
  animation: hero-pride-slam 900ms var(--ease-pop) both;
}

@keyframes hero-pride-slam {
  0% {
    filter:
      drop-shadow(0 0 0 rgba(241, 80, 96, 0))
      drop-shadow(0 0 0 rgba(94, 200, 229, 0))
      drop-shadow(0 0 0 rgba(255, 233, 78, 0));
  }
  30% {
    filter:
      drop-shadow(0.045em 0.045em 0 rgba(241, 80, 96, 0.55))
      drop-shadow(-0.04em -0.04em 0 rgba(94, 200, 229, 0.45))
      drop-shadow(0.05em -0.04em 0 rgba(255, 233, 78, 0.4));
  }
  100% {
    filter:
      drop-shadow(0 0 0 rgba(241, 80, 96, 0))
      drop-shadow(0 0 0 rgba(94, 200, 229, 0))
      drop-shadow(0 0 0 rgba(255, 233, 78, 0));
  }
}

/* ============================================================
   Reduced motion — kill all the cycling, but keep one calm,
   distinctive pop per letter so the differentiation survives.
   ============================================================ */
@media (prefers-reduced-motion: reduce) {
  .hero-wordmark,
  .hero-letter,
  .hero-letter.entering,
  .hero-letter.is-active {
    animation: none;
    transition: color 200ms ease-out, text-shadow 200ms ease-out,
                -webkit-text-stroke 200ms ease-out, background-size 200ms ease-out;
  }

  /* Per-letter kills at matching specificity. The blanket
     `.hero-letter.is-active` above is (0,2,0) and loses to the
     per-letter active rules' (0,3,0) animation/transform/filter
     declarations — media queries add no cascade weight — so each
     pos-N.is-active needs its own later-in-source tie-breaker. */
  .hero-letter.pos-0.is-active,
  .hero-letter.pos-1.is-active,
  .hero-letter.pos-2.is-active,
  .hero-letter.pos-3.is-active,
  .hero-letter.pos-4.is-active,
  .hero-letter.pos-5.is-active {
    animation: none;
    transform: none;
    filter: none;
  }

  /* Pride under reduced motion: pins appear instantly, all six
     letters recolor simultaneously through the 200ms transitions
     above, and the pride-locked hover animations go still. The
     selectors match the pride rules' specificity so they actually
     win inside the media query. */
  .letter-pin { animation: none; }
  .hero-wordmark.is-flooding .hero-letter { transition-delay: 0ms; }
  .hero-wordmark.pride-slam .hero-letter { animation: none; }
  .hero-wordmark.is-pride .hero-letter.pos-0.is-active,
  .hero-wordmark.is-pride .hero-letter.pos-1.is-active,
  .hero-wordmark.is-pride .hero-letter.pos-3.is-active,
  .hero-wordmark.is-pride .hero-letter.pos-4.is-active {
    animation: none;
  }
  .hero-letter.is-active {
    transform: none;
    filter: none;
  }
  .hero-letter.pos-0.is-active {
    --stripe-color: var(--color-pop-magenta);
  }
  .hero-letter.pos-1.is-active {
    -webkit-text-stroke-color: var(--color-pop-magenta);
    -webkit-text-stroke-width: clamp(3px, 0.7vw, 9px);
    text-shadow:
       0.10em  0.10em 0 var(--color-pop-yellow),
      -0.10em -0.10em 0 #5ec8e5;
  }
  .hero-letter.pos-2.is-active {
    color: var(--color-pop-magenta);
    text-shadow: 0.06em 0.06em 0 var(--color-cream);
  }
  .hero-letter.pos-3.is-active {
    color: var(--color-pop-magenta);
    text-shadow:
       0.10em  0.10em 0 var(--color-pop-yellow),
      -0.07em -0.07em 0 #5ec8e5,
       0.10em -0.07em 0 var(--color-pop-orange);
  }
  .hero-letter.pos-4.is-active {
    --halftone-color: var(--color-pop-magenta);
    --halftone-tile: 12px;
  }
  .hero-letter.pos-5.is-active {
    text-shadow:
      0.04em 0.04em 0 var(--color-cream),
      0.08em 0.08em 0 var(--color-pop-magenta);
  }
}
</style>
