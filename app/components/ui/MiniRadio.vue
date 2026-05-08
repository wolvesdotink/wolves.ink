<script setup lang="ts">
/**
 * MiniRadio — the floating "now playing" cabinet that lives in the
 * bottom-right corner of every page while the visitor is tuned to
 * today's frequency.
 *
 * Visibility rule (computed against `useRadioPlayer()`):
 *   - Visible only while `locked` is true — i.e. the dial is currently
 *     within ±0.05 MHz of today's frequency and the stream is playing.
 *     The moment the user tunes away, the mini disappears; tuning back
 *     in reveals it again. Visibility tracks the live lock state, not
 *     a sticky "ever locked" flag.
 *   - Hidden while the big `RadioDial` cabinet is on screen, so we
 *     never show two radios simultaneously. The big dial fills the
 *     `dialInView` flag via an IntersectionObserver in `RadioDial.vue`.
 *   - On every other route (`/projects`, `/projects/[slug]`, …) the
 *     big cabinet doesn't render, so the only gate is `locked`.
 *
 * Audio + state are owned by the singleton composable, so the stream
 * keeps playing across navigation. This component is purely a
 * controller: mute toggle, frequency readout, "open the dial" button.
 *
 * Mounted once in `layouts/default.vue` so it's a layout-level
 * persistent surface — Nuxt keeps the layout instance alive across
 * page transitions, which is what lets the mini player keep its
 * <transition> mounted state and the audio handle steady.
 */

const {
  isPlaying,
  audioMuted,
  nowPlaying,
  locked,
  dialInView,
  mhzLabel,
  toggleMute,
} = useRadioPlayer()

// Composite visibility — only render the actual surface when both
// gates are open. `locked` flips false the moment the user tunes off
// today's MHz, so the mini ducks back into the corner immediately
// rather than persisting as a sticky badge. We still keep the
// <Teleport> mounted so the transition can animate; the inner div is
// what enters/leaves.
const shouldShow = computed(() => locked.value && !dialInView.value)

// "Open the dial" — clicking the cabinet body scrolls the page back to
// the homepage's RadioDial cabinet. From any route we route home with
// the #radio-cabinet hash; on the homepage we just smooth-scroll. The
// router's scrollBehavior isn't customised, so we do the smooth-scroll
// ourselves once the navigation lands.
const router = useRouter()
const route = useRoute()

function openBigDial() {
  if (route.path === '/') {
    const el = document.getElementById('radio-cabinet')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return
  }
  // Off-route: navigate home, then scroll once the page is mounted.
  // A short rAF loop lets the homepage render its DOM before we look
  // for the anchor element.
  router.push('/').then(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.getElementById('radio-cabinet')
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      })
    })
  })
}
</script>

<template>
  <!--
    `client-only` keeps the mini player out of the SSR'd HTML — its
    visibility hinges on user-gesture state (locked, dialInView) that
    only exists in the browser, and rendering it server-side would
    cause a hydration flash.
  -->
  <ClientOnly>
    <transition name="mini-radio">
      <div
        v-show="shouldShow"
        class="mini-radio"
        role="region"
        aria-label="Pack radio — mini player"
      >
        <!-- Brand strip — same chrome nameplate vocabulary as the big
             cabinet, scaled down. The On Air dot pulses while the
             stream is live so the player feels alive even when the
             user isn't looking at the readout. -->
        <button
          type="button"
          class="mini-radio__brand"
          aria-label="Open the radio dial"
          :title="`Tuned to ${mhzLabel} MHz — open the dial`"
          @click="openBigDial"
        >
          <span class="mini-radio__mark" aria-hidden="true">◑</span>
          <span class="mini-radio__freq">
            <span class="mini-radio__mhz">{{ mhzLabel }}</span>
            <span class="mini-radio__unit">MHz</span>
          </span>
          <span
            class="mini-radio__dot"
            :class="isPlaying && !audioMuted ? 'is-on' : ''"
            aria-hidden="true"
          />
        </button>

        <!-- Now-playing readout — artist · title, scrolls inside its
             clip when the line overruns the column. Falls back to a
             static "Pack Radio" label if metadata hasn't arrived yet
             (or the SomaFM JSON request failed). -->
        <div class="mini-radio__np" aria-live="polite">
          <transition name="mini-np-swap" mode="out-in">
            <span
              v-if="isPlaying && nowPlaying"
              key="np"
              class="mini-radio__marquee"
            >
              <span class="mini-radio__artist">{{ nowPlaying.artist }}</span>
              <span class="mini-radio__sep" aria-hidden="true"> — </span>
              <span class="mini-radio__title">{{ nowPlaying.title }}</span>
            </span>
            <span v-else key="brand" class="mini-radio__fallback">
              Wolves · Pack Radio
            </span>
          </transition>
        </div>

        <!-- Mute toggle — the only direct audio control on the mini.
             Tuning has to happen on the big dial (a deliberate
             constraint: the easter egg keeps its sense of place). -->
        <button
          type="button"
          class="mini-radio__mute"
          :aria-pressed="audioMuted"
          :aria-label="audioMuted ? 'Unmute pack radio' : 'Mute pack radio'"
          :title="audioMuted ? 'Unmute' : 'Mute'"
          @click.stop="toggleMute"
        >
          <Icon
            :name="audioMuted ? 'lucide:volume-x' : 'lucide:volume-2'"
            class="text-base"
          />
        </button>
      </div>
    </transition>
  </ClientOnly>
</template>

<style scoped>
/* ============================================================
   The cabinet, miniaturised
   - Cream/paper body and ink border match the big set so the
     mini reads as the same physical object, just smaller.
   - Fixed bottom-right with safe-area insets so it lands above
     iOS home-indicator and any browser chrome.
   ============================================================ */
.mini-radio {
  position: fixed;
  bottom: calc(1rem + env(safe-area-inset-bottom, 0));
  right: calc(1rem + env(safe-area-inset-right, 0));
  z-index: 60; /* above sticky header (z-40), below modal overlays */

  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.55rem;
  /* Wide enough to fit a short artist line, but capped so a long
     title ellipsises rather than steals the corner. */
  width: clamp(15rem, 24vw, 19rem);
  padding: 0.55rem 0.65rem;

  background: var(--color-paper);
  color: var(--color-ink);
  border: 2px solid var(--color-ink);
  border-radius: 12px;
  box-shadow:
    inset 0 0 0 3px var(--color-cream),
    inset 0 0 0 4px var(--color-ink),
    0 8px 22px rgba(0, 0, 0, 0.45),
    0 2px 0 rgba(0, 0, 0, 0.4);
  font-family: var(--font-mono);
}

@media (max-width: 480px) {
  /* On phones we let the cabinet hug both edges so it doesn't crowd
     into a tiny strip. Title still ellipsises to keep the row tidy. */
  .mini-radio {
    left: calc(0.75rem + env(safe-area-inset-left, 0));
    right: calc(0.75rem + env(safe-area-inset-right, 0));
    width: auto;
  }
}

/* ── Brand strip / open-the-dial trigger.
   The whole left chiclet acts as a button so the click target is
   generous; we suppress the native button chrome so it reads as a
   nameplate rather than a form control. */
.mini-radio__brand {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.5rem;
  background: var(--color-cream);
  border: 1px solid var(--color-ink);
  border-radius: 4px;
  cursor: pointer;
  transition:
    background-color 220ms var(--ease-pop),
    color 220ms var(--ease-pop),
    transform 220ms var(--ease-pop);
}
.mini-radio__brand:hover {
  background: var(--color-pop-yellow);
}
.mini-radio__brand:active {
  transform: translateY(1px);
}
.mini-radio__brand:focus-visible {
  outline: 2px solid var(--color-pop-magenta);
  outline-offset: 2px;
}

.mini-radio__mark {
  color: var(--color-pop-magenta);
  font-size: 0.95rem;
  line-height: 1;
}

.mini-radio__freq {
  display: inline-flex;
  align-items: baseline;
  gap: 0.2rem;
  line-height: 1;
}
.mini-radio__mhz {
  font-family: var(--font-display);
  font-size: 0.95rem;
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
  color: var(--color-pop-magenta);
}
.mini-radio__unit {
  font-size: 0.5rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: color-mix(in oklab, var(--color-ink) 65%, transparent);
}

/* ── Live dot — tiny pulsing LED next to the frequency to confirm
   the stream is on. Sits dim while paused/muted, pulses magenta
   while broadcasting. */
.mini-radio__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: color-mix(in oklab, var(--color-ink) 35%, transparent);
  box-shadow: inset 0 0 0 1px var(--color-ink);
  transition: background-color 260ms var(--ease-pop), box-shadow 260ms var(--ease-pop);
}
.mini-radio__dot.is-on {
  background: var(--color-pop-magenta);
  box-shadow:
    inset 0 0 0 1px var(--color-ink),
    0 0 6px color-mix(in oklab, var(--color-pop-magenta) 70%, transparent);
  animation: mini-dot-pulse 1.4s ease-in-out infinite;
}
@keyframes mini-dot-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
}

/* ── Now-playing column. Fixed-width clip with auto-scroll on
   overflow; the scrolling track only animates if the line is wider
   than its container, which `text-overflow: ellipsis` plus the
   marquee class handles below. */
.mini-radio__np {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  font-size: 0.7rem;
  color: var(--color-ink);
}
.mini-radio__marquee {
  display: inline-flex;
  align-items: baseline;
  gap: 0.25rem;
  min-width: 0;
}
.mini-radio__artist {
  font-weight: 600;
  flex-shrink: 0;
}
.mini-radio__sep {
  opacity: 0.45;
  flex-shrink: 0;
}
.mini-radio__title {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 0.78rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}
.mini-radio__fallback {
  font-family: var(--font-display);
  font-size: 0.65rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: color-mix(in oklab, var(--color-ink) 75%, transparent);
}

/* Crossfade between brand fallback and now-playing — same easing as
   the big cabinet's brand swap, scaled to the smaller surface. */
.mini-np-swap-enter-active,
.mini-np-swap-leave-active {
  transition: opacity 220ms var(--ease-pop);
}
.mini-np-swap-enter-from,
.mini-np-swap-leave-to {
  opacity: 0;
}

/* ── Mute toggle — small chiclet, mirrors the big cabinet's
   `.brand-mute` so the two surfaces feel like one device. */
.mini-radio__mute {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--color-ink);
  background: var(--color-cream);
  color: var(--color-ink);
  border-radius: 4px;
  cursor: pointer;
  transition:
    background-color 220ms var(--ease-pop),
    color 220ms var(--ease-pop),
    transform 220ms var(--ease-pop);
}
.mini-radio__mute:hover {
  background: var(--color-pop-yellow);
}
.mini-radio__mute:active {
  transform: translateY(1px);
}
.mini-radio__mute:focus-visible {
  outline: 2px solid var(--color-pop-magenta);
  outline-offset: 2px;
}
.mini-radio__mute[aria-pressed="true"] {
  background: var(--color-ink);
  color: var(--color-cream);
}

/* ============================================================
   Enter/leave — the cabinet pops up from the corner and tucks
   back when the big dial returns. Uses the same spring easing
   as the rest of the kit (`--ease-pop`).
   ============================================================ */
.mini-radio-enter-active {
  transition:
    opacity 320ms var(--ease-pop),
    transform 380ms var(--ease-pop);
}
.mini-radio-leave-active {
  transition:
    opacity 220ms ease-out,
    transform 280ms var(--ease-pop);
}
.mini-radio-enter-from {
  opacity: 0;
  transform: translateY(14px) scale(0.94);
}
.mini-radio-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.96);
}

/* ============================================================
   Reduced motion — kill the entry/exit transform and the LED
   pulse so the mini behaves as a static badge.
   ============================================================ */
@media (prefers-reduced-motion: reduce) {
  .mini-radio-enter-active,
  .mini-radio-leave-active {
    transition: opacity 200ms ease;
  }
  .mini-radio-enter-from,
  .mini-radio-leave-to {
    transform: none;
  }
  .mini-radio__dot.is-on {
    animation: none;
  }
}
</style>
