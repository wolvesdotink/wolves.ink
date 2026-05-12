<script setup lang="ts">
import type { Project } from '~/data/projects'

const props = defineProps<{ project: Project }>()

const { list } = useProjects()
const totalSpreads = computed(() => String(list.length).padStart(2, '0'))

// Single source of truth for accent classes / gradients / sticker tones.
const accent = useAccentColor(() => props.project.accent)

// Non-webapp open-source projects (draw, magpie, fuji) show their latest
// GitHub release tag instead of a placeholder "domain" string. The server
// route returns null for webapps and projects without a github link, so the
// `showVersion` check naturally falls back to the Domain sticker.
const { data: release } = await useFetch(
  () => `/api/release-version/${props.project.slug}`,
  {
    key: `release-${props.project.slug}`,
    default: () => null,
  },
)

const showVersion = computed(
  () => Boolean(release.value?.tag) && !props.project.links.live,
)

const showDownloads = computed(
  () => showVersion.value && (release.value?.downloadCount ?? 0) > 0,
)

const formattedDownloads = computed(() =>
  (release.value?.downloadCount ?? 0).toLocaleString('en-US'),
)
</script>

<template>
  <section class="relative overflow-hidden">
    <!-- Background image -->
    <div class="absolute inset-0">
      <!--
        LCP element on `/projects/[slug]`. `fetchpriority="high"` tells
        the browser to schedule this image ahead of other resources of
        the same `loading="eager"` class — pairs with the Unsplash
        preconnect in `app.vue` so the socket is already warm when the
        request goes out.
      -->
      <NuxtImg
        :src="project.cover.src"
        :alt="project.cover.alt"
        provider="unsplash"
        width="2200"
        height="1400"
        quality="85"
        class="absolute inset-0 h-full w-full object-cover"
        :style="{ objectPosition: project.cover.position }"
        loading="eager"
        fetchpriority="high"
      />
      <div
        class="absolute inset-0 mix-blend-multiply"
        :style="{ background: accent.heroGradient }"
        aria-hidden="true"
      />
      <div class="absolute inset-0 halftone text-ink/40 mix-blend-multiply opacity-40" aria-hidden="true" />
      <div
        class="absolute inset-x-0 bottom-0 h-1/2"
        style="background: linear-gradient(180deg, rgba(13,12,10,0) 0%, rgba(13,12,10,1) 100%);"
        aria-hidden="true"
      />
    </div>

    <div class="relative mx-auto max-w-[1600px] px-4 pt-24 pb-12 md:px-10 md:pt-32">
      <!-- Eyebrow -->
      <div class="relative z-10 flex flex-wrap items-center gap-3 text-cream">
        <NuxtLink
          to="/projects"
          class="group inline-flex items-center gap-2 text-mono-eyebrow text-cream/80 transition-colors hover:text-cream"
        >
          <span class="transition-transform group-hover:-translate-x-1">←</span>
          All spreads
        </NuxtLink>
        <span class="text-mono-eyebrow opacity-30">·</span>
        <span class="text-mono-eyebrow opacity-70">Spread {{ project.index }} / {{ totalSpreads }}</span>
        <span class="text-mono-eyebrow opacity-30">·</span>
        <span class="text-mono-eyebrow opacity-70">{{ project.type }}</span>
      </div>

      <!-- Big name -->
      <div class="relative mt-12 md:mt-16">
        <!-- Vibe word as decorative outline behind the title -->
        <span
          class="pointer-events-none absolute -top-12 right-0 hidden text-display-xl text-transparent md:block"
          style="-webkit-text-stroke: 1.5px var(--color-cream); opacity: 0.18; transform: rotate(-2deg);"
          aria-hidden="true"
        >
          {{ project.vibeWord }}
        </span>

        <h1
          class="text-display-xl text-cream"
          :style="{ viewTransitionName: `project-${project.slug}` }"
        >
          {{ project.name }}
        </h1>

        <p class="text-editorial mt-6 max-w-[34ch] text-2xl text-cream/85 md:text-3xl">
          {{ project.tagline }}
        </p>
      </div>

      <!-- Meta strip -->
      <div class="mt-12 flex flex-wrap items-center gap-3">
        <StickerBadge :tone="accent.sticker" :tilt="-4" eyebrow="Status">
          {{ project.status.label }}
        </StickerBadge>
        <StickerBadge tone="cream" :tilt="3" eyebrow="Year">
          {{ project.year }}
        </StickerBadge>
        <StickerBadge v-if="showVersion" tone="ink" :tilt="-2" eyebrow="Latest">
          {{ release!.tag }}
        </StickerBadge>
        <StickerBadge v-else tone="ink" :tilt="-2" eyebrow="Domain">
          {{ project.domain }}
        </StickerBadge>
        <StickerBadge v-if="showDownloads" tone="ink" :tilt="2" eyebrow="Downloads">
          {{ formattedDownloads }}
        </StickerBadge>
      </div>

      <!-- Links row -->
      <div class="mt-10 flex flex-wrap items-center gap-3">
        <a
          v-if="project.links.live"
          :href="project.links.live.href"
          target="_blank"
          rel="noreferrer noopener"
          class="group inline-flex items-center gap-3 rounded-full bg-cream px-5 py-3 text-mono-eyebrow text-ink transition-colors duration-300 hover:bg-pop-yellow"
        >
          <Icon name="lucide:arrow-up-right" class="text-base transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          Visit live · {{ project.links.live.label }}
        </a>
        <a
          v-if="project.links.download"
          :href="project.links.download.href"
          download
          class="group inline-flex items-center gap-3 rounded-full bg-cream px-5 py-3 text-mono-eyebrow text-ink transition-colors duration-300 hover:bg-pop-orange"
        >
          <Icon name="lucide:download" class="text-base transition-transform group-hover:translate-y-0.5" />
          {{ project.links.download.label }}
        </a>
        <a
          v-if="project.links.github"
          :href="project.links.github.href"
          target="_blank"
          rel="noreferrer noopener"
          class="group inline-flex items-center gap-3 rounded-full border border-cream/40 px-5 py-3 text-mono-eyebrow text-cream transition-colors duration-300 hover:bg-cream hover:text-ink"
        >
          <Icon name="mdi:github" class="text-base" />
          {{ project.links.github.label }}
        </a>
      </div>
    </div>

    <!-- Bottom tape stripe -->
    <div class="relative h-1 w-full tape-stripes opacity-90" />
  </section>
</template>
