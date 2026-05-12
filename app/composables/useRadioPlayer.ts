/**
 * useRadioPlayer — singleton state + audio handle for the pack radio.
 *
 * The big `RadioDial` lives only on the homepage, but we want the music
 * to keep playing once the visitor has tuned in — even after they
 * navigate to `/projects`, `/projects/[slug]`, etc. To pull that off,
 * the actual `<audio>` element, the `AudioContext` for the static SFX,
 * and the reactive state (tuning position, lock state, now-playing
 * track) all live at module scope here. Components subscribe via this
 * composable instead of holding state themselves.
 *
 * Two consumers:
 *  - `RadioDial.vue` (homepage easter egg) — reads + writes everything.
 *  - `MiniRadio.vue` (mounted in `layouts/default.vue`) — reads
 *    everything, controls only mute/play, never tunes. Renders only
 *    while currently locked to today's MHz and the big dial is
 *    off-screen.
 *
 * SSR-safe: refs are created with `useState` so each request gets its
 * own snapshot, and the audio element / `AudioContext` are only ever
 * touched inside `typeof window !== 'undefined'` guards.
 */

import { site } from '~/data/site'

// ── FM-band geometry. Mirrors the constants the dial used inline so a
// future change here flows to both surfaces.
export const MIN_TENTHS = 880 // 88.0 MHz
export const MAX_TENTHS = 1080 // 108.0 MHz
export const STEP_TENTHS = 1 // 0.1 MHz

// SomaFM "Groove Salad" — same downtempo/electronic feed the inline
// dial used. Free, CORS-enabled, no license required.
const STREAM_URL = 'https://ice1.somafm.com/groovesalad-128-mp3'
const NOW_PLAYING_URL = 'https://somafm.com/songs/groovesalad.json'

interface SomaFMSong { title?: string, artist?: string, album?: string }
interface NowPlaying { artist: string, title: string }

// ── Module-scope singletons. Held outside Vue's reactive system so
// they survive component unmount during page navigation. The reactive
// refs that mirror their state use `useState` so they're created once
// per Nuxt request and shared across composable invocations.
let audioEl: HTMLAudioElement | null = null
let audioCtx: AudioContext | null = null
let noiseBuffer: AudioBuffer | null = null
let nowPlayingTimer: ReturnType<typeof setInterval> | null = null
let lastStaticAt = 0
let watchersBound = false

/**
 * Composable. Returns the same refs and methods on every call — pure
 * fan-out over module-scoped state. Calling it from multiple
 * components is fine and intentional.
 */
export function useRadioPlayer() {
  const { tenths: todaysTenths } = useTodaysFrequency()

  // ── Reactive state via useState so SSR keeps requests isolated and
  // composable callers all see the same instance during a single page
  // session.
  const tenths = useState<number>('radio:tenths', () => MIN_TENTHS)
  const isPlaying = useState<boolean>('radio:isPlaying', () => false)
  const audioMuted = useState<boolean>('radio:muted', () => false)
  const nowPlaying = useState<NowPlaying | null>('radio:nowPlaying', () => null)
  // Set by the big dial via `setDialInView` while it's mounted +
  // visible in the viewport. Mini radio uses the inverse to decide
  // whether to show.
  const dialInView = useState<boolean>('radio:dialInView', () => false)

  // ── Derived values
  const mhz = computed(() => tenths.value / 10)
  const mhzLabel = computed(() => mhz.value.toFixed(1))
  const distanceTenths = computed(() => Math.abs(tenths.value - todaysTenths.value))
  // Locked when within 0.05 MHz — only an exact 0.1-MHz-step match
  // qualifies, since steps are integers in tenths.
  const locked = computed(() => distanceTenths.value < 0.5)
  const transmission = computed(() => {
    const lines = site.transmissions
    return lines[todaysTenths.value % lines.length] ?? ''
  })

  // ── Audio stream lifecycle ───────────────────────────────────────────
  function ensureAudio(): HTMLAudioElement | null {
    if (audioEl) return audioEl
    if (typeof window === 'undefined') return null
    const a = new Audio()
    a.src = STREAM_URL
    a.crossOrigin = 'anonymous'
    a.preload = 'none'
    // Modest default volume so a sudden lock doesn't blast the user.
    a.volume = 0.55
    a.muted = audioMuted.value
    a.addEventListener('play', () => { isPlaying.value = true })
    a.addEventListener('pause', () => { isPlaying.value = false })
    a.addEventListener('error', () => { isPlaying.value = false })
    audioEl = a
    return a
  }

  async function playStream() {
    const a = ensureAudio()
    if (!a) return
    try { await a.play() }
    catch {
      // Autoplay rejected (user-gesture activation expired between the
      // input event and this call). Silent failure — visual lock state
      // still works.
    }
  }
  function pauseStream() {
    if (audioEl && !audioEl.paused) audioEl.pause()
  }
  function syncAudioWithLock() {
    if (locked.value) playStream()
    else pauseStream()
  }
  function toggleMute() {
    audioMuted.value = !audioMuted.value
    if (audioEl) audioEl.muted = audioMuted.value
  }

  // ── Tuning ───────────────────────────────────────────────────────────
  function clampTenths(t: number) {
    return Math.max(MIN_TENTHS, Math.min(MAX_TENTHS, t))
  }
  function setTenths(t: number) {
    const next = clampTenths(Math.round(t))
    const changed = next !== tenths.value
    tenths.value = next
    // setTenths is called from user-gesture handlers (drag, click,
    // key, knob), so we ride that gesture activation to start the
    // stream and unlock the AudioContext for static SFX. Browser
    // autoplay policies require play() / new AudioContext() to happen
    // inside a user gesture; doing it here means we never need a
    // separate "enable sound" button.
    syncAudioWithLock()
    // Crackle a tick of static on every actual frequency step.
    // Skipped if the value didn't change (e.g. clamped at the band
    // edges) so we don't keep crackling when the user holds an arrow
    // key past 108.0 MHz.
    if (changed) playStaticBurst()
  }
  function nudge(delta: number) {
    setTenths(tenths.value + delta)
  }

  // ── Now-playing — polls SomaFM's metadata endpoint while the stream
  // is on, replacing the cabinet's brand stamp with the current
  // artist + title. Tracks change every ~3–5 minutes, so 30s polling
  // keeps the display fresh without hammering the API. Held in a
  // module-scoped timer so the polling loop doesn't get duplicated
  // across composable invocations.
  async function fetchNowPlaying() {
    try {
      const res = await fetch(NOW_PLAYING_URL, { cache: 'no-cache' })
      if (!res.ok) return
      const data: { songs?: SomaFMSong[] } = await res.json()
      const current = data.songs?.[0]
      const artist = (current?.artist ?? '').trim()
      const title = (current?.title ?? '').trim()
      if (!artist && !title) return
      nowPlaying.value = { artist: artist || 'Unknown', title: title || 'Unknown' }
    }
    catch {
      // Silent — the cabinet falls back to its static brand label.
    }
  }
  function clearNowPlaying() {
    if (nowPlayingTimer) {
      clearInterval(nowPlayingTimer)
      nowPlayingTimer = null
    }
    nowPlaying.value = null
  }

  // ── Static SFX — synthesized noise bursts on each frequency step.
  // Bandpass-filtered so it sounds like inter-station hiss rather
  // than pure white noise. Volume + filter pitch shift with distance
  // from today's MHz, so as the user approaches lock the static
  // naturally quiets and tightens — exactly like a real radio
  // finding the carrier.
  function ensureAudioCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (audioCtx) {
      // Some browsers (Safari, mobile Chrome) start the context
      // suspended and require an explicit resume() inside a user
      // gesture.
      if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {})
      return audioCtx
    }
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return null
    audioCtx = new Ctx()
    // Pre-generate 1s of white noise once — every burst plays a
    // random slice of the same buffer to avoid per-burst allocations
    // during fast drags.
    const buf = audioCtx.createBuffer(1, audioCtx.sampleRate, audioCtx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    noiseBuffer = buf
    return audioCtx
  }
  function playStaticBurst() {
    // No static at lock — that's the moment the music takes over.
    if (locked.value) return
    // Brand-strip mute kills all sound (stream + static), one toggle.
    if (audioMuted.value) return
    // Throttle so a fast drag doesn't queue dozens of overlapping bursts.
    const now = performance.now()
    if (now - lastStaticAt < 35) return
    lastStaticAt = now

    const ctx = ensureAudioCtx()
    if (!ctx || !noiseBuffer) return

    // Distance-scaled gain — far from lock = louder, closer = quieter.
    const dist = Math.min(1, distanceTenths.value / 50)
    const peakGain = 0.03 + dist * 0.09 // 0.03..0.12

    // Bandpass center shifts with distance: far = low rumble/hiss,
    // near lock = higher whistle/squeal. Adds a subtle psychoacoustic
    // cue that you're approaching the carrier.
    const filterFreq = 1200 + (1 - dist) * 1800 + Math.random() * 600

    const src = ctx.createBufferSource()
    src.buffer = noiseBuffer
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = filterFreq
    filter.Q.value = 0.7
    const gain = ctx.createGain()
    const t = ctx.currentTime
    // Quick attack, short exponential decay — sounds like a "ksh"
    // rather than a sustained shhhh.
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(peakGain, t + 0.005)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.10)
    src.connect(filter); filter.connect(gain); gain.connect(ctx.destination)
    const offset = Math.random() * (noiseBuffer.duration - 0.12)
    src.start(t, offset, 0.11)
    src.stop(t + 0.12)
  }

  // ── Big-dial visibility registration ────────────────────────────────
  // The mini radio hides while the big radio is on screen. The dial
  // calls this from its IntersectionObserver in `RadioDial.vue`.
  function setDialInView(value: boolean) {
    dialInView.value = value
  }

  // ── One-time watcher binding. `useState` returns the same ref on
  // every call, but Vue's `watch` would stack listeners if we wired
  // them up unconditionally — bind once, the first time the
  // composable runs in the browser.
  if (typeof window !== 'undefined' && !watchersBound) {
    watchersBound = true

    // Now-playing fetch only while the stream is on. Tracks rotate
    // every few minutes; 30s polling is a comfortable budget.
    watch(isPlaying, (playing) => {
      if (playing) {
        fetchNowPlaying()
        if (nowPlayingTimer) clearInterval(nowPlayingTimer)
        nowPlayingTimer = setInterval(fetchNowPlaying, 30_000)
      }
      else {
        clearNowPlaying()
      }
    })
  }

  return {
    // constants
    MIN_TENTHS,
    MAX_TENTHS,
    STEP_TENTHS,
    // raw state refs
    tenths,
    isPlaying,
    audioMuted,
    nowPlaying,
    dialInView,
    // derived
    mhz,
    mhzLabel,
    distanceTenths,
    locked,
    transmission,
    // methods
    setTenths,
    nudge,
    toggleMute,
    syncAudioWithLock,
    playStream,
    pauseStream,
    playStaticBurst,
    setDialInView,
  }
}
