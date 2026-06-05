<script lang="ts">
/**
 * Public props interface — exported so <StatRow> can type its `items`
 * array. Lives in the standalone <script> block (not <script setup>)
 * because <script setup> doesn't support top-level type exports.
 */
export interface AnimatedStatProps {
  /** Final value as a number. If not numeric, pass `display`. */
  value?: number
  /** Already-formatted display when value is non-numeric (e.g. "∞"). */
  display?: string
  /** Pop colour token used for the number tint */
  tone?: 'magenta' | 'yellow' | 'orange' | 'cream'
  /** Pad with leading zeros up to N digits. Defaults to 2. */
  pad?: number
  /** ms to fully count up. */
  duration?: number
  /**
   * Render the number as a real (style-reset) button that emits
   * `activate` on click/Enter/Space. Display-only stats stay spans.
   */
  interactive?: boolean
  /** Accessible name for the interactive button. */
  ariaLabel?: string
  /** Optional whisper for the RisoCursor label chip on hover. */
  risoLabel?: string
  /**
   * Force/deny the slow symbol-breathe treatment. Defaults to the old
   * heuristic (non-numeric ⇒ symbol) — pass `false` when an external
   * driver rolls numbers through `display` and the breathing would
   * read wrong on digits.
   */
  symbol?: boolean
  /**
   * 0–2: how poked the symbol is. Each level accelerates the breathe
   * loop and heats the ink toward orange with wider riso aberration.
   */
  agitation?: number
  /** True while the counter is jammed — harsher CMYK strobe treatment. */
  jam?: boolean
  /** External slam trigger — pulses the riso slam on a rising edge. */
  slam?: boolean
}
</script>

<script setup lang="ts">
/**
 * AnimatedStat — magazine stat row item that counts up when scrolled into
 * view and lands with a single riso misregistration frame, like the press
 * stamping the final number into place. The non-numeric form (∞) gets a
 * slow rotation tic instead of a count-up.
 *
 * Honors prefers-reduced-motion: in that mode the value renders straight
 * away without animation.
 */
const props = withDefaults(
  defineProps<AnimatedStatProps>(),
  { tone: 'cream', pad: 2, duration: 1200, interactive: false, agitation: 0, jam: false, slam: false },
)

const emit = defineEmits<{ activate: [] }>()

const colorClass = computed(() => {
  switch (props.tone) {
    case 'magenta': return 'text-pop-magenta'
    case 'yellow': return 'text-pop-yellow'
    case 'orange': return 'text-pop-orange'
    case 'cream':
    default: return 'text-cream'
  }
})

const isNumeric = computed(() => typeof props.value === 'number' && Number.isFinite(props.value))

// Symbol treatment — explicit prop wins; otherwise the old heuristic
// (any non-numeric display breathes).
const isSymbol = computed(() => props.symbol ?? !isNumeric.value)

const root = ref<HTMLElement | null>(null)
const current = ref(0)
const landed = ref(false)
const slammed = ref(false)

function format(n: number) {
  return String(Math.round(n)).padStart(props.pad, '0')
}

const text = computed(() => {
  if (!isNumeric.value) return props.display ?? ''
  return format(current.value)
})

function easeOutQuint(t: number) {
  return 1 - Math.pow(1 - t, 5)
}

function startCountUp() {
  if (!isNumeric.value || landed.value) return

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    current.value = props.value!
    landed.value = true
    slammed.value = true
    return
  }

  const start = performance.now()
  const target = props.value!
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / props.duration)
    current.value = target * easeOutQuint(t)
    if (t < 1) {
      requestAnimationFrame(tick)
    }
    else {
      current.value = target
      landed.value = true
      // Trigger the riso slam right when the number lands
      slammed.value = true
      // Drop the slam class after the press flash so future hovers
      // don't stack with it.
      setTimeout(() => { slammed.value = false }, 700)
    }
  }
  requestAnimationFrame(tick)
}

// External slam — a rising edge on the `slam` prop pulses the same
// riso misregistration frame the count-up landing uses, so externally
// driven displays (the billion-jam egg) land with the house slam.
watch(() => props.slam, (now, was) => {
  if (!now || was) return
  slammed.value = true
  setTimeout(() => { slammed.value = false }, 700)
})

onMounted(() => {
  if (!root.value) return
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // Non-numeric values render their display straight away; only the
  // landed flag matters for any visual flair.
  if (!isNumeric.value) {
    landed.value = true
    return
  }

  if (reduced) {
    startCountUp()
    return
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          startCountUp()
          observer.disconnect()
          break
        }
      }
    },
    { threshold: 0.5, rootMargin: '0px 0px -10% 0px' },
  )
  observer.observe(root.value as unknown as Element)

  onBeforeUnmount(() => observer.disconnect())
})
</script>

<template>
  <div ref="root" class="animated-stat">
    <!-- Interactive variant — a style-reset button so Enter/Space count
         as clicks and the global :focus-visible ring applies. Used by
         the homepage's poke-able stat; display-only stats keep the span. -->
    <button
      v-if="interactive"
      type="button"
      class="animated-stat__num animated-stat__btn text-display-md block"
      :class="[
        colorClass,
        slammed ? 'is-slamming' : '',
        isSymbol ? 'is-symbol' : '',
        agitation === 1 ? 'is-agitated-1' : '',
        agitation >= 2 ? 'is-agitated-2' : '',
        jam ? 'is-jamming' : '',
      ]"
      :aria-label="ariaLabel"
      :data-riso-label="risoLabel"
      @click="emit('activate')"
    >{{ text }}</button>
    <span
      v-else
      class="animated-stat__num text-display-md block"
      :class="[colorClass, slammed ? 'is-slamming' : '', isSymbol ? 'is-symbol' : '']"
    >{{ text }}</span>
    <span class="text-mono-meta text-cream/60 block mt-1">
      <slot />
    </span>
  </div>
</template>

<style scoped>
.animated-stat__num {
  position: relative;
  display: inline-block;
  /* Reserve space so the line doesn't shift while counting */
  font-variant-numeric: tabular-nums;
  transition: text-shadow 280ms var(--ease-pop), transform 280ms var(--ease-pop);
}

/* The riso slam — a single pulse the moment the count finishes. The
   keyframes drop offsets back to zero so the resting state stays clean. */
.animated-stat__num.is-slamming {
  animation: stat-slam 600ms var(--ease-pop) both;
}

@keyframes stat-slam {
  0% {
    transform: translate(0, 0) scale(1);
    text-shadow: 0 0 0 transparent;
  }
  35% {
    transform: translate(-1px, -1px) scale(1.04);
    text-shadow:
       0.05em  0.05em 0 var(--color-cream),
      -0.04em -0.04em 0 #5ec8e5,
       0.06em -0.04em 0 var(--color-pop-magenta);
  }
  70% {
    transform: translate(0.5px, 0) scale(1.01);
    text-shadow:
       0.03em  0.03em 0 var(--color-cream),
      -0.02em -0.02em 0 #5ec8e5,
       0.03em -0.02em 0 var(--color-pop-magenta);
  }
  100% {
    transform: translate(0, 0) scale(1);
    text-shadow: 0 0 0 transparent;
  }
}

/* Symbol values (∞) get a subtle, slow rotation lift instead of a count-up */
.animated-stat__num.is-symbol {
  animation: symbol-breathe 6s ease-in-out infinite;
  transform-origin: 50% 60%;
}

@keyframes symbol-breathe {
  0%, 100% { transform: rotate(0) translateY(0); }
  50%      { transform: rotate(-6deg) translateY(-2px); }
}

/* Interactive variant — full button reset; the display classes carry
   all the visual identity. Cursor stays pointer as the only native
   affordance (the RisoCursor bloom + label chip is the real hint on
   fine pointers). */
.animated-stat__btn {
  appearance: none;
  background: transparent;
  border: 0;
  padding: 0;
  margin: 0;
  /* No `font` reset here — this scoped rule is unlayered and would
     beat the layered text-display-md utility that gives the number
     its size. Author styles already outrank the UA button font. */
  text-align: left;
  cursor: pointer;
}

/* Poked — the breathe loop accelerates and the ink heats toward
   orange with a widening riso aberration. Pressure is building. */
.animated-stat__num.is-symbol.is-agitated-1 {
  animation: symbol-breathe 2.2s ease-in-out infinite;
  text-shadow: 0.025em 0.025em 0 var(--color-pop-orange);
}
.animated-stat__num.is-symbol.is-agitated-2 {
  color: var(--color-pop-orange);
  animation: symbol-wobble 1.1s ease-in-out infinite;
  text-shadow:
    0.045em 0.045em 0 var(--color-pop-magenta),
    -0.035em -0.035em 0 #5ec8e5;
}

@keyframes symbol-wobble {
  0%, 100% { transform: rotate(-12deg) translateY(-1px); }
  50%      { transform: rotate(12deg) translateY(-3px); }
}

/* The jam — the counting machine hits its limit. A harsher cut of the
   slam misregistration at double offsets, with a mis-registered cyan
   ghost like a hand-stamp hit twice because the first impression was
   too faint. The JS swaps content every 350ms ≈ 2.9 swaps ≈ 1.4 flash
   cycles/sec — under the WCAG 2.3.1 3-flashes/sec ceiling (a flash is
   a pair of opposing changes). */
.animated-stat__num.is-jamming {
  animation: stat-jam 700ms steps(2, jump-none) infinite;
}

@keyframes stat-jam {
  0% {
    transform: translate(-1px, 0);
    text-shadow:
       0.10em  0.10em 0 var(--color-cream),
      -0.08em -0.08em 0 #5ec8e5,
       0.12em -0.08em 0 var(--color-pop-magenta),
       0.01em  0.01em 0 #5ec8e5;
  }
  50% {
    transform: translate(1px, 1px);
    text-shadow:
      -0.10em  0.08em 0 #5ec8e5,
       0.08em -0.08em 0 var(--color-pop-magenta),
      -0.12em -0.06em 0 var(--color-cream),
      -0.01em  0.01em 0 #5ec8e5;
  }
  100% {
    transform: translate(-1px, 0);
    text-shadow:
       0.10em  0.10em 0 var(--color-cream),
      -0.08em -0.08em 0 #5ec8e5,
       0.12em -0.08em 0 var(--color-pop-magenta),
       0.01em  0.01em 0 #5ec8e5;
  }
}

@media (prefers-reduced-motion: reduce) {
  .animated-stat__num.is-slamming,
  .animated-stat__num.is-symbol,
  /* match the agitated/jam rules' specificity so these actually win */
  .animated-stat__num.is-symbol.is-agitated-1,
  .animated-stat__num.is-symbol.is-agitated-2,
  .animated-stat__num.is-jamming {
    animation: none;
    transform: none;
    text-shadow: none;
  }
}
</style>
