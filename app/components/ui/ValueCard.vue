<script setup lang="ts">
/**
 * ValueCard — the small payoff card behind every clickable hero value-word
 * (see InkHighlight.vue). One shape for all four: a tiny accent eyebrow and a
 * single short, memorable line about the value. Develops as a riso proof
 * plate anchored right beside the word that opened it (positioned by the
 * parent via `--proof-x`; one card open at a time via useInkProof).
 *
 * Deliberately content-only — no controls — so focus stays on the word and
 * the line is announced through a polite live region. Dismisses on Escape,
 * outside-click, or opening another word's card.
 */
const props = defineProps<{
  eyebrow: string
  line: string
  /** CSS colour (a `var(--color-pop-*)`); the card's whole colour budget. */
  accent: string
}>()
const emit = defineEmits<{ close: [] }>()

const plateEl = ref<HTMLElement | null>(null)

// aria-live announces only a CHANGE — render empty, fill after mount (the
// card re-mounts on each open, so every value read aloud).
const live = ref('')
onMounted(() => { nextTick(() => { live.value = `${props.eyebrow}. ${props.line}.` }) })

useProofDismiss(plateEl, () => emit('close'))
</script>

<template>
  <div
    ref="plateEl"
    class="ink-proof value-card"
    :style="{ '--accent': accent }"
    role="group"
    :aria-label="eyebrow"
    tabindex="-1"
    @click.stop
  >
    <p class="value-card__eyebrow text-mono-eyebrow" aria-hidden="true">{{ eyebrow }}</p>
    <p class="value-card__line text-editorial" aria-hidden="true">
      {{ line }}<span class="ink-proof__stop">.</span>
    </p>
    <span class="sr-only" aria-live="polite">{{ live }}</span>
  </div>
</template>

<style scoped>
.value-card {
  --accent: var(--color-pop-magenta); /* default; parent sets the real one inline */
}
/* A small riso swatch label: dark ink ON the accent, not accent-coloured
   text — fluorescent pops (esp. yellow) are unreadable on the cream stock. */
.value-card__eyebrow {
  display: inline-block;
  padding: 0.16rem 0.42rem;
  background: var(--accent);
  color: var(--color-ink);
  border-radius: 2px;
}
.value-card__line {
  margin-top: 0.4rem;
  font-size: 1.15rem;
  line-height: 1.22;
  text-wrap: balance;
  color: var(--color-ink);
}
</style>
