<script setup lang="ts">
/**
 * RisoCursor — a riso-print follower that lives in place of the OS
 * cursor on devices with fine pointers. The base shape is a tiny magenta
 * dot; over interactive elements it blooms into a chunky riso registration
 * ring that drifts in sympathy with the press' misalignment vibe.
 *
 * Implementation notes
 * - Position is driven by a rAF loop that LERPs toward the live mouse
 *   position. A second, slower loop drives the trailing yellow + cyan
 *   ghosts so the registration shifts feel mechanical, not synced.
 * - Hover state is detected by walking up from the event target each
 *   pointermove and looking for the closest `[data-riso-target]` /
 *   anchor / button / role=button.
 * - The native cursor is hidden via a body class that this component
 *   toggles. It bails out (and restores the OS cursor) on coarse
 *   pointers and when prefers-reduced-motion is set.
 */

const enabled = ref(false)
const mounted = ref(false)
const visible = ref(false)
const isHover = ref(false)
const isPressed = ref(false)
const labelText = ref<string>('')

// Live target — magenta dot
const x = ref(0)
const y = ref(0)
// Trail target — yellow ghost (slightly behind)
const xY = ref(0)
const yY = ref(0)
// Trail target — cyan ghost (further behind)
const xC = ref(0)
const yC = ref(0)

let raf = 0
let mouseX = 0
let mouseY = 0
let lastMove = 0

// Hover-resolution cache. `pointermove` fires every few ms while the
// cursor is moving, but `e.target` only changes when the cursor crosses
// an element boundary. Caching the last (target, resolved) pair lets us
// skip the `resolveTarget` DOM walk on the ~80% of moves that stay
// within the same element — the dominant INP win on this component.
let lastTarget: Element | null = null
let lastResolved: HTMLElement | null = null

function resolveTarget(el: Element | null): HTMLElement | null {
  if (!el) return null
  let node: Element | null = el
  while (node && node !== document.body) {
    if (node instanceof HTMLElement) {
      if (node.dataset.risoTarget !== undefined) return node
      if (
        node.tagName === 'A' ||
        node.tagName === 'BUTTON' ||
        node.tagName === 'INPUT' ||
        node.tagName === 'TEXTAREA' ||
        node.getAttribute('role') === 'button' ||
        node.getAttribute('tabindex') === '0'
      ) {
        return node
      }
    }
    node = node.parentElement
  }
  return null
}

function onPointerMove(e: PointerEvent) {
  mouseX = e.clientX
  mouseY = e.clientY
  lastMove = performance.now()
  visible.value = true

  // Fast-path: same element as last move → reuse the resolved target.
  // Only walk the DOM when the cursor crosses an element boundary.
  const target = e.target as Element | null
  let t: HTMLElement | null
  if (target === lastTarget) {
    t = lastResolved
  }
  else {
    t = resolveTarget(target)
    lastTarget = target
    lastResolved = t
  }

  if (t) {
    isHover.value = true
    const label = t.dataset.risoLabel
    labelText.value = label ?? ''
  }
  else {
    isHover.value = false
    labelText.value = ''
  }
}

function onPointerDown() { isPressed.value = true }
function onPointerUp() { isPressed.value = false }
function onLeave() { visible.value = false }

function tick() {
  // Live magenta — fast follow
  x.value += (mouseX - x.value) * 0.32
  y.value += (mouseY - y.value) * 0.32
  // Yellow ghost — medium follow
  xY.value += (mouseX - xY.value) * 0.18
  yY.value += (mouseY - yY.value) * 0.18
  // Cyan ghost — slow follow
  xC.value += (mouseX - xC.value) * 0.12
  yC.value += (mouseY - yC.value) * 0.12

  // After 1.6s of stillness, fade the cursor — like the press resting
  if (visible.value && performance.now() - lastMove > 1600) {
    visible.value = false
  }

  raf = requestAnimationFrame(tick)
}

onMounted(() => {
  mounted.value = true

  const fine = window.matchMedia('(pointer: fine)').matches
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!fine || reduced) return

  enabled.value = true
  document.documentElement.classList.add('riso-cursor-active')

  // Initialize at center to avoid a startle-jump
  mouseX = window.innerWidth / 2
  mouseY = window.innerHeight / 2
  x.value = xY.value = xC.value = mouseX
  y.value = yY.value = yC.value = mouseY

  window.addEventListener('pointermove', onPointerMove, { passive: true })
  window.addEventListener('pointerdown', onPointerDown, { passive: true })
  window.addEventListener('pointerup', onPointerUp, { passive: true })
  window.addEventListener('pointercancel', onPointerUp, { passive: true })
  window.addEventListener('mouseleave', onLeave)
  document.addEventListener('mouseleave', onLeave)

  raf = requestAnimationFrame(tick)
})

onBeforeUnmount(() => {
  if (!enabled.value) return
  cancelAnimationFrame(raf)
  document.documentElement.classList.remove('riso-cursor-active')
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerdown', onPointerDown)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
  window.removeEventListener('mouseleave', onLeave)
  document.removeEventListener('mouseleave', onLeave)
})
</script>

<template>
  <ClientOnly>
    <div
      v-if="enabled"
      class="riso-cursor-root pointer-events-none fixed inset-0 z-[70]"
      :class="[
        visible ? 'is-visible' : '',
        isHover ? 'is-hover' : '',
        isPressed ? 'is-pressed' : '',
      ]"
      aria-hidden="true"
    >
      <!-- Cyan ghost — slowest follow -->
      <span
        class="riso-cursor riso-cursor--cyan"
        :style="{ transform: `translate3d(${xC}px, ${yC}px, 0) translate(-50%, -50%)` }"
      />
      <!-- Yellow ghost — medium follow -->
      <span
        class="riso-cursor riso-cursor--yellow"
        :style="{ transform: `translate3d(${xY}px, ${yY}px, 0) translate(-50%, -50%)` }"
      />
      <!-- Live magenta core — fast follow -->
      <span
        class="riso-cursor riso-cursor--magenta"
        :style="{ transform: `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)` }"
      >
        <span v-if="labelText" class="riso-cursor__label">{{ labelText }}</span>
      </span>
    </div>
  </ClientOnly>
</template>

<style>
/* Hide native cursor only on devices that get the fancy version */
html.riso-cursor-active,
html.riso-cursor-active body {
  cursor: none;
}

html.riso-cursor-active a,
html.riso-cursor-active button,
html.riso-cursor-active input,
html.riso-cursor-active textarea,
html.riso-cursor-active [role="button"],
html.riso-cursor-active [tabindex="0"],
html.riso-cursor-active [data-riso-target] {
  cursor: none;
}
</style>

<style scoped>
.riso-cursor-root {
  opacity: 0;
  transition: opacity 280ms ease-out;
}
.riso-cursor-root.is-visible {
  opacity: 1;
}

.riso-cursor {
  position: absolute;
  top: 0;
  left: 0;
  width: 12px;
  height: 12px;
  border-radius: 999px;
  mix-blend-mode: screen;
  will-change: transform, width, height;
  transition: width 380ms var(--ease-pop), height 380ms var(--ease-pop),
              opacity 280ms ease-out, border-width 280ms var(--ease-pop);
}

.riso-cursor--magenta {
  background: var(--color-pop-magenta);
  box-shadow: 0 0 0 1px rgba(255, 72, 105, 0.4);
}
.riso-cursor--yellow {
  background: var(--color-pop-yellow);
  width: 10px;
  height: 10px;
  opacity: 0.85;
}
.riso-cursor--cyan {
  background: #5ec8e5;
  width: 8px;
  height: 8px;
  opacity: 0.75;
}

/* Hover bloom — chunky riso registration ring */
.is-hover .riso-cursor--magenta {
  width: 44px;
  height: 44px;
  background: transparent;
  border: 2px solid var(--color-pop-magenta);
  box-shadow:
    0 0 0 1px rgba(255, 72, 105, 0.4),
    inset 0 0 0 1px rgba(255, 72, 105, 0.4);
  animation: riso-cursor-pulse 1200ms var(--ease-pop) infinite alternate;
}
.is-hover .riso-cursor--yellow {
  width: 38px;
  height: 38px;
  background: transparent;
  border: 1.5px solid var(--color-pop-yellow);
  opacity: 0.9;
}
.is-hover .riso-cursor--cyan {
  width: 50px;
  height: 50px;
  background: transparent;
  border: 1.5px solid #5ec8e5;
  opacity: 0.7;
}

/* Press — slam everything in by 30% */
.is-pressed .riso-cursor--magenta {
  width: 18px;
  height: 18px;
  background: var(--color-pop-magenta);
  border-color: transparent;
  box-shadow: 0 0 18px rgba(255, 72, 105, 0.55);
  animation: none;
}
.is-pressed .riso-cursor--yellow {
  width: 14px;
  height: 14px;
  background: var(--color-pop-yellow);
  border-color: transparent;
}
.is-pressed .riso-cursor--cyan {
  width: 22px;
  height: 22px;
  background: #5ec8e5;
  border-color: transparent;
}

@keyframes riso-cursor-pulse {
  from {
    box-shadow:
      0 0 0 0 rgba(255, 72, 105, 0.0),
      inset 0 0 0 1px rgba(255, 72, 105, 0.4);
  }
  to {
    box-shadow:
      0 0 0 6px rgba(255, 72, 105, 0.18),
      inset 0 0 0 1px rgba(255, 72, 105, 0.4);
  }
}

/* Optional contextual label hovering near the cursor */
.riso-cursor__label {
  position: absolute;
  left: 50%;
  top: 100%;
  transform: translate(-50%, 8px);
  white-space: nowrap;
  font-family: var(--font-mono);
  font-size: 0.6rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--color-ink);
  background: var(--color-pop-yellow);
  padding: 4px 8px;
  pointer-events: none;
  mix-blend-mode: normal;
  opacity: 0;
  transition: opacity 200ms ease-out 80ms, transform 240ms var(--ease-pop) 80ms;
}
.is-hover .riso-cursor__label {
  opacity: 1;
  transform: translate(-50%, 14px);
}
</style>
