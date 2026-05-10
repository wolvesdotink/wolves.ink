<template>
  <div class="relative min-h-dvh">
    <GrainOverlay :intensity="14" />
    <!--
      RisoCursor is brand polish, not critical to first interaction.
      `hydrate-on-idle` waits for `requestIdleCallback` before mounting
      it, so the rAF loop and DOM-walking pointermove listener never
      compete with first paint. The cursor itself self-gates on
      `pointer: fine` and `prefers-reduced-motion: reduce`, so this
      composes naturally — idle hydration just defers the gate check.
    -->
    <LazyRisoCursor hydrate-on-idle />
    <AppHeader />
    <main>
      <slot />
    </main>
    <AppFooter />
    <!--
      MiniRadio lives at the layout level so it survives page
      navigation and the audio handle (held in `useRadioPlayer`) keeps
      the stream alive between routes. The component self-gates: it
      only renders when the user has tuned in once AND the big dial on
      the homepage isn't currently in view.
    -->
    <MiniRadio />
    <!--
      PawTrail is the cursor-following companion to the footer paw
      (AppFooter.vue). Once the user presses the paw it sets a
      session-scoped flag (`usePawTrail`) and this overlay starts
      dropping fading paw prints under the cursor. Mounted at the
      layout level so the trail survives route transitions within
      the same tab session. Self-gates on `(pointer: fine)` and
      `prefers-reduced-motion: reduce` — pairs with RisoCursor.
    -->
    <PawTrail />
  </div>
</template>
