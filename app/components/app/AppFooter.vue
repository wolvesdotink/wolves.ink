<script setup lang="ts">
import { site } from '~/data/site'

const year = computed(() => new Date().getFullYear())
const issueLabel = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`
})

const scrollToTop = () => {
  if (typeof window !== 'undefined') {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}
</script>

<template>
  <footer class="relative mt-24 overflow-hidden border-t border-cream/10 bg-ink-soft">
    <div class="relative mx-auto max-w-[1600px] px-4 pb-10 pt-20 md:px-8">
      <!-- ── Crop marks (printer's registration corners) ───────────────── -->
      <span
        class="pointer-events-none absolute left-3 top-6 select-none text-cream/22 md:left-6"
        aria-hidden="true"
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M0 11 H8 M11 0 V8" stroke="currentColor" stroke-width="1.2" />
          <circle cx="11" cy="11" r="1.5" fill="currentColor" />
        </svg>
      </span>
      <span
        class="pointer-events-none absolute right-3 top-6 select-none text-cream/22 md:right-6"
        aria-hidden="true"
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M22 11 H14 M11 0 V8" stroke="currentColor" stroke-width="1.2" />
          <circle cx="11" cy="11" r="1.5" fill="currentColor" />
        </svg>
      </span>
      <span
        class="pointer-events-none absolute bottom-6 left-3 select-none text-cream/22 md:left-6"
        aria-hidden="true"
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M0 11 H8 M11 22 V14" stroke="currentColor" stroke-width="1.2" />
          <circle cx="11" cy="11" r="1.5" fill="currentColor" />
        </svg>
      </span>
      <span
        class="pointer-events-none absolute bottom-6 right-3 select-none text-cream/22 md:right-6"
        aria-hidden="true"
      >
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M22 11 H14 M11 22 V14" stroke="currentColor" stroke-width="1.2" />
          <circle cx="11" cy="11" r="1.5" fill="currentColor" />
        </svg>
      </span>

      <!-- ── Issue stamp — rotated sticker, top right of wordmark ──────── -->
      <div
        class="absolute right-6 top-12 z-10 hidden md:block"
        style="--tilt: 9deg"
      >
        <div
          class="sticker-jiggle sticker-shadow grid h-28 w-28 place-items-center rounded-full border-2 border-ink bg-pop-magenta text-ink"
        >
          <div class="text-center leading-none">
            <div class="text-mono-eyebrow text-[0.55rem] opacity-80">howl</div>
            <div class="text-display mt-1 text-3xl">№∞</div>
            <div class="text-mono-eyebrow mt-1 text-[0.55rem] opacity-80">{{ issueLabel }}</div>
          </div>
        </div>
      </div>

      <!-- ── Eyebrow rule — "Out of the den" ───────────────────────────── -->
      <div class="mb-3 flex items-center gap-3 text-cream/50">
        <span class="h-px w-10 bg-cream/15" />
        <span class="text-mono-eyebrow">Out of the den · sign-off</span>
        <span class="h-px flex-1 bg-cream/15" />
      </div>

      <!-- ── Big footer wordmark + house quote ─────────────────────────── -->
      <div class="pointer-events-none relative">
        <div
          class="text-display-mega select-none leading-[0.78] text-cream/12"
          aria-hidden="true"
        >
          WOLVES
        </div>
        <p
          class="absolute inset-0 flex items-center justify-center px-4 text-center font-serif text-cream"
        >
          <span class="pointer-events-auto text-editorial text-balance text-2xl md:text-4xl lg:text-5xl">
            &ldquo;{{ site.quotes.footer }}&rdquo;
          </span>
        </p>
      </div>

      <!-- ── 12-col grid — The pack / Calls ─────────────────────────────  -->
      <div class="mt-16 grid gap-12 md:grid-cols-12">
        <!-- The pack — 5 cols -->
        <div class="space-y-5 md:col-span-5">
          <span class="text-mono-eyebrow text-cream/60">The pack</span>
          <p class="max-w-[34ch] text-lg leading-relaxed text-cream/85">
            <span class="text-editorial text-cream">{{ site.name }}</span> is a small studio shipping
            UX-driven applications. Mostly open source. Where learning meets teaching.
          </p>
        </div>

        <!-- Calls — 4 cols, right-aligned -->
        <div class="space-y-5 md:col-span-4 md:col-start-9">
          <span class="text-mono-eyebrow text-cream/60">Calls</span>
          <ul class="divide-y divide-cream/10 border-y border-cream/10">
            <li>
              <a
                :href="site.socials.github"
                target="_blank"
                rel="noreferrer noopener"
                class="group flex items-center justify-between gap-3 py-3 text-cream/85 transition-colors hover:text-pop-yellow"
              >
                <span class="flex items-center gap-3">
                  <Icon name="mdi:github" class="text-xl" />
                  <span class="text-base">github.com/wolvesdotink</span>
                </span>
                <span
                  class="text-mono-eyebrow translate-x-[-4px] opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
                >open ↗</span>
              </a>
            </li>
            <li>
              <a
                :href="site.socials.twitch"
                target="_blank"
                rel="noreferrer noopener"
                class="group flex items-center justify-between gap-3 py-3 text-cream/85 transition-colors hover:text-pop-magenta"
              >
                <span class="flex items-center gap-3">
                  <Icon name="mdi:twitch" class="text-xl" />
                  <span class="text-base">twitch.tv/wolvesdotink</span>
                </span>
                <span
                  class="text-mono-eyebrow translate-x-[-4px] opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
                >live ↗</span>
              </a>
            </li>
            <li>
              <a
                href="mailto:hi@wolves.ink"
                class="group flex items-center justify-between gap-3 py-3 text-cream/85 transition-colors hover:text-pop-orange"
              >
                <span class="flex items-center gap-3">
                  <Icon name="mdi:email-outline" class="text-xl" />
                  <span class="text-base">hi@wolves.ink</span>
                </span>
                <span
                  class="text-mono-eyebrow translate-x-[-4px] opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
                >write ↗</span>
              </a>
            </li>
          </ul>
        </div>

      </div>

      <!-- ── Baseline ──────────────────────────────────────────────────── -->
      <div
        class="mt-14 grid items-center gap-4 border-t border-cream/15 pt-6 md:grid-cols-[1fr_auto_1fr]"
      >
        <p class="text-mono-meta text-cream/55 md:justify-self-start">
          © {{ year }} {{ site.name }} · All wolves howling
        </p>

        <button
          type="button"
          class="group inline-flex items-center gap-2 border border-cream/20 bg-transparent px-4 py-2 text-mono-eyebrow text-cream/80 transition-all duration-300 hover:border-pop-yellow hover:bg-pop-yellow hover:text-ink md:justify-self-center"
          @click="scrollToTop"
        >
          <span>Back to the top</span>
          <span
            class="transition-transform duration-300 group-hover:-translate-y-0.5"
            aria-hidden="true"
          >↑</span>
        </button>

        <p class="text-mono-meta text-cream/55 md:justify-self-end">
          <NuxtLink to="/impressum" class="transition-colors hover:text-cream">Impressum</NuxtLink>
          · Last revised — {{ issueLabel }}
        </p>
      </div>
    </div>

    <!-- ── Bottom tape stripe — mirrors the header ─────────────────────── -->
    <div class="h-1 w-full opacity-80 tape-stripes" />
  </footer>
</template>
