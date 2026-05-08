<script setup lang="ts">
/**
 * PageNavigation — the prev/next "turn the page" footer used on
 * /projects/[slug] and /field-notes/[slug].
 *
 * Each item is `{ slug, title, meta }` — the consumer picks what `meta`
 * means (a tagline, an eyebrow + date, etc.). The `hrefBuilder` lets the
 * caller decide the URL prefix, so `/projects/` and `/field-notes/`
 * stay decoupled from the component itself. View-transitions are
 * fired internally — pages don't have to wire `useViewTransition`.
 */

interface NavItem {
  slug: string
  title: string
  meta: string
}

const props = withDefaults(
  defineProps<{
    prev: NavItem
    next: NavItem
    /** Build a destination href from a slug — e.g. (s) => `/projects/${s}`. */
    hrefBuilder: (slug: string) => string
    /** Eyebrow on the prev half. Defaults to `"← Previous"`. */
    prevLabel?: string
    /** Eyebrow on the next half. Defaults to `"Next →"`. */
    nextLabel?: string
  }>(),
  { prevLabel: '← Previous', nextLabel: 'Next →' },
)

const { startTransition } = useViewTransition()

function go(slug: string) {
  startTransition(props.hrefBuilder(slug))
}
</script>

<template>
  <nav class="border-t border-cream/10">
    <div class="mx-auto grid max-w-[1600px] grid-cols-1 md:grid-cols-2">
      <a
        href="#"
        class="group flex flex-col gap-3 border-b border-cream/10 px-4 py-12 transition-colors hover:bg-ink-soft md:border-b-0 md:border-r md:px-10 md:py-20"
        @click.prevent="go(prev.slug)"
      >
        <span class="text-mono-eyebrow text-cream/55 transition-colors group-hover:text-cream">
          {{ prevLabel }}
        </span>
        <span class="text-display-lg text-cream/70 transition-colors group-hover:text-cream">
          {{ prev.title }}
        </span>
        <span class="text-editorial text-cream/55">{{ prev.meta }}</span>
      </a>
      <a
        href="#"
        class="group flex flex-col items-end gap-3 px-4 py-12 text-right transition-colors hover:bg-ink-soft md:px-10 md:py-20"
        @click.prevent="go(next.slug)"
      >
        <span class="text-mono-eyebrow text-cream/55 transition-colors group-hover:text-cream">
          {{ nextLabel }}
        </span>
        <span class="text-display-lg text-cream/70 transition-colors group-hover:text-cream">
          {{ next.title }}
        </span>
        <span class="text-editorial text-cream/55">{{ next.meta }}</span>
      </a>
    </div>
  </nav>
</template>
