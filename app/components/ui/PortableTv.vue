<script setup lang="ts">
/**
 * PortableTv — a small CRT-style "pack TV" easter egg.
 *
 * Interaction model (pointer-driven, mirrors the reference Portable CRT):
 *   - Cartridges live in a retail-style sleeve next to the TV.
 *   - User grabs a cart with the pointer and physically drags it.
 *   - Dropping the cart on the TV's slot inserts it: any previously
 *     inserted cart auto-ejects back to its home in the sleeve, and the
 *     screen plays the new cart's looping scene.
 *   - Dropping the cart anywhere else snaps it back to its home slot.
 *   - The slot itself is clickable as an eject button.
 *   - Clicking a cart in the sleeve (no drag) acts as a keyboard/touch
 *     fallback that inserts it directly.
 *
 * State is purely local; no audio, no network. Cartridge scenes are
 * inline SVG with CSS keyframe animations.
 */

type Tone = 'magenta' | 'yellow' | 'cream' | 'green'

interface Cartridge {
  id: 'walk' | 'moon' | 'melon' | 'paw'
  label: string
  title: string
  tone: Tone
}

/**
 * SEEDS — the third cart in the sleeve: green rind body, red label
 * window, ink-black seeds. A watermelon in cartridge form, which is to
 * say the Palestinian flag palette in cartridge form. The symbol
 * exists because hiding was once necessary: when the flag was banned
 * in the occupied territories (1980–1993), artists painted the fruit
 * that carried the same four colors. Slot it in and the CRT broadcasts
 * the slice (see the melon scene below).
 */
const cartridges: Cartridge[] = [
  { id: 'walk',  label: 'WALK ON',   title: 'The pack, on the move', tone: 'magenta' },
  { id: 'moon',  label: 'MOONRISE',  title: 'Late ship',             tone: 'yellow'  },
  { id: 'melon', label: 'SEEDS',     title: 'Free Palestine',        tone: 'green'   },
  { id: 'paw',   label: 'PAW STAMP', title: 'Receipt printer',       tone: 'cream'   },
]

// Which cart (if any) is currently inserted in the TV.
const insertedId = ref<Cartridge['id'] | null>(null)
// True once the inserted cart has finished sliding into the slot — at
// which point we hide it (opacity 0 + pointer-events: none) so it looks
// like it lives inside the TV. The only way back is the eject button.
const insertedHidden = ref(false)
// True for ~280ms after an insert — paints CRT static over the screen.
const isSwapping = ref(false)
// Power state for the screen (clicking the screen toggles).
const isOn = ref(true)

// Timers we may need to cancel mid-flight (e.g. user re-inserts while
// the previous insert's hide-timer is still pending).
let hideTimer: number | undefined
let ejectTimer1: number | undefined
let ejectTimer2: number | undefined
let swapTimer: number | undefined
function clearTimers() {
  if (hideTimer)   window.clearTimeout(hideTimer)
  if (ejectTimer1) window.clearTimeout(ejectTimer1)
  if (ejectTimer2) window.clearTimeout(ejectTimer2)
  if (swapTimer)   window.clearTimeout(swapTimer)
  hideTimer = ejectTimer1 = ejectTimer2 = swapTimer = undefined
}

// Active drag, if any. dx/dy are the cart's translate offsets in pixels
// relative to its home position in the sleeve.
const drag = reactive({
  id: null as Cartridge['id'] | null,
  startX: 0,
  startY: 0,
  dx: 0,
  dy: 0,
  pointerId: 0,
  moved: false,
  hot: false, // pointer is currently over the slot drop zone
})

// Per-cart "parked" translate when inserted — computed once per insert,
// so the cart visually slides from its home into the slot.
const parked = reactive<Record<string, { dx: number, dy: number }>>({})

const cartRefs = ref<Record<string, HTMLElement | null>>({})
const slotEl = ref<HTMLElement | null>(null)
const stageEl = ref<HTMLElement | null>(null)

function setCartRef(id: string, el: Element | null) {
  cartRefs.value[id] = (el as HTMLElement | null)
}

const active = computed(() =>
  insertedId.value
    ? cartridges.find(c => c.id === insertedId.value) ?? null
    : null,
)

const channelLabel = computed(() => {
  if (!insertedId.value) return 'CH --'
  const idx = cartridges.findIndex(c => c.id === insertedId.value)
  return `CH ${String(idx + 1).padStart(2, '0')}`
})

function toneTrim(t: Tone) {
  switch (t) {
    case 'magenta': return 'cart--magenta'
    case 'yellow':  return 'cart--yellow'
    case 'cream':   return 'cart--cream'
    case 'green':   return 'cart--green'
  }
}

// ── Drag mechanics ─────────────────────────────────────────────────────

const DRAG_THRESHOLD_PX = 4 // below this counts as a click, not a drag

function onPointerDown(ev: PointerEvent, id: Cartridge['id']) {
  // Don't start a new drag if one is already in flight.
  if (drag.id) return
  // Left button / touch / pen only.
  if (ev.button !== undefined && ev.button !== 0) return
  drag.id = id
  drag.startX = ev.clientX
  drag.startY = ev.clientY
  drag.dx = 0
  drag.dy = 0
  drag.pointerId = ev.pointerId
  drag.moved = false
  drag.hot = false
  ;(ev.currentTarget as HTMLElement).setPointerCapture?.(ev.pointerId)
}

function onPointerMove(ev: PointerEvent) {
  if (!drag.id) return
  // Multi-touch guard — a second finger on another cart must not
  // steer (or end) the first finger's drag.
  if (ev.pointerId !== drag.pointerId) return
  drag.dx = ev.clientX - drag.startX
  drag.dy = ev.clientY - drag.startY
  if (!drag.moved
    && (Math.abs(drag.dx) > DRAG_THRESHOLD_PX
      || Math.abs(drag.dy) > DRAG_THRESHOLD_PX)) {
    drag.moved = true
  }
  // Live drop-zone hit-test (cart center vs. slot rect)
  drag.hot = isOverSlot(ev.clientX, ev.clientY)
}

function onPointerUp(ev: PointerEvent) {
  if (!drag.id) return
  if (ev.pointerId !== drag.pointerId) return
  const id = drag.id
  const wasOverSlot = drag.hot
  const wasMoved = drag.moved
  const finalDx = drag.dx
  const finalDy = drag.dy
  try { (ev.currentTarget as HTMLElement).releasePointerCapture?.(drag.pointerId) }
  catch { /* may already be released */ }

  // Capture the cart's drop rect BEFORE clearing drag — at this moment
  // the DOM still shows the drag transform, so getBoundingClientRect()
  // reflects the drop position. We pass it to the inserter so it can
  // compute the correct parked translate (slot − home, accounting for
  // the drag offset). If we measured after clearing drag, the rect
  // might or might not have flushed back to home depending on Vue's
  // timing — leading to the cart landing at slot − dragOffset (≈ home).
  let dropRect: DOMRect | null = null
  if (wasOverSlot && cartRefs.value[id]) {
    dropRect = cartRefs.value[id]!.getBoundingClientRect()
  }

  drag.id = null
  drag.dx = 0
  drag.dy = 0
  drag.hot = false
  drag.moved = false

  if (wasOverSlot && dropRect) {
    insertCartFromDrop(id, dropRect, finalDx, finalDy)
  } else if (!wasMoved) {
    // Bare click — toggle: insert if it's not the current cart, eject if it is.
    if (insertedId.value === id) ejectCart()
    else insertCart(id)
  }
  // Otherwise: the cart snaps back to home automatically via CSS transition.
}

function onPointerCancel(ev: PointerEvent) {
  if (drag.id && ev.pointerId !== drag.pointerId) return
  drag.id = null
  drag.dx = 0
  drag.dy = 0
  drag.hot = false
  drag.moved = false
}

function isOverSlot(px: number, py: number) {
  const slot = slotEl.value
  if (!slot) return false
  const r = slot.getBoundingClientRect()
  // Add a generous 12px margin so it doesn't feel pixel-precise.
  const m = 12
  return px >= r.left - m && px <= r.right + m
      && py >= r.top - m  && py <= r.bottom + m
}

// ── Insert / eject ─────────────────────────────────────────────────────

/**
 * Compute the parked translate from a known drop rect + drag offset.
 * Used when the user releases a drag over the slot.
 *
 * The cart's home center is `drop.center − dragOffset`. So:
 *   parked = slot.center − home.center
 *          = slot.center − drop.center + dragOffset
 * This gets the cart from its home position to the slot center exactly,
 * regardless of where the user actually let go of the pointer.
 */
function insertCartFromDrop(
  id: Cartridge['id'],
  dropRect: DOMRect,
  fromDx: number,
  fromDy: number,
) {
  if (!slotEl.value) return
  clearTimers()

  const slotRect = slotEl.value.getBoundingClientRect()
  const dropCx = dropRect.left + dropRect.width  / 2
  const dropCy = dropRect.top  + dropRect.height / 2
  const slotCx = slotRect.left + slotRect.width  / 2
  const slotCy = slotRect.top  + slotRect.height / 2

  parked[id] = {
    dx: slotCx - dropCx + fromDx,
    dy: slotCy - dropCy + fromDy,
  }
  commitInsert(id)
}

/**
 * Click-based insert (no drag). The cart is at home, so we measure
 * directly and compute slot − home.
 */
function insertCart(id: Cartridge['id']) {
  if (!cartRefs.value[id] || !slotEl.value) return
  clearTimers()

  const cartRect = cartRefs.value[id]!.getBoundingClientRect()
  const slotRect = slotEl.value.getBoundingClientRect()
  parked[id] = {
    dx: (slotRect.left + slotRect.width  / 2) - (cartRect.left + cartRect.width  / 2),
    dy: (slotRect.top  + slotRect.height / 2) - (cartRect.top  + cartRect.height / 2),
  }
  commitInsert(id)
}

function commitInsert(id: Cartridge['id']) {
  // Eject the previously inserted cart back to its home, if any.
  const prev = insertedId.value
  if (prev && prev !== id) {
    delete parked[prev]
  }

  insertedId.value = id
  insertedHidden.value = false // visible while it slides into the slot
  isSwapping.value = true
  if (!isOn.value) isOn.value = true

  // After the slide-in completes, "sink" the cart into the TV — extra
  // translateY + scale-down + opacity-0 in one combined transition, so
  // it visually drops INTO the slot and vanishes inside.
  // (The sink transform itself lives in `cartTransform()`; the timer
  // here just flips the flag at the moment the slide-in settles.)
  hideTimer = window.setTimeout(() => {
    if (insertedId.value !== id) return
    // The sinking cart is about to leave the tab order AND the
    // accessibility tree (tabindex -1 + aria-hidden). If the user
    // keyboard-inserted it, focus would be stranded on a hidden
    // element — hand it to the slot, whose label is already
    // `Eject ${label}`: the natural next action.
    if (cartRefs.value[id] && document.activeElement === cartRefs.value[id]) {
      slotEl.value?.focus()
    }
    insertedHidden.value = true
  }, 380)
  swapTimer = window.setTimeout(() => { isSwapping.value = false }, 320)
}

function ejectCart() {
  if (!insertedId.value) return
  const id = insertedId.value
  clearTimers()

  // Rise out of the TV: cart un-sinks (transform back to slot center,
  // full scale, opacity 1) in one tween. Then slide back home.
  insertedHidden.value = false
  ejectTimer1 = window.setTimeout(() => {
    delete parked[id]
    ejectTimer2 = window.setTimeout(() => {
      if (insertedId.value === id) insertedId.value = null
    }, 420)
  }, 320)
}

function cartTransform(id: Cartridge['id']) {
  if (drag.id === id) {
    return `translate(${drag.dx}px, ${drag.dy}px)`
  }
  const p = parked[id]
  if (p) {
    if (insertedHidden.value && insertedId.value === id) {
      // Sunk into the TV: extra Y translate + scale-down. Combined with
      // opacity 0 from `.is-hidden`, this reads as "consumed by the slot."
      return `translate(${p.dx}px, ${p.dy + 22}px) scale(0.72) rotate(-1.6deg)`
    }
    // Just arrived at the slot — rotate to match the TV body angle.
    return `translate(${p.dx}px, ${p.dy}px) rotate(-1.6deg)`
  }
  return 'translate(0, 0)'
}

function togglePower() {
  isOn.value = !isOn.value
}

// Recompute parked translate on resize so the cart stays "in" the slot
// even if the layout reflows (font load, viewport change).
//
// Measured from the cart's CELL (its untransformed parent), not the
// cart itself: mid-transition the cart's own rect reports wherever the
// 420ms tween currently has it, which made the old re-park (delete +
// insertCart on nextTick) compute garbage AND replay insert side
// effects (CRT static, un-hide flash) on every resize. The cart fills
// its cell, so cell center == home center, always.
let ro: ResizeObserver | null = null
onMounted(() => {
  if (typeof ResizeObserver === 'undefined' || !stageEl.value) return
  ro = new ResizeObserver(() => {
    const id = insertedId.value
    if (!id || !slotEl.value) return
    const cell = cartRefs.value[id]?.parentElement
    if (!cell) return
    const cellRect = cell.getBoundingClientRect()
    const slotRect = slotEl.value.getBoundingClientRect()
    parked[id] = {
      dx: (slotRect.left + slotRect.width / 2) - (cellRect.left + cellRect.width / 2),
      dy: (slotRect.top + slotRect.height / 2) - (cellRect.top + cellRect.height / 2),
    }
  })
  ro.observe(stageEl.value)
})
onBeforeUnmount(() => {
  ro?.disconnect()
})
</script>

<template>
  <div ref="stageEl" class="portable-tv-stage select-none">
    <!-- TV cabinet -->
    <div
      class="portable-tv"
      :class="{ 'is-off': !isOn, 'is-swapping': isSwapping, 'is-target': drag.hot }"
      :data-cart="active?.id ?? 'none'"
      role="region"
      aria-label="Pack TV — drag a cartridge into the slot"
    >
      <!-- Rabbit-ears antenna -->
      <span class="portable-tv__antenna" aria-hidden="true">
        <span class="portable-tv__rod portable-tv__rod--l" />
        <span class="portable-tv__rod portable-tv__rod--r" />
      </span>

      <!-- Brand strip. The model number winks while SEEDS broadcasts:
           a watermelon is ~92% water. Same-width swap in a fixed
           strip — nobody's layout moves for a joke. -->
      <div class="portable-tv__brand">
        <span class="portable-tv__mark" aria-hidden="true">◑</span>
        <span class="portable-tv__brand-text">PACK TV</span>
        <span class="portable-tv__model">{{ insertedId === 'melon' ? 'CRT-92' : 'CRT-09' }}</span>
      </div>

      <!-- Screen -->
      <button
        type="button"
        class="portable-tv__screen"
        :aria-pressed="isOn"
        :aria-label="isOn
          ? (active ? `Now playing: ${active.title}. Click to power off.` : 'No cartridge inserted. Click to power off.')
          : 'TV off. Click to power on.'"
        @click="togglePower"
      >
        <span class="portable-tv__static" aria-hidden="true" />
        <span class="portable-tv__scanlines" aria-hidden="true" />
        <span class="portable-tv__vignette" aria-hidden="true" />

        <!-- Cartridge scene — keyed so each swap remounts the SVG. -->
        <Transition name="tv-cart" mode="out-in">
          <div
            v-if="isOn && active"
            :key="active.id"
            class="portable-tv__scene"
          >
            <!-- WALK ON -->
            <svg
              v-if="active.id === 'walk'"
              viewBox="0 0 200 150"
              preserveAspectRatio="xMidYMid slice"
              class="portable-tv__svg portable-tv__svg--magenta"
            >
              <defs>
                <pattern id="tv-halftone" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
                  <circle cx="3" cy="3" r="1" fill="currentColor" />
                </pattern>
              </defs>
              <rect x="0" y="100" width="200" height="50" fill="url(#tv-halftone)" opacity="0.6" />
              <g class="walker">
                <path d="M2 100 L8 100 L10 92 L20 90 L24 84 L28 84 L31 80 L36 80 L40 84 L44 84 L46 88 L48 90 L46 96 L44 100 L36 100 L34 96 L30 100 L24 100 L22 96 L18 100 L12 100 L10 96 Z" fill="currentColor" />
                <circle cx="42" cy="83" r="0.9" fill="#0d0c0a" />
              </g>
              <circle cx="170" cy="32" r="11" fill="currentColor" opacity="0.7" />
              <circle cx="174" cy="29" r="10" fill="#0d0c0a" />
            </svg>

            <!-- MOONRISE -->
            <svg
              v-else-if="active.id === 'moon'"
              viewBox="0 0 200 150"
              preserveAspectRatio="xMidYMid slice"
              class="portable-tv__svg portable-tv__svg--yellow"
            >
              <defs>
                <pattern id="tv-horizon" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
                  <circle cx="3" cy="3" r="1" fill="currentColor" />
                </pattern>
                <radialGradient id="tv-moon-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stop-color="currentColor" stop-opacity="0.9" />
                  <stop offset="100%" stop-color="currentColor" stop-opacity="0" />
                </radialGradient>
              </defs>
              <g class="stars" fill="currentColor">
                <circle cx="22" cy="22" r="0.8" />
                <circle cx="62" cy="14" r="0.6" />
                <circle cx="108" cy="30" r="0.9" />
                <circle cx="150" cy="18" r="0.7" />
                <circle cx="178" cy="40" r="0.8" />
                <circle cx="42" cy="48" r="0.6" />
              </g>
              <g class="moon-riser">
                <circle cx="100" cy="78" r="40" fill="url(#tv-moon-glow)" />
                <circle cx="100" cy="78" r="22" fill="currentColor" />
                <circle cx="92"  cy="74" r="2.2" fill="#0d0c0a" opacity="0.35" />
                <circle cx="106" cy="84" r="1.8" fill="#0d0c0a" opacity="0.35" />
                <circle cx="100" cy="68" r="1.2" fill="#0d0c0a" opacity="0.35" />
              </g>
              <rect x="0" y="110" width="200" height="40" fill="url(#tv-horizon)" opacity="0.7" />
            </svg>

            <!-- SEEDS — the broadcast. A riso-printed
                 watermelon slice on cream paper: green rind, cream
                 margin, red flesh slightly off-register (a second pass
                 through the press), ink seeds drifting upward like
                 broadcast snow in reverse. -->
            <svg
              v-else-if="active.id === 'melon'"
              viewBox="0 0 200 150"
              preserveAspectRatio="xMidYMid slice"
              class="portable-tv__svg portable-tv__svg--melon"
            >
              <defs>
                <pattern id="tv-melon-halftone" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
                  <circle cx="3" cy="3" r="0.9" fill="#0d0c0a" />
                </pattern>
              </defs>
              <!-- cream paper field, printed -->
              <rect x="0" y="0" width="200" height="150" fill="var(--color-cream)" opacity="0.92" />
              <rect x="0" y="0" width="200" height="150" fill="url(#tv-melon-halftone)" opacity="0.14" />
              <!-- caption — set in the transmission vocabulary -->
              <text x="100" y="22" text-anchor="middle" class="melon-caption" fill="#0d0c0a">SOME SIGNALS CAN'T BE JAMMED</text>
              <!-- the slice: rind / margin / flesh, point up -->
              <g class="melon-slice">
                <path d="M100 36 L36 110 Q100 144 164 110 Z" fill="var(--color-pop-green)" />
                <path d="M100 46 L46 107 Q100 136 154 107 Z" fill="var(--color-cream)" />
                <!-- off-register ghost pass of the flesh -->
                <path d="M102 53 L56 103 Q100 128 144 102 Z" fill="var(--color-pop-magenta)" opacity="0.35" />
                <path d="M100 54 L54 104 Q100 129 146 104 Z" fill="var(--color-pop-red)" />
                <!-- seeds in the flesh -->
                <g fill="#0d0c0a">
                  <ellipse cx="86" cy="88" rx="2" ry="3.1" transform="rotate(-14 86 88)" />
                  <ellipse cx="113" cy="80" rx="2" ry="3.1" transform="rotate(10 113 80)" />
                  <ellipse cx="100" cy="100" rx="2" ry="3.1" transform="rotate(4 100 100)" />
                  <ellipse cx="124" cy="98" rx="2" ry="3.1" transform="rotate(-8 124 98)" />
                  <ellipse cx="76" cy="74" rx="2" ry="3.1" transform="rotate(18 76 74)" />
                </g>
              </g>
              <!-- seeds drifting up out of the slice -->
              <g class="melon-drift" fill="#0d0c0a">
                <ellipse cx="92" cy="66" rx="1.8" ry="2.8" transform="rotate(-10 92 66)" />
                <ellipse cx="108" cy="58" rx="1.8" ry="2.8" transform="rotate(12 108 58)" />
                <ellipse cx="120" cy="70" rx="1.8" ry="2.8" transform="rotate(-6 120 70)" />
              </g>
              <!-- credit — homage, not a dated claim -->
              <text x="100" y="143" text-anchor="middle" class="melon-credit" fill="#0d0c0a">after S. Mansour</text>
            </svg>

            <!-- PAW STAMP -->
            <svg
              v-else
              viewBox="0 0 200 150"
              preserveAspectRatio="xMidYMid slice"
              class="portable-tv__svg portable-tv__svg--cream"
            >
              <g class="paw paw-1">
                <ellipse cx="0" cy="0" rx="8" ry="10" fill="currentColor" transform="translate(36 90)" />
                <ellipse cx="0" cy="0" rx="3" ry="4"  fill="currentColor" transform="translate(28 76)" />
                <ellipse cx="0" cy="0" rx="3" ry="4"  fill="currentColor" transform="translate(34 70)" />
                <ellipse cx="0" cy="0" rx="3" ry="4"  fill="currentColor" transform="translate(40 70)" />
                <ellipse cx="0" cy="0" rx="3" ry="4"  fill="currentColor" transform="translate(46 76)" />
              </g>
              <g class="paw paw-2">
                <ellipse cx="0" cy="0" rx="8" ry="10" fill="currentColor" transform="translate(100 50)" />
                <ellipse cx="0" cy="0" rx="3" ry="4"  fill="currentColor" transform="translate(92  36)" />
                <ellipse cx="0" cy="0" rx="3" ry="4"  fill="currentColor" transform="translate(98  30)" />
                <ellipse cx="0" cy="0" rx="3" ry="4"  fill="currentColor" transform="translate(104 30)" />
                <ellipse cx="0" cy="0" rx="3" ry="4"  fill="currentColor" transform="translate(110 36)" />
              </g>
              <g class="paw paw-3">
                <ellipse cx="0" cy="0" rx="8" ry="10" fill="currentColor" transform="translate(160 100)" />
                <ellipse cx="0" cy="0" rx="3" ry="4"  fill="currentColor" transform="translate(152 86)" />
                <ellipse cx="0" cy="0" rx="3" ry="4"  fill="currentColor" transform="translate(158 80)" />
                <ellipse cx="0" cy="0" rx="3" ry="4"  fill="currentColor" transform="translate(164 80)" />
                <ellipse cx="0" cy="0" rx="3" ry="4"  fill="currentColor" transform="translate(170 86)" />
              </g>
            </svg>
          </div>

          <!-- Empty-slot prompt -->
          <div v-else-if="isOn" key="empty" class="portable-tv__empty">
            <span class="portable-tv__empty-mark" aria-hidden="true">▾</span>
            <span class="portable-tv__empty-line">INSERT A CARTRIDGE</span>
          </div>
        </Transition>

        <!-- Chyron — channel + title -->
        <Transition name="tv-chyron">
          <span
            v-if="isOn && active"
            :key="active.id"
            class="portable-tv__chyron"
          >
            <span class="portable-tv__channel">{{ channelLabel }}</span>
            <span class="portable-tv__title">{{ active.title }}</span>
          </span>
        </Transition>

        <!-- Power-off shutdown line -->
        <span v-if="!isOn" class="portable-tv__off-dot" aria-hidden="true" />
      </button>

      <!-- Screen-reader narration for channel changes — visual users
           get the chyron; AT users get the same line at insert time. -->
      <span class="sr-only" aria-live="polite">{{ isOn && active ? `${channelLabel} — ${active.title}` : '' }}</span>

      <!-- Deck — grille + knobs + LED -->
      <div class="portable-tv__deck">
        <div class="portable-tv__grille" aria-hidden="true">
          <span v-for="n in 28" :key="n" />
        </div>
        <div class="portable-tv__knobs" aria-hidden="true">
          <span class="portable-tv__knob portable-tv__knob--lg">
            <span class="portable-tv__knob-notch" />
          </span>
          <span class="portable-tv__knob">
            <span class="portable-tv__knob-notch" />
          </span>
          <span class="portable-tv__led" :class="{ 'is-on': isOn && active }" />
        </div>
      </div>

      <!-- Slot — the drop target. Clicking it ejects the current cart. -->
      <button
        ref="slotEl"
        type="button"
        class="portable-tv__slot"
        :class="{ 'is-target': drag.hot, 'is-loaded': active }"
        :aria-label="active ? `Eject ${active.label}` : 'Cartridge slot — drag a cartridge here'"
        @click="ejectCart"
      >
        <span class="portable-tv__slot-mouth" aria-hidden="true" />
        <span class="portable-tv__slot-label">
          <template v-if="active">
            <span class="opacity-60">LOADED</span>
            <strong>{{ active.label }}</strong>
            <span class="portable-tv__slot-eject">EJECT ▴</span>
          </template>
          <template v-else>
            <span class="opacity-60">SLOT</span>
            <strong>DROP A CART</strong>
          </template>
        </span>
      </button>
    </div>

    <!-- Cartridge pack — the retail sleeve that holds the loose carts -->
    <div class="portable-tv-package" aria-label="Cartridge pack">
      <span class="portable-tv-package__hang" aria-hidden="true" />
      <div class="portable-tv-package__header">
        <span class="portable-tv-package__mark">◑</span>
        <span class="portable-tv-package__brand">WOLVES CARTRIDGES</span>
        <span class="portable-tv-package__count">04 / 04</span>
      </div>

      <ul class="portable-tv-package__grid">
        <li
          v-for="(c, i) in cartridges"
          :key="c.id"
          class="portable-tv-package__cell"
          :class="{ 'is-empty': insertedId === c.id || drag.id === c.id }"
        >
          <!-- Empty-slot outline shown when the cart has been pulled out -->
          <span class="portable-tv-package__outline" aria-hidden="true">
            <span class="portable-tv-package__outline-label">
              CART · {{ String(i + 1).padStart(2, '0') }}
            </span>
          </span>

          <!-- The cartridge itself — physical, draggable -->
          <div
            :ref="el => setCartRef(c.id, el as Element | null)"
            class="cart"
            :class="[
              toneTrim(c.tone),
              {
                'is-dragging': drag.id === c.id,
                'is-inserted': insertedId === c.id,
                'is-hidden':   insertedId === c.id && insertedHidden,
                'is-tilted':   drag.id !== c.id && insertedId !== c.id,
              },
            ]"
            :style="{
              transform: cartTransform(c.id),
              '--seat-tilt': `${(i % 2 === 0 ? -1 : 1) * (2 + (i % 3))}deg`,
            }"
            :data-cart="c.id"
            :tabindex="(insertedId === c.id && insertedHidden) ? -1 : 0"
            :aria-hidden="(insertedId === c.id && insertedHidden) ? 'true' : undefined"
            role="button"
            :aria-pressed="insertedId === c.id"
            :aria-label="`${c.label} cartridge. ${insertedId === c.id ? 'Inserted. Press eject on the slot to remove.' : 'Press or drag to insert.'}`"
            @pointerdown="onPointerDown($event, c.id)"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointercancel="onPointerCancel"
            @keydown.enter.prevent="insertedId === c.id ? ejectCart() : insertCart(c.id)"
            @keydown.space.prevent="insertedId === c.id ? ejectCart() : insertCart(c.id)"
          >
            <span class="cart__spool cart__spool--l" aria-hidden="true" />
            <span class="cart__spool cart__spool--r" aria-hidden="true" />
            <!-- SEEDS only: red label window with three ink seeds -->
            <span v-if="c.id === 'melon'" class="cart__window" aria-hidden="true" />
            <span class="cart__strip">
              <span class="cart__index">{{ String(i + 1).padStart(2, '0') }}</span>
              <span class="cart__name">{{ c.label }}</span>
            </span>
            <span class="cart__notch cart__notch--l" aria-hidden="true" />
            <span class="cart__notch cart__notch--r" aria-hidden="true" />
          </div>
        </li>
      </ul>

      <span class="portable-tv-package__hint">drag a cart into the slot →</span>
    </div>
  </div>
</template>

<style scoped>
/* =========================================================================
   Stage — TV beside the cartridge pack
   ========================================================================= */
.portable-tv-stage {
  position: relative;
  display: grid;
  gap: 2.5rem 3rem;
  grid-template-columns: minmax(0, 1fr);
  place-items: center;
  /* Allow the dragged cart to fly above neighbouring content. */
  overflow: visible;
  /* Isolate the cart's transforms from the surrounding document layout.
     Without this, the cart's translated bounding box can momentarily
     extend the page's scroll area during the slide-into-the-slot
     animation — which makes the body's scrollbar appear/disappear and
     shifts the centered section sideways by the scrollbar width. */
  contain: layout;
}
@media (min-width: 60rem) {
  .portable-tv-stage {
    /* Explicit-width columns are deliberate. With auto-sized tracks the
       TV's intrinsic max-content drives the column width, and the TV's
       max-content changes when the slot label flips between
       "SLOT · DROP A CART" and "LOADED · {name} · EJECT ▴" — the wider
       loaded label expands the column, which shifts every centered
       element in the section sideways. Locking the columns to
       30rem + 22rem keeps the layout pinned regardless of slot state. */
    grid-template-columns: 30rem 22rem;
    justify-content: center;
    align-items: center;
  }
}

/* =========================================================================
   Cabinet — cream chassis, ink bezel, static rotation (no hover-tilt)
   ========================================================================= */
.portable-tv {
  position: relative;
  width: 100%;
  max-width: 30rem;
  aspect-ratio: 5 / 6;
  padding: 1.25rem 1.25rem 1rem;
  rotate: -1.6deg;
  background: var(--color-cream);
  border: 3px solid var(--color-ink);
  border-radius: 18px;
  display: grid;
  grid-template-rows: auto 1fr auto auto;
  gap: 0.7rem;
  box-shadow:
    inset 0 0 0 2px var(--color-cream),
    inset 0 0 0 3px var(--color-ink),
    0 14px 0 rgba(13, 12, 10, 0.35),
    0 28px 60px rgba(13, 12, 10, 0.45);
  background-image:
    radial-gradient(circle at 1px 1px, rgba(13, 12, 10, 0.05) 1px, transparent 1.5px);
  background-size: 6px 6px;
  transition: filter 320ms var(--ease-pop);
}
.portable-tv.is-off {
  filter: saturate(0.6) brightness(0.92);
}

/* Antenna */
.portable-tv__antenna {
  position: absolute;
  top: -56px;
  left: 50%;
  width: 0;
  height: 0;
  transform: translateX(-50%);
  pointer-events: none;
}
.portable-tv__rod {
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 3px;
  height: 60px;
  background: var(--color-ink);
  border-radius: 3px;
  transform-origin: bottom center;
}
.portable-tv__rod::after {
  content: "";
  position: absolute;
  top: -4px;
  left: 50%;
  transform: translateX(-50%);
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--color-ink);
}
.portable-tv__rod--l { transform: rotate(-22deg); }
.portable-tv__rod--r { transform: rotate(22deg); }

/* Brand strip */
.portable-tv__brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 0.2rem;
}
.portable-tv__mark { color: var(--color-pop-magenta); font-size: 0.95rem; line-height: 1; }
.portable-tv__brand-text {
  font-family: var(--font-display);
  font-size: 0.95rem;
  letter-spacing: 0.18em;
  color: var(--color-ink);
}
.portable-tv__model {
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: 0.6rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: color-mix(in oklab, var(--color-ink) 55%, transparent);
}

/* =========================================================================
   Screen
   ========================================================================= */
.portable-tv__screen {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: 14px / 18px;
  background: #07120f;
  border: 6px solid var(--color-ink);
  box-shadow:
    inset 0 0 0 2px #1a1a1a,
    inset 0 6px 22px rgba(0, 0, 0, 0.7),
    inset 0 -8px 18px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  cursor: pointer;
  font: inherit;
  color: inherit;
  padding: 0;
  appearance: none;
}
.portable-tv__screen:focus-visible {
  outline: 2px solid var(--color-pop-magenta);
  outline-offset: 3px;
}

.portable-tv__scanlines {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: repeating-linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0) 0,
    rgba(0, 0, 0, 0) 2px,
    rgba(0, 0, 0, 0.25) 2px,
    rgba(0, 0, 0, 0.25) 3px
  );
  mix-blend-mode: multiply;
  opacity: 0.55;
  z-index: 4;
}
.portable-tv__vignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(120% 90% at 50% 45%, rgba(120, 220, 200, 0.05), rgba(0, 0, 0, 0.65) 95%),
    radial-gradient(60% 30% at 50% 0%, rgba(255, 255, 255, 0.08), transparent 75%);
  z-index: 3;
}
.portable-tv__static {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 5;
  opacity: 0.06;
  background-image:
    repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.6) 0 1px, transparent 1px 2px),
    repeating-linear-gradient(0deg,  rgba(255, 255, 255, 0.5) 0 1px, transparent 1px 3px);
  mix-blend-mode: screen;
  transition: opacity 220ms ease-out;
}
.portable-tv.is-swapping .portable-tv__static {
  opacity: 0.85;
  animation: tv-snow 220ms steps(4) infinite;
}
@keyframes tv-snow {
  0%   { background-position: 0 0,    0 0; }
  25%  { background-position: 12px 0, 0 7px; }
  50%  { background-position: 4px 9px, 18px 3px; }
  75%  { background-position: 19px 2px, 8px 16px; }
  100% { background-position: 0 0,    0 0; }
}

.portable-tv__scene { position: absolute; inset: 0; z-index: 2; }
.portable-tv__svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  filter:
    drop-shadow(0 0 6px rgba(255, 72, 105, 0.35))
    drop-shadow(0 0 14px rgba(255, 233, 78, 0.2));
}
.portable-tv__svg--magenta { color: var(--color-pop-magenta); }
.portable-tv__svg--yellow  { color: var(--color-pop-yellow);  }
.portable-tv__svg--cream   { color: var(--color-cream);       }
/* The SEEDS broadcast glows in its own inks (green/red), not the
   house magenta/yellow phosphor. */
.portable-tv__svg--melon {
  filter:
    drop-shadow(0 0 6px rgba(0, 169, 92, 0.3))
    drop-shadow(0 0 14px rgba(241, 80, 96, 0.18));
}

/* Empty-state prompt while no cartridge is inserted */
.portable-tv__empty {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  z-index: 2;
  font-family: var(--font-mono);
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: color-mix(in oklab, var(--color-cream) 60%, transparent);
}
.portable-tv__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 0.7rem;
}
.portable-tv__empty-mark {
  font-size: 1.6rem;
  color: var(--color-pop-yellow);
  animation: tv-empty-bounce 1.6s ease-in-out infinite;
}
@keyframes tv-empty-bounce {
  0%, 100% { transform: translateY(0);    opacity: 0.85; }
  50%      { transform: translateY(6px);  opacity: 1; }
}

.portable-tv__chyron {
  position: absolute;
  left: 0.55rem;
  bottom: 0.55rem;
  right: 0.55rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.28rem 0.55rem;
  background: rgba(13, 12, 10, 0.55);
  border: 1px solid color-mix(in oklab, var(--color-cream) 25%, transparent);
  border-radius: 4px;
  z-index: 6;
  font-family: var(--font-mono);
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  color: var(--color-cream);
  text-transform: uppercase;
  backdrop-filter: blur(2px);
}
.portable-tv__channel {
  color: var(--color-pop-yellow);
  font-weight: 700;
  letter-spacing: 0.15em;
}
.portable-tv__title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 0.75rem;
  text-transform: none;
  letter-spacing: 0;
  color: color-mix(in oklab, var(--color-cream) 92%, transparent);
}

.portable-tv__off-dot {
  position: absolute;
  left: 50%; top: 50%;
  width: 60px; height: 4px;
  margin: -2px 0 0 -30px;
  background: rgba(200, 220, 215, 0.7);
  border-radius: 4px;
  z-index: 7;
  filter: blur(0.5px);
  animation: tv-shutdown 600ms var(--ease-pop) forwards;
}
@keyframes tv-shutdown {
  0%   { width: 90%; height: 60%; margin-left: -45%; margin-top: -30%; opacity: 1; border-radius: 30%; }
  35%  { width: 80%; height: 4px; margin-left: -40%; margin-top: -2px; opacity: 0.9; border-radius: 4px; }
  100% { width: 0;   height: 4px; margin-left: 0;     margin-top: -2px; opacity: 0; }
}

/* =========================================================================
   Deck — grille + knobs + LED
   ========================================================================= */
.portable-tv__deck {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 0.8rem;
  padding: 0.25rem 0.1rem 0;
}
.portable-tv__grille {
  display: grid;
  grid-template-columns: repeat(14, 1fr);
  gap: 4px;
  padding: 6px 8px;
  background: var(--color-ink);
  border-radius: 6px;
}
.portable-tv__grille span {
  display: block;
  height: 6px;
  background: color-mix(in oklab, var(--color-cream) 65%, var(--color-ink));
  border-radius: 50%;
  opacity: 0.55;
}
.portable-tv__knobs { display: flex; align-items: center; gap: 0.55rem; }
.portable-tv__knob {
  position: relative;
  width: 22px; height: 22px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 28%, color-mix(in oklab, var(--color-cream) 90%, transparent), color-mix(in oklab, var(--color-ink) 70%, var(--color-cream)) 85%);
  border: 2px solid var(--color-ink);
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.4);
}
.portable-tv__knob--lg { width: 28px; height: 28px; }
.portable-tv__knob-notch {
  position: absolute;
  top: 2px; left: 50%;
  width: 2px; height: 6px;
  margin-left: -1px;
  background: var(--color-ink);
  border-radius: 1px;
  transform-origin: 50% 9px;
  transform: rotate(35deg);
}
.portable-tv__knob--lg .portable-tv__knob-notch {
  height: 8px;
  transform-origin: 50% 12px;
  transform: rotate(-25deg);
}
.portable-tv__led {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: color-mix(in oklab, var(--color-ink) 70%, transparent);
  border: 1px solid var(--color-ink);
  margin-left: 0.2rem;
}
.portable-tv__led.is-on {
  background: var(--color-pop-magenta);
  box-shadow:
    0 0 0 1px var(--color-ink),
    0 0 8px color-mix(in oklab, var(--color-pop-magenta) 70%, transparent);
  animation: tv-led-pulse 1.8s ease-in-out infinite;
}
/* The LED re-inks green while the contraband broadcasts. */
.portable-tv[data-cart="melon"] .portable-tv__led.is-on {
  background: var(--color-pop-green);
  box-shadow:
    0 0 0 1px var(--color-ink),
    0 0 8px color-mix(in oklab, var(--color-pop-green) 70%, transparent);
}
@keyframes tv-led-pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.5; }
}

/* =========================================================================
   Slot — drop target + eject button
   ========================================================================= */
.portable-tv__slot {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.55rem 0.65rem;
  background: var(--color-paper);
  border: 2px solid var(--color-ink);
  border-radius: 6px;
  cursor: pointer;
  font: inherit;
  color: inherit;
  appearance: none;
  text-align: left;
  transition:
    background-color 220ms var(--ease-pop),
    box-shadow 220ms var(--ease-pop),
    transform 220ms var(--ease-pop);
}
.portable-tv__slot.is-target {
  background: color-mix(in oklab, var(--color-pop-yellow) 70%, var(--color-paper));
  box-shadow:
    0 0 0 3px var(--color-ink),
    0 0 0 6px var(--color-pop-yellow),
    0 0 22px color-mix(in oklab, var(--color-pop-yellow) 50%, transparent);
}
.portable-tv__slot.is-loaded { cursor: pointer; }
.portable-tv__slot:not(.is-loaded) { cursor: default; }
.portable-tv__slot:focus-visible {
  outline: 2px solid var(--color-pop-magenta);
  outline-offset: 3px;
}
.portable-tv__slot-mouth {
  display: block;
  width: 44px;
  height: 8px;
  border-radius: 2px;
  background: var(--color-ink);
  box-shadow:
    inset 0 1px 0 rgba(0, 0, 0, 0.8),
    inset 0 -1px 0 color-mix(in oklab, var(--color-cream) 50%, var(--color-ink));
  flex-shrink: 0;
}
.portable-tv__slot-label {
  display: inline-flex;
  align-items: baseline;
  gap: 0.45rem;
  font-family: var(--font-mono);
  font-size: 0.62rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--color-ink);
  flex: 1;
  min-width: 0;
}
.portable-tv__slot-label strong {
  font-family: var(--font-display);
  font-size: 0.78rem;
  letter-spacing: 0.12em;
  color: var(--color-pop-magenta);
}
.portable-tv__slot-eject {
  margin-left: auto;
  font-size: 0.55rem;
  letter-spacing: 0.24em;
  color: var(--color-ink);
  background: var(--color-pop-yellow);
  padding: 0.15rem 0.35rem;
  border-radius: 3px;
}

/* =========================================================================
   Cartridge pack — printed sleeve, 2x2 of carts
   ========================================================================= */
.portable-tv-package {
  position: relative;
  width: 100%;
  max-width: 22rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.5rem 1rem 1rem;
  margin-top: 2.5rem;
  background: var(--color-paper);
  border: 3px solid var(--color-ink);
  border-radius: 4px;
  box-shadow:
    inset 0 0 0 2px var(--color-paper),
    inset 0 0 0 3px var(--color-ink),
    0 10px 0 rgba(13, 12, 10, 0.35),
    0 22px 40px rgba(13, 12, 10, 0.45);
  rotate: 1.4deg;
  /* riso halftone wash on the sleeve */
  background-image:
    radial-gradient(circle at 1px 1px, rgba(13, 12, 10, 0.06) 1px, transparent 1.5px);
  background-size: 6px 6px;
}

/* A pretend hang-hole at the top of the retail sleeve */
.portable-tv-package__hang {
  position: absolute;
  top: -14px;
  left: 50%;
  transform: translateX(-50%);
  width: 28px;
  height: 14px;
  background: var(--color-paper);
  border: 3px solid var(--color-ink);
  border-bottom: none;
  border-radius: 30px 30px 0 0;
}
.portable-tv-package__hang::after {
  content: "";
  position: absolute;
  top: 4px; left: 50%;
  transform: translateX(-50%);
  width: 10px; height: 6px;
  background: var(--color-ink);
  border-radius: 6px;
}

.portable-tv-package__header {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px dashed color-mix(in oklab, var(--color-ink) 65%, transparent);
}
.portable-tv-package__mark { color: var(--color-pop-magenta); font-size: 0.9rem; line-height: 1; }
.portable-tv-package__brand {
  font-family: var(--font-display);
  font-size: 0.78rem;
  letter-spacing: 0.18em;
  color: var(--color-ink);
}
.portable-tv-package__count {
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: 0.6rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: color-mix(in oklab, var(--color-ink) 55%, transparent);
}

.portable-tv-package__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.9rem;
  list-style: none;
  padding: 0;
  margin: 0;
}
.portable-tv-package__cell {
  position: relative;
  /* Landscape carts — flatter than the old 4/5 portrait cells. The
     whole sleeve shrinks with the cells, so the holder follows. */
  aspect-ratio: 4 / 3;
  display: grid;
  place-items: stretch;
}
.portable-tv-package__outline {
  position: absolute;
  inset: 0;
  border: 1.5px dashed color-mix(in oklab, var(--color-ink) 45%, transparent);
  border-radius: 6px;
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
  padding: 0.4rem;
  opacity: 0;
  transition: opacity 220ms ease-out;
  background:
    repeating-linear-gradient(
      45deg,
      rgba(13, 12, 10, 0.04) 0 6px,
      rgba(13, 12, 10, 0) 6px 12px
    );
}
.portable-tv-package__cell.is-empty .portable-tv__cell-outline,
.portable-tv-package__cell.is-empty .portable-tv-package__outline { opacity: 0.85; }
.portable-tv-package__outline-label {
  font-family: var(--font-mono);
  font-size: 0.5rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: color-mix(in oklab, var(--color-ink) 60%, transparent);
}

.portable-tv-package__hint {
  margin-top: 0.4rem;
  font-family: var(--font-mono);
  font-size: 0.6rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: color-mix(in oklab, var(--color-ink) 55%, transparent);
  text-align: center;
}

/* =========================================================================
   The cartridge itself — physical, draggable
   ========================================================================= */
.cart {
  position: relative;
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-rows: 1fr auto;
  align-items: center;
  justify-items: center;
  border: 2.5px solid var(--color-ink);
  border-radius: 6px;
  cursor: grab;
  touch-action: none;
  z-index: 1;
  transform-origin: center;
  background-image:
    radial-gradient(circle at 1px 1px, rgba(13, 12, 10, 0.12) 1px, transparent 1.5px);
  background-size: 6px 6px;
  background-blend-mode: multiply;
  box-shadow:
    inset 0 0 0 2px color-mix(in oklab, var(--color-cream) 30%, transparent),
    0 4px 0 rgba(13, 12, 10, 0.35),
    0 8px 16px rgba(13, 12, 10, 0.35);
  transition:
    transform 420ms var(--ease-pop),
    opacity 340ms ease-out,
    box-shadow 220ms ease-out;
  user-select: none;
}
.cart.is-tilted { transform: rotate(var(--seat-tilt, 0deg)); }

/* Sunk inside the TV — invisible + unreachable. The transform that
   carries the cart further down + smaller comes from `cartTransform()`
   in JS; here we just zero opacity and disable pointer events. The
   slightly longer transition gives the disappearance a real beat
   instead of a flicker. */
.cart.is-hidden {
  opacity: 0;
  pointer-events: none;
}

/* While sliding into / out of the TV, give the cart a chunkier drop
   shadow so it reads as "lifting and being placed" rather than gliding. */
.cart.is-inserted {
  box-shadow:
    inset 0 0 0 2px color-mix(in oklab, var(--color-cream) 30%, transparent),
    0 12px 0 rgba(13, 12, 10, 0.45),
    0 22px 30px rgba(13, 12, 10, 0.55);
}
.cart:hover    { box-shadow:
  inset 0 0 0 2px color-mix(in oklab, var(--color-cream) 30%, transparent),
  0 6px 0 rgba(13, 12, 10, 0.4),
  0 14px 24px rgba(13, 12, 10, 0.45);
}
.cart:focus-visible {
  outline: 2px solid var(--color-pop-magenta);
  outline-offset: 3px;
}
.cart:active {
  cursor: grabbing;
}
.cart.is-dragging {
  cursor: grabbing;
  transition: none;
  z-index: 50;
  box-shadow:
    inset 0 0 0 2px color-mix(in oklab, var(--color-cream) 30%, transparent),
    0 10px 0 rgba(13, 12, 10, 0.4),
    0 22px 40px rgba(13, 12, 10, 0.55);
}
.cart.is-inserted {
  z-index: 40;
  cursor: pointer;
}

.cart--magenta { background-color: var(--color-pop-magenta); color: var(--color-ink); }
.cart--yellow  { background-color: var(--color-pop-yellow);  color: var(--color-ink); }
.cart--cream   { background-color: var(--color-cream);       color: var(--color-ink); }
.cart--green   { background-color: var(--color-pop-green);   color: var(--color-ink); }

/* SEEDS only — red label window between the spools: flesh and three
   ink seeds. Sized against the cart width so it stays clear of the
   single-line label strip on the landscape cart. */
.cart__window {
  position: absolute;
  top: 14%;
  left: 50%;
  transform: translateX(-50%);
  width: 19%;
  aspect-ratio: 1;
  border-radius: 50%;
  background-color: var(--color-pop-red);
  background-image:
    radial-gradient(circle at 36% 38%, var(--color-ink) 9%, transparent 11%),
    radial-gradient(circle at 64% 34%, var(--color-ink) 9%, transparent 11%),
    radial-gradient(circle at 50% 66%, var(--color-ink) 9%, transparent 11%);
  box-shadow:
    inset 0 0 0 2px color-mix(in oklab, var(--color-ink) 85%, transparent),
    inset 0 0 0 3.5px var(--color-cream);
}

/* Two ink spool wheels in the cart's upper face — sized for the
   landscape cart so they clear the label strip. */
.cart__spool {
  position: absolute;
  top: 15%;
  width: 20%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: var(--color-ink);
  box-shadow: inset 0 0 0 2px color-mix(in oklab, var(--color-cream) 70%, transparent);
}
.cart__spool::before {
  content: "";
  position: absolute;
  inset: 22%;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.18;
}
.cart__spool--l { left: 12%; }
.cart__spool--r { right: 12%; }

/* Bottom label strip — index and name on one line; the stacked layout
   ate too much of the half-height cart. */
.cart__strip {
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: row;
  align-items: baseline;
  justify-content: center;
  gap: 0.45rem;
  padding: 0.28rem 0.4rem 0.32rem;
  background: var(--color-cream);
  border-top: 2.5px solid var(--color-ink);
  /* Halftone strip overlay so the label feels printed */
  background-image:
    radial-gradient(circle at 1px 1px, rgba(13, 12, 10, 0.15) 1px, transparent 1.5px);
  background-size: 4px 4px;
}
.cart__index {
  font-family: var(--font-mono);
  font-size: 0.5rem;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: color-mix(in oklab, var(--color-ink) 65%, transparent);
}
.cart__name {
  font-family: var(--font-display);
  font-size: 0.78rem;
  letter-spacing: 0.1em;
  line-height: 1;
  color: var(--color-ink);
  text-align: center;
}

/* Connector notches at the bottom of the cart */
.cart__notch {
  position: absolute;
  bottom: -2.5px;
  width: 14%;
  height: 6%;
  background: var(--color-ink);
  border-radius: 0 0 3px 3px;
}
.cart__notch--l { left: 18%; }
.cart__notch--r { right: 18%; }

/* =========================================================================
   Transitions for scene + chyron
   ========================================================================= */
.tv-cart-enter-active { transition: opacity 320ms ease-out, transform 320ms var(--ease-pop); }
.tv-cart-leave-active { transition: opacity 200ms ease-in; }
.tv-cart-enter-from   { opacity: 0; transform: scale(1.04); }
.tv-cart-leave-to     { opacity: 0; }

.tv-chyron-enter-active { transition: opacity 360ms ease-out 120ms, transform 360ms var(--ease-pop) 120ms; }
.tv-chyron-leave-active { transition: opacity 180ms ease-in; }
.tv-chyron-enter-from   { opacity: 0; transform: translateY(6px); }
.tv-chyron-leave-to     { opacity: 0; }

/* =========================================================================
   Scene animations
   ========================================================================= */
:deep(.portable-tv__svg--magenta .walker) { animation: tv-walk 7s linear infinite; }
@keyframes tv-walk { 0% { transform: translateX(-30px); } 100% { transform: translateX(230px); } }

:deep(.portable-tv__svg--yellow .moon-riser) { animation: tv-moonrise 9s ease-in-out infinite; }
:deep(.portable-tv__svg--yellow .stars)      { animation: tv-twinkle 3.2s ease-in-out infinite alternate; }
@keyframes tv-moonrise { 0% { transform: translateY(60px); } 50% { transform: translateY(-20px); } 100% { transform: translateY(60px); } }
@keyframes tv-twinkle  { 0% { opacity: 0.4; } 100% { opacity: 1; } }

/* SEEDS — drift upward out of the slice, broadcast snow in reverse */
:deep(.portable-tv__svg--melon .melon-drift) {
  animation: tv-melon-drift 5.5s linear infinite;
}
@keyframes tv-melon-drift {
  0%   { transform: translateY(0);     opacity: 0; }
  12%  { opacity: 0.9; }
  82%  { opacity: 0.9; }
  100% { transform: translateY(-58px); opacity: 0; }
}
:deep(.portable-tv__svg--melon .melon-caption) {
  font-family: var(--font-mono);
  font-size: 6.5px;
  letter-spacing: 0.18em;
}
:deep(.portable-tv__svg--melon .melon-credit) {
  font-family: var(--font-mono);
  font-size: 6px;
  letter-spacing: 0.14em;
  opacity: 0.65;
}

:deep(.portable-tv__svg--cream .paw) {
  opacity: 0;
  transform-origin: center;
  animation: tv-paw 3.6s ease-in-out infinite;
}
:deep(.portable-tv__svg--cream .paw-1) { animation-delay: 0s;    }
:deep(.portable-tv__svg--cream .paw-2) { animation-delay: 0.85s; }
:deep(.portable-tv__svg--cream .paw-3) { animation-delay: 1.7s;  }
@keyframes tv-paw {
  0%   { opacity: 0; transform: scale(0.6) rotate(-8deg); }
  10%  { opacity: 1; transform: scale(1)   rotate(0deg);  }
  60%  { opacity: 0.95; }
  85%  { opacity: 0; transform: scale(1.05); }
  100% { opacity: 0; }
}

/* =========================================================================
   Reduced motion
   ========================================================================= */
@media (prefers-reduced-motion: reduce) {
  .portable-tv,
  .portable-tv-package,
  .cart {
    transition: none;
  }
  .cart.is-dragging { transition: none; }
  :deep(.walker),
  :deep(.moon-riser),
  :deep(.stars),
  :deep(.paw),
  :deep(.melon-drift) {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
  .portable-tv__led.is-on { animation: none; }
  .portable-tv.is-swapping .portable-tv__static { animation: none; opacity: 0.3; }
  .portable-tv__empty-mark { animation: none; }
  /* Power-off keeps its meaning (screen goes dark) without the 600ms
     CRT-collapse motion. */
  .portable-tv__off-dot { animation: none; opacity: 0; }
}
</style>
