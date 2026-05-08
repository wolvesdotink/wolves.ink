import type { ProjectAccent } from '~/data/projects'

/**
 * Single source of truth for the riso accent → Tailwind class mapping.
 *
 * Before this util, the same `switch (accent) { case 'pop-orange': ... }`
 * was repeated in 8+ places (ProjectHero, ProjectCard, ProjectIndexCard,
 * ProjectGuide, /projects/[slug], /field-notes/[slug], /field-notes/index).
 * Each copy was a chance for them to drift; now the table is the only
 * place that knows what `pop-magenta` looks like in CSS.
 *
 * Auto-imported via Nuxt 4's `app/utils/` convention.
 *
 * NOTE: `OgImageWolves.takumi.vue` runs in a separate Takumi/Satori sandbox
 * without Tailwind, auto-imports, or `~/utils/*`. Its accent switch must
 * stay duplicated; the `og` field below is the canonical mirror so
 * site-side code can map `ProjectAccent` → the OG component's `accent` prop.
 */

/** Sticker / OG short-form tone names — used by <StickerBadge> and OgImage. */
export type AccentTone = 'magenta' | 'yellow' | 'orange' | 'blue' | 'cream' | 'ink'

export interface AccentClassMap {
  /** `text-pop-magenta` — for headlines, drop caps, accent text. */
  text: string
  /** `bg-pop-magenta` — for solid-colour fills (e.g. issue stamp). */
  bg: string
  /** `border-pop-magenta` — paired with `text` on outline elements. */
  border: string
  /** `ring-pop-magenta` — for focus / active card states. */
  ring: string
  /** `hover:text-pop-magenta` — for inline text-link hovers. */
  hoverText: string
  /**
   * Pull-quote bg + readable fg pairing. Blue keeps `text-cream` for
   * legibility; magenta/yellow/orange flip to `text-ink`.
   */
  bgWithFg: string
  /** Sticker tone short form for `<StickerBadge :tone>`. */
  sticker: AccentTone
  /**
   * Cover-tint linear-gradient — full-bleed (used by ProjectHero).
   * Strong top tint that fades fully into ink at the bottom.
   */
  heroGradient: string
  /**
   * Cover-tint linear-gradient — card density (used by ProjectCard /
   * ProjectIndexCard). Lower top opacity so cover photo reads through.
   */
  cardGradient: string
  /** Short OG-image accent name. */
  og: 'magenta' | 'yellow' | 'orange' | 'blue'
}

/**
 * Lookup table — keyed by `ProjectAccent`. Every gradient string is the
 * exact literal previously inlined in the consuming component, so
 * extracting this changes zero rendered pixels.
 */
export const ACCENT_CLASSES: Record<ProjectAccent, AccentClassMap> = {
  'pop-orange': {
    text: 'text-pop-orange',
    bg: 'bg-pop-orange',
    border: 'border-pop-orange',
    ring: 'ring-pop-orange',
    hoverText: 'hover:text-pop-orange',
    bgWithFg: 'bg-pop-orange text-ink',
    sticker: 'orange',
    heroGradient: 'linear-gradient(180deg, rgba(255,108,47,0.85) 0%, rgba(13,12,10,1) 100%)',
    cardGradient: 'linear-gradient(180deg, rgba(255,108,47,0.7) 0%, rgba(13,12,10,0.95) 100%)',
    og: 'orange',
  },
  'pop-magenta': {
    text: 'text-pop-magenta',
    bg: 'bg-pop-magenta',
    border: 'border-pop-magenta',
    ring: 'ring-pop-magenta',
    hoverText: 'hover:text-pop-magenta',
    bgWithFg: 'bg-pop-magenta text-ink',
    sticker: 'magenta',
    heroGradient: 'linear-gradient(180deg, rgba(255,72,105,0.7) 0%, rgba(13,12,10,1) 100%)',
    cardGradient: 'linear-gradient(180deg, rgba(255,72,105,0.55) 0%, rgba(13,12,10,0.95) 100%)',
    og: 'magenta',
  },
  'pop-yellow': {
    text: 'text-pop-yellow',
    bg: 'bg-pop-yellow',
    border: 'border-pop-yellow',
    ring: 'ring-pop-yellow',
    hoverText: 'hover:text-pop-yellow',
    bgWithFg: 'bg-pop-yellow text-ink',
    sticker: 'yellow',
    heroGradient: 'linear-gradient(180deg, rgba(255,233,78,0.7) 0%, rgba(13,12,10,1) 100%)',
    cardGradient: 'linear-gradient(180deg, rgba(255,233,78,0.55) 0%, rgba(13,12,10,0.95) 100%)',
    og: 'yellow',
  },
  'pop-blue': {
    text: 'text-pop-blue',
    bg: 'bg-pop-blue',
    border: 'border-pop-blue',
    ring: 'ring-pop-blue',
    hoverText: 'hover:text-pop-blue',
    /** Blue is the only accent that keeps cream-on-blue for legibility. */
    bgWithFg: 'bg-pop-blue text-cream',
    /** Blue projects use the cream sticker tone (no `blue` sticker variant). */
    sticker: 'cream',
    heroGradient: 'linear-gradient(180deg, rgba(61,93,201,0.7) 0%, rgba(13,12,10,1) 100%)',
    cardGradient: 'linear-gradient(180deg, rgba(61,93,201,0.55) 0%, rgba(13,12,10,0.95) 100%)',
    og: 'blue',
  },
}

/**
 * Convenience accessor. Returns the full class map for a given accent.
 * Use this in plain `<script setup>` when you don't need reactivity.
 * For reactive callers (where `accent` lives in a ref/computed), reach
 * for `useAccentColor()` from `~/composables/useAccentColor.ts`.
 */
export function accentClasses(a: ProjectAccent): AccentClassMap {
  return ACCENT_CLASSES[a]
}
