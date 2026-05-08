<script setup lang="ts">
import type { NuxtError } from '#app'

/**
 * Global error page — Nuxt renders this for both 404s and uncaught
 * runtime errors. Riso-print aesthetic with a small game embedded:
 * "Howl Hunt" — the 404 narrative ("a spread that doesn't exist") is
 * extended into "a wolf wandered off — track the stray to find your
 * way home." Five catches and the "Take me to the cover" CTA blooms.
 *
 * The game is a delightful diversion — never a barrier. The three
 * navigation links remain visible and clickable from the moment the
 * page renders. AppHeader and AppFooter stay so a lost reader still
 * has the full site nav around them.
 *
 * SEO note: 404s set `noindex` so Google doesn't accumulate dead
 * spread URLs in its index when slugs change.
 */

const props = defineProps<{ error: NuxtError }>()

const is404 = computed(() => props.error?.statusCode === 404)
const code = computed(() => props.error?.statusCode ?? 500)

const heading = computed(() =>
  is404.value
    ? 'This spread doesn\'t exist.'
    : 'The press jammed.',
)
const subhead = computed(() =>
  is404.value
    ? 'You followed a link to an issue that was never printed — looks like a wolf wandered off with it. Track the stray to find your way home.'
    : 'An unexpected error stopped the run. Try again, or head back to the cover.',
)

useSeoMeta({
  title: is404.value ? 'Page not found' : 'Error',
  description: subhead.value,
  // 404s and 5xxs should never be indexed.
  robots: 'noindex, nofollow',
})

// ─────────────────────────────────────────────────────────────────────
// HOWL HUNT — game state.
//
// The wolf surfaces for ~APPEAR_BASE ms minus a difficulty curve, then
// hides for HIDE_BASE ms before reappearing somewhere else. Click before
// it darts to catch. TARGET catches wins the round.
//
// Coordinates are kept as percentages of the playfield so we don't have
// to measure the DOM on every frame — CSS transforms do the layout work.
// ─────────────────────────────────────────────────────────────────────

type PawTone = 'magenta' | 'yellow' | 'orange'
const TONES: PawTone[] = ['magenta', 'yellow', 'orange']

interface Paw {
  id: number
  x: number
  y: number
  rot: number
  tone: PawTone
}
interface Ripple {
  id: number
  x: number
  y: number
  kind: 'catch' | 'miss'
  tone: PawTone
}
// Floating "+N" that drifts up from the catch site. Two visual tiers
// (quick / lightning) earn larger glyphs so a snap-catch reads as a
// genuine flourish — the +1 pop still appears so first-time players
// can see the scoring system exists.
type SpeedTier = 'steady' | 'quick' | 'lightning'
interface ScorePop {
  id: number
  x: number
  y: number
  bonus: number
  tier: SpeedTier
  tone: PawTone
}

const TARGET = 5
const APPEAR_BASE = 1500
const HIDE_BASE = 650

// Speed bonus thresholds (ms between the wolf surfacing and a catch).
// Average human visual reaction sits ~250ms, so the "quick" tier
// (<500ms) is the comfortable middle a focused player will mostly land
// on, and "lightning" (<250ms) is the rare snap catch. Slow catches
// still earn +1 — points are a flourish, not a gate.
const SPEED_QUICK_MS = 500
const SPEED_LIGHTNING_MS = 250

const wolfX = ref(50)
const wolfY = ref(50)
const wolfVisible = ref(false)
const wolfTone = ref<PawTone>('magenta')
const caught = ref(0)
const misses = ref(0)
const score = ref(0)
const paws = ref<Paw[]>([])
const ripples = ref<Ripple[]>([])
const scorePops = ref<ScorePop[]>([])
const won = ref(false)
const startedAt = ref(0)
const finishedAt = ref(0)
const now = ref(0)
const bestTime = ref<number | null>(null)
const bestScore = ref<number | null>(null)

let pawId = 0
let rippleId = 0
let popId = 0
// Timestamp captured when the wolf surfaces — read once on catch to
// derive reaction time. Plain `let` (no ref) since it's never rendered.
let wolfAppearedAt = 0
let appearTimer: ReturnType<typeof setTimeout> | null = null
let hideTimer: ReturnType<typeof setTimeout> | null = null
let tickTimer: ReturnType<typeof setInterval> | null = null

const elapsed = computed(() => {
  if (!startedAt.value) return 0
  const end = finishedAt.value || now.value
  return Math.max(0, Math.floor((end - startedAt.value) / 1000))
})

const elapsedLabel = computed(() => {
  const s = elapsed.value
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
})

const accuracy = computed(() => {
  const total = caught.value + misses.value
  if (!total) return 100
  return Math.round((caught.value / total) * 100)
})

const bestTimeLabel = computed(() => {
  if (bestTime.value === null) return '—'
  const s = bestTime.value
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
})

const bestScoreLabel = computed(() => {
  if (bestScore.value === null) return '—'
  return String(bestScore.value)
})

const statusEyebrow = computed(() => {
  if (won.value) return 'Found · 200'
  return `Error · ${code.value}`
})

const liveLabel = computed(() => {
  if (won.value) return 'Tracked home — the den is open.'
  if (!wolfVisible.value && caught.value === 0) return 'Stray on the loose — listening for movement…'
  return 'Live · stray on the loose'
})

function pickSpot(): { x: number; y: number } {
  // Generous insets so the cream coin doesn't clip the playfield edge,
  // and a "no-spawn-zone" near the previous catch so the wolf doesn't
  // appear right where you just clicked.
  for (let i = 0; i < 8; i++) {
    const x = 10 + Math.random() * 80
    const y = 18 + Math.random() * 64
    if (Math.hypot(x - wolfX.value, y - wolfY.value) > 22) return { x, y }
  }
  return { x: 10 + Math.random() * 80, y: 18 + Math.random() * 64 }
}

function showWolf() {
  if (won.value) return
  const spot = pickSpot()
  wolfX.value = spot.x
  wolfY.value = spot.y
  wolfTone.value = TONES[caught.value % TONES.length] ?? 'magenta'
  wolfVisible.value = true
  // Stamp the surface time so performCatch() can compute reaction.
  wolfAppearedAt = Date.now()

  // Each catch shaves visibility — but never below 600ms so it stays fair.
  const visibleFor = Math.max(600, APPEAR_BASE - caught.value * 180)
  hideTimer = setTimeout(() => {
    wolfVisible.value = false
    appearTimer = setTimeout(showWolf, HIDE_BASE)
  }, visibleFor)
}

function clearTimers() {
  if (appearTimer) { clearTimeout(appearTimer); appearTimer = null }
  if (hideTimer) { clearTimeout(hideTimer); hideTimer = null }
}

function spawnRipple(x: number, y: number, kind: 'catch' | 'miss', tone: PawTone) {
  const id = rippleId++
  ripples.value = [...ripples.value, { id, x, y, kind, tone }]
  setTimeout(() => {
    ripples.value = ripples.value.filter(r => r.id !== id)
  }, 900)
}

function spawnScorePop(x: number, y: number, bonus: number, tier: SpeedTier, tone: PawTone) {
  const id = popId++
  scorePops.value = [...scorePops.value, { id, x, y, bonus, tier, tone }]
  setTimeout(() => {
    scorePops.value = scorePops.value.filter(p => p.id !== id)
  }, 1100)
}

function startGame() {
  clearTimers()
  caught.value = 0
  misses.value = 0
  score.value = 0
  paws.value = []
  ripples.value = []
  scorePops.value = []
  won.value = false
  wolfVisible.value = false
  wolfAppearedAt = 0
  startedAt.value = Date.now()
  finishedAt.value = 0
  now.value = Date.now()
  if (!tickTimer) {
    tickTimer = setInterval(() => { now.value = Date.now() }, 200)
  }
  // Tiny pause so the player sees the empty playfield and crop marks
  // before the first wolf surfaces.
  appearTimer = setTimeout(showWolf, 700)
}

// Shared catch logic — invoked from both pointer (onWolfClick) and
// keyboard (onKeydown) paths. Keeping it in one place prevents the two
// paths from drifting (the original copy-paste lost a tone update once
// already during development).
function performCatch() {
  if (!wolfVisible.value || won.value) return

  const tone = wolfTone.value

  // Speed bonus — measured from the moment the wolf surfaced.
  // Guard wolfAppearedAt with a falsy check so a malformed state never
  // hands out an undeserved 3pt (it would otherwise be Date.now() - 0,
  // a huge number that always falls through to the +1 floor — but the
  // guard is here for clarity).
  const reactionMs = wolfAppearedAt > 0
    ? Date.now() - wolfAppearedAt
    : Number.POSITIVE_INFINITY
  let bonus = 1
  let tier: SpeedTier = 'steady'
  if (reactionMs < SPEED_LIGHTNING_MS) {
    bonus = 3
    tier = 'lightning'
  }
  else if (reactionMs < SPEED_QUICK_MS) {
    bonus = 2
    tier = 'quick'
  }

  caught.value++
  score.value += bonus
  paws.value.push({
    id: pawId++,
    x: wolfX.value,
    y: wolfY.value,
    rot: Math.random() * 36 - 18,
    tone,
  })
  spawnRipple(wolfX.value, wolfY.value, 'catch', tone)
  spawnScorePop(wolfX.value, wolfY.value, bonus, tier, tone)

  clearTimers()
  wolfVisible.value = false

  if (caught.value >= TARGET) {
    finishedAt.value = Date.now()
    won.value = true
    const secs = Math.floor((finishedAt.value - startedAt.value) / 1000)
    if (bestTime.value === null || secs < bestTime.value) {
      bestTime.value = secs
      if (typeof window !== 'undefined') {
        try { localStorage.setItem('wolves.howlHunt.best', String(secs)) } catch {}
      }
    }
    if (bestScore.value === null || score.value > bestScore.value) {
      bestScore.value = score.value
      if (typeof window !== 'undefined') {
        try { localStorage.setItem('wolves.howlHunt.bestScore', String(score.value)) } catch {}
      }
    }
    // Wolf returns to the centre — "the den" — after a beat to celebrate.
    setTimeout(() => {
      wolfX.value = 50
      wolfY.value = 50
      wolfTone.value = 'yellow'
      wolfVisible.value = true
    }, 720)
  } else {
    appearTimer = setTimeout(showWolf, HIDE_BASE)
  }
}

function onWolfClick(e: MouseEvent) {
  e.stopPropagation()
  performCatch()
}

function onFieldClick(e: MouseEvent) {
  if (won.value) return
  const target = e.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const x = ((e.clientX - rect.left) / rect.width) * 100
  const y = ((e.clientY - rect.top) / rect.height) * 100
  misses.value++
  spawnRipple(x, y, 'miss', 'magenta')
}

/**
 * Spacebar as an alternate "catch" — keyboard-friendly play.
 *
 * Spacebar is special: the browser default is "scroll one viewport
 * down", and the page is taller than the viewport. If we only swallow
 * space when the wolf is visible, the player tapping at the wrong
 * moment scrolls the playfield out of view. So during active play
 * (game started, not won) we ALWAYS preventDefault on space — if the
 * wolf isn't visible the keypress is simply ignored.
 *
 * Enter is left alone so it keeps activating focused buttons/links
 * (Tab → Reset → Enter still works as expected).
 *
 * The handler also bails out if focus is on an input, contenteditable,
 * or any focusable button/link/kbd so tab-driven users keep full
 * keyboard access to the surrounding chrome.
 */
function onKeydown(e: KeyboardEvent) {
  if (e.key !== ' ' && e.key !== 'Spacebar') return
  if (won.value) return
  const t = e.target as HTMLElement | null
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
  if (t && (t.tagName === 'BUTTON' || t.tagName === 'A' || t.tagName === 'SELECT')) return

  // Always swallow space during play so the page never scrolls out from
  // under the player. The catch only fires when the wolf is visible —
  // otherwise the keypress is silently absorbed.
  e.preventDefault()
  performCatch()
}

function reset() {
  startGame()
}

function clearAndGoHome() {
  clearError({ redirect: '/' })
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('wolves.howlHunt.best')
      if (saved) bestTime.value = Number.parseInt(saved, 10)
      const savedScore = localStorage.getItem('wolves.howlHunt.bestScore')
      if (savedScore) bestScore.value = Number.parseInt(savedScore, 10)
    }
    catch {}
    window.addEventListener('keydown', onKeydown)
  }
  startGame()
})

onBeforeUnmount(() => {
  clearTimers()
  if (tickTimer) { clearInterval(tickTimer); tickTimer = null }
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', onKeydown)
  }
})
</script>

<template>
  <div class="grain min-h-dvh bg-ink text-cream flex flex-col">
    <AppHeader />

    <main class="relative isolate flex-1 overflow-hidden">
      <!-- Riso accent discs — keep the empty page from feeling empty. -->
      <div class="pointer-events-none absolute -left-12 top-32 hidden md:block">
        <HalftoneOrb tone="text-pop-magenta" size-class="h-72 w-72" :range="22" influence="toward" />
      </div>
      <div class="pointer-events-none absolute right-8 -top-8">
        <HalftoneOrb tone="text-pop-yellow" size-class="h-40 w-40" :range="14" influence="away" />
      </div>
      <div class="pointer-events-none absolute -bottom-24 right-1/4 hidden md:block">
        <HalftoneOrb tone="text-pop-orange" size-class="h-56 w-56" :range="18" influence="toward" :opacity="0.12" />
      </div>

      <div class="mx-auto max-w-[1600px] px-4 pt-20 pb-16 md:px-8 md:pt-28 md:pb-24">
        <!-- ════════════════════════════════════════════════════════
             EDITORIAL HEADER — masthead block.
             Full-bleed title (mirrors the homepage's HeroDisplay
             rhythm: eyebrow → giant title → border-t ticker → subhead
             grid). Eyebrow swaps to "Found · 200" on victory; copy and
             stickers shift in lockstep so the page itself "resolves"
             when the player wins.
        ════════════════════════════════════════════════════════ -->
        <span class="text-mono-eyebrow flex flex-wrap items-center gap-x-3 gap-y-1">
          <span :class="won ? 'text-pop-yellow' : 'text-cream/60'">{{ statusEyebrow }}</span>
          <span class="opacity-30">/</span>
          <span class="text-cream">Howl Hunt</span>
          <span class="opacity-30">·</span>
          <span class="text-editorial italic font-serif normal-case tracking-normal text-cream/80">
            track the stray
          </span>
        </span>

        <!-- The headline runs the full max-w-[1600px] so on desktop
             "This spread doesn't exist." resolves on two lines instead
             of being squeezed into seven of twelve columns. text-balance
             keeps the wrap visually even. -->
        <h1
          class="text-display-xl mt-5 text-cream leading-[0.85] text-balance"
          aria-live="polite"
        >
          <template v-if="!won">{{ heading }}</template>
          <template v-else>
            You found
            <span class="text-pop-magenta italic font-serif">the pack.</span>
          </template>
        </h1>

        <!-- Tape row — score stickers ride above a hairline rule like
             the homepage's "Live · 03 active projects" ticker. The
             stickers stay tilted and jiggle on update; their eyebrow
             labels keep the magazine voice. -->
        <div class="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4 border-t border-cream/15 pt-5 md:mt-14">
          <span class="text-mono-eyebrow flex items-center gap-2 text-cream/65">
            <span
              class="h-1.5 w-1.5 rounded-full"
              :class="won ? 'bg-pop-yellow' : 'bg-pop-magenta pulse-dot'"
            />
            {{ won ? 'Score · final' : 'Score · running total' }}
          </span>
          <div class="flex flex-wrap items-center gap-3 md:ml-auto md:gap-4">
            <StickerBadge tone="magenta" :tilt="-4" eyebrow="Quarry" jiggle>
              <span class="tabular-nums">{{ caught }} / {{ TARGET }}</span> tracked
            </StickerBadge>
            <StickerBadge tone="orange" :tilt="5" eyebrow="Score" jiggle>
              <span class="tabular-nums">{{ score }}</span> pts
            </StickerBadge>
            <StickerBadge tone="cream" :tilt="3" eyebrow="Field log">
              <span class="tabular-nums">{{ elapsedLabel }}</span>
            </StickerBadge>
            <StickerBadge tone="yellow" :tilt="-2" eyebrow="Best run" :jiggle="won">
              <span class="tabular-nums">{{ bestTimeLabel }}</span>
            </StickerBadge>
          </div>
        </div>

        <!-- Subhead — column-bound for readability so it doesn't
             stretch into a single billboard line on ultrawides. -->
        <p class="text-editorial mt-10 max-w-[58ch] text-balance text-2xl text-cream/85 md:mt-12 md:text-3xl">
          <template v-if="!won">{{ subhead }}</template>
          <template v-else>
            The wolf led you home. The cover is open — and the workbench you came looking for is one click away.
          </template>
        </p>

        <!-- ════════════════════════════════════════════════════════
             GAME ZONE — the press sheet.
        ════════════════════════════════════════════════════════ -->
        <div class="hunt mt-14 md:mt-16">
          <!-- Live HUD — newsroom slug bar above the sheet. -->
          <div
            class="hunt__head text-mono-eyebrow flex flex-wrap items-center gap-x-4 gap-y-1 text-cream/55 mb-3"
          >
            <span class="flex items-center gap-2">
              <span
                class="h-1.5 w-1.5 rounded-full"
                :class="won ? 'bg-pop-yellow' : 'bg-pop-magenta pulse-dot'"
              />
              {{ liveLabel }}
            </span>
            <span class="hidden sm:inline opacity-30">·</span>
            <span class="hidden sm:inline">Catches <span class="text-cream tabular-nums">{{ caught }}</span></span>
            <span class="hidden sm:inline opacity-30">·</span>
            <span class="hidden sm:inline">Score <span class="text-pop-orange tabular-nums">{{ score }}</span></span>
            <span class="hidden sm:inline opacity-30">·</span>
            <span class="hidden sm:inline">Misses <span class="text-cream tabular-nums">{{ misses }}</span></span>
            <span class="hidden sm:inline opacity-30">·</span>
            <span class="hidden sm:inline">Accuracy <span class="text-cream tabular-nums">{{ accuracy }}%</span></span>
            <span class="hidden md:inline opacity-30">·</span>
            <span class="hidden md:inline">Best score <span class="text-cream tabular-nums">{{ bestScoreLabel }}</span></span>
          </div>

          <!-- The sheet itself. Click anywhere = miss; click the wolf = catch. -->
          <div
            class="hunt__field"
            :class="won ? 'hunt__field--won' : ''"
            :aria-label="won ? 'Howl Hunt — tracked home' : 'Howl Hunt — track the stray. Click the wolf when it surfaces, or press space.'"
            role="application"
            @click="onFieldClick"
          >
            <!-- printer's registration corners -->
            <span class="hunt__crop hunt__crop--tl" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22">
                <path d="M0 12 H10 M12 0 V10" stroke="currentColor" stroke-width="1.4" />
                <circle cx="12" cy="12" r="1.6" fill="currentColor" />
              </svg>
            </span>
            <span class="hunt__crop hunt__crop--tr" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22">
                <path d="M24 12 H14 M12 0 V10" stroke="currentColor" stroke-width="1.4" />
                <circle cx="12" cy="12" r="1.6" fill="currentColor" />
              </svg>
            </span>
            <span class="hunt__crop hunt__crop--bl" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22">
                <path d="M0 12 H10 M12 24 V14" stroke="currentColor" stroke-width="1.4" />
                <circle cx="12" cy="12" r="1.6" fill="currentColor" />
              </svg>
            </span>
            <span class="hunt__crop hunt__crop--br" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="22" height="22">
                <path d="M24 12 H14 M12 24 V14" stroke="currentColor" stroke-width="1.4" />
                <circle cx="12" cy="12" r="1.6" fill="currentColor" />
              </svg>
            </span>

            <!-- "404" wallpaper number, faint — print artefact behind the action -->
            <span class="hunt__plate" aria-hidden="true">{{ won ? 'FOUND' : code }}</span>

            <!-- horizon rule — pretend gutter line of the spread -->
            <span class="hunt__horizon" aria-hidden="true" />

            <!-- accumulated paw prints, riso-tinted -->
            <span
              v-for="paw in paws"
              :key="paw.id"
              class="hunt__paw"
              :class="`hunt__paw--${paw.tone}`"
              :style="{ left: `${paw.x}%`, top: `${paw.y}%`, '--rot': `${paw.rot}deg` }"
              aria-hidden="true"
            >
              <svg viewBox="0 0 28 28" width="30" height="30">
                <ellipse cx="14" cy="20" rx="6.2" ry="5" fill="currentColor" />
                <ellipse cx="6" cy="11.5" rx="2.4" ry="3" fill="currentColor" />
                <ellipse cx="11" cy="6.5" rx="2.4" ry="3" fill="currentColor" />
                <ellipse cx="17" cy="6.5" rx="2.4" ry="3" fill="currentColor" />
                <ellipse cx="22" cy="11.5" rx="2.4" ry="3" fill="currentColor" />
              </svg>
            </span>

            <!-- ripple effects — catch ring + miss cross -->
            <span
              v-for="ripple in ripples"
              :key="ripple.id"
              class="hunt__ripple"
              :class="[
                `hunt__ripple--${ripple.kind}`,
                `hunt__ripple--${ripple.tone}`,
              ]"
              :style="{ left: `${ripple.x}%`, top: `${ripple.y}%` }"
              aria-hidden="true"
            >
              <svg
                v-if="ripple.kind === 'miss'"
                viewBox="0 0 24 24"
                width="24"
                height="24"
              >
                <line x1="5" y1="5" x2="19" y2="19" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" />
                <line x1="19" y1="5" x2="5" y2="19" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" />
              </svg>
            </span>

            <!-- score pops — floating "+N" that drifts up from each catch.
                 Quick / Lightning tiers get a louder glyph and a tier label
                 so a snap-catch reads as the flourish it is. -->
            <span
              v-for="pop in scorePops"
              :key="pop.id"
              class="hunt__pop"
              :class="[
                `hunt__pop--${pop.tone}`,
                `hunt__pop--${pop.tier}`,
              ]"
              :style="{ left: `${pop.x}%`, top: `${pop.y}%` }"
              aria-hidden="true"
            >
              <span class="hunt__pop__num tabular-nums">+{{ pop.bonus }}</span>
              <span v-if="pop.tier !== 'steady'" class="hunt__pop__tier">
                {{ pop.tier === 'lightning' ? 'Lightning!' : 'Quick!' }}
              </span>
            </span>

            <!-- the wolf — the actual brand W glyph in a cream coin -->
            <button
              v-if="wolfVisible"
              type="button"
              class="hunt__wolf"
              :class="[`hunt__wolf--${wolfTone}`, won ? 'hunt__wolf--home' : '']"
              :style="{ left: `${wolfX}%`, top: `${wolfY}%` }"
              :disabled="won"
              :aria-label="won ? 'The wolf made it home' : 'Catch the wolf'"
              @click="onWolfClick"
            >
              <svg viewBox="0 0 550 414" class="hunt__wolf__glyph">
                <g transform="translate(-225 -304)" fill="currentColor">
                  <path d="M627.879524,539 L689.506201,539 L624.324737,718.084599 L551.689519,718.084599 L400.975051,304 L462.601727,304 L588.007128,648.548508 L627.879524,539 Z M629.699376,534 L636.97878,514 L698.605457,514 L691.326052,534 L629.699376,534 Z M640.618483,504 L647.897887,484 L709.524564,484 L702.245159,504 L640.618483,504 Z M653.357441,469 L660.636845,449 L722.263522,449 L714.984117,469 L653.357441,469 Z M667.91625,429 L675.195655,409 L736.822332,409 L729.542927,429 L667.91625,429 Z M684.294911,384 L691.574315,364 L753.200992,364 L745.921587,384 L684.294911,384 Z M702.493422,334 L713.412529,304 L775.039206,304 L764.120099,334 L702.493422,334 Z M286.634022,304 L412.27267,649.189348 L456.401167,527.947298 L487.214505,612.606249 L448.823525,718.084599 L375.721814,718.084599 L225.007345,304 L286.634022,304 Z M537.911317,304 L599.537994,304 L544.219314,455.986823 L513.405976,371.327872 L537.911317,304 Z" />
                </g>
              </svg>
              <span class="hunt__wolf__ring" aria-hidden="true" />
              <span class="hunt__wolf__halo" aria-hidden="true" />
            </button>

            <!-- victory slam -->
            <Transition name="hunt-found">
              <div v-if="won" class="hunt__found" aria-hidden="true">
                <span class="hunt__found__sub text-mono-eyebrow">↳ Den · located</span>
                <span class="hunt__found__word">FOUND</span>
                <span class="hunt__found__meta text-mono-meta">
                  {{ caught }} catches · {{ score }} pts · {{ misses }} misses · {{ elapsedLabel }}
                </span>
              </div>
            </Transition>

            <!-- live region for screen readers -->
            <span class="sr-only" aria-live="polite">
              <template v-if="won">Found the pack in {{ elapsedLabel }} with {{ score }} points and {{ misses }} misses.</template>
              <template v-else>Caught {{ caught }} of {{ TARGET }}, {{ score }} points, {{ misses }} misses.</template>
            </span>
          </div>

          <!-- Underscore: hint + reset, mono and small -->
          <div
            class="hunt__instructions mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-mono-meta text-cream/60"
          >
            <span class="flex items-center gap-2">
              <span class="opacity-50">↳</span>
              <span>Click the wolf when it surfaces, or tap <kbd class="hunt__kbd">space</kbd>.</span>
            </span>
            <button
              type="button"
              class="hunt__reset"
              @click="reset"
            >
              <span aria-hidden="true">↺</span>
              <span>{{ won ? 'Hunt again' : 'Reset hunt' }}</span>
            </button>
          </div>
        </div>

        <!-- ════════════════════════════════════════════════════════
             NAVIGATION — always available. Cover CTA blooms on win.
        ════════════════════════════════════════════════════════ -->
        <div
          class="mt-16 grid grid-cols-1 gap-4 md:mt-20 md:grid-cols-3 md:gap-6"
        >
          <button
            type="button"
            class="exit-link group"
            :class="won ? 'exit-link--bloom' : ''"
            @click="clearAndGoHome"
          >
            <span class="text-mono-eyebrow opacity-65">Take me to</span>
            <span class="exit-link__title">
              The cover
              <span class="exit-link__arrow" aria-hidden="true">→</span>
            </span>
          </button>
          <NuxtLink
            to="/projects"
            class="exit-link exit-link--magenta group"
          >
            <span class="text-mono-eyebrow opacity-65">Browse</span>
            <span class="exit-link__title">
              Workbench
              <span class="exit-link__arrow" aria-hidden="true">→</span>
            </span>
          </NuxtLink>
          <NuxtLink
            to="/field-notes"
            class="exit-link exit-link--orange group"
          >
            <span class="text-mono-eyebrow opacity-65">Read the</span>
            <span class="exit-link__title">
              Field notes
              <span class="exit-link__arrow" aria-hidden="true">→</span>
            </span>
          </NuxtLink>
        </div>
      </div>
    </main>

    <AppFooter />
  </div>
</template>

<style scoped>
/* ════════════════════════════════════════════════════════════════════
   Howl Hunt — playfield.
   The whole game is positioned absolutely inside .hunt__field; coords
   are stored as percentages on the JS side so the layout work happens
   once on resize and never on each tick.
   ════════════════════════════════════════════════════════════════════ */

.hunt__field {
  position: relative;
  height: clamp(380px, 58vh, 580px);
  width: 100%;
  overflow: hidden;
  isolation: isolate;
  border-top: 1px solid rgba(241, 233, 216, 0.15);
  border-bottom: 1px solid rgba(241, 233, 216, 0.15);
  background:
    radial-gradient(120% 80% at 12% -10%, rgba(255, 72, 105, 0.10), transparent 60%),
    radial-gradient(80% 60% at 110% 110%, rgba(255, 233, 78, 0.07), transparent 60%),
    var(--color-ink-deep);
  cursor: crosshair;
  transition: border-color 480ms var(--ease-pop);
}
.hunt__field--won {
  border-top-color: rgba(255, 233, 78, 0.5);
  border-bottom-color: rgba(255, 233, 78, 0.5);
  cursor: default;
}

.hunt__field::before {
  /* halftone dot field — print artefact texture under everything */
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle at 1px 1px, rgba(241, 233, 216, 0.07) 1px, transparent 1.6px);
  background-size: 14px 14px;
  pointer-events: none;
  z-index: 0;
}

/* horizon rule — gutter of the spread */
.hunt__horizon {
  position: absolute;
  left: 6%;
  right: 6%;
  top: 50%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(241, 233, 216, 0.10), transparent);
  pointer-events: none;
  z-index: 0;
}

/* ── Plate — the giant 404 / FOUND set behind the play, low contrast ── */
.hunt__plate {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-family: var(--font-display);
  font-size: clamp(8rem, 26vw, 22rem);
  letter-spacing: -0.04em;
  line-height: 0.78;
  color: rgba(241, 233, 216, 0.05);
  pointer-events: none;
  z-index: 0;
  user-select: none;
  text-shadow:
    0.012em 0.012em 0 rgba(255, 72, 105, 0.05),
   -0.012em -0.012em 0 rgba(255, 233, 78, 0.05);
}

/* ── Crop marks — printer's registration corners ───────────────────── */
.hunt__crop {
  position: absolute;
  width: 22px;
  height: 22px;
  color: rgba(241, 233, 216, 0.32);
  pointer-events: none;
  z-index: 1;
}
.hunt__crop--tl { top: 10px; left: 10px; }
.hunt__crop--tr { top: 10px; right: 10px; }
.hunt__crop--bl { bottom: 10px; left: 10px; }
.hunt__crop--br { bottom: 10px; right: 10px; }

/* ── Paw prints — riso ink stamps that persist across the round ────── */
.hunt__paw {
  position: absolute;
  width: 30px;
  height: 30px;
  margin-left: -15px;
  margin-top: -15px;
  pointer-events: none;
  z-index: 2;
  opacity: 0;
  transform: rotate(var(--rot, 0deg)) scale(2.4);
  animation: paw-stamp 380ms var(--ease-pop) forwards;
  filter: drop-shadow(0 1px 0 rgba(0, 0, 0, 0.4));
}
.hunt__paw--magenta { color: var(--color-pop-magenta); }
.hunt__paw--yellow { color: var(--color-pop-yellow); }
.hunt__paw--orange { color: var(--color-pop-orange); }

@keyframes paw-stamp {
  0%   { opacity: 0; transform: rotate(var(--rot, 0deg)) scale(2.4); }
  60%  { opacity: 0.95; transform: rotate(var(--rot, 0deg)) scale(0.92); }
  100% { opacity: 0.6; transform: rotate(var(--rot, 0deg)) scale(1); }
}

/* ── Ripples — catch ring + miss cross ─────────────────────────────── */
.hunt__ripple {
  position: absolute;
  width: 14px;
  height: 14px;
  margin-left: -7px;
  margin-top: -7px;
  pointer-events: none;
  z-index: 3;
  display: grid;
  place-items: center;
}
.hunt__ripple--catch {
  border: 2px solid currentColor;
  border-radius: 999px;
  box-shadow: 0 0 0 1px currentColor inset;
  animation: ripple-grow 800ms var(--ease-pop) forwards;
}
.hunt__ripple--catch.hunt__ripple--magenta { color: var(--color-pop-magenta); }
.hunt__ripple--catch.hunt__ripple--yellow { color: var(--color-pop-yellow); }
.hunt__ripple--catch.hunt__ripple--orange { color: var(--color-pop-orange); }

.hunt__ripple--miss {
  width: 28px;
  height: 28px;
  margin-left: -14px;
  margin-top: -14px;
  color: var(--color-pop-magenta);
  animation: ripple-fade 700ms var(--ease-pop) forwards;
  filter: drop-shadow(0 1px 0 rgba(0, 0, 0, 0.5));
}

@keyframes ripple-grow {
  0%   { opacity: 0.95; transform: scale(0.4); }
  100% { opacity: 0; transform: scale(7); }
}
@keyframes ripple-fade {
  0%   { opacity: 0; transform: rotate(0deg) scale(0.6); }
  20%  { opacity: 0.9; transform: rotate(-6deg) scale(1.05); }
  100% { opacity: 0; transform: rotate(-6deg) scale(1.4); }
}

/* ── Score pops — floating "+N" that drifts up from each catch ─────── */
.hunt__pop {
  position: absolute;
  pointer-events: none;
  z-index: 4;
  display: grid;
  place-items: center;
  text-align: center;
  line-height: 0.9;
  /* The translate offsets are baked into the keyframes so the rise
     animation can compose with them — keeping it here means the
     pop is centred even if the animation hasn't started yet. */
  transform: translate(-50%, -50%);
  filter: drop-shadow(0 1px 0 rgba(0, 0, 0, 0.5));
  animation: pop-rise 1100ms var(--ease-pop) forwards;
}
.hunt__pop__num {
  display: block;
  font-family: var(--font-display);
  font-size: clamp(1.4rem, 3vw, 2rem);
  letter-spacing: -0.02em;
  font-weight: 600;
}
.hunt__pop__tier {
  display: block;
  margin-top: 2px;
  font-family: var(--font-mono);
  font-size: 0.62rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: 0.92;
}
.hunt__pop--magenta { color: var(--color-pop-magenta); }
.hunt__pop--yellow  { color: var(--color-pop-yellow); }
.hunt__pop--orange  { color: var(--color-pop-orange); }
.hunt__pop--quick .hunt__pop__num     { font-size: clamp(1.7rem, 3.6vw, 2.4rem); }
.hunt__pop--lightning .hunt__pop__num { font-size: clamp(2rem, 4.5vw, 2.9rem); }
.hunt__pop--lightning {
  text-shadow:
     0.04em  0.04em 0 rgba(255, 72, 105, 0.55),
    -0.03em -0.03em 0 rgba(255, 233, 78, 0.45);
}

@keyframes pop-rise {
  0%   { opacity: 0; transform: translate(-50%, -30%) scale(0.7); }
  18%  { opacity: 1; transform: translate(-50%, -70%) scale(1.12); }
  55%  { opacity: 1; transform: translate(-50%, -100%) scale(1); }
  100% { opacity: 0; transform: translate(-50%, -150%) scale(0.95); }
}

/* ── The wolf — cream coin, glyph in tone, halftone halo ───────────── */
.hunt__wolf {
  position: absolute;
  width: 56px;
  height: 56px;
  margin-left: -28px;
  margin-top: -28px;
  border-radius: 999px;
  background: var(--color-cream);
  color: var(--color-ink);
  border: none;
  cursor: pointer;
  display: grid;
  place-items: center;
  isolation: isolate;
  z-index: 4;
  box-shadow:
    0 1px 0 rgba(0, 0, 0, 0.5),
    0 8px 18px rgba(0, 0, 0, 0.42);
  animation: wolf-pop 240ms var(--ease-pop) both;
  transition: transform 220ms var(--ease-pop), background 320ms var(--ease-pop);
  -webkit-tap-highlight-color: transparent;
}
.hunt__wolf:hover { transform: scale(1.06) rotate(-4deg); }
.hunt__wolf:focus-visible {
  outline: 2px solid var(--color-pop-yellow);
  outline-offset: 4px;
}

.hunt__wolf__glyph {
  width: 30px;
  height: 30px;
  position: relative;
  z-index: 1;
}

/* Howl ring — expanding circle in the active tone */
.hunt__wolf__ring {
  position: absolute;
  inset: -10px;
  border-radius: 999px;
  border: 1.5px solid currentColor;
  opacity: 0;
  animation: wolf-ring 1500ms var(--ease-pop) infinite;
  pointer-events: none;
}

/* Soft halo — diffused riso ink behind the coin */
.hunt__wolf__halo {
  position: absolute;
  inset: -16px;
  border-radius: 999px;
  background: radial-gradient(circle, currentColor 0%, transparent 65%);
  opacity: 0.22;
  filter: blur(8px);
  z-index: -1;
  pointer-events: none;
}

.hunt__wolf--magenta { color: var(--color-pop-magenta); }
.hunt__wolf--yellow  { color: var(--color-pop-yellow); }
.hunt__wolf--orange  { color: var(--color-pop-orange); }

/* Victory state — wolf turns yellow, sits at centre, bobs gently */
.hunt__wolf--home {
  background: var(--color-pop-yellow);
  color: var(--color-ink);
  cursor: default;
  animation:
    wolf-pop 420ms var(--ease-pop) both,
    wolf-home-bob 2.6s ease-in-out infinite 420ms;
  box-shadow:
    0 1px 0 rgba(0, 0, 0, 0.4),
    0 12px 28px rgba(255, 233, 78, 0.35),
    0 0 0 4px rgba(255, 233, 78, 0.18);
}

@keyframes wolf-pop {
  0%   { opacity: 0; transform: scale(0.4); }
  60%  { opacity: 1; transform: scale(1.18); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes wolf-ring {
  0%   { transform: scale(0.6); opacity: 0; }
  35%  { opacity: 0.85; }
  100% { transform: scale(2.5); opacity: 0; }
}
@keyframes wolf-home-bob {
  0%, 100% { transform: translateY(0) rotate(0); }
  50%      { transform: translateY(-6px) rotate(2deg); }
}

/* ── FOUND slam — riso aberration over the playfield on victory ────── */
.hunt__found {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  align-content: center;
  pointer-events: none;
  z-index: 5;
  text-align: center;
  background: radial-gradient(60% 80% at 50% 50%, rgba(255, 233, 78, 0.18), transparent 70%);
}
.hunt__found__sub {
  display: block;
  color: var(--color-pop-yellow);
  margin-bottom: 0.4rem;
}
.hunt__found__word {
  display: block;
  font-family: var(--font-display);
  font-size: clamp(4.5rem, 14vw, 11rem);
  letter-spacing: -0.04em;
  line-height: 0.88;
  color: var(--color-pop-yellow);
  text-shadow:
     0.06em  0.06em 0 var(--color-pop-magenta),
    -0.04em -0.04em 0 var(--color-pop-orange);
}
.hunt__found__meta {
  display: block;
  margin-top: 0.5rem;
  color: rgba(241, 233, 216, 0.75);
}

.hunt-found-enter-active {
  animation: found-slam 720ms var(--ease-pop) both;
}
@keyframes found-slam {
  0%   { transform: scale(0.6) rotate(-6deg); opacity: 0; }
  60%  { transform: scale(1.06) rotate(2deg); opacity: 1; }
  100% { transform: scale(1) rotate(0); opacity: 1; }
}

/* ── HUD trim ──────────────────────────────────────────────────────── */
.hunt__kbd {
  display: inline-grid;
  place-items: center;
  height: 1.4em;
  min-width: 2.6em;
  padding: 0 0.5em;
  border: 1px solid rgba(241, 233, 216, 0.25);
  border-radius: 4px;
  background: rgba(241, 233, 216, 0.04);
  color: var(--color-cream);
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  vertical-align: 0.05em;
}

.hunt__reset {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  color: var(--color-pop-yellow);
  text-transform: uppercase;
  cursor: pointer;
  background: transparent;
  border: 0;
  padding: 0.25rem 0;
  transition: color 220ms ease;
}
.hunt__reset:hover { color: var(--color-cream); }
.hunt__reset:focus-visible {
  outline: 2px solid var(--color-pop-yellow);
  outline-offset: 4px;
}

/* ════════════════════════════════════════════════════════════════════
   Exit links — the three editorial CTAs.
   The cover link is the hero — it bumps to magenta on victory and the
   underline thickens like a press-stamped lead. The two side links use
   the existing magenta/orange hover language so the page still reads
   as part of the wider site.
   ════════════════════════════════════════════════════════════════════ */

.exit-link {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 1.25rem 0 1.5rem;
  border-top: 1px solid rgba(241, 233, 216, 0.18);
  color: var(--color-cream);
  background: transparent;
  border-left: 0;
  border-right: 0;
  border-bottom: 0;
  text-align: left;
  cursor: pointer;
  transition: color 320ms ease, border-top-color 320ms ease, transform 320ms var(--ease-pop);
  position: relative;
  isolation: isolate;
}
.exit-link::before {
  /* tape stub — slides in on hover */
  content: '';
  position: absolute;
  top: -1px;
  left: 0;
  height: 3px;
  width: 0;
  background: var(--color-pop-yellow);
  transition: width 480ms var(--ease-pop);
}
.exit-link--magenta::before { background: var(--color-pop-magenta); }
.exit-link--orange::before  { background: var(--color-pop-orange); }

.exit-link:hover { color: var(--color-pop-yellow); transform: translateY(-2px); }
.exit-link--magenta:hover { color: var(--color-pop-magenta); }
.exit-link--orange:hover  { color: var(--color-pop-orange); }
.exit-link:hover::before { width: 88px; }

.exit-link:focus-visible {
  outline: 2px solid var(--color-pop-yellow);
  outline-offset: 4px;
}

.exit-link__title {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: clamp(1.65rem, 3.6vw, 2.4rem);
  line-height: 1;
  letter-spacing: -0.01em;
  display: inline-flex;
  align-items: baseline;
  gap: 0.55rem;
}
.exit-link__arrow {
  font-family: var(--font-sans);
  font-style: normal;
  font-size: 0.85em;
  transition: transform 320ms var(--ease-pop);
}
.exit-link:hover .exit-link__arrow { transform: translateX(4px); }

/* Cover bloom — when the player has tracked the wolf home, the cover
   CTA recolours and pulses gently to invite the click. */
.exit-link--bloom {
  color: var(--color-pop-yellow);
  border-top-color: var(--color-pop-yellow);
}
.exit-link--bloom::before {
  width: 88px;
  background: var(--color-pop-yellow);
  animation: bloom-pulse 2s ease-in-out infinite;
}
@keyframes bloom-pulse {
  0%, 100% { opacity: 0.7; transform: scaleX(1); transform-origin: 0 0; }
  50%      { opacity: 1;   transform: scaleX(1.2); }
}

/* ════════════════════════════════════════════════════════════════════
   Reduced motion — kill the loops, keep the staging readable.
   ════════════════════════════════════════════════════════════════════ */
@media (prefers-reduced-motion: reduce) {
  .hunt__paw,
  .hunt__ripple,
  .hunt__pop,
  .hunt__wolf,
  .hunt__wolf__ring,
  .hunt__wolf--home,
  .hunt__found .hunt-found-enter-active,
  .exit-link--bloom::before {
    animation: none !important;
  }
  .hunt__paw { opacity: 0.6; transform: rotate(var(--rot, 0deg)); }
  /* Static pop offset above the catch site so it's still readable
     without the rising animation. */
  .hunt__pop { opacity: 0.92; transform: translate(-50%, -120%); }
  .hunt__wolf { transition: none; }
  .exit-link:hover { transform: none; }
}
</style>
