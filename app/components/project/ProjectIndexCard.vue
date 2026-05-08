<script setup lang="ts">
import type { Project } from '~/data/projects'

/**
 * `priority` flips the cover image into eager-loaded, high-fetchpriority
 * mode. The /projects index renders this card in a 3-col grid — only the
 * first card is reliably above the fold, so only that one should be
 * marked priority. The rest stay lazy (the `<NuxtImg>` default), which
 * keeps total bytes-on-wire small for the LCP window.
 */
const props = withDefaults(
  defineProps<{
    project: Project
    priority?: boolean
  }>(),
  {
    priority: false,
  },
)

const { startTransition } = useViewTransition()

// Single source of truth for accent classes / gradients / sticker tones.
const accent = useAccentColor(() => props.project.accent)

/** Has the project got a real spread written for it? */
const hasSpread = computed(
  () => Boolean(props.project.featured || props.project.description?.length),
)

const externalHref = computed(
  () => props.project.links.live?.href ?? props.project.links.github?.href ?? null,
)

const ctaLabel = computed(() => {
  if (hasSpread.value) return 'Open spread'
  if (props.project.links.live) return 'Visit live'
  if (props.project.links.github) return 'View source'
  return 'Coming soon'
})

const isInternal = computed(() => hasSpread.value)
const internalHref = computed(() => `/projects/${props.project.slug}`)

function navigate(e: MouseEvent) {
  if (!isInternal.value) return // let the browser handle external links
  e.preventDefault()
  startTransition(internalHref.value)
}
</script>

<template>
  <article
    class="group relative isolate flex h-full flex-col overflow-hidden border border-cream/10 bg-ink-soft transition-colors duration-500 hover:border-cream/30"
  >
    <!-- Cover image -->
    <div class="relative h-[200px] overflow-hidden">
      <NuxtImg
        :src="project.cover.src"
        :alt="project.cover.alt"
        provider="unsplash"
        width="800"
        height="500"
        quality="75"
        sizes="100vw md:50vw lg:33vw"
        class="absolute inset-0 h-full w-full object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-[1.06]"
        :style="{ objectPosition: project.cover.position }"
        :loading="priority ? 'eager' : 'lazy'"
        :fetchpriority="priority ? 'high' : 'auto'"
      />
      <!-- Tint -->
      <div
        class="absolute inset-0 mix-blend-multiply"
        :style="{ background: accent.cardGradient }"
        aria-hidden="true"
      />
      <div class="absolute inset-0 halftone text-ink/60 mix-blend-multiply opacity-50" aria-hidden="true" />

      <!-- Index counter top-left -->
      <div class="absolute left-4 top-4 flex items-center gap-2 text-cream">
        <span class="text-display-md text-2xl">{{ project.index }}</span>
        <span class="text-mono-eyebrow opacity-70">·&nbsp;{{ project.type }}</span>
      </div>

      <!-- Sticker top-right -->
      <div class="absolute right-4 top-4">
        <StickerBadge
          :tone="accent.sticker"
          :tilt="project.accent === 'pop-yellow' ? 6 : -6"
          eyebrow="Status"
        >
          {{ project.status.label }}
        </StickerBadge>
      </div>
    </div>

    <!-- Body -->
    <div class="relative flex flex-1 flex-col gap-3 p-5 md:p-6">
      <!-- Domain -->
      <span class="text-mono-eyebrow opacity-60">{{ project.domain }}</span>

      <h3 class="text-display-md text-2xl text-cream">
        {{ project.name }}
      </h3>

      <p class="text-pretty text-cream/80 leading-snug">
        {{ project.tagline }}
      </p>

      <p class="text-cream/55 text-sm leading-relaxed">
        {{ project.blurb }}
      </p>

      <!-- CTA -->
      <div class="mt-auto flex items-center justify-between gap-4 pt-4">
        <a
          :href="isInternal ? internalHref : externalHref ?? '#'"
          :target="isInternal || !externalHref ? undefined : '_blank'"
          :rel="isInternal || !externalHref ? undefined : 'noreferrer noopener'"
          @click="navigate"
          class="group/cta inline-flex items-center gap-3 border-b border-cream/30 pb-1 text-mono-eyebrow transition-colors hover:border-cream"
          :class="accent.text"
        >
          <span>{{ ctaLabel }}</span>
          <span class="transition-transform group-hover/cta:translate-x-1">{{ isInternal ? '→' : '↗' }}</span>
        </a>
        <span class="text-mono-meta opacity-50">{{ project.year }}</span>
      </div>
    </div>

    <!-- Decorative bottom band — neutral by default, accent on hover -->
    <div
      class="pointer-events-none absolute bottom-0 left-0 right-0 h-1 bg-cream/15"
      aria-hidden="true"
    />
    <div
      class="pointer-events-none absolute bottom-0 left-0 right-0 h-1 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
      :class="accent.bg"
      aria-hidden="true"
    />
  </article>
</template>
