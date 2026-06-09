<script setup lang="ts">
import { site } from '~/data/site'
import type { StatItem } from '~/components/ui/StatRow.vue'

// The homepage is the "opening trail" — its <title> doesn't get the
// auto-suffix because the studio name is already baked into the hero
// copy. `titleTemplate: null` opts out of the global "%s — %siteName"
// template in nuxt.config.
useSeoMeta({
  titleTemplate: null,
  title: 'Wolves — UX-driven applications, mostly open source',
  description: site.positioning,
  ogTitle: 'Wolves — a small studio shipping loud',
  ogDescription: `${site.manifesto} ${site.positioning}`,
  ogType: 'website',
  twitterCard: 'summary_large_image',
  twitterTitle: 'Wolves',
  twitterDescription: site.positioning,
})

// Per-page OG image — accent the masthead card in pop-magenta to match
// the homepage hero. This overrides the site-wide default registered
// in `app.vue`.
defineOgImage('Wolves', {
  title: 'Wolves',
  eyebrow: `Issue ${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`,
  description: site.positioning,
  accent: 'magenta',
})

const issue = computed(() => {
  const d = new Date()
  return `${String(d.getMonth() + 1).padStart(2, '0')} / ${d.getFullYear()}`
})

// Today's frequency — same composable that the RadioDial reads from, so
// the masthead label and the dial's lock target can never drift.
const { label: frequencyLabel } = useTodaysFrequency()

/**
 * Big quote-mark in-view: when the section scrolls into the viewport
 * we toggle a class on the opening " glyph so it gently riso-shimmies
 * (defined in main.css). The flag stays on once true so the animation
 * keeps running while the user is in the section, but won't restart
 * if they scroll away and back — feels more like a printed page.
 */
const bigQuoteRoot = ref<HTMLElement | null>(null)
const bigQuoteInView = ref(false)
onMounted(() => {
  if (!bigQuoteRoot.value) return
  const obs = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          bigQuoteInView.value = true
          obs.disconnect()
          break
        }
      }
    },
    { threshold: 0.4 },
  )
  obs.observe(bigQuoteRoot.value as unknown as Element)
  onBeforeUnmount(() => obs.disconnect())
})

/* ======================================================================
   SIX PINS (pride egg) — the wordmark ritual lives in HeroDisplay;
   this page carries two of the completion tells: the masthead ticker
   re-reads in place (same flex line, same line-height — pure text
   swap) and the pack-call marquee answers itself in its own meter.
   ====================================================================== */
const { prideOn } = usePridePins()

// Both strings are exactly 25 characters in the mono face — equal
// width by construction, so the flex row can never wrap differently
// between states (the zero-height-change invariant, enforced by
// typography).
const tickerLine = computed(() =>
  prideOn.value ? "Live · marching since '70" : 'Live · 06 active projects',
)

const packCallMarquee = computed(() =>
  prideOn.value
    ? { text: site.packCallPride, separator: '✶' }
    : { text: site.packCall, separator: '◑' },
)

/* ======================================================================
   COUNTING TO A BILLION (eat-the-rich egg)

   The ∞ stat — the magenta odd-one-out — is poke-able. Click it three
   times and it flips into numeric mode and tries to count to infinity:
   compact magnitudes whip through the tabular-nums span, accelerating,
   until the counter JAMS at exactly 1B. The count-up component, built
   to celebrate small honest numbers, physically fails at a billion.
   A billion does not fit. The jam resolves with the house slam: the
   display lands on 0, the label swaps to "Billionaires needed"
   (19 characters → 19 characters; the line doesn't even breathe), and
   the marquee below hot-swaps to the rich variant. Re-clicking resets
   the stat cell instantly — but the marquee stays swapped for the
   visit (module state — see useRichFired). Discovered politics don't
   un-discover.

   Width-stable by construction: tabular-nums + default compact
   notation caps the string at four characters ('1.2K', '123M', '1B',
   'ERR'). Hydration-safe: SSR renders the untouched ∞; every mutation
   here is post-click.
   ====================================================================== */
type RichStage = 'idle' | 'rolling' | 'jammed' | 'zero'
const richStage = ref<RichStage>('idle')
const richClicks = ref(0)
const richDisplay = ref('∞')
/** Module-level: the marquee swap survives route navigation. */
const richFired = useRichFired()
const statLive = ref('')
let richRaf = 0
let strobeTimer: number | undefined
let settledAt = 0

// Default compact rounding — do NOT add maximumFractionDigits: it
// overrides compact's 2-significant-digit behavior and emits 6-char
// strings like '123.5M' mid-roll.
const compactFmt = typeof Intl !== 'undefined'
  ? new Intl.NumberFormat('en', { notation: 'compact' })
  : null

function onStatActivate(index: number) {
  if (index !== 1) return
  if (richStage.value === 'rolling' || richStage.value === 'jammed') return

  if (richStage.value === 'zero') {
    // Brief cooldown so a hammer-click (especially on the instant
    // reduced-motion path) can't blow past the payoff before it
    // registers.
    if (performance.now() - settledAt < 900) return
    // Reset the cell — instant, no replay of the roll. The marquee
    // stays; only the counter forgets.
    richStage.value = 'idle'
    richClicks.value = 0
    richDisplay.value = '∞'
    statLive.value = 'Counter reset.'
    return
  }

  // Hammering the infinity symbol to make it grow is itself the joke
  // about accumulation. Three pokes and it tries.
  richClicks.value++
  if (richClicks.value >= 3) startBillionRoll()
}

function startBillionRoll() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    // Mirror AnimatedStat's instant path: no roll, no strobe, no slam —
    // a direct cut to the conclusion.
    settleZero()
    return
  }

  richStage.value = 'rolling'
  statLive.value = 'Counting.'
  const startT = performance.now()
  const DURATION = 2400
  const tick = (now: number) => {
    if (richStage.value !== 'rolling') return
    const t = Math.min(1, (now - startT) / DURATION)
    // Exponential sweep 1 → 1e9 — the magnitudes whip past like a
    // meter pegging, accelerating instead of easing out.
    const v = Math.pow(10, t * 9)
    richDisplay.value = compactFmt ? compactFmt.format(Math.round(v)) : String(Math.round(v))
    if (t < 1) richRaf = requestAnimationFrame(tick)
    else jamAtBillion()
  }
  richRaf = requestAnimationFrame(tick)
}

function jamAtBillion() {
  richStage.value = 'jammed'
  statLive.value = 'Jammed at one billion.'
  richDisplay.value = '1B'
  // Swaps every 350ms ≈ 2.9 content swaps ≈ 1.4 flash cycles/sec —
  // under the WCAG 2.3.1 3-flashes/sec ceiling (a flash is a PAIR of
  // opposing changes; don't shorten this interval trusting the swap
  // count as headroom). The harsher misregistration treatment is CSS
  // (.is-jamming) keyed to this stage.
  let flips = 0
  strobeTimer = window.setInterval(() => {
    flips++
    richDisplay.value = flips % 2 ? 'ERR' : '1B'
    if (flips >= 5) {
      window.clearInterval(strobeTimer)
      strobeTimer = undefined
      settleZero()
    }
  }, 350)
}

function settleZero() {
  richStage.value = 'zero'
  richDisplay.value = '0'
  richFired.value = true
  settledAt = performance.now()
  statLive.value = 'Zero billionaires needed. Wolves share the kill.'
}

onBeforeUnmount(() => {
  cancelAnimationFrame(richRaf)
  if (strobeTimer) window.clearInterval(strobeTimer)
})

/**
 * The stat items, lifted from the old template literal into a computed
 * so the ∞ cell can be driven by the egg. The other three stats pass
 * through byte-identical to the original literal — SSR markup of the
 * resting state never changes.
 */
const statItems = computed<StatItem[]>(() => [
  { value: 6, tone: 'yellow', label: 'Active projects' },
  {
    display: richDisplay.value,
    tone: 'magenta',
    label: richStage.value === 'zero' ? 'Billionaires needed' : 'Late-night sketches',
    interactive: true,
    symbol: richStage.value === 'idle',
    agitation: richStage.value === 'idle' ? Math.min(richClicks.value, 2) : 0,
    jam: richStage.value === 'jammed',
    slam: richStage.value === 'zero',
    ariaLabel: 'Late-night sketches counter',
    risoLabel: 'count it',
  },
  { value: 6, pad: 1, tone: 'orange', label: 'Open-source repos' },
  { value: 1, pad: 1, tone: 'cream', label: 'Manifesto' },
])

/** First marquee — the house slogan, or the house slogan turned on capital. */
const manifestoMarquee = computed(() =>
  richFired.value
    ? { text: site.quotes.marqueeRich, tone: 'magenta-on-ink' as const, separator: 'ψ' }
    : { text: site.quotes.marquee, tone: 'yellow-on-ink' as const, separator: '✺' },
)

/* ======================================================================
   HELD, NOT SAID (not-all-men egg)

   Press-and-hold the big-quote block for 1200ms. The gesture teaches
   itself: from the first beat of pressure the quote's ink starts to
   bleed (CSS reads --hold, written here each frame), so even an
   accidental tap shows the page yielding and invites a longer press.
   Release early and the ink settles back. At full hold the quote
   presses into the page once, then a quiet plate develops over the
   section — absolute inset-0 inside the section's existing
   overflow-hidden box. Esc or a click lifts it off. No badge, no
   persistence — the statement is not displayed, it is held, and it is
   there every time you press.

   The plate is deliberately UNBRANDED: no eyebrow, no signature, no
   house framing. Purely the statement.

   The hold DURATION gates intent and survives reduced-motion; only
   the bleed theatrics are gated (see main.css — a static outline
   appears at half-hold instead).
   ====================================================================== */
const HOLD_MS = 1200
const plateOpen = ref(false)
const isCommitting = ref(false)
/** Crossing flag (reduced-motion progress feedback) — set in the raf. */
const isHalfHold = ref(false)
/** Enables a one-shot transition so a released hold settles, not pops. */
const isSettling = ref(false)
const plateEl = ref<HTMLElement | null>(null)
const holdWrapEl = ref<HTMLElement | null>(null)
const plateTriggerEl = ref<HTMLElement | null>(null)
const plateAnnounced = ref(false)
const plateLive = ref('')
let holdRaf = 0
/** One hold timeline across modalities — pointer and keyboard never stack. */
let holding = false
let holdPointerId: number | null = null
let holdStartX = 0
let holdStartY = 0
let keyHolding = false
let commitTimer: ReturnType<typeof setTimeout> | undefined

/**
 * --hold is written imperatively: driving a CSS variable through Vue
 * reactivity would re-render/diff the whole page component at 60fps
 * for the duration of the hold. The only reactive state is threshold
 * crossings (half-hold, completion).
 */
function setHoldVar(p: number) {
  holdWrapEl.value?.style.setProperty('--hold', String(p))
}

function beginHold() {
  if (plateOpen.value || isCommitting.value || holding) return
  holding = true
  isSettling.value = false
  const startT = performance.now()
  cancelAnimationFrame(holdRaf)
  const step = (now: number) => {
    const p = Math.min(1, (now - startT) / HOLD_MS)
    setHoldVar(p)
    if (p >= 0.5 && !isHalfHold.value) isHalfHold.value = true
    if (p >= 1) {
      completeHold()
      return
    }
    holdRaf = requestAnimationFrame(step)
  }
  holdRaf = requestAnimationFrame(step)
}

function cancelHold() {
  holdPointerId = null
  keyHolding = false
  if (!holding) return
  holding = false
  cancelAnimationFrame(holdRaf)
  // The ink settles back instead of popping: .is-settling enables a
  // transition on the bleed channels for this single write; it's
  // dropped on the next beginHold so per-frame raf writes stay
  // transition-free.
  isSettling.value = true
  setHoldVar(0)
  isHalfHold.value = false
}

function completeHold() {
  holding = false
  holdPointerId = null
  keyHolding = false
  cancelAnimationFrame(holdRaf)
  setHoldVar(0)
  isHalfHold.value = false
  // One deep letterpress beat (scale 0.99 via .is-committing), then
  // the plate develops.
  isCommitting.value = true
  commitTimer = setTimeout(() => {
    isCommitting.value = false
    plateOpen.value = true
    if (!plateAnnounced.value) {
      plateAnnounced.value = true
      // One combined announcement — the deflection never reaches a
      // screen reader without its correction.
      plateLive.value = 'Not all men — but always men.'
    }
    nextTick(() => plateEl.value?.focus({ preventScroll: true }))
  }, 240)
}

function onQuotePointerDown(e: PointerEvent) {
  if (plateOpen.value || holding) return
  if (e.button !== undefined && e.button !== 0) return
  holdPointerId = e.pointerId
  holdStartX = e.clientX
  holdStartY = e.clientY
  beginHold()
}

function onQuotePointerMove(e: PointerEvent) {
  if (holdPointerId === null || e.pointerId !== holdPointerId) return
  // Drift past ~12px is scroll intent, not a hold. We never
  // preventDefault the touch, so scrolling itself stays native.
  const dx = e.clientX - holdStartX
  const dy = e.clientY - holdStartY
  if (dx * dx + dy * dy > 144) cancelHold()
}

function onQuotePointerEnd() {
  if (holdPointerId !== null) cancelHold()
}

function onQuoteContextMenu(e: Event) {
  // iOS long-press fires the callout mid-hold; suppress only while a
  // hold is actually armed so normal right-clicks elsewhere survive.
  if (holdPointerId !== null) e.preventDefault()
}

/**
 * Keyboard/AT doorway — a dedicated control instead of role="button"
 * on the quote wrapper. ARIA button is "children presentational": a
 * labelled wrapper would erase the quote itself from the accessibility
 * tree, and SR activation (a single synthesized click) can never
 * satisfy a 1200ms hold anyway. So: sighted keyboard users hold
 * Enter/Space on this control; AT activation arrives as a click with
 * detail === 0 and is honored as a completed hold.
 */
function onTriggerKeydown(e: KeyboardEvent) {
  if (e.key !== 'Enter' && e.key !== ' ') return
  e.preventDefault()
  if (e.repeat || holding || plateOpen.value) return
  keyHolding = true
  beginHold()
}

function onTriggerKeyup(e: KeyboardEvent) {
  if (e.key !== 'Enter' && e.key !== ' ') return
  // preventDefault so Space's default keyup activation can't fire a
  // synthesized click — clicks are reserved for AT activation below.
  e.preventDefault()
  if (keyHolding) cancelHold()
}

function onTriggerClick(e: MouseEvent) {
  if (e.detail !== 0) return // real pointer clicks land on the quote
  if (plateOpen.value || holding || isCommitting.value) return
  completeHold()
}

function closePlate(e?: MouseEvent) {
  if (!plateOpen.value) return
  // A drag-select ending on the plate (or the first tap of a double-
  // tap selection) arrives as a click — deliberate selects shouldn't
  // dismiss the statement.
  if (e) {
    const sel = window.getSelection()
    if ((sel && !sel.isCollapsed) || e.detail > 1) return
  }
  plateOpen.value = false
  nextTick(() => plateTriggerEl.value?.focus({ preventScroll: true }))
}

function onPlateWindowKeydown(e: KeyboardEvent) {
  if (!plateOpen.value || e.key !== 'Escape' || e.defaultPrevented) return
  e.preventDefault()
  closePlate()
}

onMounted(() => {
  // Capture phase: window keydown listeners fire in registration
  // order, and this page mounts after HeroDisplay but before the
  // lazily-hydrated FieldPolaroid — bubble-phase ordering would make
  // the defaultPrevented handshake meaningless. Capture runs first,
  // period: the plate claims Esc, the polaroid (which now checks
  // defaultPrevented) and the pride pins (which defer their check a
  // task) both respect it.
  window.addEventListener('keydown', onPlateWindowKeydown, { capture: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onPlateWindowKeydown, { capture: true })
  cancelAnimationFrame(holdRaf)
  if (commitTimer) clearTimeout(commitTimer)
})
</script>

<template>
  <div class="grain">
    <!-- ======================================================================
         COVER — the wallpaper word + masthead

         Intentionally NOT migrated to <PageMasthead>: this masthead is
         the giant wordmark + ticker stamp, with bespoke px/py spacing
         and no h1/eyebrow/sticker grid. Reuses <HalftoneOrbBackdrop>
         for the parallax orb pair (which matches the default config).
    ====================================================================== -->
    <section class="relative isolate overflow-hidden border-b border-cream/10">
      <!-- Halftone backplates — parallax orbs that subtly drift with the cursor -->
      <HalftoneOrbBackdrop />

      <!-- Masthead — gigantic wordmark.
           Mobile uses tighter side padding (px-4) so the larger
           clamp(7rem, 27vw, ...) wordmark gets edge-to-edge breathing
           room instead of clipping against px-6. Vertical padding is
           pulled in vs. the desktop py-36 so the wordmark sits with
           a bit less air on phones, but py-20/mt-16 still gives the
           composition room to breathe (the original py-24/mt-24 was
           too generous at the larger mobile font size). -->
      <div class="relative mx-auto max-w-[1600px] px-4 py-20 md:px-12 md:py-36 lg:py-44">
        <HeroDisplay word="WOLVES" />

        <!-- Tickers under the wordmark.
             mt-* mirrors the parent's py-* so the visible gap above the
             title (parent's pt) matches the gap below it (this mt to the
             border-t divider). Combined with text-box-trim on .hero-wordmark,
             this gives the title visually equal padding top and bottom. -->
        <div class="mt-16 flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-t border-cream/15 pt-5 text-mono-eyebrow text-cream/75 md:mt-36 lg:mt-44">
          <div class="flex items-center gap-3">
            <span class="h-1.5 w-1.5 rounded-full bg-pop-magenta pulse-dot" />
            <!-- Re-reads in place while all six wordmark pins are in —
                 same flex line, same line-height, pure text swap. -->
            <span>{{ tickerLine }}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="opacity-50">Today's frequency</span>
            <span class="text-cream">{{ frequencyLabel }}</span>
          </div>
        </div>
      </div>

      <!-- The hero subtitle as a 2-col editorial spread -->
      <div class="mx-auto max-w-[1600px] px-4 pb-20 md:px-8 md:pb-32">
        <div class="grid grid-cols-12 gap-x-6 gap-y-10">
          <!-- Subhead -->
          <div class="col-span-12 lg:col-span-7">
            <span class="text-mono-eyebrow text-pop-yellow">From the den</span>
            <p
              class="text-editorial mt-4 text-balance text-3xl text-cream md:text-5xl lg:text-6xl"
              style="line-height: 1.05;"
            >
              We make
              <InkHighlight mode="stamp" tone="magenta">UX-driven</InkHighlight>
              applications. Most are
              <InkHighlight mode="wavy" tone="yellow">open source.</InkHighlight>
              Wolves is becoming the place where
              <InkHighlight mode="lift" tone="orange">learning</InkHighlight>
              meets
              <InkHighlight mode="lift" tone="orange">teaching.</InkHighlight>
            </p>
          </div>

          <!-- Margin column — "The Fence Comes Down" (nature / rewilding
               egg). Replaced the four floating sticker cards that used to
               float here: their what/how/why/where messaging is already
               carried by the manifesto tenets below, and this egg keeps
               the spirit of the "Where we live → The world is home"
               sticker as its own payoff (see RewildPlot.vue). -->
          <RewildPlot class="col-span-12 self-start lg:col-span-5" />
        </div>

        <!-- A row of small numbers — magazine-style stats with count-up
             + riso slam. Items live in a computed now: the ∞ stat is
             poke-able (see COUNTING TO A BILLION in the script). -->
        <StatRow :items="statItems" @activate="onStatActivate" />
        <!-- Narrative beats of the billion counter, for screen readers
             only — the key moments, never the per-frame values. -->
        <span class="sr-only" aria-live="polite">{{ statLive }}</span>
      </div>
    </section>

    <!-- ======================================================================
         MARQUEE BREAK — the manifesto, screaming

         Below the fold on every viewport — `hydrate-on-visible` keeps
         its (small) hydration cost out of the LCP window. Animation is
         pure CSS so the marquee scrolls fine pre-hydration.
    ====================================================================== -->
    <!-- Props are computeds over the billion-counter egg: once it has
         fired, the band re-renders inside the same fixed-height track
         (text swap + tone swap, outlined stencil type stays). The ψ
         separator is a quiet fork laid between the repetitions —
         unexplained, like everything else in the margins here.
         :key forces a fresh client mount if the egg fires while the
         band is still below the viewport un-hydrated — hydrating rich
         vnodes against yellow-slogan SSR DOM would patch the text but
         never the tone classes. -->
    <LazyMarqueeQuote
      :key="manifestoMarquee.tone"
      hydrate-on-visible
      :text="manifestoMarquee.text"
      :tone="manifestoMarquee.tone"
      :outline="true"
      :separator="manifestoMarquee.separator"
      size-class="text-display-xl"
    />

    <!-- ======================================================================
         TRANSMISSION — tune the dial (easter egg)

         The dial is interactive but well below the fold. Deferring its
         hydration until visible saves ~10-20KB of JS in the initial
         bundle and removes a rAF wobble loop from the first-paint path.
    ====================================================================== -->
    <section class="border-t border-cream/10">
      <div class="mx-auto max-w-[1600px] px-4 py-14 md:px-8 md:py-20">
        <LazyRadioDial hydrate-on-visible />
      </div>
    </section>

    <!-- ======================================================================
         GUIDED SPREADS — current work
    ====================================================================== -->
    <section class="border-y border-cream/10">
      <!-- Section masthead -->
      <div class="mx-auto max-w-[1600px] px-4 pt-20 pb-10 md:px-8">
        <div class="grid grid-cols-12 items-end gap-x-6 gap-y-6">
          <div class="col-span-12 lg:col-span-7">
            <span class="text-mono-eyebrow text-cream/60">Vantage III — Current work</span>
            <h2 class="text-display-xl mt-4 text-cream">
              The pack,<br>
              <span class="text-pop-magenta">three&nbsp;deep.</span>
            </h2>
          </div>
          <div class="col-span-12 lg:col-span-5">
            <p class="text-editorial text-balance text-xl text-cream/85 md:text-2xl">
              A guided tour through what's on the workbench. Each spread is a real,
              shipping project — with the small details that make them ours.
            </p>
          </div>
        </div>
      </div>

      <ProjectGuide />

      <!-- CTA — into the workbench -->
      <div class="mx-auto max-w-[1600px] px-4 pb-20 md:px-8 md:pb-28">
        <NuxtLink
          to="/projects"
          class="group flex items-center justify-between gap-6 border-t border-cream/15 py-8 text-cream transition-colors hover:text-pop-yellow"
        >
          <span class="flex flex-col">
            <span class="text-mono-eyebrow opacity-65">More from the workbench</span>
            <span class="text-display-md mt-1 text-3xl">Enter the workbench</span>
          </span>
          <span class="flex items-center gap-3 text-2xl transition-transform group-hover:translate-x-1">
            →
          </span>
        </NuxtLink>
      </div>
    </section>

    <!-- ======================================================================
         MANIFESTO SPREAD — the long form
    ====================================================================== -->
    <section
      id="manifesto"
      class="relative scroll-mt-16 overflow-hidden border-b border-cream/10 bg-cream text-ink"
    >
      <!-- Halftone backplates — parallax orbs (away pushes them off the cursor)

           These two orbs sit in the manifesto section, well below the
           fold. `hydrate-on-visible` skips their rAF + pointermove
           setup until the user actually scrolls them into view. -->
      <div class="pointer-events-none absolute -right-32 -top-32">
        <LazyHalftoneOrb hydrate-on-visible tone="text-ink" size-class="h-80 w-80" :range="20" influence="away" :opacity="0.16" />
      </div>
      <div class="pointer-events-none absolute -left-20 bottom-0">
        <LazyHalftoneOrb hydrate-on-visible tone="text-pop-magenta" size-class="h-64 w-64" :range="16" influence="toward" :opacity="0.12" />
      </div>

      <div class="mx-auto max-w-[1600px] px-4 py-20 md:px-8 md:py-32">
        <div class="grid grid-cols-12 gap-x-6 gap-y-10">
          <div class="col-span-12 lg:col-span-4">
            <span class="text-mono-eyebrow opacity-65">Howl IV — Manifesto</span>
            <h2 class="text-display-xl mt-4 leading-[0.82]">
              Less<br>
              <span class="italic font-serif">talking,</span><br>
              more<br>
              <span class="text-pop-magenta">shipping.</span>
            </h2>
            <div class="mt-8 flex gap-3">
              <StickerBadge tone="ink" :tilt="-4">Tenets · 04</StickerBadge>
            </div>
          </div>

          <div class="col-span-12 grid gap-y-10 lg:col-span-8 lg:grid-cols-2 lg:gap-x-10">
            <article class="manifesto-card space-y-3 border-t-2 border-ink pt-5" tabindex="0" data-riso-target>
              <span class="manifesto-num text-display-md text-3xl">01</span>
              <h3 class="text-2xl font-serif italic">Ideas are cheap.</h3>
              <p class="text-pretty leading-relaxed text-ink/80">
                Everyone has them. A notes app full of "wouldn't it be cool if" is just
                grocery list of cravings. Execution is the receipt.
              </p>
            </article>
            <article class="manifesto-card space-y-3 border-t-2 border-ink pt-5" tabindex="0" data-riso-target>
              <span class="manifesto-num text-display-md text-3xl">02</span>
              <h3 class="text-2xl font-serif italic">UX is a verb.</h3>
              <p class="text-pretty leading-relaxed text-ink/80">
                Not a layer applied at the end, not a department. Every commit either
                makes the experience kinder or makes it noisier. Pick one.
              </p>
            </article>
            <article class="manifesto-card space-y-3 border-t-2 border-ink pt-5" tabindex="0" data-riso-target>
              <span class="manifesto-num text-display-md text-3xl">03</span>
              <h3 class="text-2xl font-serif italic">Open by default.</h3>
              <p class="text-pretty leading-relaxed text-ink/80">
                If we can ship the source, we do. Closed code is a debt to the future,
                and we're trying to teach as we go — not lock the curriculum.
              </p>
            </article>
            <article class="manifesto-card space-y-3 border-t-2 border-ink pt-5" tabindex="0" data-riso-target>
              <span class="manifesto-num text-display-md text-3xl">04</span>
              <h3 class="text-2xl font-serif italic">Learn loudly.</h3>
              <p class="text-pretty leading-relaxed text-ink/80">
                We stream the work, write down the mistakes, and post the wins.
                Wolves is becoming the place where learning meets teaching — both ways.
              </p>
            </article>
          </div>
        </div>
      </div>
    </section>

    <!-- ======================================================================
         BIG QUOTE BLOCK

         Also hosts HELD, NOT SAID (see script): press-and-hold the
         quote and a quiet plate develops over the section. The section
         was already relative + overflow-hidden, so the plate (absolute
         inset-0) can only cover it, never extend it.
    ====================================================================== -->
    <section
      ref="bigQuoteRoot"
      class="relative overflow-hidden border-b border-cream/10 py-20 md:py-32"
      :class="{ 'held-plate-open': plateOpen }"
    >
      <div class="mx-auto max-w-[1600px] px-4 md:px-8">
        <!-- Pointer hold surface. Deliberately NOT a button: ARIA
             button is children-presentational and would erase the
             quote from the accessibility tree. Keyboard/AT get the
             dedicated .plate-key-trigger control below instead. -->
        <div
          ref="holdWrapEl"
          class="house-quote-hold grid grid-cols-12 gap-6"
          :class="{ 'is-committing': isCommitting, 'is-half': isHalfHold, 'is-settling': isSettling }"
          data-riso-target
          data-riso-label="Hold your breath"
          @pointerdown="onQuotePointerDown"
          @pointermove="onQuotePointerMove"
          @pointerup="onQuotePointerEnd"
          @pointercancel="onQuotePointerEnd"
          @pointerleave="onQuotePointerEnd"
          @contextmenu="onQuoteContextMenu"
        >
          <div class="col-span-12 lg:col-span-2">
            <span
              class="big-quote-mark text-display-mega leading-[0.78] text-[clamp(4rem,8vw,9rem)]"
              :class="bigQuoteInView ? 'in-view' : ''"
            >&ldquo;</span>
          </div>
          <div class="col-span-12 lg:col-span-9">
            <p class="house-quote-ink text-display-lg text-cream text-balance leading-[0.92]">
              {{ site.quotes.bigBlock.pre }}
              <span class="text-pop-magenta italic font-serif">{{ site.quotes.bigBlock.highlightA }}</span><br>
              {{ site.quotes.bigBlock.mid }}
              <span class="text-pop-yellow">{{ site.quotes.bigBlock.highlightB }}</span>
            </p>
            <p class="text-mono-eyebrow mt-6 text-cream/65">— Wolves, house rules</p>
          </div>
        </div>
      </div>

      <!-- Keyboard / screen-reader doorway to the held statement.
           Absolutely positioned (zero flow impact), visually hidden
           until focused, then shows as a small mono chip. Keyboard
           users press-and-hold Enter/Space; AT activation (a single
           synthesized click) is honored as a completed hold. -->
      <button
        ref="plateTriggerEl"
        type="button"
        class="plate-key-trigger"
        @keydown="onTriggerKeydown"
        @keyup="onTriggerKeyup"
        @click="onTriggerClick"
        @blur="cancelHold"
      >Press and hold — there is one more line</button>

      <!-- THE PLATE. This is the one place the site goes quiet: ink on
           cream only, no fluorescents, no stickers, no jiggle, and —
           deliberately — no wolf branding. The single magenta full
           stop is the entire color budget. Click or Esc lifts it off;
           nothing persists. -->
      <Transition name="plate">
        <div
          v-if="plateOpen"
          ref="plateEl"
          class="held-plate absolute inset-0 z-10 overflow-hidden"
          tabindex="-1"
          @click="closePlate"
        >
          <!-- crop marks — the footer's print-shop registration corners -->
          <span class="pointer-events-none absolute left-4 top-4 text-ink/30 md:left-8 md:top-8" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M0 11 H8 M11 0 V8" stroke="currentColor" stroke-width="1.2" />
              <circle cx="11" cy="11" r="1.5" fill="currentColor" />
            </svg>
          </span>
          <span class="pointer-events-none absolute right-4 top-4 text-ink/30 md:right-8 md:top-8" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M22 11 H14 M11 0 V8" stroke="currentColor" stroke-width="1.2" />
              <circle cx="11" cy="11" r="1.5" fill="currentColor" />
            </svg>
          </span>
          <span class="pointer-events-none absolute bottom-4 left-4 text-ink/30 md:bottom-8 md:left-8" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M0 11 H8 M11 22 V14" stroke="currentColor" stroke-width="1.2" />
              <circle cx="11" cy="11" r="1.5" fill="currentColor" />
            </svg>
          </span>
          <span class="pointer-events-none absolute bottom-4 right-4 text-ink/30 md:bottom-8 md:right-8" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M22 11 H14 M11 22 V14" stroke="currentColor" stroke-width="1.2" />
              <circle cx="11" cy="11" r="1.5" fill="currentColor" />
            </svg>
          </span>

          <!-- The statement, nothing else. Lines stagger by opacity
               only — both the deflection and its correction are in the
               DOM from the first frame and share the same beat; the
               deflection never stands alone. -->
          <div class="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center md:gap-5">
            <!-- Muted lines use color-alpha (text-ink/N), not opacity
                 utilities — the stagger animation owns `opacity`. -->
            <p class="plate-line plate-deboss text-display-md md:text-display-lg leading-[0.9]" style="--line: 0">
              {{ site.quotes.notAllMen.deflection }}
            </p>
            <p class="plate-line text-editorial text-2xl md:text-4xl" style="--line: 0">
              <span class="plate-rule">{{ site.quotes.notAllMen.correction }}<span class="text-pop-magenta">.</span></span>
            </p>
            <p class="plate-line text-editorial hidden text-lg text-ink/80 sm:block md:text-xl" style="--line: 1">
              {{ site.quotes.notAllMen.aside }}
            </p>
            <p class="plate-line text-editorial text-base text-ink/80 md:text-lg" style="--line: 2">
              {{ site.quotes.notAllMen.beat }}
            </p>
            <p class="plate-line text-mono-meta mt-2 text-ink/75" style="--line: 3">
              {{ site.quotes.notAllMen.closing }}
            </p>
          </div>
        </div>
      </Transition>
      <span class="sr-only" aria-live="polite">{{ plateLive }}</span>
    </section>

    <!-- ======================================================================
         SECOND MARQUEE — pack call

         Far below the fold — same lazy-hydration treatment as the first
         marquee. CSS-only animation, so it visually streams from SSR.
    ====================================================================== -->
    <!-- Pride pass: while all six pins are in, the pack call answers
         itself in its own meter. Same band, same height. :key for the
         same pre-hydration prop-swap reason as the first marquee —
         the pins live at the very top of the page, so this band is
         routinely un-hydrated when the sixth pin lands. -->
    <LazyMarqueeQuote
      :key="packCallMarquee.separator"
      hydrate-on-visible
      :text="packCallMarquee.text"
      tone="magenta-on-ink"
      :separator="packCallMarquee.separator"
      size-class="text-display-lg"
      reverse
    />

    <!-- ======================================================================
         BROADCAST — pack TV (easter egg, sibling to RadioDial / Polaroid)

         The third physical-object easter egg on the homepage: a small
         portable CRT with a sleeve of draggable cartridges. The whole
         interaction (pull a cart out of its pack, drop it in the slot,
         eject) lives inside the component. Lazy-hydrated by visibility
         so the pointer-event wiring stays off the LCP path.
    ====================================================================== -->
    <section class="relative overflow-hidden border-t border-cream/10">
      <div class="mx-auto max-w-[1600px] px-4 py-20 md:px-8 md:py-28">
        <LazyPortableTv hydrate-on-visible />
      </div>
    </section>

    <!-- ======================================================================
         OUTRO — call to follow
    ====================================================================== -->
    <section class="mx-auto grid max-w-[1600px] gap-12 px-4 py-24 md:grid-cols-2 md:px-8 md:py-32">
      <div>
        <span class="text-mono-eyebrow text-cream/60">Lookout VI — Stay close</span>
        <h2 class="text-display-xl mt-4 text-cream leading-[0.85]">
          Follow the pack.
        </h2>
        <p class="text-editorial mt-6 max-w-[40ch] text-2xl text-cream/85">
          Code on GitHub, late-night building on Twitch. Same wolves, two windows.
        </p>
      </div>
      <div class="flex flex-col justify-end gap-6">
        <SocialLink
          :href="site.socials.github"
          icon="mdi:github"
          label="GitHub"
          sublabel="github.com/wolvesdotink"
          tone="yellow"
          external
        />
        <SocialLink
          :href="site.socials.twitch"
          icon="mdi:twitch"
          label="Twitch"
          sublabel="twitch.tv/wolvesdotink"
          tone="magenta"
          external
        />
        <SocialLink
          href="mailto:hi@wolves.ink"
          icon="mdi:email-outline"
          label="Email"
          sublabel="hi@wolves.ink"
          tone="orange"
          border="border-y"
        />
      </div>
    </section>

    <!--
      FIELD POLAROID — visual sibling to the radio. No longer a
      dedicated section: the rest-state surface is just a leather
      camera strap pinned to the top-right of the viewport (fixed
      position, lives in the component). Pulling the strap deploys a
      modal-style overlay with the live-cam viewfinder, a riso-filter
      shutter pipeline (selfie capture), and the print stack. The
      whole component owns its own positioning, so it sits as a sibling
      of the page root rather than inside any layout column.

      `hydrate-on-interaction="click"` is the key INP win on this page.
      The component carries the heaviest payload in the bundle (canvas
      rendering, camera stream wiring, ~200 lines of synchronous draw
      code), but the user only needs it after they pull the strap. The
      SSR'd strap visual still renders via CSS — first click both
      hydrates the component AND fires the open handler in the same
      gesture. Saves 30-80KB off the initial JS payload.
    -->
    <LazyFieldPolaroid hydrate-on-interaction="click" />
  </div>
</template>
