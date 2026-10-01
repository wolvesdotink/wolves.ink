<script setup lang="ts">
import type { NuxtError } from '#app'

/**
 * Global error page shell. Nuxt imports `error.vue` statically into the
 * entry chunk, so anything in this file ships on every page — even the
 * ones that never error. The page body (Howl Hunt game, styles and all)
 * lives in `components/app/ErrorTrail.vue` and loads lazily, only when
 * an error actually renders. SSR'd 404s still render it inline.
 *
 * AppHeader and AppFooter stay here on purpose: every page renders them
 * anyway, and importing them from the entry keeps their CSS in the
 * entry stylesheet instead of splitting out an extra render-blocking
 * request.
 */
defineProps<{ error: NuxtError }>()
</script>

<template>
  <div class="grain min-h-dvh bg-ink text-cream flex flex-col">
    <AppHeader />
    <LazyErrorTrail :error="error" />
    <AppFooter />
  </div>
</template>
