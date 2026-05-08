<script setup lang="ts">
import { site } from '~/data/site'

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
  obs.observe(bigQuoteRoot.value)
  onBeforeUnmount(() => obs.disconnect())
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

      <!-- Masthead — gigantic wordmark -->
      <div class="relative mx-auto max-w-[1600px] px-6 py-24 md:px-12 md:py-36 lg:py-44">
        <HeroDisplay word="WOLVES" />

        <!-- Tickers under the wordmark.
             mt-* mirrors the parent's py-* so the visible gap above the
             title (parent's pt) matches the gap below it (this mt to the
             border-t divider). Combined with text-box-trim on .hero-wordmark,
             this gives the title visually equal padding top and bottom. -->
        <div class="mt-24 flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-t border-cream/15 pt-5 text-mono-eyebrow text-cream/75 md:mt-36 lg:mt-44">
          <div class="flex items-center gap-3">
            <span class="h-1.5 w-1.5 rounded-full bg-pop-magenta pulse-dot" />
            <span>Live · 03 active projects</span>
          </div>
          <div class="hidden items-center gap-2 md:flex">
            <span class="opacity-50">Set in</span>
            <span class="text-cream">Anton</span>
            <span class="opacity-50">+</span>
            <span class="text-editorial text-cream">Fraunces</span>
            <span class="opacity-50">+</span>
            <span class="text-cream">Geist</span>
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

          <!-- Stickers / margin column -->
          <aside class="col-span-12 flex flex-row flex-wrap items-start gap-3 lg:col-span-5 lg:flex-col lg:items-start lg:gap-4 lg:pt-12">
            <StickerBadge tone="yellow" :tilt="-5" eyebrow="What we ship" jiggle>
              Open source ✦
            </StickerBadge>
            <StickerBadge tone="cream" :tilt="4" eyebrow="How we ship">
              UX before features
            </StickerBadge>
            <StickerBadge tone="magenta" :tilt="-3" eyebrow="Why we ship" jiggle>
              Learning · Teaching
            </StickerBadge>
            <StickerBadge tone="ink" :tilt="2" eyebrow="Where we live">
              The world is home
            </StickerBadge>
          </aside>
        </div>

        <!-- A row of small numbers — magazine-style stats with count-up + riso slam -->
        <StatRow
          :items="[
            { value: 3, tone: 'yellow', label: 'Active projects' },
            { display: '∞', tone: 'magenta', label: 'Late-night sketches' },
            { value: 2, pad: 1, tone: 'orange', label: 'Open-source repos' },
            { value: 1, pad: 1, tone: 'cream', label: 'Manifesto' },
          ]"
        />

        <!-- Scroll cue — animated draw-down + pulsing arrow -->
        <div class="mt-20 flex flex-col items-center gap-3 text-cream/50">
          <span class="text-mono-eyebrow">Walk on</span>
          <span class="turn-page__line" aria-hidden="true" />
          <span class="turn-page__arrow text-cream/60" aria-hidden="true">▾</span>
        </div>
      </div>
    </section>

    <!-- ======================================================================
         MARQUEE BREAK — the manifesto, screaming

         Below the fold on every viewport — `hydrate-on-visible` keeps
         its (small) hydration cost out of the LCP window. Animation is
         pure CSS so the marquee scrolls fine pre-hydration.
    ====================================================================== -->
    <LazyMarqueeQuote
      hydrate-on-visible
      :text="site.quotes.marquee"
      tone="yellow-on-ink"
      :outline="true"
      separator="✺"
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
    ====================================================================== -->
    <section
      ref="bigQuoteRoot"
      class="relative overflow-hidden border-b border-cream/10 py-20 md:py-32"
    >
      <div class="mx-auto max-w-[1600px] px-4 md:px-8">
        <div class="grid grid-cols-12 gap-6">
          <div class="col-span-12 lg:col-span-2">
            <span
              class="big-quote-mark text-display-mega leading-[0.78] text-[clamp(4rem,8vw,9rem)]"
              :class="bigQuoteInView ? 'in-view' : ''"
            >&ldquo;</span>
          </div>
          <div class="col-span-12 lg:col-span-9">
            <p class="text-display-lg text-cream text-balance leading-[0.92]">
              {{ site.quotes.bigBlock.pre }}
              <span class="text-pop-magenta italic font-serif">{{ site.quotes.bigBlock.highlightA }}</span><br>
              {{ site.quotes.bigBlock.mid }}
              <span class="text-pop-yellow">{{ site.quotes.bigBlock.highlightB }}</span>
            </p>
            <p class="text-mono-eyebrow mt-6 text-cream/65">— Wolves, house rules</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ======================================================================
         SECOND MARQUEE — pack call

         Far below the fold — same lazy-hydration treatment as the first
         marquee. CSS-only animation, so it visually streams from SSR.
    ====================================================================== -->
    <LazyMarqueeQuote
      hydrate-on-visible
      text="Stay curious · Ship anyway · Howl twice"
      tone="magenta-on-ink"
      separator="◑"
      size-class="text-display-lg"
      reverse
    />

    <!-- ======================================================================
         OUTRO — call to follow
    ====================================================================== -->
    <section class="mx-auto grid max-w-[1600px] gap-12 px-4 py-24 md:grid-cols-2 md:px-8 md:py-32">
      <div>
        <span class="text-mono-eyebrow text-cream/60">Lookout V — Stay close</span>
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
