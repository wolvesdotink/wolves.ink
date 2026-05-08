<script setup lang="ts">
/**
 * PageMasthead — the section header used by /projects, /field-notes,
 * /impressum, and /field-notes/[slug].
 *
 * Each consumer was repeating ~50 lines of identical chrome:
 *   <section class="relative isolate overflow-hidden border-b border-cream/10">
 *     {orb backdrop}
 *     <div class="mx-auto max-w-[1600px] px-4 pt-20 pb-16 md:px-8 md:pt-32 md:pb-24">
 *       <span class="text-mono-eyebrow text-cream/60">{eyebrow}</span>
 *       <h1>{title}</h1>
 *       {body grid}
 *       {stats grid}
 *     </div>
 *   </section>
 *
 * Slots, not config props: each masthead has hand-tuned sticker tilts, a
 * `<br>` inside the h1, and a colored span on the second line — encoding
 * all of that as JSON would inflate the API more than slots cost.
 *
 * The homepage masthead intentionally does NOT use this component — it's
 * the wordmark + ticker stamp, which is bespoke to /index.vue.
 */

interface OrbConfig {
  tone?: string
  sizeClass?: string
  range?: number
  influence?: 'toward' | 'away'
}

withDefaults(
  defineProps<{
    /** Top eyebrow line — e.g. "Range · Workbench". */
    eyebrow: string
    /**
     * Container max-width.
     *   `page`   → 1600px (default — index pages)
     *   `spread` → 1400px (project pull-quote)
     *   `note`   → 1200px (field-note detail body)
     *   `prose`  → 820px  (long-form reading)
     */
    width?: 'page' | 'spread' | 'note' | 'prose'
    /** Hide the parallax orb backdrop entirely. */
    noOrbs?: boolean
    /** Override the left orb's tone / size / range / influence. */
    leftOrb?: OrbConfig
    /** Override the right orb's tone / size / range / influence. */
    rightOrb?: OrbConfig
  }>(),
  { width: 'page', noOrbs: false },
)
</script>

<template>
  <section class="relative isolate overflow-hidden border-b border-cream/10">
    <HalftoneOrbBackdrop v-if="!noOrbs" :left="leftOrb" :right="rightOrb" />

    <div
      class="section-container pt-20 pb-16 md:pt-32 md:pb-24"
      :data-width="width"
    >
      <span class="eyebrow-dim">{{ eyebrow }}</span>
      <h1 class="text-display-xl mt-4 text-cream leading-[0.85]">
        <slot name="title" />
      </h1>

      <!-- Editorial copy + sticker grid (col-span-12 lg:col-span-7 + lg:col-span-5). -->
      <slot name="body" />

      <!-- Optional stat row — use <StatRow /> here. -->
      <slot name="stats" />

      <!-- Default slot is an escape hatch for absolute-positioned ornaments
           inside the masthead (e.g. the issue stamp on /field-notes/[slug]). -->
      <slot />
    </div>
  </section>
</template>
