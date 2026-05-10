export type ProjectAccent = 'pop-orange' | 'pop-magenta' | 'pop-yellow' | 'pop-blue'

export interface ProjectCover {
  /** Unsplash photo path/ID — swap for `/projects/<file>.jpg` once custom photography arrives. */
  src: string
  alt: string
  credit?: string
  /** Object position fine-tune for cover crops */
  position?: string
}

export interface Project {
  slug: string
  index: string // "01", "02", "03" — used as the spread number
  name: string
  domain: string
  tagline: string
  /** Short blurb shown in the guide section */
  blurb: string
  /** Drives homepage filtering — only featured projects show in the "pack of three". */
  featured: boolean
  /** Long-form description on the detail page (required for featured spreads). */
  description?: string[]
  status: { label: string; tone: 'live' | 'beta' | 'wip' }
  year: string
  type: string
  accent: ProjectAccent
  links: {
    live?: { href: string; label: string }
    github?: { href: string; label: string }
    download?: { href: string; label: string }
  }
  tech?: string[]
  /** Small, beloved details (required for featured spreads). */
  details?: { title: string; body: string }[]
  /** Pull-quote for the detail page (required for featured spreads). */
  pullQuote?: string
  cover: ProjectCover
  /** Decorative scribble on the detail spread (required for featured spreads). */
  vibeWord?: string
}

/**
 * Workbench entries.
 *
 * Featured projects (`featured: true`) appear on the homepage "pack of three"
 * and get a full magazine spread at `/projects/[slug]`. They require:
 *   description[], pullQuote, details[], vibeWord, tech[]
 *
 * Non-featured projects (`featured: false`) only appear on `/projects` (the
 * workbench). The minimum required fields are:
 *   slug, index, name, domain, tagline, blurb, featured, status, year, type,
 *   accent, links, cover
 *
 * Tip: when a non-featured project has no spread fields, the workbench card
 * links straight to `links.live` (or `links.github`).
 */
export const projects: Project[] = [
  {
    slug: 'owlat',
    index: '01',
    name: 'owlat.app',
    domain: 'owlat.app',
    tagline: 'Open-source email marketing, finally.',
    blurb:
      'An email marketing platform you can host, fork, theme and trust. Campaigns, automations, transactional and contacts — without the SaaS lock-in.',
    featured: true,
    description: [
      'Owlat is a full email marketing stack — campaign builder, automation flows, transactional API, contact management — released under a permissive license. The bet: marketing email deserves the same care, openness and craft we give to code editors and design tools.',
      'It works as a SaaS for teams who just want to send their newsletter, and as a self-hostable monorepo for teams who want to own every byte. The interface borrows from terminal-fluent tools: keyboard-first, dense when you want it, calm when you don\'t.',
    ],
    status: { label: 'Beta', tone: 'beta' },
    year: '2026',
    type: 'Open Source · Marketing Email',
    accent: 'pop-magenta',
    links: {
      live: { href: 'https://owlat.app', label: 'owlat.app' },
      github: { href: 'https://github.com/wolvesdotink/owlat', label: 'wolvesdotink/owlat' },
    },
    tech: ['Nuxt 4', 'Vue 3', 'Tailwind 4', 'Bun', 'Convex', 'BetterAuth', 'Postgres', 'Redis'],
    details: [
      {
        title: 'Campaigns + automations',
        body: 'A block-based email builder with multi-step automation flows. Trigger on signup, on tag, on a date — branch on opens, clicks or custom events. The drag-and-drop affordances stay out of the way of the keyboard.',
      },
      {
        title: 'Transactional API',
        body: 'A drop-in transactional endpoint with copy-paste code snippets in JavaScript and Java right inside the dashboard. Receipts, password resets and welcome mails without standing up a separate service.',
      },
      {
        title: 'Contacts you actually own',
        body: 'Self-hostable contact lists with org-level permissions via BetterAuth. Import, segment, tag and export — your audience is a CSV away from leaving with you.',
      },
      {
        title: 'Keyboard-first navigation',
        body: 'g + c for contacts, g + m for campaigns, g + t for transactional. n for new, s for save, ? for the full map. The mouse is welcome, but never required.',
      },
    ],
    pullQuote:
      "Marketing email got captured by ten companies and a billion dark patterns. We rebuilt it as a tool — open, hostable, and yours.",
    cover: {
      src: 'photo-1637793492728-0cb7af658e69',
      alt: 'A grey owl perched on a branch in a dark forest, soft woodland light',
      credit: 'Photo by Erik Karits on Unsplash',
      position: 'center center',
    },
    vibeWord: 'Send',
  },
  {
    slug: 'draw',
    index: '02',
    name: 'draw',
    domain: 'draw.wolves.ink',
    tagline: 'Excalidraw, local-first, yours.',
    blurb:
      'A native-feel desktop wrapper around Excalidraw. Files live on your machine as plain .excalidraw files. Continuous autosave, full offline support, signed for macOS.',
    featured: true,
    description: [
      'Draw is what happens when your favorite whiteboard tool stops asking you to log in. It wraps Excalidraw in a native shell, files on disk, with the kind of thoughtful chrome you usually only get in a paid app.',
      'It exists because diagrams are notes, and notes belong to you. The cloud is great until it isn\'t. With Draw, your sketches outlive any company.',
    ],
    status: { label: 'Beta', tone: 'beta' },
    year: '2026',
    type: 'Desktop · Local-first',
    accent: 'pop-yellow',
    links: {
      github: { href: 'https://github.com/wolvesdotink/draw', label: 'wolvesdotink/draw' },
      download: { href: 'https://github.com/wolvesdotink/draw/releases/latest/download/draw.dmg', label: 'Download for macOS' },
    },
    tech: ['Tauri 2', 'Rust', 'React 18', 'Vite', 'Excalidraw'],
    details: [
      {
        title: 'A folder is a project',
        body: 'Drawings live as plain .excalidraw files under ~/Library/Application Support/ink.wolves.draw/drawings. The sidebar mirrors the folder tree; rename, move and nest from inside the app.',
      },
      {
        title: 'Continuous autosave',
        body: 'Every change is debounced to disk in 500ms. Atomic writes via a .tmp companion file — pull the plug mid-stroke and the file you had a second ago is the file you reopen.',
      },
      {
        title: 'In-app auto-updater',
        body: 'Signed, notarized macOS builds via GitHub Actions, with a Tauri minisign updater that checks 4 seconds after launch. The app never auto-restarts; you click RESTART when you\'re ready.',
      },
      {
        title: 'Get out of the way',
        body: 'Cmd + \\ collapses the sidebar so the canvas takes the whole screen. Native title-bar overlay, no extraneous chrome — the cursor is the only thing left.',
      },
    ],
    pullQuote:
      "Whiteboards should outlive trends. Yours should outlive ours.",
    cover: {
      src: 'photo-1455390582262-044cdead277a',
      alt: 'A hand sketching with a black marker on grid paper',
      credit: 'Photo on Unsplash',
      position: 'center center',
    },
    vibeWord: 'Sketch',
  },
  {
    slug: 'magpie',
    index: '03',
    name: 'magpie',
    domain: 'magpie',
    tagline: 'Dictation that keeps quiet about it.',
    blurb:
      'A small Tauri tray app that turns your voice into clean text without leaving your machine. Whisper for the listening, a tiny LLM for the polish, a global Fn-key for the cue.',
    featured: true,
    description: [
      'Magpie listens. It lives in your menu bar, holds a Fn key, and turns whatever you said into text wherever the cursor happens to be. Whisper handles the transcription, a small local LLM cleans up the false starts and the missing commas, and the result lands in your clipboard before the same sentence would have finished typing.',
      'It exists because dictation is too intimate to rent. The audio never leaves the laptop, the models live next to your apps, and the only thing on the network is your decision not to put one there. A magpie collects shiny things; this one collects sentences.',
    ],
    status: { label: 'Beta', tone: 'beta' },
    year: '2026',
    type: 'Desktop · Voice',
    accent: 'pop-orange',
    links: {
      github: { href: 'https://github.com/wolvesdotink/magpie', label: 'wolvesdotink/magpie' },
      download: { href: 'https://github.com/wolvesdotink/magpie/releases/latest/download/magpie.dmg', label: 'Download for macOS' },
    },
    tech: ['Tauri 2', 'Rust', 'Vue 3', 'Tailwind 4', 'Bun', 'whisper-rs', 'llama.cpp', 'CPAL'],
    details: [
      {
        title: 'Hold a key, get a sentence',
        body: 'Hold Fn anywhere on macOS — in a doc, a Slack thread, a terminal — and start talking. Release to transcribe. The result lands in your clipboard or directly under the cursor; the menu-bar icon glows while the model is listening so you always know who is awake.',
      },
      {
        title: 'Whisper, on your machine',
        body: 'Speech recognition runs locally via whisper-rs. Pick a model size at setup — small for instant turnaround, medium when accuracy matters more than seconds. The audio is decoded, transcribed and discarded; nothing is uploaded, nothing is logged.',
      },
      {
        title: 'A small LLM, after the fact',
        body: 'A llama.cpp pass turns the verbatim transcript into a real sentence — drops the false starts, inserts the punctuation, restores the brand names Whisper would have mangled. Small enough to ship in the bundle, fast enough to finish before the clipboard hits the screen.',
      },
      {
        title: 'Tray, overlay, settings — out of the way',
        body: 'A 320×480 popover for history and quick settings, a 160×44 overlay that floats while you talk, and a settings window for permissions and model picks. Open the one you need; the rest stay hidden until you call them.',
      },
    ],
    pullQuote:
      "Dictation is too intimate to rent. We kept the model on the laptop and the magpie in the menu bar.",
    cover: {
      src: 'photo-1640610033950-a1351ebab311',
      alt: 'A black-and-white magpie perched on a branch in soft green light',
      credit: 'Photo on Unsplash',
      position: 'center 18%',
    },
    vibeWord: 'Speak',
  },
  {
    slug: 'fuji',
    index: '04',
    name: 'fuji',
    domain: 'fuji-culler',
    tagline: 'A quieter way to cull a shoot.',
    blurb:
      'A small Tauri app for the post-shoot ritual — plug in a camera, browse the card, star the keepers, send them to a library folder. Native RAF previews, CLIP-powered search, keyboard-first.',
    featured: false,
    description: [
      'Fuji exists for the half-hour between the last frame and the first edit. The card is in your hand, the laptop is open, and the next step is supposed to be Lightroom — except Lightroom wants a catalog, a subscription, and an opinion about your folder structure. Fuji wants none of those things. It wants you to rate, compare, and move on.',
      'It started as a Saturday tool for triaging Fujifilm RAF files without booting the whole Adobe stack. It grew a small CLIP model so you can search "kid laughing in golden light" instead of scrolling. It stays small on purpose — your library is a folder on disk, your ratings live next to your photos, and the app gets out of the way the moment you have your set.',
    ],
    status: { label: 'Beta', tone: 'beta' },
    year: '2026',
    type: 'Desktop · Photography',
    accent: 'pop-blue',
    links: {
      github: { href: 'https://github.com/wolvesdotink/fuji', label: 'wolvesdotink/fuji' },
      download: { href: 'https://github.com/wolvesdotink/fuji/releases/latest/download/fuji.dmg', label: 'Download for macOS' },
    },
    tech: ['Tauri 2', 'Rust', 'Vue 3', 'Pinia', 'Tailwind 4', 'ONNX Runtime', 'CLIP', 'rayon'],
    details: [
      {
        title: 'Native RAF previews',
        body: 'Fujifilm RAW files decoded in Rust without a round-trip through Lightroom or RawTherapee. Thumbnails render on rayon-pooled workers so the card looks like a card in seconds — the first row is browsable while the rest are still painting in.',
      },
      {
        title: 'Search by vibe, not by filename',
        body: 'A CLIP model embedded into the app via ONNX Runtime. Type "rain on the windshield" or "the dog mid-jump" and the keepers float up. Embeddings live in the library folder — computed once, queried locally, no upload, no cloud round-trip.',
      },
      {
        title: 'A keyboard for the cull',
        body: '1–5 to rate, 0 to clear. Space jumps to the next unreviewed frame so you never lose your place. M marks a candidate, C opens side-by-side compare, G toggles grid and single. The mouse is welcome but the rhythm is keys.',
      },
      {
        title: 'Card in, prompt out, library stays put',
        body: 'A Rust PTP bridge watches for camera mounts. When a card shows up a non-blocking prompt floats over the library asking what to do — say no and the library keeps reading, say yes and the import progress drops in without ever taking the screen.',
      },
    ],
    pullQuote:
      "The half-hour between the last frame and the first edit deserves its own tool — small, local, fast.",
    cover: {
      src: 'photo-1777019051200-b8281581c426',
      alt: 'A photographer\'s desk with film strips on a light table, lenses, and a monitor showing a culling grid of thumbnails',
      credit: 'Photo on Unsplash',
      position: 'center center',
    },
    vibeWord: 'Cull',
  },
  {
    slug: 'wolves-ink',
    index: '05',
    name: 'wolves.ink',
    domain: 'wolves.ink',
    tagline: 'The studio site, source open.',
    blurb:
      'The very page you\'re reading. A riso-print Nuxt site with every component, easter egg and fixated detail under MIT — clone it, fork it, file it under "we shipped the website too."',
    featured: false,
    description: [
      'wolves.ink is the studio\'s own front door, and we open-sourced it for the same reason we open-sourced the tools that live behind it: closed code is a debt to the future. Every halftone orb, every wobble timing, every easter egg lives in the same repo, in plain Nuxt + Vue + Tailwind, with the messy commits to prove which idea came first.',
      'It\'s also a teaching surface. The site is a working magazine — layered SSR with view transitions, a riso-themed accent system, lazy-hydrated playthings, OG image generation, and a collection of small interactions (the camera strap, the radio dial, the paw trail) wired so you can crack them open and steal the shape. Read the source the way you\'d read a fanzine: a spread at a time.',
    ],
    status: { label: 'Live', tone: 'live' },
    year: '2026 →',
    type: 'Studio Site · Open source',
    accent: 'pop-magenta',
    links: {
      live: { href: 'https://wolves.ink', label: 'wolves.ink' },
      github: { href: 'https://github.com/wolvesdotink/wolves.ink', label: 'wolvesdotink/wolves.ink' },
    },
    tech: ['Nuxt 4', 'Vue 3', 'Tailwind 4', 'Nuxt Image', 'Satori', 'Motion', 'TypeScript'],
    details: [
      {
        title: 'A magazine that compiles',
        body: 'Every page is a spread. Mastheads, pull quotes, marquee bands, sticker badges — each lives as a real component you can read, fork or rip out. The riso treatment is a CSS layer, not an image; the halftone is computed live, the grain is generated, the parallax orbs are pure DOM.',
      },
      {
        title: 'Easter eggs as code samples',
        body: 'The radio dial, the camera strap, the paw cursor — they\'re not decoration. They\'re small lessons in pointer events, lazy hydration and rAF discipline, written so the dev-tools-first reader gets the same magazine as the scroller.',
      },
      {
        title: 'One accent system, end-to-end',
        body: 'A single useAccentColor() composable feeds project cards, pull quotes, OG image generation, hero gradients and sticker tones. Pick one accent on a project and it fans out everywhere — including the share image. One source of truth, four vibes, zero drift.',
      },
      {
        title: 'Open by default, on principle',
        body: 'MIT license, no analytics tied to the studio, no sign-up walls, no funnel. Fork it, swap the wordmark, rename a couple of files and you\'ve got a magazine of your own. We\'d like that.',
      },
    ],
    pullQuote:
      "Closed code is a debt to the future. Even our own front door pays it forward.",
    cover: {
      src: 'photo-1644942888834-97e142f5f9ee',
      alt: 'A wolf in profile through warm autumn forest light',
      credit: 'Photo on Unsplash',
      position: 'center center',
    },
    vibeWord: 'Read',
  },
  {
    slug: 'hinterland',
    index: '06',
    name: 'hinterland.camp',
    domain: 'hinterland.camp',
    tagline: 'The great outdoors made bookable.',
    blurb:
      'A booking platform for sites, stays and cabins that earn the word "wild." Built for people who plan trips like they pack a backpack — light, deliberate, with the right tools.',
    featured: false,
    description: [
      'Hinterland is a love letter to the outdoors with a checkout flow attached. It connects independent hosts of cabins, treehouses, fire-towers and pitch-your-tent meadows to the people who would rather sleep under stars than under chandeliers.',
      'Hinterland was built to connect people with nature and make the close surroundings fun to explore. It keeps fees low, surfaces real photos in real weather, and treats availability like a serious calendar — not a marketing surface.',
    ],
    status: { label: 'Live', tone: 'live' },
    year: '2020 →',
    type: 'Marketplace',
    accent: 'pop-orange',
    links: {
      live: { href: 'https://hinterland.camp', label: 'hinterland.camp' },
    },
    tech: ['Nuxt 4', 'Tailwind', 'Pinia', 'Java', 'Spring Boot', 'Postgres', 'Stripe', 'Mapbox'],
    details: [
      {
        title: 'Catalogue at scale',
        body: '3,000+ private camps and cabins across Germany, Denmark, Sweden, Italy and Austria. Filterable by what actually matters on the ground — water access, dogs welcome, vineyard locations, off-grid pitches.',
      },
      {
        title: 'Road Trip Planner',
        body: 'Drop in a route and get the most beautiful camps and cabins along the way. Pre-built itineraries for Italian road trips and Swedish camping expeditions live alongside your own.',
      },
      {
        title: 'Instant book or request',
        body: 'Hosts choose between instant-book and booking-request flows; reservations live under "My trips" for both sides of the marketplace, so the conversation has a calendar attached.',
      },
      {
        title: 'Native apps for the trail',
        body: 'iOS and Android companions, so the marketplace fits in a pocket once you\'re on the road and the laptop is back home.',
      },
    ],
    pullQuote:
      "Most travel apps want you online. We want you outside, and we want our app to get out of the way the moment you've booked.",
    cover: {
      src: 'photo-1496545672447-f699b503d270',
      alt: 'A small canvas tent glowing warmly in a dark forest at dusk',
      credit: 'Photo by Scott Goodwill on Unsplash',
      position: 'center 60%',
    },
    vibeWord: 'Outside',
  },
]

/** A separate hero image for the giant-letter cut-out on the home page. */
export const heroCutout: ProjectCover = {
  src: 'photo-1474511320723-9a56873867b5',
  alt: 'A wolf in moody side-light against a forest',
  credit: 'Photo on Unsplash',
}
