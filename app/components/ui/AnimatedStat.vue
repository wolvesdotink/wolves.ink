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
  { tone: 'cream', pad: 2, duration: 1200 },
)

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
  observer.observe(root.value)

  onBeforeUnmount(() => observer.disconnect())
})
</script>

<template>
  <div ref="root" class="animated-stat">
    <span
      class="animated-stat__num text-display-md block"
      :class="[colorClass, slammed ? 'is-slamming' : '', !isNumeric ? 'is-symbol' : '']"
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

@media (prefers-reduced-motion: reduce) {
  .animated-stat__num.is-slamming,
  .animated-stat__num.is-symbol {
    animation: none;
    transform: none;
  }
}
</style>
