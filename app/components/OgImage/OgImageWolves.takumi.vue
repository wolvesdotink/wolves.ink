<script setup lang="ts">
/**
 * Default share-card for wolves.ink — riso-print aesthetic.
 *
 * This component renders inside the Takumi runtime that
 * @nuxtjs/og-image uses to produce static PNG previews. That runtime
 * supports a strict subset of CSS (no Tailwind utilities, no @apply,
 * no CSS custom properties from main.css) — every style here lives
 * inline so it survives the renderer sandbox.
 *
 * Design rules of the card:
 *   1. ONE bold thing (the Anton wordmark) — let it own the frame.
 *   2. ONE atmospheric accent bloom — riso, not maximalist.
 *   3. THREE typographic lines — kicker, deck, baseline. No more.
 *
 * Props mirror the page metadata so per-page calls can override:
 *   defineOgImage('Wolves', { title, eyebrow, accent })
 */

interface Props {
  /** Big magazine masthead — typically the page title. */
  title?: string
  /** Small "kicker" line printed above the title. */
  eyebrow?: string
  /** Sub-deck under the title. */
  description?: string
  /** Riso accent colour. Maps to one of the four house pops. */
  accent?: 'magenta' | 'yellow' | 'orange' | 'blue'
  /** Footer slug — defaults to the studio handle. */
  handle?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Wolves',
  eyebrow: 'A note from the den',
  description: "Ideas are meaningless if you don't execute them.",
  accent: 'magenta',
  handle: 'wolves',
})

const accentHex = computed(() => {
  switch (props.accent) {
    case 'yellow': return '#ffe94e'
    case 'orange': return '#ff6c2f'
    case 'blue': return '#3d5dc9'
    case 'magenta':
    default: return '#ff4869'
  }
})

const ink = '#0d0c0a'
const cream = '#f1e9d8'
const muted = '#a89e88'
</script>

<template>
  <div
    :style="{
      width: '1200px',
      height: '630px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '88px 84px',
      fontFamily: 'Geist, system-ui, sans-serif',
      background: ink,
      color: cream,
      position: 'relative',
      overflow: 'hidden',
    }"
  >
    <!-- Single atmospheric riso bloom — pulled further off-canvas and
         softened so it reads as light, not as a graphic shape. -->
    <div
      :style="{
        position: 'absolute',
        right: '-300px',
        top: '-300px',
        width: '720px',
        height: '720px',
        borderRadius: '9999px',
        background: `radial-gradient(circle at 32% 32%, ${accentHex}, transparent 62%)`,
        opacity: '0.32',
      }"
    />

    <!-- Top kicker — just an accent dot + a single eyebrow line. No
         duplicated badge on the right; the dot carries the "live" cue. -->
    <div
      :style="{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        fontFamily: 'Geist Mono, ui-monospace, monospace',
        fontSize: '20px',
        letterSpacing: '0.24em',
        textTransform: 'uppercase',
        color: muted,
        zIndex: 1,
      }"
    >
      <span
        :style="{
          width: '14px',
          height: '14px',
          borderRadius: '9999px',
          background: accentHex,
        }"
      />
      <span>{{ eyebrow }}</span>
    </div>

    <!-- Centerpiece — wordmark + a single italic deck.
         The frame above and below intentionally reads as space, not
         chrome — that's where the boldness comes from. -->
    <div
      :style="{
        display: 'flex',
        flexDirection: 'column',
        gap: '28px',
        zIndex: 1,
      }"
    >
      <div
        :style="{
          fontFamily: 'Anton, sans-serif',
          fontSize:
            title.length > 36
              ? '96px'
              : title.length > 24
                ? '120px'
                : title.length > 12
                  ? '168px'
                  : '212px',
          lineHeight: '0.86',
          letterSpacing: '-0.025em',
          color: cream,
          textTransform: 'uppercase',
          display: 'flex',
          flexWrap: 'wrap',
          maxWidth: '1032px',
        }"
      >
        {{ title }}
      </div>
      <div
        :style="{
          fontFamily: 'Fraunces, Georgia, serif',
          fontStyle: 'italic',
          fontSize: '32px',
          lineHeight: '1.18',
          color: '#d8cdb8',
          maxWidth: '880px',
          display: 'flex',
        }"
      >
        {{ description }}
      </div>
    </div>

    <!-- Baseline — a single hairline rule with the studio motto on the
         left and the wordmark handle on the right. Replaces the old
         stacked footer + tilted "MADE LOUD" stamp. -->
    <div
      :style="{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontFamily: 'Geist Mono, ui-monospace, monospace',
        fontSize: '20px',
        letterSpacing: '0.24em',
        textTransform: 'uppercase',
        color: muted,
        zIndex: 1,
        borderTop: '1px solid rgba(241,233,216,0.16)',
        paddingTop: '28px',
      }"
    >
      <span>Live · loud · open</span>
      <span
        :style="{
          color: cream,
          letterSpacing: '0.12em',
        }"
      >
        {{ handle }}
      </span>
    </div>
  </div>
</template>
