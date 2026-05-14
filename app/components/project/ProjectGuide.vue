<script setup lang="ts">
import type { Project } from '~/data/projects'

const props = defineProps<{
  /** Override the project list shown in the guide. Defaults to featured projects. */
  projects?: Project[]
}>()

const { featured } = useProjects()
const items = computed(() => props.projects ?? featured)

// Track which card is currently centered in the viewport rail
const activeIndex = ref(0)
const cardRefs = ref<HTMLElement[]>([])

function setRef(el: Element | ComponentPublicInstance | null, idx: number) {
  if (el) cardRefs.value[idx] = el as never
}

onMounted(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      // Find the entry with the highest intersection ratio
      let best = -1
      let bestRatio = 0
      entries.forEach((entry) => {
        if (entry.intersectionRatio > bestRatio) {
          bestRatio = entry.intersectionRatio
          const idx = Number((entry.target as HTMLElement).dataset.index)
          if (!Number.isNaN(idx)) best = idx
        }
      })
      if (best >= 0) activeIndex.value = best
    },
    { threshold: [0.4, 0.6, 0.8], rootMargin: '-10% 0px -10% 0px' },
  )
  cardRefs.value.forEach((el) => el && observer.observe(el as unknown as Element))
  onBeforeUnmount(() => observer.disconnect())
})

const activeProject = computed(() => items.value[activeIndex.value]!)
const totalLabel = computed(() => String(items.value.length).padStart(2, '0'))

function scrollTo(i: number) {
  cardRefs.value[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

</script>

<template>
  <section
    id="work"
    class="relative grid scroll-mt-16 gap-0 lg:grid-cols-[1fr_minmax(0,2fr)]"
  >
    <!-- Sticky rail — guide / index -->
    <aside
      class="sticky top-14 z-20 self-start border-b border-cream/10 bg-ink/90 backdrop-blur-md lg:border-b-0 lg:border-r lg:border-cream/10"
    >
      <div class="flex flex-col gap-8 p-6 md:p-10 lg:min-h-[calc(100dvh-3.5rem)]">
        <div class="flex items-center justify-between gap-3">
          <span class="text-mono-eyebrow text-cream/60">Currently · spreads</span>
          <span class="text-mono-eyebrow text-cream/40">{{ String(activeIndex + 1).padStart(2, '0') }} / {{ totalLabel }}</span>
        </div>

        <div class="hidden lg:block">
          <p class="text-mono-eyebrow text-cream/50 mb-3">In view</p>
          <Transition mode="out-in">
            <div :key="activeProject.slug" class="space-y-4 min-h-[18rem]">
              <span class="text-display-mega leading-[0.78] block text-[clamp(2.5rem,5vw,4.5rem)]">{{ activeProject.index }}</span>
              <h3 class="text-display-md text-cream min-h-[6.5rem]">
                {{ activeProject.name }}
              </h3>
              <p class="text-editorial text-cream/85 text-balance text-lg max-w-[28ch]">
                {{ activeProject.tagline }}
              </p>
            </div>
          </Transition>
        </div>

        <!-- Index list -->
        <ol class="mt-auto flex gap-2 overflow-x-auto lg:flex-col lg:gap-3 lg:overflow-visible">
          <li v-for="(p, i) in items" :key="p.slug" class="shrink-0">
            <button
              type="button"
              class="group flex items-center gap-3 text-left transition-colors"
              :class="i === activeIndex ? 'text-cream' : 'text-cream/45 hover:text-cream/80'"
              @click="scrollTo(i)"
            >
              <span
                class="grid h-8 w-8 place-items-center rounded-full border text-mono-eyebrow transition-colors"
                :class="i === activeIndex ? `border-transparent ${accentClasses(p.accent).bg} text-ink` : 'border-cream/25'"
              >
                {{ p.index }}
              </span>
              <span class="hidden flex-col leading-tight lg:flex">
                <span class="text-mono-meta">{{ p.name }}</span>
                <span class="text-mono-eyebrow opacity-50">{{ p.type }}</span>
              </span>
            </button>
          </li>
        </ol>
      </div>
    </aside>

    <!-- The cards rail itself -->
    <div
      class="flex flex-col gap-12 px-4 py-12 md:px-10 md:py-20"
    >
      <div
        v-for="(p, i) in items"
        :key="p.slug"
        :ref="(el) => setRef(el, i)"
        :data-index="i"
        class="min-h-[78dvh] lg:min-h-[80dvh]"
      >
        <ProjectCard :project="p" :active="i === activeIndex" :total="items.length" :priority="i === 0" class="h-full" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.v-enter-active,
.v-leave-active {
  transition: opacity 320ms ease;
}
.v-enter-from {
  opacity: 0;
}
.v-leave-to {
  opacity: 0;
}
</style>
