import type { ComputedRef, MaybeRefOrGetter } from 'vue'
import type { ProjectAccent } from '~/data/projects'
import type { AccentClassMap } from '~/utils/accent'

/**
 * Reactive variant of `accentClasses()` — accepts a ref, a getter, or a
 * plain value, and returns a `ComputedRef<AccentClassMap>` that updates
 * whenever the source accent changes.
 *
 * Most call-sites pass a getter (`() => props.project.accent`) or a
 * computed-ref of a project field, so reaching for `toValue()` here keeps
 * the consumer site terse.
 *
 *   const accent = useAccentColor(() => props.project.accent)
 *   //   accent.value.text       → 'text-pop-magenta'
 *   //   accent.value.bgWithFg   → 'bg-pop-magenta text-ink'
 *   //   accent.value.heroGradient → 'linear-gradient(...)'
 */
export function useAccentColor(
  accent: MaybeRefOrGetter<ProjectAccent>,
): ComputedRef<AccentClassMap> {
  return computed(() => accentClasses(toValue(accent)))
}
