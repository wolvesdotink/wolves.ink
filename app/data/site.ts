export const site = {
  name: 'Wolves',
  /** Header wordmark — the studio is "Wolves." The .ink is just our address. */
  wordmark: 'Wolves',
  short: 'WOLVES',
  domain: 'wolves.ink',
  manifesto: "Ideas are meaningless if you don't execute them.",
  quotes: {
    marquee: 'Less talking. More shipping.',
    bigBlock: {
      pre: "We don't pitch",
      highlightA: 'decks.',
      mid: 'We push',
      highlightB: 'commits.',
    },
    footer: 'Made loud, made open, made for the curious.',
  },
  positioning: 'UX-driven applications. Mostly open source. Where learning meets teaching.',
  tagline: 'A small studio. A loud voice. A pack of three projects.',
  founder: 'Marcel',
  year: new Date().getFullYear(),
  /**
   * Hidden transmissions revealed by the radio dial easter egg at the
   * bottom of the homepage. One line is selected per UTC day (the same
   * hash that picks the daily frequency).
   */
  transmissions: [
    'The pack is listening.',
    'Ship loud. Howl louder.',
    'You found us. Welcome to the den.',
    'Curiosity is a frequency. You tuned in.',
  ],
  /**
   * Daily field shots served by `FieldPolaroid.vue` (the visual sibling
   * to the radio at the bottom of the homepage). One entry is selected
   * per UTC day via `useTodaysShot()` using the same FNV-1a fingerprint
   * pattern as `useTodaysFrequency()`, so the array can stay short and
   * still cycle naturally — adding one image extends the pool without
   * a calendar reshuffle.
   *
   * Files live under `public/shots/` so they're served as static assets
   * (matches how favicon/robots are handled). The filename convention
   * is YYYY-MM-DD or any-stable-slug — the hash decides which gets
   * printed today, not the filename. The seeded files are SVG riso
   * silhouettes; swap to .jpg by editing both the path and dropping
   * the new file alongside the SVG.
   *
   * Each entry:
   *   - image    → path served from /shots/.
   *   - caption  → one line printed below the photo on the front.
   *   - location → small location stamp on the back of the print.
   *   - backNote → the hidden payoff: a handwritten field note revealed
   *                when the print is flipped (mirrors the radio's
   *                lock-line transmission).
   */
  shots: [
    {
      image: '/shots/workbench-2am.svg',
      caption: 'workbench, 2am',
      location: 'Berlin, late',
      backNote: 'first time the riso bloomed right.',
    },
    {
      image: '/shots/stream-still.svg',
      caption: 'stream still — pre-roll',
      location: 'Twitch booth',
      backNote: 'chat asked if the wolves were real. answered yes.',
    },
    {
      image: '/shots/sketchbook-spread.svg',
      caption: 'sketchbook spread',
      location: 'kitchen table',
      backNote: 'the idea was good before it was named.',
    },
    {
      image: '/shots/moodboard-scrap.svg',
      caption: 'moodboard scrap',
      location: 'studio wall',
      backNote: 'ripped from a magazine in 2009. still earns its tape.',
    },
    {
      image: '/shots/halftone-test.svg',
      caption: 'halftone test print',
      location: 'press, drying rack',
      backNote: 'magenta hit the paper before yellow. happy accident.',
    },
    {
      image: '/shots/cable-knot.svg',
      caption: 'cable knot, untangled',
      location: 'under the desk',
      backNote: 'every project starts as one of these.',
    },
    {
      image: '/shots/coffee-rings.svg',
      caption: 'three coffees, one decision',
      location: 'café across the street',
      backNote: 'we shipped the smaller version. we always do.',
    },
    {
      image: '/shots/late-light.svg',
      caption: 'late light through blinds',
      location: 'home office',
      backNote: 'the hour the work gets honest.',
    },
    {
      image: '/shots/pinned-note.svg',
      caption: 'pinned note — house rules',
      location: 'corkboard',
      backNote: 'less talking. more shipping.',
    },
    {
      image: '/shots/keyboard-worn.svg',
      caption: 'a keyboard, well-loved',
      location: 'main rig',
      backNote: 'the E key is shaped like the work.',
    },
    {
      image: '/shots/window-rain.svg',
      caption: 'rain on the window',
      location: 'second-floor walkup',
      backNote: 'wrote the manifesto on a day like this.',
    },
    {
      image: '/shots/print-stack.svg',
      caption: 'a stack of test prints',
      location: 'on the floor',
      backNote: 'most of these never leave the room. a few of them do.',
    },
  ],
  /**
   * Back-of-print pools used by `FieldPolaroid.vue`. Each pressed print
   * picks one note at capture time and stores it on the print, so
   * flipping the same print twice always shows the same line — the
   * variation lives across the stack, not within a single artifact.
   *
   * Two pools so cam captures and curated prints feel different in
   * voice:
   *   - `camBackNotes`  → fun lines aimed at the visitor staring at
   *                       their own selfie. Conspiratorial, studio-
   *                       irreverent, occasionally encouraging.
   *   - `studioBackNotes` → "field journal" lines about the work,
   *                         mixed in alongside the daily curated
   *                         note (which still gets its turn via the
   *                         per-shot `backNote` field above).
   *
   * Tone target: the rest of the wolves.ink voice — confident, a
   * little weird, ship-flavored. If a line wouldn't earn a smirk
   * from a sleep-deprived ICs at 2am, it doesn't belong here.
   */
  camBackNotes: [
    'you, in the lens, mid-thought.',
    'the wolves saw you. they approve.',
    'this is the face of someone with twelve tabs open.',
    'shipping looks good on you.',
    'the riso bloomed. so did you.',
    'tag yourself: tab-monster, ship-howler, ghost-of-deploys-past.',
    'the algorithm didn\'t pick this one. the wolves did.',
    'your face is now in the den\'s archive. our condolences.',
    'field note: you exist. confirmed.',
    'the only filter we trust is ink-on-paper.',
    'you found the shutter. now go ship something.',
    'snapshot of a person mid-build.',
    'if you were a commit message, this would be the merge.',
    'good light. good angle. suspiciously good crew.',
    'this print outlives the deploy.',
    'look at you, executing on something.',
    'the lens is impressed. it doesn\'t say that often.',
    'exhibit A in your case for a longer lunch.',
    'you, but riso. an upgrade.',
    'captured, filed. the pack remembers.',
    'you blinked. we kept it anyway.',
    'this is the face that ships.',
    'the camera saw what we saw. nice.',
    'somewhere, a side project just got slightly more likely.',
  ],
  studioBackNotes: [
    'first time the riso bloomed right.',
    'the idea was good before it was named.',
    'every project starts as a tangle.',
    'less talking. more shipping.',
    'we wrote the manifesto on a day like this.',
    'the work gets honest at this hour.',
    'the E key is shaped like the work.',
    'magenta hit the paper before yellow. happy accident.',
    'we shipped the smaller version. we always do.',
    'kept the bug. it became a feature.',
    'the deploy went out at 3am and the team cheered at 3:01.',
    'executive note: ideas are cheap. receipts aren\'t.',
    'the late light is doing most of the design.',
    'if you can ship the source, you do.',
    'this is what "focus mode" actually looks like.',
    'the workshop hum is the metronome.',
    'stay curious. ship anyway. howl twice.',
    'we name our pull requests after weather patterns.',
    'the wolves work in pairs. we work in packs.',
    'bug triage is just storytelling with worse pacing.',
    'the brief said "simple". we believed it for an hour.',
    'every print is one of these.',
    'the press is hot. the coffee is hotter.',
    'open by default.',
  ],
  socials: {
    github: 'https://github.com/wolvesdotink',
    twitch: 'https://twitch.tv/wolvesdotink',
  },
  /**
   * Primary header navigation.
   *
   * `href` rules:
   *  - Absolute paths (`/projects`, `/field-notes`) work from anywhere.
   *  - Anchor links use `/#hash` form so they jump to the home section
   *    even when the user is on `/projects` or `/field-notes`.
   *
   * "Open Source" and "Live" were intentionally removed — the GitHub and
   * Twitch icons in the social cluster on the right cover those routes.
   * "Work" was removed because it pointed at the same surface as
   * "Workbench" — the homepage `#work` section is just a teaser for the
   * full `/projects` index, so we kept the canonical destination.
   */
  nav: [
    { label: 'Workbench', href: '/projects' },
    { label: 'Field Notes', href: '/field-notes' },
    { label: 'Manifesto', href: '/#manifesto' },
  ],
} as const

export type Site = typeof site
