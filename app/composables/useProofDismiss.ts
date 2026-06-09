import type { Ref } from 'vue'

/**
 * useProofDismiss — outside-click + Escape dismissal for the hero proof value
 * card (ValueCard.vue). Call it from a plate that is mounted only while open
 * (v-if), passing the plate's root ref and a close callback.
 *
 * On mount — deferred one frame so the opening click doesn't immediately
 * dismiss it — it starts listening for an outside pointerdown or Escape;
 * either calls onClose. (No resize listener: the plate is width-clamped, and
 * resize fires on mobile URL-bar collapse, which would dismiss it mid-scroll.)
 * All listeners are torn down on unmount. Focus restoration is the caller's
 * job — InkHighlight returns focus to the value-word after close.
 *
 * Only one proof is ever open at a time (useInkProof), so at most one of these
 * is active. The pointerdown listener rides the capture phase, to catch an
 * outside click before it reaches a child handler. The Escape listener rides
 * the bubble phase, after the page's capture-phase held-plate handler (which
 * no-ops while its own plate is closed): it honours that handler's
 * `defaultPrevented` claim and sets its own when it closes the card, so one
 * Escape never dismisses two surfaces at once.
 */
export function useProofDismiss(
  plateEl: Ref<HTMLElement | null>,
  onClose: () => void,
) {
  function onPointerDown(e: Event) {
    const t = e.target as Node | null
    if (t && plateEl.value && !plateEl.value.contains(t)) onClose()
  }
  function onKeydown(e: KeyboardEvent) {
    // Bail if the page's capture-phase held-plate handler already claimed this
    // Escape; otherwise claim it ourselves so nothing further acts on it.
    if (e.key !== 'Escape' || e.defaultPrevented) return
    e.preventDefault()
    onClose()
  }

  let raf = 0
  let added = false

  onMounted(() => {
    raf = requestAnimationFrame(() => {
      window.addEventListener('pointerdown', onPointerDown, true)
      window.addEventListener('keydown', onKeydown)
      added = true
    })
  })

  onBeforeUnmount(() => {
    cancelAnimationFrame(raf)
    if (!added) return
    window.removeEventListener('pointerdown', onPointerDown, true)
    window.removeEventListener('keydown', onKeydown)
  })
}
