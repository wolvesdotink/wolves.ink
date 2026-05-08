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
  </div>
</template>
