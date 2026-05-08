<script setup lang="ts">
import type { Project } from '~/data/projects'

const props = withDefaults(
  defineProps<{
    project: Project
    /** Whether this card is the currently focused one in the rail */
    active?: boolean
    /** Total number of cards in the rail (drives the "/ NN" counter). Defaults to 3. */
    total?: number
  }>(),
  { total: 3 },
)

const totalLabel = computed(() => String(props.total).padStart(2, '0'))

const { startTransition } = useViewTransition()

// Single source of truth for accent classes / gradients / sticker tones.
const accent = useAccentColor(() => props.project.accent)

function navigate(e: MouseEvent) {
  e.preventDefault()
  startTransition(`/projects/${props.project.slug}`)
}
</script>

<template>
  <article
    class="group relative isolate flex h-full snap-center flex-col overflow-hidden border border-cream/10 bg-ink-soft transition-colors duration-500"
    :class="[
      active ? 'border-cream/35' : '',
    ]"
  >
    <!-- Cover image -->
    <div class="relative h-[42%] min-h-[260px] overflow-hidden">
      <NuxtImg
        :src="project.cover.src"
        :alt="project.cover.alt"
        provider="unsplash"
        width="1200"
        height="700"
        quality="78"
        sizes="100vw md:50vw"
        class="absolute inset-0 h-full w-full object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-[1.06]"
        :style="{ objectPosition: project.cover.position }"
      />
      <!-- Tint -->
      <div
        class="absolute inset-0 mix-blend-multiply"
        :style="{ background: accent.cardGradient }"
        aria-hidden="true"
      />
      <div class="absolute inset-0 halftone text-ink/60 mix-blend-multiply opacity-50" aria-hidden="true" />

      <!-- Index counter top-left -->
      <div class="absolute left-5 top-5 flex items-center gap-3 text-cream">
        <span class="text-display-md text-3xl">{{ project.index }}</span>
        <span class="text-mono-eyebrow opacity-70">/ {{ totalLabel }} ·&nbsp;{{ project.type }}</span>
      </div>

      <!-- Sticker top-right -->
      <div class="absolute right-5 top-5">
        <StickerBadge
          :tone="accent.sticker"
          :tilt="project.accent === 'pop-yellow' ? 6 : -6"
          eyebrow="Status"
        >
          <span class="h-1.5 w-1.5 rounded-full" :class="accent.bg" v-if="false" />
          <span>{{ project.status.label }}</span>
        </StickerBadge>
      </div>
    </div>

    <!-- Body -->
    <div class="relative flex flex-1 flex-col gap-5 p-6 md:p-8">
      <!-- Domain -->
      <span class="text-mono-eyebrow opacity-60">{{ project.domain }}</span>

      <!-- Name (gets the view-transition-name) -->
      <h3
        class="text-display-lg text-cream"
        :style="{ viewTransitionName: `project-${project.slug}` }"
      >
        {{ project.name }}
      </h3>

      <p class="max-w-[44ch] text-cream/80 text-pretty">
        {{ project.tagline }}
      </p>

      <p class="max-w-[44ch] text-cream/55 text-sm leading-relaxed">
        {{ project.blurb }}
      </p>

      <!-- CTA -->
      <div class="mt-auto flex items-center justify-between gap-4 pt-4">
        <a
          :href="`/projects/${project.slug}`"
          @click="navigate"
          class="group/cta inline-flex items-center gap-3 border-b border-cream/30 pb-1 text-mono-eyebrow transition-colors hover:border-cream"
          :class="accent.text"
        >
          <span>Open spread</span>
          <span class="transition-transform group-hover/cta:translate-x-1">→</span>
        </a>
        <span class="text-mono-meta opacity-50">{{ project.year }}</span>
      </div>
    </div>

    <!-- Decorative bottom band -->
    <div
      class="absolute bottom-0 left-0 right-0 h-1 transition-all duration-500"
      :class="[active ? accent.bg : 'bg-cream/15']"
    />
  </article>
</template>
