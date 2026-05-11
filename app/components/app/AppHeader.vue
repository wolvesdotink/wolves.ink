<script setup lang="ts">
import { site } from '~/data/site'
import { formatDispatchDate } from '~/composables/useFieldNotes'

/**
 * AppHeader — sticky site header.
 *
 * Composition (left → center → right):
 *  - Wordmark "Wolves" with the wolf glyph.
 *  - Note pill: a stamp showing the latest field note. By default
 *    it reads "Latest · {title} · {date}". On hover/focus it flips to reveal
 *    "→ Follow the trail" and routes to /field-notes. Replaces the previous
 *    inert "03 active projects" / "← Back to the den" status line.
 *  - Nav (Workbench · Field Notes · Manifesto) followed by a divider
 *    and the GitHub + Twitch icons. The previous "Open Source" and "Live"
 *    nav links were removed because they duplicated the social icons; the
 *    earlier "Work" link was removed because it pointed at the same surface
 *    as "Workbench" (the homepage `#work` section teases `/projects`).
 *
 * Anchors (`/#manifesto`) are absolute paths so they work from any page —
 * the corresponding scroll lives in `nuxt.config.ts > router.options`.
 *
 * Mobile: a full-bleed drawer with a "table of contents" feel — large
 * editorial type, numbered items, the field-notes preview at the bottom.
 */

const route = useRoute()
const { latest } = useFieldNotes()

/**
 * Active-state matcher. We treat the `Field Notes` link as active for
 * `/field-notes` and any nested route, and the `Workbench` link as active
 * for `/projects` and any nested route. Anchor links never look "active"
 * because there's no reliable way to know which section the user is in.
 */
function isActive(href: string): boolean {
  if (href.startsWith('/#')) return false
  if (href === '/') return route.path === '/'
  return route.path === href || route.path.startsWith(href + '/')
}

// ── Mobile drawer state ──────────────────────────────────────────────
const open = ref(false)
const close = () => { open.value = false }

// Close drawer whenever the route actually changes (path or hash both count).
watch(() => route.fullPath, close)

// Lock the body when the drawer is open so background content doesn't scroll.
watch(open, (v) => {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('overflow-hidden', v)
})
onBeforeUnmount(() => {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.remove('overflow-hidden')
  }
})

// Latest note, shortened for the pill on small breakpoints.
const latestMeta = computed(() => formatDispatchDate(latest.date))
</script>

<template>
  <header class="app-header sticky top-0 z-40">
    <div class="border-b border-cream/12 bg-ink/85 backdrop-blur-xl supports-[backdrop-filter]:bg-ink/72">
      <div
        class="mx-auto grid h-16 max-w-[1600px] items-center gap-4 px-4 md:gap-6 md:px-8"
        :class="'grid-cols-[auto_1fr_auto] md:grid-cols-[1fr_auto_1fr]'"
      >
        <!-- ════════════════════════════════════════════════════
             LEFT — Wordmark
        ════════════════════════════════════════════════════ -->
        <NuxtLink
          to="/"
          class="wordmark group flex items-center gap-3"
          aria-label="Wolves — back to home"
        >
          <span
            class="wolf-glyph relative inline-grid h-8 w-8 place-items-center text-cream"
            aria-hidden="true"
          >
            <!--
              Master wolves.ink mark — sourced from /public/logo.svg.
              Inlined (rather than <img>) so we keep `currentColor`
              control: the wrapper sets `text-cream` and the glyph
              stamps cream onto the dark ink header. The W's natural
              aspect (~4:3) means it fills the 32px square with a hair
              of vertical letterboxing — no coin/circle backdrop.
            -->
            <svg viewBox="0 0 550 414" class="h-full w-full">
              <g transform="translate(-225 -304)" fill="currentColor">
                <path d="M627.879524,539 L689.506201,539 L624.324737,718.084599 L551.689519,718.084599 L400.975051,304 L462.601727,304 L588.007128,648.548508 L627.879524,539 Z M629.699376,534 L636.97878,514 L698.605457,514 L691.326052,534 L629.699376,534 Z M640.618483,504 L647.897887,484 L709.524564,484 L702.245159,504 L640.618483,504 Z M653.357441,469 L660.636845,449 L722.263522,449 L714.984117,469 L653.357441,469 Z M667.91625,429 L675.195655,409 L736.822332,409 L729.542927,429 L667.91625,429 Z M684.294911,384 L691.574315,364 L753.200992,364 L745.921587,384 L684.294911,384 Z M702.493422,334 L713.412529,304 L775.039206,304 L764.120099,334 L702.493422,334 Z M286.634022,304 L412.27267,649.189348 L456.401167,527.947298 L487.214505,612.606249 L448.823525,718.084599 L375.721814,718.084599 L225.007345,304 L286.634022,304 Z M537.911317,304 L599.537994,304 L544.219314,455.986823 L513.405976,371.327872 L537.911317,304 Z"/>
              </g>
            </svg>
            <span class="wolf-glyph__halo" aria-hidden="true" />
          </span>
          <span class="flex items-baseline gap-2">
            <span class="wordmark__name text-display text-[1.1rem] tracking-[0.04em] text-cream">
              {{ site.wordmark }}
            </span>
            <span class="hidden text-mono-eyebrow text-cream/40 sm:inline">v∞</span>
          </span>
        </NuxtLink>

        <!-- ════════════════════════════════════════════════════
             CENTER — Note pill (latest field note)
             Default: "Latest · <title> · <date>"
             Hover  : "→ Follow the trail"
        ════════════════════════════════════════════════════ -->
        <NuxtLink
          to="/field-notes"
          class="dispatch-pill group hidden md:inline-grid"
          aria-label="Open field notes"
        >
          <span class="dispatch-pane dispatch-pane--front">
            <span class="dispatch-live" aria-hidden="true">
              <span class="dispatch-live__dot" />
            </span>
            <span class="text-mono-eyebrow text-cream/55">Latest</span>
            <span class="dispatch-pipe" aria-hidden="true" />
            <span class="text-mono-meta text-cream/85 italic font-serif normal-case tracking-normal">
              {{ latest.title }}
            </span>
            <span class="dispatch-pipe hidden lg:inline" aria-hidden="true" />
            <span class="hidden text-mono-eyebrow text-cream/40 lg:inline">{{ latestMeta }}</span>
          </span>
          <span class="dispatch-pane dispatch-pane--back">
            <span class="text-mono-eyebrow text-pop-yellow">Follow the trail</span>
            <span class="dispatch-arrow" aria-hidden="true">→</span>
          </span>
        </NuxtLink>

        <!-- ════════════════════════════════════════════════════
             RIGHT — Nav + socials + mobile menu trigger
        ════════════════════════════════════════════════════ -->
        <nav class="flex items-center justify-end gap-1 md:gap-4">
          <ul class="hidden items-center gap-5 md:flex">
            <li v-for="item in site.nav" :key="item.label">
              <NuxtLink
                :to="item.href"
                class="nav-link group relative text-mono-eyebrow transition-colors duration-300"
                :class="isActive(item.href) ? 'text-cream is-active' : 'text-cream/70 hover:text-cream'"
              >
                {{ item.label }}
                <span class="nav-link__rule" aria-hidden="true" />
              </NuxtLink>
            </li>
          </ul>

          <span
            class="mx-2 hidden h-6 w-px bg-cream/15 md:block"
            aria-hidden="true"
          />

          <div class="hidden items-center gap-1.5 md:flex">
            <IconLink
              :href="site.socials.github"
              icon="mdi:github"
              label="Wolves on GitHub"
              tone="yellow"
              size="sm"
            />
            <IconLink
              :href="site.socials.twitch"
              icon="mdi:twitch"
              label="Wolves on Twitch"
              tone="magenta"
              size="sm"
            />
          </div>

          <!-- Mobile menu trigger -->
          <button
            type="button"
            class="menu-trigger md:hidden"
            :aria-expanded="open"
            aria-controls="mobile-nav"
            @click="open = !open"
          >
            <span class="sr-only">{{ open ? 'Close menu' : 'Open menu' }}</span>
            <span class="menu-trigger__lines" :class="{ 'is-open': open }" aria-hidden="true">
              <span /><span /><span />
            </span>
          </button>
        </nav>
      </div>

      <!-- Bottom rule — scroll progress doubles as a tape stripe -->
      <ScrollProgress />
    </div>

    <!-- ══════════════════════════════════════════════════════
         MOBILE DRAWER — editorial table of contents
    ══════════════════════════════════════════════════════ -->
    <Transition name="drawer">
      <div
        v-if="open"
        id="mobile-nav"
        class="drawer fixed inset-x-0 top-[67px] z-30 md:hidden"
      >
        <div class="drawer__bg" aria-hidden="true" />
        <div class="drawer__inner relative mx-auto max-w-[1600px] px-4 pb-12 pt-6">
          <span class="text-mono-eyebrow text-cream/45">Table of contents</span>
          <ol class="mt-6 divide-y divide-cream/10 border-y border-cream/10">
            <li v-for="(item, i) in site.nav" :key="item.label">
              <NuxtLink
                :to="item.href"
                class="drawer-link group flex items-center justify-between gap-4 py-5"
                :style="{ '--i': i }"
              >
                <span class="flex items-baseline gap-4">
                  <span class="text-mono-eyebrow text-cream/35 tabular-nums">
                    {{ String(i + 1).padStart(2, '0') }}
                  </span>
                  <span class="text-display text-3xl tracking-[0.02em] text-cream transition-colors group-hover:text-pop-yellow">
                    {{ item.label }}
                  </span>
                </span>
                <span class="text-2xl text-cream/30 transition-all group-hover:translate-x-1 group-hover:text-pop-yellow">
                  →
                </span>
              </NuxtLink>
            </li>
          </ol>

          <!-- Latest dispatch preview -->
          <NuxtLink
            to="/field-notes"
            class="drawer-dispatch group mt-10 block border-t border-cream/15 pt-6"
          >
            <span class="flex items-center gap-2 text-mono-eyebrow text-pop-yellow">
              <span class="grid h-2 w-2 place-items-center">
                <span class="absolute h-2 w-2 rounded-full bg-pop-magenta pulse-dot" />
              </span>
              Latest note · {{ latest.eyebrow }}
            </span>
            <span class="text-editorial mt-3 block text-2xl text-cream group-hover:text-pop-yellow">
              {{ latest.title }}
            </span>
            <span class="text-mono-meta mt-2 block text-cream/55">
              {{ latestMeta }} · {{ latest.readTime }}
            </span>
          </NuxtLink>

          <!-- Socials -->
          <div class="mt-10 flex items-center gap-3 border-t border-cream/15 pt-6">
            <IconLink
              :href="site.socials.github"
              icon="mdi:github"
              label="Wolves on GitHub"
              tone="yellow"
              size="md"
            />
            <IconLink
              :href="site.socials.twitch"
              icon="mdi:twitch"
              label="Wolves on Twitch"
              tone="magenta"
              size="md"
            />
            <a
              href="mailto:hi@wolves.ink"
              class="ml-auto text-mono-eyebrow text-cream/70 transition-colors hover:text-pop-orange"
            >
              hi@wolves.ink ↗
            </a>
          </div>
        </div>
      </div>
    </Transition>
  </header>
</template>

<style scoped>
/* ──────────────────────────────────────────────────────────────────────
   Wordmark — wolf glyph rotates a hair on hover, a soft halo blooms.
   ────────────────────────────────────────────────────────────────────── */
.wolf-glyph {
  transition: transform 480ms var(--ease-pop);
}
.wordmark:hover .wolf-glyph,
.wordmark:focus-visible .wolf-glyph {
  transform: rotate(18deg) scale(1.04);
}
.wolf-glyph__halo {
  position: absolute;
  inset: -6px;
  border-radius: 999px;
  background: radial-gradient(circle, var(--color-pop-magenta) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 480ms ease;
  z-index: -1;
  filter: blur(6px);
}
.wordmark:hover .wolf-glyph__halo,
.wordmark:focus-visible .wolf-glyph__halo {
  opacity: 0.55;
}

/* ──────────────────────────────────────────────────────────────────────
   Dispatch pill — magazine "issue" indicator that flips on hover.
   ────────────────────────────────────────────────────────────────────── */
.dispatch-pill {
  position: relative;
  height: 36px;
  padding: 0 16px;
  border: 1px solid rgba(241, 233, 216, 0.12);
  border-radius: 999px;
  background:
    linear-gradient(180deg, rgba(241, 233, 216, 0.05) 0%, rgba(241, 233, 216, 0) 70%),
    rgba(13, 12, 10, 0.4);
  display: grid;
  align-items: center;
  justify-self: center;
  overflow: hidden;
  transition:
    border-color 320ms var(--ease-pop),
    background 320ms var(--ease-pop),
    transform 320ms var(--ease-pop);
  isolation: isolate;
}
.dispatch-pill::before {
  /* Riso wash — pulses in from the left when hovered. */
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(120% 80% at 0% 50%, rgba(255, 72, 105, 0.22), transparent 60%);
  opacity: 0;
  transition: opacity 480ms var(--ease-pop);
  z-index: -1;
}
.dispatch-pill:hover,
.dispatch-pill:focus-visible {
  border-color: rgba(241, 233, 216, 0.32);
  transform: translateY(-1px);
}
.dispatch-pill:hover::before,
.dispatch-pill:focus-visible::before {
  opacity: 1;
}

.dispatch-pane {
  grid-column: 1;
  grid-row: 1;
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
  white-space: nowrap;
  transition: transform 520ms var(--ease-pop), opacity 320ms ease;
}
.dispatch-pane--back {
  transform: translateY(140%);
  opacity: 0;
}
.dispatch-pill:hover .dispatch-pane--front,
.dispatch-pill:focus-visible .dispatch-pane--front {
  transform: translateY(-140%);
  opacity: 0;
}
.dispatch-pill:hover .dispatch-pane--back,
.dispatch-pill:focus-visible .dispatch-pane--back {
  transform: translateY(0);
  opacity: 1;
}

.dispatch-live {
  position: relative;
  width: 0.5rem;
  height: 0.5rem;
  display: inline-grid;
  place-items: center;
}
.dispatch-live__dot {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background: var(--color-pop-magenta);
  box-shadow: 0 0 12px rgba(255, 72, 105, 0.8);
  animation: pulse-dot 1.6s ease-in-out infinite;
}

.dispatch-pipe {
  display: inline-block;
  width: 1px;
  height: 0.75rem;
  background: rgba(241, 233, 216, 0.18);
}

.dispatch-arrow {
  font-family: var(--font-display);
  font-size: 0.875rem;
  color: var(--color-pop-yellow);
  transition: transform 320ms var(--ease-pop);
}
.dispatch-pill:hover .dispatch-arrow,
.dispatch-pill:focus-visible .dispatch-arrow {
  transform: translateX(2px);
}

@media (prefers-reduced-motion: reduce) {
  .dispatch-pane { transition: opacity 200ms ease; }
  .dispatch-pill:hover .dispatch-pane--front,
  .dispatch-pill:focus-visible .dispatch-pane--front { transform: none; }
  .dispatch-pill:hover .dispatch-pane--back,
  .dispatch-pill:focus-visible .dispatch-pane--back { transform: none; }
}

/* ──────────────────────────────────────────────────────────────────────
   Nav links — riso underline draws from the start.
   ────────────────────────────────────────────────────────────────────── */
.nav-link {
  position: relative;
  padding: 0.25rem 0;
}
.nav-link__rule {
  position: absolute;
  left: 0;
  bottom: -6px;
  height: 1px;
  width: 0;
  background: var(--color-pop-yellow);
  transition: width 480ms var(--ease-pop), background 320ms ease;
}
.nav-link:hover .nav-link__rule,
.nav-link:focus-visible .nav-link__rule {
  width: 100%;
}
.nav-link.is-active .nav-link__rule {
  width: 100%;
  background: var(--color-cream);
}

/* ──────────────────────────────────────────────────────────────────────
   Mobile menu trigger — small circular button, three lines → X.
   ────────────────────────────────────────────────────────────────────── */
.menu-trigger {
  display: inline-grid;
  place-items: center;
  height: 38px;
  width: 38px;
  border-radius: 999px;
  border: 1px solid rgba(241, 233, 216, 0.25);
  color: var(--color-cream);
  background: rgba(13, 12, 10, 0.4);
  transition: background 280ms ease, border-color 280ms ease, color 280ms ease, transform 280ms var(--ease-pop);
}
.menu-trigger:hover {
  background: var(--color-pop-yellow);
  border-color: var(--color-pop-yellow);
  color: var(--color-ink);
  transform: rotate(-3deg);
}
.menu-trigger__lines {
  display: grid;
  gap: 4px;
  width: 14px;
}
.menu-trigger__lines span {
  display: block;
  width: 14px;
  height: 1.5px;
  background: currentColor;
  transition: transform 320ms var(--ease-pop), opacity 240ms ease;
  transform-origin: center;
}
.menu-trigger__lines.is-open span:nth-child(1) {
  transform: translateY(5.5px) rotate(45deg);
}
.menu-trigger__lines.is-open span:nth-child(2) {
  opacity: 0;
}
.menu-trigger__lines.is-open span:nth-child(3) {
  transform: translateY(-5.5px) rotate(-45deg);
}
/* Hide on desktop — there is no sidebar to open at md+. The Tailwind
   `md:hidden` on the button itself loses to the scoped `.menu-trigger`
   rule above (scoped attribute selectors win on specificity), so we
   re-assert the hide in a media query here. */
@media (min-width: 768px) {
  .menu-trigger { display: none; }
}

/* ──────────────────────────────────────────────────────────────────────
   Drawer — full-bleed editorial overlay below the bar.
   ────────────────────────────────────────────────────────────────────── */
.drawer {
  bottom: 0;
}
.drawer__bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(60% 40% at 50% 0%, rgba(255, 72, 105, 0.08), transparent 70%),
    radial-gradient(40% 30% at 100% 100%, rgba(255, 233, 78, 0.06), transparent 70%),
    var(--color-ink-deep);
  backdrop-filter: blur(20px);
}
.drawer__inner {
  height: 100%;
  overflow-y: auto;
}
.drawer-link {
  --i: 0;
  animation: drawer-stagger 520ms var(--ease-pop) both;
  animation-delay: calc(60ms * var(--i));
}
.drawer-dispatch {
  animation: drawer-stagger 520ms var(--ease-pop) both;
  animation-delay: calc(60ms * 6);
}

@keyframes drawer-stagger {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}

.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 320ms ease, transform 360ms var(--ease-pop);
}
.drawer-enter-from {
  opacity: 0;
  transform: translateY(-12px);
}
.drawer-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}

@media (prefers-reduced-motion: reduce) {
  .drawer-link,
  .drawer-dispatch { animation: none; }
  .drawer-enter-active,
  .drawer-leave-active { transition: opacity 200ms ease; }
}

/* ──────────────────────────────────────────────────────────────────────
   Slim breakpoint nudges — keep the dispatch readable below 1100px.
   ────────────────────────────────────────────────────────────────────── */
@media (max-width: 1100px) {
  .dispatch-pill { padding: 0 12px; }
}

/* Re-assert the mobile hide — Tailwind's `hidden` on the element loses
   to the scoped `.dispatch-pill` rule above on specificity, same trap
   as `.menu-trigger`. */
@media (max-width: 767px) {
  .dispatch-pill { display: none; }
}
</style>
