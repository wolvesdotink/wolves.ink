<script setup lang="ts">
/**
 * RadioDial — easter egg at the bottom of the homepage. A small FM-band
 * dial (88.0–108.0 MHz, 0.1 MHz steps) styled as a vintage analog radio
 * cabinet. When the user tunes within 0.05 MHz of `useTodaysFrequency()`,
 * the static settles, a `TRANSMISSION RECEIVED` eyebrow flickers in, and
 * a hidden line types out — picked deterministically per day from
 * `site.transmissions`.
 *
 * State + audio live in `useRadioPlayer()` (singleton, module-scoped) so
 * the stream survives page navigation and a `MiniRadio.vue` floating
 * player can keep the music going from any other route. This component
 * only owns the cosmetic, big-dial-only effects:
 *   - Drag / knob / keyboard handlers (write through to setTenths)
 *   - The rAF static-shimmer wobble on the readout
 *   - The IntersectionObserver that tells the mini radio when to hide
 *     itself behind the big cabinet
 *   - The type-out reveal of the daily transmission line
 *
 * Implementation notes / patterns:
 *   - Static-bar wobble (the small CMYK shimmer overlay on the readout)
 *     uses the same rAF + reduced-motion + pointer:fine guard as
 *     `HalftoneOrb.vue` (lines 75–87). Damps as we approach the locked
 *     frequency.
 *   - Lock-line fade-in mirrors the IntersectionObserver gate used for
 *     `bigQuoteInView` in `index.vue` lines 24–42, but here it's the
 *     `locked` state that drives the keyframe — replayable on re-tune.
 *   - Easing tokens (`--ease-pop`) and the `halftone` utility come from
 *     `main.css` (lines 39 and 157).
 */

const {
  MIN_TENTHS,
  MAX_TENTHS,
  STEP_TENTHS,
  tenths,
  isPlaying,
  audioMuted,
  nowPlaying,
  mhz,
  mhzLabel,
  distanceTenths,
  locked,
  transmission,
  setTenths,
  nudge,
  toggleMute,
  setDialInView,
} = useRadioPlayer()

// ── Drag interaction ───────────────────────────────────────────────────
// Translate horizontal pointer movement into tenths-of-MHz at a fixed
// pixels-per-tick ratio so the gesture feels consistent regardless of
// dial width.
const PX_PER_TICK = 14
const trackEl = ref<HTMLElement | null>(null)
const dragging = ref(false)
let dragStartX = 0
let dragStartTenths = 0

function onPointerDown(e: PointerEvent) {
  if (!trackEl.value) return
  dragging.value = true
  dragStartX = e.clientX
  dragStartTenths = tenths.value
  trackEl.value.setPointerCapture(e.pointerId)
}
function onPointerMove(e: PointerEvent) {
  if (!dragging.value) return
  const dx = e.clientX - dragStartX
  setTenths(dragStartTenths - dx / PX_PER_TICK)
}
function onPointerUp(e: PointerEvent) {
  if (!dragging.value || !trackEl.value) return
  dragging.value = false
  try { trackEl.value.releasePointerCapture(e.pointerId) }
  catch { /* ignore — capture may already be released */ }
}

// ── Keyboard ───────────────────────────────────────────────────────────
function onKeydown(e: KeyboardEvent) {
  switch (e.key) {
    case 'ArrowLeft':
    case 'ArrowDown':
      nudge(-STEP_TENTHS); e.preventDefault(); break
    case 'ArrowRight':
    case 'ArrowUp':
      nudge(STEP_TENTHS); e.preventDefault(); break
    case 'PageDown':
      nudge(-10); e.preventDefault(); break
    case 'PageUp':
      nudge(10); e.preventDefault(); break
    case 'Home':
      setTenths(MIN_TENTHS); e.preventDefault(); break
    case 'End':
      setTenths(MAX_TENTHS); e.preventDefault(); break
  }
}

// ── Knob rotation — the visible knob rotates from −135° at 88.0 MHz to
// +135° at 108.0 MHz so the user feels they are physically turning the
// dial. Driven by `tenths`, so spinning the knob and dragging the
// strip stay perfectly in sync.
const knobRotation = computed(() => {
  const t = (tenths.value - MIN_TENTHS) / (MAX_TENTHS - MIN_TENTHS)
  return -135 + t * 270
})

// ── Knob drag — circular gesture. Click anywhere on the knob, then
// rotate the cursor around its center; the knob follows the angular
// delta. 270° of knob rotation maps to the full FM band (200 tenths).
// We don't try to make the click-point "stick" to the cursor — that
// causes a visual jump on grab. Instead we record the start angle and
// apply only the delta, which feels like turning a real knob.
const knobEl = ref<HTMLElement | null>(null)
const knobDragging = ref(false)
let knobStartAngle = 0
let knobStartTenths = 0
let knobCx = 0
let knobCy = 0

function knobAngleAt(clientX: number, clientY: number): number {
  // atan2 returns radians in (−π, π]; we work in degrees for the
  // wrap math.
  return Math.atan2(clientY - knobCy, clientX - knobCx) * (180 / Math.PI)
}

function onKnobDown(e: PointerEvent) {
  if (!knobEl.value) return
  const r = knobEl.value.getBoundingClientRect()
  // The knob is a circle, so its AABB center is its visual center
  // regardless of rotation.
  knobCx = r.left + r.width / 2
  knobCy = r.top + r.height / 2
  knobStartAngle = knobAngleAt(e.clientX, e.clientY)
  knobStartTenths = tenths.value
  knobDragging.value = true
  knobEl.value.setPointerCapture(e.pointerId)
  e.preventDefault()
}

function onKnobMove(e: PointerEvent) {
  if (!knobDragging.value) return
  const angle = knobAngleAt(e.clientX, e.clientY)
  let delta = angle - knobStartAngle
  // Unwrap the cross-boundary case (e.g. 170° → −170° should read as
  // +20°, not −340°). A single drag is therefore capped at ±180° per
  // gesture; users release and re-grab to keep turning, just like a
  // real knob with finger reach limits.
  if (delta > 180) delta -= 360
  if (delta < -180) delta += 360
  const tenthsDelta = (delta / 270) * (MAX_TENTHS - MIN_TENTHS)
  setTenths(knobStartTenths + tenthsDelta)
}

function onKnobUp(e: PointerEvent) {
  if (!knobDragging.value || !knobEl.value) return
  knobDragging.value = false
  try { knobEl.value.releasePointerCapture(e.pointerId) }
  catch { /* ignore — capture may already be released */ }
}

// ── Static shimmer (rAF wobble on the readout) ─────────────────────────
// Tiny offset on the readout text-shadow that scales with how far we are
// from today's MHz, so the riso aberration noises down as you tune in.
const noise = ref(0)
let raf = 0
let active = false

function tick() {
  // Distance is in tenths; clamp the noise factor so being far away
  // doesn't push amplitude beyond a tasteful ceiling.
  const target = locked.value ? 0 : Math.min(1, distanceTenths.value / 60)
  // Smooth toward target so locking/unlocking eases visually.
  noise.value += (target - noise.value) * 0.12
  raf = requestAnimationFrame(tick)
}

// ── Visibility — tells the mini radio to stand down while the big
// cabinet is on screen. The threshold is generous (0.05) so the mini
// player only takes over once the big dial is genuinely off-screen,
// not just clipped by a few pixels at the edge during a slow scroll.
const cabinetEl = ref<HTMLElement | null>(null)
let visibilityObs: IntersectionObserver | null = null

onMounted(() => {
  // rAF wobble — guard pattern matches HalftoneOrb.vue (coarse
  // pointers and reduced-motion both want the wobble disabled).
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const fine = window.matchMedia('(pointer: fine)').matches
  if (!reduced && fine) {
    active = true
    raf = requestAnimationFrame(tick)
  }

  // Big-dial visibility → drives MiniRadio.vue. The mini radio
  // appears only when (a) the user has tuned in at least once and
  // (b) the big cabinet is not currently on screen. Both halves of
  // that condition live in the composable; this observer feeds (b).
  if (cabinetEl.value && 'IntersectionObserver' in window) {
    visibilityObs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) setDialInView(e.isIntersecting)
      },
      { threshold: 0.05 },
    )
    visibilityObs.observe(cabinetEl.value as unknown as Element)
  }
})

onBeforeUnmount(() => {
  if (active) cancelAnimationFrame(raf)
  if (visibilityObs) {
    visibilityObs.disconnect()
    visibilityObs = null
  }
  // Crucial: when the homepage is unmounted (navigation away), the
  // big dial is by definition no longer on screen. Without this, a
  // late-firing observer entry could leave `dialInView` stuck on
  // true and suppress the mini radio on the next route. Audio is
  // intentionally NOT torn down here — it lives in the composable
  // singleton so the stream keeps playing across pages.
  setDialInView(false)
})

// ── Type-out reveal ────────────────────────────────────────────────────
const typed = ref('')
let typeTimer: ReturnType<typeof setInterval> | null = null

function clearType() {
  if (typeTimer) {
    clearInterval(typeTimer)
    typeTimer = null
  }
}

watch(locked, (isLocked) => {
  clearType()
  if (!isLocked) {
    typed.value = ''
    return
  }
  const target = transmission.value
  // Reduced-motion users get the line all at once — same accommodation
  // pattern as `AnimatedStat.vue` (lines 61–67).
  const reduced
    = typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced || !target) {
    typed.value = target
    return
  }
  typed.value = ''
  let i = 0
  typeTimer = setInterval(() => {
    i++
    typed.value = target.slice(0, i)
    if (i >= target.length) clearType()
  }, 30)
})

onBeforeUnmount(clearType)

// ── Tick-strip geometry ────────────────────────────────────────────────
const TOTAL_TICKS = MAX_TENTHS - MIN_TENTHS + 1
const stripOffsetPx = computed(() => -(tenths.value - MIN_TENTHS) * PX_PER_TICK)
</script>

<template>
  <div class="mx-auto max-w-5xl">
    <!-- ── Compact header — eyebrow + medium heading on a single row ─── -->
    <header class="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-cream/15 pb-5">
      <div>
        <span class="text-mono-eyebrow text-cream/60">Section II — Transmission</span>
        <h2 class="text-display-md mt-2 text-cream md:text-4xl lg:text-5xl">
          Tune the <span class="text-pop-magenta italic font-serif">dial.</span>
        </h2>
      </div>
      <p class="text-editorial max-w-[34ch] text-base text-cream/70 md:text-right md:text-lg">
        Pirate signal from the den. Mostly howls, occasionally on-key.
      </p>
    </header>

    <!-- ── Radio cabinet ──────────────────────────────────────────────── -->
    <div
      id="radio-cabinet"
      ref="cabinetEl"
      class="radio-cabinet"
      :class="locked ? 'is-locked' : ''"
    >
      <!-- Top brand stamp — like the silver nameplate on a mid-century set.
           When the stream is live, an ON AIR badge flickers in next to
           the model number, paired with the mute toggle so the broadcast
           controls live in one place. -->
      <div class="radio-brand">
        <span class="brand-mark" aria-hidden="true">◑</span>
        <!-- The brand-name slot doubles as the now-playing readout:
             while the stream is on, it shows the current SomaFM track
             (artist — title); otherwise it falls back to the cabinet's
             nameplate. Crossfaded with a Vue transition so the swap
             feels like a station ident rolling over. -->
        <span class="brand-name brand-name--swap">
          <transition name="brand-swap" mode="out-in">
            <span
              v-if="isPlaying && nowPlaying"
              key="np"
              class="brand-np"
            >
              <span class="brand-np__icon" aria-hidden="true">♪</span>
              <span class="brand-np__artist">{{ nowPlaying.artist }}</span>
              <span class="brand-np__sep" aria-hidden="true">—</span>
              <span class="brand-np__title">{{ nowPlaying.title }}</span>
            </span>
            <span v-else key="brand">Wolves · Pack Radio</span>
          </transition>
        </span>
        <span class="brand-model">Model № Δ-99</span>
        <transition name="onair-fade">
          <div v-if="isPlaying" class="brand-onair-group">
            <span class="brand-onair" aria-hidden="true">
              <span class="brand-onair__dot" />
              On Air
            </span>
            <button
              type="button"
              class="brand-mute"
              :aria-pressed="audioMuted"
              :aria-label="audioMuted ? 'Unmute pack radio stream' : 'Mute pack radio stream'"
              :title="audioMuted ? 'Unmute stream' : 'Mute stream'"
              @click="toggleMute"
            >
              <Icon
                :name="audioMuted ? 'lucide:volume-x' : 'lucide:volume-2'"
                class="text-base"
              />
            </button>
          </div>
        </transition>
      </div>

      <!-- Body — speaker | dial face | tuning knob -->
      <div class="radio-body">
        <!-- Speaker grille: halftone dots over a recessed circle, with
             cabinet bolts in the corners. The cone subtly pulses while
             the stream is playing — pure ornament, but it sells the
             illusion that the cabinet is actually pushing air. -->
        <div
          class="radio-speaker"
          :class="isPlaying ? 'is-playing' : ''"
          aria-hidden="true"
        >
          <div class="speaker-cone" />
          <div class="speaker-grille halftone" />
          <span class="speaker-bolt speaker-bolt--tl" />
          <span class="speaker-bolt speaker-bolt--tr" />
          <span class="speaker-bolt speaker-bolt--bl" />
          <span class="speaker-bolt speaker-bolt--br" />
        </div>

        <!-- Dial face — readout, status LED, and the tuning scale.
             This is the interactive heart of the radio. -->
        <div class="radio-dialface">
          <!-- Top row — readout + LED status -->
          <div class="dial-readout-row">
            <div class="dial-readout">
              <span
                class="readout-num"
                :class="locked ? 'is-locked' : ''"
                :style="{
                  textShadow: noise > 0
                    ? `${noise * 0.06}em ${noise * 0.04}em 0 var(--color-pop-magenta), ${noise * -0.05}em ${noise * -0.05}em 0 #5ec8e5`
                    : undefined,
                }"
              >{{ mhzLabel }}</span>
              <span class="readout-unit">MHz</span>
            </div>
            <div class="dial-status">
              <span class="led" :class="locked ? 'is-on' : ''" aria-hidden="true" />
              <span class="status-label">{{ locked ? 'Locked' : 'Tuning' }}</span>
            </div>
          </div>

          <!-- Tuning scale — the heart of the radio. Drag, click ±, or
               keyboard to tune. The strip translates under a fixed
               magenta needle. -->
          <div
            ref="trackEl"
            class="dial-track"
            :class="dragging ? 'is-dragging' : ''"
            role="slider"
            tabindex="0"
            :aria-valuemin="MIN_TENTHS / 10"
            :aria-valuemax="MAX_TENTHS / 10"
            :aria-valuenow="mhz"
            :aria-valuetext="`${mhzLabel} MHz`"
            aria-label="Radio dial — drag horizontally or use arrow keys to tune"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointercancel="onPointerUp"
            @keydown="onKeydown"
          >
            <!-- Strip — translates under the needle. While dragging we
                 drop the snap easing so motion is 1:1. -->
            <div
              class="dial-strip"
              :class="dragging ? 'is-dragging' : ''"
              :style="{ transform: `translate3d(${stripOffsetPx}px, 0, 0)` }"
            >
              <span
                v-for="i in TOTAL_TICKS"
                :key="i"
                class="dial-tick"
                :class="[
                  ((MIN_TENTHS + (i - 1)) % 10 === 0) ? 'dial-tick--major'
                    : ((MIN_TENTHS + (i - 1)) % 5 === 0) ? 'dial-tick--mid'
                    : 'dial-tick--minor',
                ]"
              >
                <span
                  v-if="((MIN_TENTHS + (i - 1)) % 10 === 0)"
                  class="dial-tick__label"
                >{{ (MIN_TENTHS + (i - 1)) / 10 }}</span>
              </span>
            </div>

            <!-- Center needle, fixed -->
            <span class="dial-needle" aria-hidden="true" />

            <!-- Lock halo — soft yellow glow when tuned. -->
            <span
              class="dial-halo"
              :class="locked ? 'is-on' : ''"
              aria-hidden="true"
            />
          </div>

          <!-- Band markings — vintage radios always say AM/FM/SW etc. -->
          <div class="dial-band">
            <span class="band-on">FM</span>
            <span class="band-off">AM</span>
            <span class="band-off">SW</span>
            <span class="band-spacer" />
            <span class="band-stereo">◖◗ Stereo</span>
          </div>
        </div>

        <!-- Tuning knob — fully interactive. Click and rotate the
             cursor around the knob's center to tune; release and
             re-grab to keep turning past ±180°. The dial track
             stays the primary slider for screen readers, so the
             knob is hidden from the AT tree to avoid two redundant
             slider widgets controlling the same value. -->
        <div class="radio-knob-wrap" aria-hidden="true">
          <div
            ref="knobEl"
            class="radio-knob"
            :class="knobDragging ? 'is-dragging' : ''"
            :style="{ transform: `rotate(${knobRotation}deg)` }"
            @pointerdown="onKnobDown"
            @pointermove="onKnobMove"
            @pointerup="onKnobUp"
            @pointercancel="onKnobUp"
          >
            <span class="knob-notch" />
            <span class="knob-grip" />
          </div>
          <span class="knob-label">Tune</span>
        </div>
      </div>

      <!-- Footer — round chrome push-buttons styled like vintage
           car-radio preset hardware, with etched cabinet labels
           underneath. The reveal line sits between them. -->
      <footer class="radio-footer">
        <div class="radio-button-cluster">
          <button
            type="button"
            class="radio-nudge"
            aria-label="Tune down 0.1 MHz"
            @click="nudge(-STEP_TENTHS)"
          >
            <span class="radio-nudge__icon" aria-hidden="true">◂</span>
          </button>
          <span class="radio-button__label">−0.1</span>
        </div>

        <div class="radio-reveal">
          <transition name="reveal-fade" mode="out-in">
            <div v-if="locked" key="locked" class="reveal-locked">
              <span class="reveal-eyebrow">▸ Transmission received</span>
              <p class="reveal-line">
                {{ typed }}<span
                  v-if="typed.length < transmission.length"
                  class="caret"
                  aria-hidden="true"
                >▍</span>
              </p>
            </div>
            <span v-else key="idle" class="reveal-idle">
              <span class="scan-dot" aria-hidden="true" />
              Scanning the band…
            </span>
          </transition>
        </div>

        <div class="radio-button-cluster">
          <button
            type="button"
            class="radio-nudge"
            aria-label="Tune up 0.1 MHz"
            @click="nudge(STEP_TENTHS)"
          >
            <span class="radio-nudge__icon" aria-hidden="true">▸</span>
          </button>
          <span class="radio-button__label">+0.1</span>
        </div>
      </footer>
    </div>
  </div>
</template>

<style scoped>
/* ============================================================
   Cabinet — vintage radio frame
   - Cream/paper body so it reads as a physical object against
     the dark page.
   - Inset cream border + outer drop shadow give a tactile
     "this thing has weight" feel.
   ============================================================ */
.radio-cabinet {
  background: var(--color-paper);
  color: var(--color-ink);
  border: 2px solid var(--color-ink);
  border-radius: 14px;
  padding: 1.25rem;
  position: relative;
  box-shadow:
    inset 0 0 0 4px var(--color-cream),
    inset 0 0 0 5px var(--color-ink),
    0 14px 32px rgba(0, 0, 0, 0.55),
    0 2px 0 rgba(0, 0, 0, 0.4);
  transition: box-shadow 320ms var(--ease-pop);
}
.radio-cabinet.is-locked {
  box-shadow:
    inset 0 0 0 4px var(--color-cream),
    inset 0 0 0 5px var(--color-ink),
    0 0 0 2px color-mix(in oklab, var(--color-pop-yellow) 50%, transparent),
    0 14px 32px rgba(0, 0, 0, 0.55),
    0 2px 0 rgba(0, 0, 0, 0.4);
}

/* ── Brand strip — the rounded silver nameplate at the top. */
.radio-brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.4rem 0.85rem;
  margin-bottom: 1rem;
  background: var(--color-cream);
  border: 1px solid var(--color-ink);
  border-radius: 4px;
  font-family: var(--font-display);
  font-size: 0.85rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}
.brand-mark {
  color: var(--color-pop-magenta);
  font-size: 1rem;
}
.brand-name { flex: 1; }
/* When the brand-name slot is hosting a swap transition we need
   min-width: 0 so the inner ellipsis on long track titles can take
   effect inside the flex layout. */
.brand-name--swap {
  min-width: 0;
  overflow: hidden;
}

/* ── Now-playing — replaces the brand stamp with the live SomaFM
   track. We drop the display-font uppercase look in favour of legible
   mono + italic serif: track titles are case-sensitive and often
   long, so reading them in caps would be unkind. */
.brand-np {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: none;
  color: var(--color-ink);
}
.brand-np__icon {
  color: var(--color-pop-magenta);
  font-size: 0.85rem;
  flex-shrink: 0;
  /* Subtle pulse so the music note feels live rather than printed. */
  animation: led-pulse 1.6s ease-in-out infinite;
}
.brand-np__artist {
  font-weight: 600;
  flex-shrink: 0;
  white-space: nowrap;
}
.brand-np__sep {
  opacity: 0.45;
  flex-shrink: 0;
}
.brand-np__title {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 0.85rem;
  letter-spacing: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

/* Crossfade between brand and now-playing — short, soft, station-ident-y. */
.brand-swap-enter-active,
.brand-swap-leave-active {
  transition: opacity 240ms var(--ease-pop);
}
.brand-swap-enter-from,
.brand-swap-leave-to {
  opacity: 0;
}
.brand-model {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  letter-spacing: 0.2em;
  opacity: 0.65;
}

/* ── ON AIR group — the badge + mute toggle sit together at the right
   end of the brand strip, paired so all the broadcast controls live
   in one place rather than scattered around the cabinet. */
.brand-onair-group {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

/* ── ON AIR badge — flickers in next to the model number when the
   stream is playing. Tiny, magenta, broadcast-ish. */
.brand-onair {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.1rem 0.45rem;
  background: var(--color-pop-magenta);
  color: var(--color-cream);
  border: 1px solid var(--color-ink);
  border-radius: 3px;
  font-family: var(--font-mono);
  font-size: 0.55rem;
  font-weight: 500;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  animation: lock-flicker 1.8s ease-in-out infinite;
}

/* ── Mute toggle — small chiclet alongside the ON AIR badge. Lets a
   listener kill the audio without losing the transmission reveal. */
.brand-mute {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 1px solid var(--color-ink);
  background: var(--color-cream);
  color: var(--color-ink);
  border-radius: 3px;
  cursor: pointer;
  transition:
    background-color 220ms var(--ease-pop),
    color 220ms var(--ease-pop);
}
.brand-mute:hover {
  background: var(--color-pop-yellow);
}
.brand-mute[aria-pressed="true"] {
  background: var(--color-ink);
  color: var(--color-cream);
}
.brand-onair__dot {
  width: 5px; height: 5px;
  border-radius: 50%;
  background: var(--color-cream);
  animation: led-pulse 1.4s ease-in-out infinite;
}
.onair-fade-enter-active,
.onair-fade-leave-active {
  transition: opacity 320ms var(--ease-pop), transform 320ms var(--ease-pop);
}
.onair-fade-enter-from,
.onair-fade-leave-to {
  opacity: 0;
  transform: translateY(-2px) scale(0.94);
}

/* ── Body grid — speaker | dial | knob */
.radio-body {
  display: grid;
  grid-template-columns: minmax(140px, 1fr) minmax(280px, 2.4fr) auto;
  gap: 0.85rem;
  align-items: stretch;
}
/* ============================================================
   Speaker — recessed cone behind a halftone-dot grille, with
   four cabinet bolts in the corners. Pure ornament.
   The mobile/tablet-narrow overrides for these rules sit AFTER
   the base block (see `@media (max-width: 880px)` further down)
   so source order makes them win the cascade.
   ============================================================ */
.radio-speaker {
  position: relative;
  background: var(--color-cream);
  border: 1px solid var(--color-ink);
  border-radius: 8px;
  overflow: hidden;
  /* Inner shadow to suggest depth behind the grille */
  box-shadow:
    inset 0 0 0 1px color-mix(in oklab, var(--color-ink) 15%, transparent),
    inset 0 6px 16px rgba(0, 0, 0, 0.18);
  min-height: 180px;
}
.speaker-cone {
  position: absolute;
  inset: 12%;
  border-radius: 50%;
  background:
    radial-gradient(circle at 38% 32%, color-mix(in oklab, var(--color-paper) 90%, transparent), transparent 55%),
    radial-gradient(circle at 50% 50%, var(--color-cream-dim), color-mix(in oklab, var(--color-ink) 18%, transparent) 70%, color-mix(in oklab, var(--color-ink) 35%, transparent) 100%);
  box-shadow:
    inset 0 0 0 1px color-mix(in oklab, var(--color-ink) 35%, transparent),
    inset 0 4px 8px rgba(0, 0, 0, 0.25);
}
.speaker-cone::after {
  /* Voice-coil dome at the center of the cone.
     transform-based centering references the element's OWN dimensions,
     unlike percentage margins (which always resolve against the
     containing block's WIDTH — even for `margin-top`). That trap silently
     mis-centers the dome whenever the cone isn't square. */
  content: "";
  position: absolute;
  top: 50%; left: 50%;
  width: 24%; height: 24%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, var(--color-cream), color-mix(in oklab, var(--color-ink) 60%, transparent));
  box-shadow: inset 0 0 0 1px var(--color-ink);
}
.speaker-grille {
  /* Halftone utility provides the dot pattern; we just sit it on top
     of the speaker cone at a stronger ink color so the dots read
     against the warm background. */
  position: absolute;
  inset: 0;
  color: var(--color-ink);
  background-size: 7px 7px;
  opacity: 0.65;
  mix-blend-mode: multiply;
}
.speaker-bolt {
  position: absolute;
  width: 7px; height: 7px;
  border-radius: 50%;
  background: var(--color-ink);
  box-shadow:
    inset 0 1px 0 color-mix(in oklab, var(--color-cream) 35%, transparent),
    0 1px 0 color-mix(in oklab, var(--color-cream) 70%, transparent);
}
.speaker-bolt--tl { top: 8px; left: 8px; }
.speaker-bolt--tr { top: 8px; right: 8px; }
.speaker-bolt--bl { bottom: 8px; left: 8px; }
.speaker-bolt--br { bottom: 8px; right: 8px; }

/* ── Speaker pulse — gentle scale animation on the cone while the
   stream is playing. Sells the illusion that air is being pushed
   without distracting from the dial. */
.radio-speaker.is-playing .speaker-cone {
  animation: speaker-pulse 1.1s ease-in-out infinite;
}
@keyframes speaker-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
}

/* ── Mobile / tablet-narrow overrides ──────────────────────────────────
   This block sits AFTER the speaker base rules on purpose: when both
   rule-sets target the same selector (`.radio-speaker`, `.speaker-cone`)
   with the same specificity, source order decides — and the base
   `.speaker-cone { inset: 12% }` would otherwise clobber our centering
   `top: 50%; left: 50%` here. Keep this block last, after the base. */
@media (max-width: 880px) {
  .radio-body {
    /* Stack speaker on top of dial, hide knob — it's decorative.
       Breakpoint is 880px (not 720) so tablet-portrait viewports
       (iPad ~768, iPad mini ~744) also get the stacked layout —
       at those widths the 3-column row is too tight. */
    grid-template-columns: 1fr;
  }
  .radio-knob-wrap { display: none; }
  .radio-speaker {
    /* `min-height: 180px` (base rule) plus an `aspect-ratio` would
       fight: the browser pins height at 180 and derives a wider width
       from the ratio, which on narrow viewports overflows the cabinet.
       Drop both constraints and use an explicit, modest height so
       the speaker reads as a horizontal grille without dominating. */
    aspect-ratio: auto;
    min-height: 0;
    height: 96px;
    max-width: 100%;
  }
  .speaker-cone {
    /* Override `inset: 12%` (which would stretch the cone into a
       wide ellipse on a wide-but-short speaker). Explicit circular
       sizing centered inside the speaker mimics a real horizontal-
       format radio with a single round speaker port in the grille. */
    inset: auto;
    top: 50%;
    left: 50%;
    width: 72px;
    height: 72px;
    transform: translate(-50%, -50%);
  }
  .radio-speaker.is-playing .speaker-cone {
    /* The desktop pulse keyframe uses `transform: scale(...)` which
       would clobber the centering transform above. Compose both in
       a mobile-specific keyframe so the cone stays centered while pulsing. */
    animation: speaker-pulse-mobile 1.1s ease-in-out infinite;
  }
}
@keyframes speaker-pulse-mobile {
  0%, 100% { transform: translate(-50%, -50%) scale(1); }
  50%      { transform: translate(-50%, -50%) scale(1.02); }
}

/* ============================================================
   Dial face — the warm yellow paper dial behind glass
   ============================================================ */
.radio-dialface {
  position: relative;
  background:
    /* faint vertical "glass reflection" highlight */
    linear-gradient(180deg, color-mix(in oklab, white 20%, transparent), transparent 40%),
    var(--color-pop-yellow-soft);
  border: 1px solid var(--color-ink);
  border-radius: 8px;
  padding: 0.85rem 1rem 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  box-shadow:
    inset 0 0 0 1px color-mix(in oklab, var(--color-ink) 18%, transparent),
    inset 0 1px 4px color-mix(in oklab, var(--color-ink) 22%, transparent);
}

/* ── Readout row — big MHz number + LED status */
.dial-readout-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  border-bottom: 1px dashed color-mix(in oklab, var(--color-ink) 30%, transparent);
  padding-bottom: 0.45rem;
}
.dial-readout {
  display: inline-flex;
  align-items: baseline;
  gap: 0.4rem;
}
.readout-num {
  font-family: var(--font-display);
  font-size: clamp(2rem, 4.5vw, 2.75rem);
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: var(--color-ink);
  line-height: 1;
  /* The inline `text-shadow` from script provides riso aberration
     while tuning; the property animates smoothly here. */
  transition: text-shadow 220ms linear, color 320ms var(--ease-pop);
}
.readout-num.is-locked {
  color: var(--color-pop-magenta);
  animation: readout-shimmer 1.6s ease-in-out infinite;
}
@keyframes readout-shimmer {
  0%, 100% {
    text-shadow:
       0.04em  0.04em 0 var(--color-pop-yellow),
      -0.04em -0.04em 0 #5ec8e5;
  }
  50% {
    text-shadow:
       0.07em  0.07em 0 var(--color-pop-yellow),
      -0.07em -0.07em 0 #5ec8e5,
       0.05em -0.05em 0 var(--color-pop-orange);
  }
}
.readout-unit {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: color-mix(in oklab, var(--color-ink) 70%, transparent);
}

/* ── Status — LED + label */
.dial-status {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-family: var(--font-mono);
  font-size: 0.65rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: color-mix(in oklab, var(--color-ink) 65%, transparent);
}
.led {
  width: 9px; height: 9px;
  border-radius: 50%;
  background: color-mix(in oklab, var(--color-pop-orange) 35%, transparent);
  box-shadow:
    inset 0 0 0 1px var(--color-ink),
    inset 0 1px 1px rgba(0, 0, 0, 0.4);
  transition: background-color 260ms var(--ease-pop), box-shadow 260ms var(--ease-pop);
}
.led.is-on {
  background: var(--color-pop-yellow);
  box-shadow:
    inset 0 0 0 1px var(--color-ink),
    0 0 10px var(--color-pop-yellow),
    0 0 18px color-mix(in oklab, var(--color-pop-yellow) 60%, transparent);
  animation: led-pulse 1.6s ease-in-out infinite;
}
@keyframes led-pulse {
  0%, 100% { filter: brightness(1); }
  50% { filter: brightness(1.25); }
}


/* ── Dial track — drag area + tick strip + needle + halo */
.dial-track {
  position: relative;
  height: 84px;
  cursor: grab;
  user-select: none;
  touch-action: pan-y;
  overflow: hidden;
  /* Subtle horizontal gradient so the band feels "lit" at the
     center, like vintage radios with a backlit dial. */
  background:
    radial-gradient(ellipse at center, color-mix(in oklab, white 28%, transparent), transparent 65%);
  border-top: 1px solid color-mix(in oklab, var(--color-ink) 25%, transparent);
  border-bottom: 1px solid color-mix(in oklab, var(--color-ink) 25%, transparent);
}
.dial-track:active { cursor: grabbing; }
.dial-track:focus-visible {
  outline: 2px solid var(--color-pop-magenta);
  outline-offset: 3px;
}

.dial-strip {
  position: absolute;
  inset: 0;
  left: 50%;
  display: flex;
  align-items: flex-end;
  transition: transform 220ms var(--ease-pop);
}
.dial-strip.is-dragging { transition: none; }

.dial-tick {
  width: 14px; /* must match PX_PER_TICK */
  height: 100%;
  position: relative;
  flex-shrink: 0;
}
.dial-tick::before {
  content: "";
  position: absolute;
  bottom: 1.4rem;
  left: 0;
  width: 1px;
  background: var(--color-ink);
}
.dial-tick--minor::before { height: 7px; opacity: 0.4; }
.dial-tick--mid::before { height: 12px; opacity: 0.65; }
.dial-tick--major::before { height: 22px; opacity: 1; }
.dial-tick__label {
  position: absolute;
  bottom: 0;
  left: 0;
  transform: translateX(-50%);
  font-family: var(--font-mono);
  font-size: 0.7rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--color-ink);
  white-space: nowrap;
}

.dial-needle {
  position: absolute;
  top: 0;
  bottom: 1.4rem;
  left: 50%;
  width: 2px;
  margin-left: -1px;
  background: var(--color-pop-magenta);
  box-shadow:
    0 0 0 1px color-mix(in oklab, var(--color-pop-magenta) 40%, transparent),
    0 0 12px color-mix(in oklab, var(--color-pop-magenta) 70%, transparent);
}
.dial-needle::before {
  /* Pointer at the top, like a real dial needle. */
  content: "";
  position: absolute;
  top: -7px;
  left: 50%;
  margin-left: -6px;
  width: 0; height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 8px solid var(--color-pop-magenta);
}

.dial-halo {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 130px;
  height: 130px;
  margin: -65px 0 0 -65px;
  border-radius: 50%;
  background: radial-gradient(
    closest-side,
    color-mix(in oklab, var(--color-pop-yellow) 65%, transparent),
    transparent 70%
  );
  opacity: 0;
  transition: opacity 480ms var(--ease-pop);
  pointer-events: none;
}
.dial-halo.is-on { opacity: 0.7; }

/* ── Band markings — small "FM/AM/SW · STEREO" row under the dial */
.dial-band {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  font-family: var(--font-mono);
  font-size: 0.6rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: color-mix(in oklab, var(--color-ink) 60%, transparent);
}
.band-on {
  color: var(--color-ink);
  background: var(--color-pop-yellow);
  border: 1px solid var(--color-ink);
  padding: 1px 6px;
  border-radius: 2px;
}
.band-off {
  border: 1px solid color-mix(in oklab, var(--color-ink) 35%, transparent);
  padding: 1px 6px;
  border-radius: 2px;
  opacity: 0.55;
}
.band-spacer { flex: 1; }
.band-stereo {
  color: var(--color-pop-magenta);
}

/* ============================================================
   Tuning knob — circular, with a magenta notch indicating
   rotation, and a fine grip pattern around the edge.
   ============================================================ */
.radio-knob-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0 0.25rem;
}
.radio-knob {
  position: relative;
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background:
    /* highlight + ink fill */
    radial-gradient(circle at 32% 28%, color-mix(in oklab, var(--color-cream) 70%, transparent), transparent 55%),
    radial-gradient(circle at 50% 60%, color-mix(in oklab, var(--color-ink) 90%, transparent), var(--color-ink));
  border: 2px solid var(--color-ink);
  box-shadow:
    inset 0 0 0 4px color-mix(in oklab, var(--color-cream) 22%, transparent),
    inset 0 -8px 14px rgba(0, 0, 0, 0.55),
    0 4px 0 rgba(0, 0, 0, 0.35),
    0 8px 14px rgba(0, 0, 0, 0.35);
  /* Interactive — circular drag rotates the knob and tunes the dial. */
  cursor: grab;
  touch-action: none;
  user-select: none;
  transition: transform 220ms var(--ease-pop);
}
.radio-knob:active,
.radio-knob.is-dragging {
  cursor: grabbing;
}
.radio-knob.is-dragging {
  /* During drag the rotation must follow the pointer 1:1; killing the
     transition makes it tactile rather than rubbery. */
  transition: none;
}
.knob-notch {
  position: absolute;
  top: 6%;
  left: 50%;
  width: 5px;
  height: 26%;
  margin-left: -2.5px;
  background: var(--color-pop-magenta);
  border-radius: 2px;
  box-shadow: 0 0 6px color-mix(in oklab, var(--color-pop-magenta) 80%, transparent);
}
.knob-grip {
  position: absolute;
  inset: 14%;
  border-radius: 50%;
  /* Conic gradient simulates the knurled grip ridges around a dial. */
  background:
    repeating-conic-gradient(
      from 0deg,
      color-mix(in oklab, var(--color-cream) 18%, transparent) 0deg 6deg,
      transparent 6deg 12deg
    );
  /* Inner well — where the grip meets the central cap. */
  box-shadow:
    inset 0 0 0 2px color-mix(in oklab, var(--color-cream) 15%, transparent),
    inset 0 0 18px rgba(0, 0, 0, 0.6);
}
.knob-grip::after {
  /* Center cap — like a chrome boss on the knob. */
  content: "";
  position: absolute;
  top: 50%; left: 50%;
  width: 32%; height: 32%;
  margin: -16% 0 0 -16%;
  border-radius: 50%;
  background:
    radial-gradient(circle at 35% 35%, var(--color-cream), color-mix(in oklab, var(--color-ink) 70%, transparent));
  box-shadow: inset 0 0 0 1px var(--color-ink);
}
.knob-label {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: color-mix(in oklab, var(--color-ink) 70%, transparent);
}

/* ============================================================
   Footer — controls + reveal on a strip below the cabinet body
   ============================================================ */
.radio-footer {
  margin-top: 1rem;
  padding-top: 0.85rem;
  border-top: 1px dashed color-mix(in oklab, var(--color-ink) 35%, transparent);
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

/* ── Tuning push-buttons — round chrome caps with a magenta arrow,
   styled to match the knob's hardware aesthetic. Each sits on top of
   a tiny etched mono label so the increment is still legible. */
.radio-button-cluster {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
}
.radio-button__label {
  font-family: var(--font-mono);
  font-size: 0.55rem;
  font-weight: 500;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: color-mix(in oklab, var(--color-ink) 65%, transparent);
}
.radio-nudge {
  position: relative;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 2px solid var(--color-ink);
  border-radius: 50%;
  /* Same chrome/ink layered fill as the knob, so the buttons read as
     part of the same set of cabinet hardware. */
  background:
    radial-gradient(circle at 32% 26%, color-mix(in oklab, var(--color-cream) 80%, transparent), transparent 55%),
    radial-gradient(circle at 50% 60%, color-mix(in oklab, var(--color-ink) 90%, transparent), var(--color-ink));
  color: var(--color-pop-magenta);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  /* Stack: inset bevel ring + bottom shadow for "raised cap" feel,
     plus a flat drop shadow that recedes on press. */
  box-shadow:
    inset 0 0 0 3px color-mix(in oklab, var(--color-cream) 22%, transparent),
    inset 0 -5px 10px rgba(0, 0, 0, 0.55),
    0 3px 0 rgba(0, 0, 0, 0.4),
    0 5px 10px rgba(0, 0, 0, 0.32);
  transition: transform 120ms var(--ease-pop), box-shadow 120ms var(--ease-pop), color 220ms var(--ease-pop);
}
.radio-nudge:hover {
  color: var(--color-pop-yellow);
}
.radio-nudge:active {
  /* Press the cap into the cabinet — drop the lift and add an inset. */
  transform: translateY(2px);
  box-shadow:
    inset 0 0 0 3px color-mix(in oklab, var(--color-cream) 18%, transparent),
    inset 0 4px 8px rgba(0, 0, 0, 0.7),
    0 1px 0 rgba(0, 0, 0, 0.35);
}
.radio-nudge__icon {
  font-size: 0.95rem;
  line-height: 1;
  /* Tiny shadow under the arrow so it reads as raised lettering on
     the chrome face. */
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.55);
}

.radio-reveal {
  flex: 1;
  text-align: center;
  min-height: 2.6rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
.reveal-locked {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
}
.reveal-eyebrow {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--color-pop-magenta);
  animation: lock-flicker 1.8s ease-in-out infinite;
}
@keyframes lock-flicker {
  0%, 100% { opacity: 1; }
  20% { opacity: 0.4; }
  22% { opacity: 1; }
  60% { opacity: 0.85; }
  62% { opacity: 1; }
}
.reveal-line {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: clamp(0.95rem, 2vw, 1.15rem);
  color: var(--color-ink);
  line-height: 1.2;
}
.reveal-idle {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-family: var(--font-mono);
  font-size: 0.62rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: color-mix(in oklab, var(--color-ink) 50%, transparent);
}
.scan-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--color-pop-orange);
  box-shadow: 0 0 6px color-mix(in oklab, var(--color-pop-orange) 60%, transparent);
  animation: scan-pulse 1.4s ease-in-out infinite;
}
@keyframes scan-pulse {
  0%, 100% { opacity: 0.4; transform: scale(0.85); }
  50% { opacity: 1; transform: scale(1); }
}
.caret {
  display: inline-block;
  margin-left: 0.05em;
  color: var(--color-pop-magenta);
  animation: caret-blink 1s steps(2, end) infinite;
}
@keyframes caret-blink {
  0%, 50% { opacity: 1; }
  50.01%, 100% { opacity: 0; }
}

/* ── Reveal transition (Vue <transition>) */
.reveal-fade-enter-active,
.reveal-fade-leave-active {
  transition: opacity 280ms var(--ease-pop), transform 280ms var(--ease-pop);
}
.reveal-fade-enter-from,
.reveal-fade-leave-to {
  opacity: 0;
  transform: translateY(3px);
}

/* ============================================================
   Reduced motion — kill all decorative animations.
   ============================================================ */
@media (prefers-reduced-motion: reduce) {
  .radio-cabinet,
  .readout-num.is-locked,
  .led.is-on,
  .reveal-eyebrow,
  .scan-dot,
  .caret,
  .radio-knob,
  .radio-speaker.is-playing .speaker-cone,
  .brand-onair,
  .brand-onair__dot,
  .brand-np__icon {
    animation: none;
    transition: none;
  }
  .radio-knob {
    transform: none !important;
  }
  .dial-strip {
    transition: none;
  }
  .reveal-fade-enter-active,
  .reveal-fade-leave-active,
  .onair-fade-enter-active,
  .onair-fade-leave-active,
  .brand-swap-enter-active,
  .brand-swap-leave-active {
    transition: opacity 200ms ease;
    transform: none !important;
  }
}
</style>
