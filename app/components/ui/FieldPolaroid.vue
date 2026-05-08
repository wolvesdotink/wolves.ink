<script setup lang="ts">
/**
 * FieldPolaroid — pulled-from-the-strap field camera, no longer a
 * dedicated homepage section. The visible-at-rest surface is a
 * leather camera strap dangling from the top-right corner of the
 * viewport; tugging the strap deploys a modal-style overlay with the
 * camera, the live-cam viewfinder, and the print stack.
 *
 * Sibling design — the radio dial sits in its own section because
 * tuning needs the long horizontal scrubber. The polaroid earns a
 * different home: a discoverable affordance (the strap) rather than
 * scroll-required real estate, with the camera deploying as a
 * lightweight modal so the tactile "pull it out of the bag" feel
 * matches the metaphor.
 *
 * Capture pipeline (the new bit):
 *   - First shutter press requests `getUserMedia` via `useFieldCam`.
 *   - Once granted, the lens shows a live mirrored video preview.
 *   - Subsequent presses sample a frame, run it through a
 *     canvas-based riso filter (CMY misregistration + halftone +
 *     grain + vignette — see `useFieldCam.ts:applyRisoFilter`), and
 *     emit a data-URL the print's photo layer renders.
 *   - If permission is denied, unavailable, or errors, we fall back
 *     to today's curated shot from `useTodaysShot()` — the user
 *     still gets a print, just one of the daily set instead of a
 *     selfie. The flip side (field note + location) is unchanged
 *     between the two paths so the artifact reads identically.
 *
 * Lifecycle care (critical):
 *   - `useFieldCam.stop()` runs whenever the polaroid retracts. This
 *     turns off the browser's camera-in-use indicator. Leaving it
 *     on after retract would (rightly) destroy trust.
 *   - The stream also stops on component unmount as a belt-and-
 *     suspenders defense, via the composable's own `onBeforeUnmount`.
 *
 * Inherited patterns:
 *   - Web Audio shutter SFX uses the same fail-silent + pre-
 *     allocated noise-buffer pattern as `playStaticBurst` in
 *     `useRadioPlayer.ts:209`.
 *   - Develop sequence / 3D flip / stack offsets are unchanged from
 *     the previous iteration — the visual artifact is the same, the
 *     surrounding chrome is what shifted.
 *   - Reduced-motion guard mirrors `RadioDial.vue:189`.
 */

import { site } from '~/data/site'
import { useTodaysShot } from '~/composables/useTodaysShot'
import { useFieldCam } from '~/composables/useFieldCam'

const { shot, dateKey, printLabel } = useTodaysShot()
// Destructured so the template can bind `ref="videoEl"` directly and
// reference the status as `camStatus` rather than `cam.status` (Vue
// auto-unwraps top-level refs in templates; properties of a plain
// object aren't auto-unwrapped, which would force `.value` litter
// throughout the markup).
const {
  status: camStatus,
  videoEl,
  videoDevices,
  selectedDeviceId,
  start: startCam,
  stop: stopCam,
  capture: captureCam,
  switchCamera,
} = useFieldCam()

// Friendly label for the device picker. Browsers usually return
// "FaceTime HD Camera (06CB:00BD)" or "Logitech BRIO (046d:085e)" —
// the parenthesised vendor/product IDs are noise in a 0.55rem chrome
// strip, so we strip them. iOS / Android typically return clean
// strings like "Front Camera" / "Back Camera" already, no-op for them.
function deviceLabel(d: MediaDeviceInfo, idx: number): string {
  const trimmed = (d.label ?? '').replace(/\s*\([^)]*\)\s*$/, '').trim()
  return trimmed || `Camera ${idx + 1}`
}

// Picker change handler — we re-acquire the stream against the new
// device. `switchCamera` handles the stop/start dance internally.
async function onCameraSelect(e: Event) {
  const target = e.target as HTMLSelectElement | null
  const id = target?.value
  if (!id) return
  await switchCamera(id)
}

// ── Tunables ───────────────────────────────────────────────────────────
const MAX_STACK = 5
const DEVELOP_MS = 1500
const EJECT_MS = 850

// ── Print model. Each press now stores the image source the print
// should display: a `data:` URL when the cam captured a frame, or
// the curated shot's path when we fell back. The `source` flag lets
// the back-of-print copy adapt; `backNote` is picked at capture time
// (so flipping the same print twice always shows the same line — the
// variation lives across the stack, not within a single artifact);
// `viewedBack` flips true the first time the user flips that print,
// which kills the "↻ flip me" sticker on its front face.
interface Print {
  id: string
  takenAt: number
  flipped: boolean
  source: 'cam' | 'curated'
  image: string
  backNote: string
  viewedBack: boolean
}

let printCounter = 0
function makePrint(source: 'cam' | 'curated', image: string, backNote: string): Print {
  printCounter += 1
  return {
    id: `print-${printCounter}-${Date.now().toString(36)}`,
    takenAt: Date.now(),
    flipped: false,
    source,
    image,
    backNote,
    viewedBack: false,
  }
}

// ── Back-note picker — pulls a random line from the appropriate pool
// at capture time. Cam shots get the lens-aware pool (lines about the
// visitor's own face on the print); curated shots get the studio pool
// (field-journal voice). For curated shots we also let the daily
// `shot.backNote` win ~30% of the time so the day's theme keeps
// showing up across a session of repeated presses.
function pickBackNote(source: 'cam' | 'curated'): string {
  if (source === 'cam') {
    const pool = site.camBackNotes as readonly string[]
    if (pool.length === 0) return 'you, here, now.'
    return pool[Math.floor(Math.random() * pool.length)] ?? pool[0]!
  }
  // Curated path — bias toward the daily note, fall through to the
  // studio pool for the rest.
  const daily = shot.value?.backNote
  const pool = site.studioBackNotes as readonly string[]
  if (daily && Math.random() < 0.3) return daily
  if (pool.length === 0) return daily ?? ''
  return pool[Math.floor(Math.random() * pool.length)] ?? daily ?? ''
}

// ── Reactive state ─────────────────────────────────────────────────────
const deployed = ref(false)
const prints = ref<Print[]>([])
const developingId = ref<string | null>(null)
const ejecting = ref(false)
const frontIndex = ref(0)
const shutterPulse = ref(false)
// No discovery hint — the strap is intentionally undocumented. The
// only affordance is the strap silhouette itself + its idle sway.
// Visitors who notice it earn the easter egg; the rest of the page
// is unaffected.

// ── Derived ────────────────────────────────────────────────────────────
const hasPrints = computed(() => prints.value.length > 0)
const shutterDisabled = computed(() => ejecting.value)

// Caption time-stamp printed into the bottom border. Kept user-local
// so the diary feel matches what's on the visitor's wall clock; the
// dateKey above is UTC for the daily fingerprint, intentional.
function timeStamp(t: number): string {
  const d = new Date(t)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

function captionFor(p: Print): string {
  if (p.source === 'cam') return `field cam · ${timeStamp(p.takenAt)}`
  return shot.value?.caption ?? 'today\'s exposure'
}

function backNoteFor(p: Print): string {
  // The print stores the line picked at capture time, so flipping the
  // same print twice always shows the same surprise — variation lives
  // across the stack, not within a single artifact.
  return p.backNote
}

function locationFor(p: Print): string {
  if (p.source === 'cam') return 'in front of the lens'
  return shot.value?.location ?? 'somewhere'
}

// ── Web Audio shutter SFX — two-stop "ka-WHIRR". Same pattern as
// `useRadioPlayer.playStaticBurst`: pre-generated noise buffer +
// fail-silent on missing AudioContext. Kept inline since the
// polaroid is the only consumer of these specific stops.
let audioCtx: AudioContext | null = null
let noiseBuffer: AudioBuffer | null = null

function ensureAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (audioCtx) {
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {})
    return audioCtx
  }
  const Ctx = window.AudioContext
    || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) return null
  audioCtx = new Ctx()
  const buf = audioCtx.createBuffer(1, audioCtx.sampleRate, audioCtx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  noiseBuffer = buf
  return audioCtx
}

function playShutterSfx() {
  const ctx = ensureAudioCtx()
  if (!ctx || !noiseBuffer) return

  const t0 = ctx.currentTime

  // Click — sharp, short, high-pass.
  const click = ctx.createBufferSource()
  click.buffer = noiseBuffer
  const clickFilter = ctx.createBiquadFilter()
  clickFilter.type = 'highpass'
  clickFilter.frequency.value = 2400
  clickFilter.Q.value = 0.5
  const clickGain = ctx.createGain()
  clickGain.gain.setValueAtTime(0, t0)
  clickGain.gain.linearRampToValueAtTime(0.2, t0 + 0.005)
  clickGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.06)
  click.connect(clickFilter); clickFilter.connect(clickGain); clickGain.connect(ctx.destination)
  const offset1 = Math.random() * (noiseBuffer.duration - 0.1)
  click.start(t0, offset1, 0.07)
  click.stop(t0 + 0.08)

  // Whirr — longer, low-pass with sweeping cutoff.
  const whirr = ctx.createBufferSource()
  whirr.buffer = noiseBuffer
  const whirrFilter = ctx.createBiquadFilter()
  whirrFilter.type = 'lowpass'
  whirrFilter.frequency.setValueAtTime(1100, t0 + 0.06)
  whirrFilter.frequency.exponentialRampToValueAtTime(380, t0 + 0.78)
  whirrFilter.Q.value = 0.9
  const whirrGain = ctx.createGain()
  whirrGain.gain.setValueAtTime(0, t0 + 0.06)
  whirrGain.gain.linearRampToValueAtTime(0.09, t0 + 0.12)
  whirrGain.gain.linearRampToValueAtTime(0.06, t0 + 0.55)
  whirrGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.82)
  whirr.connect(whirrFilter); whirrFilter.connect(whirrGain); whirrGain.connect(ctx.destination)
  const offset2 = Math.random() * (noiseBuffer.duration - 0.85)
  whirr.start(t0 + 0.06, offset2, 0.78)
  whirr.stop(t0 + 0.86)
}

// ── Strap interaction — deploy / retract ───────────────────────────────
function deploy() {
  if (deployed.value) return
  deployed.value = true
  // Don't auto-request the camera here — many visitors will pull the
  // strap out of curiosity and reflexively bail if a permission
  // prompt fires before they've decided. We wait for the explicit
  // "Allow camera" CTA in the lens viewfinder.
}

function retract() {
  if (!deployed.value) return
  deployed.value = false
  // Critical: stops the stream so the browser's camera-in-use light
  // turns off. Without this we'd keep the cam open between deploys
  // and visitors would (rightly) be alarmed.
  stopCam()
}

async function requestCam() {
  await startCam()
}

// ── Shutter — fires whether the cam is live or we're falling back ─────
async function fireShutter() {
  if (shutterDisabled.value) return

  shutterPulse.value = true
  setTimeout(() => { shutterPulse.value = false }, 180)

  playShutterSfx()

  // Decide what the print's image is going to be:
  //   - Live cam? Capture a riso-filtered frame.
  //   - Anything else? Fall back to today's curated shot.
  let source: 'cam' | 'curated' = 'curated'
  let image = shot.value?.image ?? '/shots/workbench-2am.svg'

  if (camStatus.value === 'live') {
    const dataUrl = await captureCam()
    if (dataUrl) {
      source = 'cam'
      image = dataUrl
    }
  }

  ejecting.value = true
  // The back-note is picked once, here, and stored on the print so
  // it stays consistent across flips. Different print = different
  // line — variation lives in the stack.
  const fresh = makePrint(source, image, pickBackNote(source))
  developingId.value = fresh.id
  prints.value = [fresh, ...prints.value].slice(0, MAX_STACK)
  frontIndex.value = 0

  setTimeout(() => { ejecting.value = false }, EJECT_MS)
  setTimeout(() => {
    if (developingId.value === fresh.id) developingId.value = null
  }, EJECT_MS + DEVELOP_MS)
}

// ── Download — bake the focused print into a high-res PNG ─────────────
//
// We rebuild the polaroid in a fresh canvas (cream paper, photo +
// residual riso CMY layers, halftone, note in italic serif, stamp in
// mono) at 4x scale rather than rasterising the live DOM with an
// html2canvas-style pass. Three reasons:
//
//   1. Same reason `useFieldCam.applyRisoFilter` builds the cam shot
//      in canvas: we control every pixel, so the artifact survives
//      browser-specific font hinting / blur quirks at small sizes.
//   2. No new dependency. The codebase already leans on Canvas2D for
//      the riso filter; adding html2canvas would be the only
//      DOM-rasterisation library and we'd inherit its known bugs
//      (CSS variables, backdrop-filter, etc.).
//   3. We can pick a clean canvas size (800×1024 at 4x) regardless of
//      the on-screen print size, so the downloaded PNG is print-
//      quality even though the on-screen polaroid is 200px wide.
//
// The CMY ink offsets / alphas mirror the on-screen
// `.print-photo__ink--*` rest-state values so a downloaded print
// reads visually identical to the print the user sees in the modal.
const DOWNLOAD_SCALE = 4
const downloadingId = ref<string | null>(null)

function loadImageEl(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    // Same-origin for both branches: data URLs from the cam capture
    // and `/shots/*.svg` from /public. `crossOrigin = anonymous` is
    // belt-and-suspenders in case any future shot is served from a
    // CDN — without it canvas would taint and `toBlob` would throw.
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

// Greedy word wrap — measures each word against `maxWidth` using the
// canvas context's current font. Caller is responsible for setting
// the font before calling. Returns one entry per visual line.
function wrapTextLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.trim().split(/\s+/)
  if (words.length === 0) return []
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (current && ctx.measureText(test).width > maxWidth) {
      lines.push(current)
      current = word
    }
    else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines
}

async function renderPrintToCanvas(p: Print): Promise<HTMLCanvasElement | null> {
  if (typeof document === 'undefined') return null

  const S = DOWNLOAD_SCALE
  const W = 200 * S // 800px — matches the on-screen 200px width × 4
  const H = 256 * S // 1024px — matches the 5/6.4 aspect ratio

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  // ── Font preload — `document.fonts.load` resolves once each
  // requested face is ready. Without this the first download fires
  // before Fraunces/Geist Mono have been requested in CSS, so canvas
  // would silently fall back to a generic serif/mono and the text
  // would visibly differ from the on-screen print. Wrapped in
  // try/catch so non-FontLoadingAPI environments still render.
  if (document.fonts) {
    try {
      await Promise.all([
        document.fonts.load(`italic ${12 * S}px Fraunces`),
        document.fonts.load(`${7 * S}px "Geist Mono"`),
      ])
    }
    catch { /* best effort */ }
  }

  // ── 1. Cream paper background — solid fill plus the same two soft
  // radial gradients as the on-screen `.print-face` so the
  // downloaded paper isn't a flat #fbf6e9 rectangle.
  ctx.fillStyle = '#fbf6e9'
  ctx.fillRect(0, 0, W, H)

  const g1 = ctx.createRadialGradient(W * 0.22, H * 0.30, 0, W * 0.22, H * 0.30, W * 0.4)
  g1.addColorStop(0, 'rgba(0, 0, 0, 0.025)')
  g1.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = g1
  ctx.fillRect(0, 0, W, H)

  const g2 = ctx.createRadialGradient(W * 0.78, H * 0.70, 0, W * 0.78, H * 0.70, W * 0.4)
  g2.addColorStop(0, 'rgba(0, 0, 0, 0.03)')
  g2.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = g2
  ctx.fillRect(0, 0, W, H)

  // ── 2. Photo box — square, 8% inset on the sides/top to mirror
  // the on-screen `.print-face--front` padding.
  const PADDING = W * 0.08
  const PHOTO_SIZE = W - PADDING * 2
  const PHOTO_X = PADDING
  const PHOTO_Y = PADDING

  // Cream-dim under-fill so any transparency in the source (curated
  // SVGs) reads as `--color-cream-dim` rather than the page bg.
  ctx.fillStyle = '#d8cdb8'
  ctx.fillRect(PHOTO_X, PHOTO_Y, PHOTO_SIZE, PHOTO_SIZE)

  const img = await loadImageEl(p.image)
  if (img) {
    // Clip subsequent ink-layer draws to the photo box so the
    // offset overlays don't leak onto the cream border.
    ctx.save()
    ctx.beginPath()
    ctx.rect(PHOTO_X, PHOTO_Y, PHOTO_SIZE, PHOTO_SIZE)
    ctx.clip()

    // Center-cropped square, same trick as the cam filter: pull the
    // largest square that fits in the source so wide images don't
    // letterbox. Falls back to the photo box itself if natural size
    // is missing (defensive for synthetic Image elements).
    const sw = img.naturalWidth || PHOTO_SIZE
    const sh = img.naturalHeight || PHOTO_SIZE
    const sz = Math.min(sw, sh)
    const sx = (sw - sz) / 2
    const sy = (sh - sz) / 2

    // Base photo. Cam shots already have the riso baked in by
    // `applyRisoFilter`; curated shots are clean SVG/raster.
    ctx.drawImage(img, sx, sy, sz, sz, PHOTO_X, PHOTO_Y, PHOTO_SIZE, PHOTO_SIZE)

    // CMY misregistration — same residual offsets the on-screen
    // `.print-photo__ink--*` rules apply at rest. We use canvas
    // `filter` to recolor the source rather than flat-fill rects,
    // because the hue-rotated copy preserves tonal information
    // exactly the way a riso plate would. Cam shots get the gentler
    // `.print.is-cam` alphas (the JPEG already carries riso) so the
    // overlay doesn't double-up.
    const isCam = p.source === 'cam'
    const cAlpha = isCam ? 0.18 : 0.32
    const mAlpha = isCam ? 0.20 : 0.38
    const yAlpha = isCam ? 0.14 : 0.28

    function inkLayer(filter: string, dx: number, dy: number, alpha: number) {
      if (!ctx) return
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.globalCompositeOperation = 'multiply'
      ctx.filter = filter
      ctx.drawImage(img!, sx, sy, sz, sz, PHOTO_X + dx * S, PHOTO_Y + dy * S, PHOTO_SIZE, PHOTO_SIZE)
      ctx.restore()
    }

    // Magenta — translate(1.5px, -1px) at rest (CSS .print-photo__ink--m)
    inkLayer('sepia(1) saturate(8) hue-rotate(310deg) contrast(1.1)', 1.5, -1, mAlpha)
    // Cyan — translate(-1.5px, 1px) at rest (CSS .print-photo__ink--c)
    inkLayer('sepia(1) saturate(6) hue-rotate(160deg) contrast(1.1)', -1.5, 1, cAlpha)
    // Yellow — translate(0.5px, 1.5px) at rest (CSS .print-photo__ink--y)
    inkLayer('sepia(1) saturate(5) hue-rotate(20deg) brightness(1.15)', 0.5, 1.5, yAlpha)

    // Halftone dots — same SPACING/RADIUS as `useFieldCam`, scaled
    // up so the dot size lands at the same percentage of the photo
    // as the on-screen version. Multiply blend so the dots only
    // deepen shadows.
    ctx.save()
    ctx.globalCompositeOperation = 'multiply'
    ctx.globalAlpha = 0.07
    ctx.fillStyle = '#0d0c0a'
    const SPACING = 5 * S
    const RADIUS = 0.9 * S
    for (let y = PHOTO_Y + SPACING / 2; y < PHOTO_Y + PHOTO_SIZE; y += SPACING) {
      for (let x = PHOTO_X + SPACING / 2; x < PHOTO_X + PHOTO_SIZE; x += SPACING) {
        ctx.beginPath()
        ctx.arc(x, y, RADIUS, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.restore()

    ctx.restore() // unclip
  }

  // Photo border (1px ink at low alpha) — drawn after the clip pop
  // so it sits cleanly on top of the photo without the ink overlays
  // covering it.
  ctx.strokeStyle = 'rgba(13, 12, 10, 0.25)'
  ctx.lineWidth = S
  ctx.strokeRect(PHOTO_X + S * 0.5, PHOTO_Y + S * 0.5, PHOTO_SIZE - S, PHOTO_SIZE - S)

  // ── 3. Field note — italic serif, centered, balanced wrap. We
  // pick the same `backNote` the on-screen front face renders.
  const NOTE_FONT_PX = 12 * S
  const NOTE_LINE_HEIGHT = NOTE_FONT_PX * 1.25
  const NOTE_TOP = PHOTO_Y + PHOTO_SIZE + 11 * S
  const NOTE_MAX_WIDTH = W - PADDING * 2

  ctx.fillStyle = '#0d0c0a'
  ctx.font = `italic ${NOTE_FONT_PX}px "Fraunces", "Iowan Old Style", Georgia, serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'

  const noteLines = wrapTextLines(ctx, p.backNote, NOTE_MAX_WIDTH).slice(0, 3)
  noteLines.forEach((line, i) => {
    ctx.fillText(line, W / 2, NOTE_TOP + i * NOTE_LINE_HEIGHT)
  })

  // ── 4. Stamp — mono, uppercase, faint ink, with the print number
  // in magenta to match the on-screen `.print-stamp__num`. We split
  // the line into colored segments and draw them left-to-right
  // because canvas can't fillText with multiple colors in one pass.
  const STAMP_FONT_PX = 7 * S
  const STAMP_TOP = NOTE_TOP + noteLines.length * NOTE_LINE_HEIGHT + 9 * S

  ctx.font = `${STAMP_FONT_PX}px "Geist Mono", "JetBrains Mono", ui-monospace, monospace`
  ctx.textBaseline = 'top'

  // letterSpacing — the on-screen stamp uses 0.18em, which on a 7px
  // mono is ~1.26px. Modern Chromium / WebKit / Firefox respect
  // CanvasRenderingContext2D.letterSpacing; older engines ignore it
  // (acceptable degradation — the text is still readable, just
  // slightly tighter).
  const ctxAny = ctx as CanvasRenderingContext2D & { letterSpacing?: string }
  try { ctxAny.letterSpacing = `${0.18 * STAMP_FONT_PX}px` }
  catch { /* unsupported, no-op */ }

  const segments: Array<{ text: string; color: string }> = [
    { text: dateKey.value.toUpperCase(), color: 'rgba(13, 12, 10, 0.65)' },
    { text: '   ·   ', color: 'rgba(13, 12, 10, 0.35)' },
    { text: timeStamp(p.takenAt), color: 'rgba(13, 12, 10, 0.65)' },
    { text: '   ·   ', color: 'rgba(13, 12, 10, 0.35)' },
    { text: printLabel.value, color: '#ff4869' },
  ]
  const segmentWidths = segments.map(s => ctx.measureText(s.text).width)
  const totalWidth = segmentWidths.reduce((a, b) => a + b, 0)
  let xCursor = (W - totalWidth) / 2
  ctx.textAlign = 'left'
  segments.forEach((seg, i) => {
    ctx.fillStyle = seg.color
    ctx.fillText(seg.text, xCursor, STAMP_TOP)
    xCursor += segmentWidths[i] ?? 0
  })

  try { ctxAny.letterSpacing = '0px' }
  catch { /* unsupported, no-op */ }

  // ── 5. Outer border — 1px ink at low alpha, mirrors the
  // on-screen `.print-face` edge.
  ctx.strokeStyle = 'rgba(13, 12, 10, 0.35)'
  ctx.lineWidth = S
  ctx.strokeRect(S * 0.5, S * 0.5, W - S, H - S)

  return canvas
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

async function downloadFocusedPrint() {
  if (!hasPrints.value) return
  const p = prints.value[frontIndex.value]
  if (!p) return
  // Don't try to bake a print that's still developing — the photo
  // would look mid-animation if anything readable rendered at all.
  if (developingId.value === p.id) return
  if (downloadingId.value) return

  downloadingId.value = p.id
  try {
    const canvas = await renderPrintToCanvas(p)
    if (!canvas) return

    // Filename: `wolves-polaroid-YYYY-MM-DD-HHMM.png` so a session of
    // multiple downloads sorts chronologically in the Downloads
    // folder. The colon strip on the time keeps the filename
    // cross-platform safe.
    const filename = `wolves-polaroid-${dateKey.value}-${timeStamp(p.takenAt).replace(':', '')}.png`

    // Prefer toBlob (cheaper memory than a data URL) with a fallback
    // for environments that haven't shipped it (very old WebKit).
    if (typeof canvas.toBlob === 'function') {
      await new Promise<void>((resolve) => {
        canvas.toBlob((blob) => {
          if (!blob) { resolve(); return }
          const url = URL.createObjectURL(blob)
          triggerDownload(url, filename)
          // Defer revoke so Chrome's download has time to grab the
          // blob — revoking immediately can cancel the download
          // mid-flight on some versions.
          setTimeout(() => URL.revokeObjectURL(url), 1000)
          resolve()
        }, 'image/png', 1.0)
      })
    }
    else {
      const url = canvas.toDataURL('image/png')
      triggerDownload(url, filename)
    }
  }
  finally {
    downloadingId.value = null
  }
}

// ── Stack interactions — focus / flip / riffle / wrap ─────────────────
function focusPrint(idx: number) {
  if (idx < 0 || idx >= prints.value.length) return
  if (idx === frontIndex.value) {
    flipFront()
    return
  }
  frontIndex.value = idx
}

function flipFront() {
  const p = prints.value[frontIndex.value]
  if (!p) return
  p.flipped = !p.flipped
  // The first flip silences the "↻ flip me" sticker on this print's
  // front face; subsequent flips don't re-show it. We track it per
  // print rather than globally so each new shutter press still
  // earns its own discovery moment.
  if (p.flipped) p.viewedBack = true
}

function sendFrontToBack() {
  if (prints.value.length < 2) return
  const [head, ...rest] = prints.value
  if (!head) return
  prints.value = [...rest, { ...head, flipped: false }]
  frontIndex.value = 0
}

function nudgeFront(delta: number) {
  if (prints.value.length === 0) return
  const len = prints.value.length
  frontIndex.value = ((frontIndex.value + delta) % len + len) % len
}

// ── Drag-to-riffle (within the deployed modal) ────────────────────────
const PX_PER_RIFFLE = 60
const stackEl = ref<HTMLElement | null>(null)
const dragging = ref(false)
let dragStartX = 0
let dragStartIndex = 0

function onStackPointerDown(e: PointerEvent) {
  if (!stackEl.value || prints.value.length < 2) return
  dragging.value = true
  dragStartX = e.clientX
  dragStartIndex = frontIndex.value
  stackEl.value.setPointerCapture(e.pointerId)
}
function onStackPointerMove(e: PointerEvent) {
  if (!dragging.value) return
  const dx = e.clientX - dragStartX
  const steps = Math.round(dx / PX_PER_RIFFLE)
  const len = prints.value.length
  if (len === 0) return
  const next = ((dragStartIndex - steps) % len + len) % len
  frontIndex.value = next
}
function onStackPointerUp(e: PointerEvent) {
  if (!dragging.value || !stackEl.value) return
  dragging.value = false
  try { stackEl.value.releasePointerCapture(e.pointerId) }
  catch { /* already released */ }
}

// ── Keyboard — same shortcuts as before, scoped to the deployed modal
// so they don't fight other page-wide handlers. Esc retracts; Space
// fires the shutter; arrows riffle; F flips. We also let Esc close
// even when the user hasn't focused the modal — common modal pattern.
function onWindowKeydown(e: KeyboardEvent) {
  if (!deployed.value) return
  const target = e.target as HTMLElement | null
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return

  switch (e.key) {
    case 'Escape':
      e.preventDefault()
      retract()
      break
    case ' ':
    case 'Spacebar':
      e.preventDefault()
      fireShutter()
      break
    case 'ArrowLeft':
      e.preventDefault()
      nudgeFront(-1)
      break
    case 'ArrowRight':
      e.preventDefault()
      nudgeFront(1)
      break
    case 'f':
    case 'F':
      e.preventDefault()
      flipFront()
      break
    case 'd':
    case 'D':
      // Save the focused print as a PNG. Mirrors the footer
      // "Save print" button so power users don't have to mouse
      // into the chrome to grab a print.
      e.preventDefault()
      downloadFocusedPrint()
      break
    case 'Backspace':
      // Repurposed: send-front-to-back on Backspace because Esc now
      // retracts the modal. Functionally close enough — most users
      // will riffle with arrows anyway.
      e.preventDefault()
      sendFrontToBack()
      break
  }
}

// ── Stack visual — same fan as before, used by inline style binding.
function stackStyle(idx: number) {
  const len = prints.value.length || 1
  let depth = idx - frontIndex.value
  if (depth < 0) depth += len
  const visible = Math.min(depth, 4)
  const sign = visible % 2 === 0 ? 1 : -1
  const x = visible * 14
  const y = visible * 10
  const rot = sign * (visible * 1.6)
  const z = 100 - visible
  return {
    transform: `translate3d(${x}px, ${y}px, 0) rotate(${rot}deg)`,
    zIndex: z,
    filter: visible === 0 ? 'none' : `brightness(${1 - visible * 0.06})`,
  }
}

// Each print's photo URL exposed as a CSS var so the develop CMY mask
// layers can reference it without baking the path into stylesheet.
function maskUrlFor(p: Print): string {
  return `url('${p.image}')`
}

// ── Lifecycle — bind the window-scoped keydown listener while the
// modal is deployed; tear it down on retract / unmount so we don't
// keep a stale closure around.
onMounted(() => {
  if (typeof window === 'undefined') return
  window.addEventListener('keydown', onWindowKeydown)
})
onBeforeUnmount(() => {
  if (typeof window === 'undefined') return
  window.removeEventListener('keydown', onWindowKeydown)
  stopCam()
})

</script>

<template>
  <!--
    The strap — the only thing visible when the polaroid is at rest.
    Fixed top-right, dangles ~80px below the viewport edge, gently
    swings while idle. Click anywhere on it to deploy the modal.

    A `<button>` rather than a `<div>` so it's keyboard-accessible by
    default (Enter/Space activate it) and the focus ring matches the
    rest of the kit.
  -->
  <button
    class="strap-handle"
    :class="deployed ? 'is-deployed' : ''"
    type="button"
    aria-label="Pull the field cam out of its strap"
    @click="deploy"
  >
    <span class="strap-handle__strap" aria-hidden="true">
      <span class="strap-handle__stitch strap-handle__stitch--l" />
      <span class="strap-handle__stitch strap-handle__stitch--r" />
    </span>
    <span class="strap-handle__ring" aria-hidden="true" />
    <span class="strap-handle__cam" aria-hidden="true">
      <span class="strap-handle__lens" />
      <span class="strap-handle__viewfinder" />
    </span>
  </button>

  <!--
    Deployed modal. Teleported to <body> so it escapes any overflow:
    hidden ancestor (sections set isolate / overflow-hidden, which
    would clip a fixed-positioned modal otherwise). Backdrop click
    retracts.
  -->
  <Teleport to="body">
    <transition name="cam-deploy">
      <div
        v-if="deployed"
        class="cam-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Field cam — pulled out"
        @click.self="retract"
      >
        <!-- Strap extension — runs from the top edge down to the
             camera body, visually grounding the camera on the same
             strap the user pulled. Clicking it does nothing; the
             retract affordance is the X on the camera body. -->
        <div class="cam-strap-ext" aria-hidden="true">
          <span class="cam-strap-ext__stitch cam-strap-ext__stitch--l" />
          <span class="cam-strap-ext__stitch cam-strap-ext__stitch--r" />
        </div>

        <!-- The camera proper. Same chrome vocabulary as the radio so
             the two devices feel like siblings. -->
        <div
          class="camera"
          :class="shutterPulse ? 'is-flashing' : ''"
        >
          <!-- Top brand strip + close button. -->
          <div class="camera-brand">
            <span class="camera-mark" aria-hidden="true">◉</span>
            <span class="camera-name">Wolves · Field Cam</span>
            <span class="camera-model">Model № P-12</span>
            <button
              type="button"
              class="camera-close"
              aria-label="Retract the field cam"
              title="Retract (Esc)"
              @click="retract"
            >
              <Icon name="lucide:x" class="text-base" />
            </button>
          </div>

          <!-- Lens + live viewfinder. The viewfinder is a small
               horizontal strip above the lens that shows the
               currently-active image source: live video, a
               fallback shot, or status text while we're requesting
               permission. -->
          <div class="camera-viewport">
            <!-- Viewfinder readout — small status strip, like the
                 LED row on a real camera. -->
            <div class="viewfinder-readout">
              <span class="readout-led" :class="camStatus === 'live' ? 'is-on' : ''" />
              <span class="readout-label">
                <template v-if="camStatus === 'live'">Recording</template>
                <template v-else-if="camStatus === 'requesting'">Waking the lens…</template>
                <template v-else-if="camStatus === 'denied'">Lens off · curated mode</template>
                <template v-else-if="camStatus === 'unavailable'">No lens · curated mode</template>
                <template v-else-if="camStatus === 'error'">Lens error · curated mode</template>
                <template v-else>Lens asleep</template>
              </span>
              <span class="readout-meta">{{ dateKey }}</span>
            </div>

            <!-- Camera picker — only renders once we have at least
                 two `videoinput` devices and the cam is live (or
                 mid-swap). Pre-permission the device list is empty
                 or label-less, so this strip stays hidden until the
                 user has actually granted access. Disabled during
                 'requesting' to prevent a second swap landing on top
                 of the first. -->
            <div
              v-if="videoDevices.length > 1 && (camStatus === 'live' || camStatus === 'requesting')"
              class="viewfinder-pick"
            >
              <span class="pick-label" aria-hidden="true">▸ Lens</span>
              <select
                class="pick-select"
                :value="selectedDeviceId ?? ''"
                :disabled="camStatus !== 'live'"
                aria-label="Select camera"
                @change="onCameraSelect"
              >
                <option
                  v-for="(d, i) in videoDevices"
                  :key="d.deviceId"
                  :value="d.deviceId"
                >
                  {{ deviceLabel(d, i) }}
                </option>
              </select>
              <span class="pick-chevron" aria-hidden="true">▾</span>
            </div>

            <!-- The lens — round halftone iris. We layer the actual
                 video element inside the iris so the round mask
                 makes the preview feel like it's coming through
                 glass rather than a square viewfinder. Pointer
                 events are off so the lens doesn't intercept the
                 backdrop's click-to-retract. -->
            <div class="camera-lens-block">
              <div class="camera-lens">
                <div class="lens-glass">
                  <!-- Live preview, only mounted while deployed so
                       autoplay obeys the user-gesture constraint. -->
                  <video
                    v-show="camStatus === 'live'"
                    ref="videoEl"
                    class="lens-video"
                    playsinline
                    autoplay
                    muted
                  />

                  <!-- Idle / requesting / denied placeholder.
                       Shows the curated shot at low opacity so
                       there's always something to look at. -->
                  <img
                    v-show="camStatus !== 'live' && shot"
                    :src="shot?.image"
                    :alt="shot?.caption ?? ''"
                    class="lens-fallback"
                    draggable="false"
                  >

                  <!-- Status overlay on top — eyebrow + CTA when
                       the cam isn't live yet. -->
                  <div
                    v-if="camStatus !== 'live'"
                    class="lens-status"
                  >
                    <transition name="status-fade" mode="out-in">
                      <div v-if="camStatus === 'idle'" key="idle" class="lens-status__group">
                        <span class="lens-status__eyebrow">▸ Lens asleep</span>
                        <button
                          type="button"
                          class="lens-status__cta"
                          @click.stop="requestCam"
                        >
                          Allow camera
                        </button>
                        <span class="lens-status__hint">or press the shutter for the curated print</span>
                      </div>
                      <div v-else-if="camStatus === 'requesting'" key="req" class="lens-status__group">
                        <span class="lens-status__eyebrow">▸ Permission requested…</span>
                      </div>
                      <div v-else-if="camStatus === 'denied'" key="denied" class="lens-status__group">
                        <span class="lens-status__eyebrow">▸ Lens off</span>
                        <span class="lens-status__hint">No problem — the curated print still works.</span>
                      </div>
                      <div v-else-if="camStatus === 'unavailable'" key="na" class="lens-status__group">
                        <span class="lens-status__eyebrow">▸ No lens here</span>
                        <span class="lens-status__hint">Curated print only.</span>
                      </div>
                      <div v-else-if="camStatus === 'error'" key="err" class="lens-status__group">
                        <span class="lens-status__eyebrow">▸ Lens error</span>
                        <button
                          type="button"
                          class="lens-status__cta lens-status__cta--small"
                          @click.stop="requestCam"
                        >
                          Retry
                        </button>
                      </div>
                    </transition>
                  </div>
                </div>
                <span class="lens-iris-ring" />
                <span class="lens-glint" />
              </div>
            </div>
          </div>

          <!-- Shutter row + small live caption. -->
          <div class="camera-shutter-row">
            <button
              type="button"
              class="camera-shutter"
              :class="shutterDisabled ? 'is-busy' : ''"
              :disabled="shutterDisabled"
              :aria-label="shutterDisabled ? 'Camera busy — print developing' : 'Take a polaroid (Space)'"
              @click="fireShutter"
            >
              <span class="shutter-cap" />
              <span class="shutter-ring" />
            </button>
            <span class="camera-shutter__label">Press</span>
          </div>

          <!-- Stack — fans out below the camera within the modal.
               Same fan-of-prints geometry as before; pointer-events
               handle riffle drag + click-to-focus / click-to-flip. -->
          <div
            ref="stackEl"
            class="print-stack"
            :class="dragging ? 'is-dragging' : ''"
            @pointerdown="onStackPointerDown"
            @pointermove="onStackPointerMove"
            @pointerup="onStackPointerUp"
            @pointercancel="onStackPointerUp"
          >
            <div v-if="!hasPrints" class="print-empty" aria-hidden="true">
              <span class="print-empty__line" />
              <span class="print-empty__cue">Stack empty — press the shutter</span>
              <span class="print-empty__line" />
            </div>

            <article
              v-for="(p, idx) in prints"
              :key="p.id"
              class="print"
              :class="[
                developingId === p.id ? 'is-developing' : '',
                developingId === p.id && ejecting ? 'is-ejecting' : '',
                p.flipped ? 'is-flipped' : '',
                idx === frontIndex ? 'is-front' : '',
                p.source === 'cam' ? 'is-cam' : '',
              ]"
              :style="stackStyle(idx)"
              :aria-label="`Print ${printLabel}, ${p.source === 'cam' ? 'field cam' : 'curated'}, taken ${timeStamp(p.takenAt)}${p.flipped ? ' — back' : ' — front'}`"
              @click="focusPrint(idx)"
            >
              <div class="print-flip">
                <!-- Front face — photo + caption + stamp. The "flip
                     me" sticker on the front nudges visitors toward
                     the surprise on the back; it disappears once
                     they've flipped that specific print at least
                     once (`viewedBack` flag set in `flipFront`). -->
                <div class="print-face print-face--front">
                  <transition name="flip-hint-fade">
                    <span
                      v-if="!p.viewedBack && idx === frontIndex && developingId !== p.id"
                      class="print-flip-hint"
                      aria-hidden="true"
                    >
                      <span class="print-flip-hint__icon">↻</span>
                      <span class="print-flip-hint__label">Flip me</span>
                    </span>
                  </transition>

                  <div class="print-photo">
                    <img
                      :src="p.image"
                      :alt="captionFor(p)"
                      class="print-photo__base"
                      draggable="false"
                    >
                    <span
                      class="print-photo__ink print-photo__ink--c"
                      :style="{ '--shot-mask': maskUrlFor(p) }"
                      aria-hidden="true"
                    />
                    <span
                      class="print-photo__ink print-photo__ink--m"
                      :style="{ '--shot-mask': maskUrlFor(p) }"
                      aria-hidden="true"
                    />
                    <span
                      class="print-photo__ink print-photo__ink--y"
                      :style="{ '--shot-mask': maskUrlFor(p) }"
                      aria-hidden="true"
                    />
                    <span class="print-photo__grain" aria-hidden="true" />
                  </div>

                  <div class="print-border">
                    <!-- The field note now lives on the front of the
                         print as the handwritten line below the
                         photo — the same `backNote` the back face
                         shows, so flipping doesn't reveal a
                         contradiction. The back keeps its own
                         layout (location, signoff) so the artifact
                         still has two readable sides. -->
                    <p class="print-front-note">
                      {{ backNoteFor(p) }}
                    </p>
                    <p class="print-stamp">
                      <span>{{ dateKey }}</span>
                      <span class="print-stamp__sep" aria-hidden="true">·</span>
                      <span>{{ timeStamp(p.takenAt) }}</span>
                      <span class="print-stamp__sep" aria-hidden="true">·</span>
                      <span class="print-stamp__num">{{ printLabel }}</span>
                    </p>
                  </div>
                </div>

                <!-- Back face — handwritten field note + location.
                     Selfies and curated prints share the layout;
                     only the copy varies. -->
                <div class="print-face print-face--back">
                  <div class="print-back">
                    <span class="print-back__eyebrow">▸ Field note</span>
                    <p class="print-back__line">
                      {{ backNoteFor(p) }}
                    </p>
                    <div class="print-back__meta">
                      <span class="print-back__loc">
                        <Icon name="lucide:map-pin" class="text-base" />
                        {{ locationFor(p) }}
                      </span>
                      <span class="print-back__date">{{ dateKey }}</span>
                    </div>
                    <div class="print-back__signoff">
                      <span class="print-back__hand">— W</span>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          </div>

          <!-- Footer — keyboard cheatsheet + archive caption +
               save-print CTA. The save button targets the focused
               (front-most) print; users riffle to a print first,
               then save it. Disabled when no prints exist, while a
               print is developing (would bake mid-animation), and
               while a download is already in flight. -->
          <footer class="camera-footer">
            <div class="camera-archive">
              <span class="camera-archive__label">Today's exposure</span>
              <span class="camera-archive__id">
                Print {{ printLabel }}
                <span class="camera-archive__dot" aria-hidden="true">·</span>
                <span class="camera-archive__date">{{ dateKey }}</span>
              </span>
            </div>
            <button
              type="button"
              class="camera-save"
              :disabled="!hasPrints || developingId !== null || downloadingId !== null"
              :aria-label="downloadingId ? 'Saving polaroid…' : 'Save the focused polaroid as a PNG'"
              title="Save print (D)"
              @click="downloadFocusedPrint"
            >
              <Icon
                :name="downloadingId ? 'lucide:loader' : 'lucide:download'"
                class="text-base"
                :class="downloadingId ? 'camera-save__spin' : ''"
              />
              <span>{{ downloadingId ? 'Saving…' : 'Save print' }}</span>
            </button>
            <div class="camera-keys" aria-label="Keyboard shortcuts">
              <kbd>Space</kbd><span>shutter</span>
              <kbd>F</kbd><span>flip</span>
              <kbd>D</kbd><span>save</span>
              <kbd>←</kbd><kbd>→</kbd><span>riffle</span>
              <kbd>Esc</kbd><span>retract</span>
            </div>
          </footer>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
/* ============================================================
   Strap handle — the always-visible affordance. Fixed top-right
   below the header, dangles a leather strap with a small camera
   peeking from the bottom. The whole element is the click target.
   ============================================================ */
.strap-handle {
  position: fixed;
  top: 0;
  right: 84px;
  width: 56px;
  /* Just enough length to read as "a strap with a camera tugging
     down on it" — extends visibly into the page. */
  height: 132px;
  padding: 0;
  margin: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  z-index: 50; /* above page content, below modal overlays */
  display: flex;
  flex-direction: column;
  align-items: center;
  /* Subtle sway so the strap reads as physical fabric. */
  transform-origin: 50% 0;
  animation: strap-sway 5.6s ease-in-out infinite;
  transition:
    transform 320ms var(--ease-pop),
    filter 320ms var(--ease-pop);
}
.strap-handle:hover {
  transform: translateY(8px);
  filter: drop-shadow(0 8px 18px rgba(0, 0, 0, 0.45));
}
.strap-handle:focus-visible {
  outline: 2px solid var(--color-pop-yellow);
  outline-offset: 4px;
  border-radius: 4px;
}
.strap-handle.is-deployed {
  /* While deployed, the strap retracts upward — visually it's
     "holding" the camera that's now centered in the modal. The
     camera-shaped tail stays just visible at the bottom edge. */
  transform: translateY(-72px);
}

@keyframes strap-sway {
  0%, 100% { transform: rotate(0); }
  50% { transform: rotate(1.8deg); }
}

/* The strap fabric — leather-toned, with two columns of stitching
   running its length. The colors are chosen to read as worn leather
   against both light and dark page sections. */
.strap-handle__strap {
  display: block;
  position: relative;
  width: 22px;
  height: 84px;
  background:
    /* center seam */
    linear-gradient(180deg, rgba(0, 0, 0, 0.25), rgba(0, 0, 0, 0.4)),
    /* main leather */
    repeating-linear-gradient(
      180deg,
      #2a1a0e 0,
      #3d2818 6px,
      #2a1a0e 12px
    );
  border-left: 1px solid #1a0f06;
  border-right: 1px solid #1a0f06;
  box-shadow:
    inset 0 0 0 1px rgba(0, 0, 0, 0.35),
    0 4px 10px rgba(0, 0, 0, 0.45);
}
.strap-handle__stitch {
  position: absolute;
  top: 6px;
  bottom: 6px;
  width: 1px;
  background-image: repeating-linear-gradient(
    180deg,
    #c9b88a 0,
    #c9b88a 4px,
    transparent 4px,
    transparent 8px
  );
  opacity: 0.7;
}
.strap-handle__stitch--l { left: 4px; }
.strap-handle__stitch--r { right: 4px; }

/* D-ring at the bottom of the strap — small chrome circle joining
   strap to camera. */
.strap-handle__ring {
  display: block;
  width: 22px;
  height: 22px;
  margin-top: -2px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.55), transparent 55%),
    radial-gradient(circle at 50% 60%, #b6ac95, #6f6657);
  border: 1px solid #1a0f06;
  box-shadow:
    inset 0 -2px 4px rgba(0, 0, 0, 0.4),
    0 2px 4px rgba(0, 0, 0, 0.4);
}

/* Mini camera peeking at the bottom — a stylised cream body with
   a magenta-edged lens, just enough silhouette to read as a camera. */
.strap-handle__cam {
  display: block;
  width: 38px;
  height: 22px;
  margin-top: -4px;
  background: var(--color-cream);
  border: 1.5px solid var(--color-ink);
  border-radius: 3px;
  position: relative;
  box-shadow:
    inset 0 -3px 6px rgba(0, 0, 0, 0.18),
    0 3px 6px rgba(0, 0, 0, 0.4);
}
.strap-handle__lens {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 14px;
  height: 14px;
  margin: -7px 0 0 -7px;
  border-radius: 50%;
  background: var(--color-ink-deep);
  border: 1.5px solid var(--color-pop-magenta);
  box-shadow: 0 0 4px color-mix(in oklab, var(--color-pop-magenta) 60%, transparent);
}
.strap-handle__viewfinder {
  position: absolute;
  top: 3px;
  right: 4px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--color-pop-yellow);
  border: 1px solid var(--color-ink);
}

/* No discovery label below the strap on purpose — visitors are
   meant to figure out the easter egg themselves. The strap's
   silhouette + idle sway is the only affordance. */

/* ============================================================
   Modal overlay — the deployed camera state. Fixed full-viewport,
   dim ink backdrop with backdrop-blur. Click backdrop to retract.
   ============================================================ */
.cam-overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 5rem 1.25rem 2rem;
  background: rgba(13, 12, 10, 0.66);
  -webkit-backdrop-filter: blur(8px) saturate(0.9);
  backdrop-filter: blur(8px) saturate(0.9);
  cursor: zoom-out;
  /* Subtle film-grain on the backdrop so the overlay reads as a
     photo "look-through" rather than a flat scrim. */
  background-image:
    radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.04) 0, transparent 40%),
    radial-gradient(circle at 80% 70%, rgba(255, 255, 255, 0.03) 0, transparent 40%);
}

/* Strap extension — the visual continuation of the strap from the
   top of the viewport down to the camera. Same leather palette as
   the handle so the two read as one continuous strap. */
.cam-strap-ext {
  position: absolute;
  top: 0;
  left: 50%;
  width: 22px;
  height: calc(50vh - 200px);
  margin-left: -11px;
  background:
    linear-gradient(180deg, rgba(0, 0, 0, 0.25), rgba(0, 0, 0, 0.4)),
    repeating-linear-gradient(
      180deg,
      #2a1a0e 0,
      #3d2818 6px,
      #2a1a0e 12px
    );
  border-left: 1px solid #1a0f06;
  border-right: 1px solid #1a0f06;
  pointer-events: none;
}
.cam-strap-ext__stitch {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background-image: repeating-linear-gradient(
    180deg,
    #c9b88a 0,
    #c9b88a 4px,
    transparent 4px,
    transparent 8px
  );
  opacity: 0.7;
}
.cam-strap-ext__stitch--l { left: 4px; }
.cam-strap-ext__stitch--r { right: 4px; }

/* ============================================================
   Camera body — cream cabinet with chrome accents. Same vocabulary
   as the radio so the two devices read as siblings.
   ============================================================ */
.camera {
  position: relative;
  z-index: 1;
  cursor: default;
  display: grid;
  grid-template-rows: auto auto auto auto auto;
  gap: 0.85rem;
  width: min(680px, 96vw);
  padding: 0.95rem 1rem 1.05rem;
  background:
    linear-gradient(180deg, color-mix(in oklab, white 12%, transparent), transparent 45%),
    var(--color-cream);
  border: 1px solid var(--color-ink);
  border-radius: 12px;
  box-shadow:
    inset 0 0 0 1px color-mix(in oklab, var(--color-ink) 18%, transparent),
    inset 0 -10px 22px rgba(0, 0, 0, 0.18),
    0 18px 38px rgba(0, 0, 0, 0.55);
  transition: box-shadow 220ms var(--ease-pop);
}
.camera.is-flashing {
  box-shadow:
    inset 0 0 0 1px color-mix(in oklab, var(--color-ink) 18%, transparent),
    inset 0 -10px 22px rgba(0, 0, 0, 0.18),
    0 0 0 2px color-mix(in oklab, var(--color-pop-yellow) 60%, transparent),
    0 18px 38px rgba(0, 0, 0, 0.55);
}

/* ── Brand strip — chrome nameplate + close button. */
.camera-brand {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.32rem 0.7rem;
  background: var(--color-paper);
  border: 1px solid var(--color-ink);
  border-radius: 4px;
  font-family: var(--font-display);
  font-size: 0.75rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}
.camera-mark { color: var(--color-pop-magenta); font-size: 0.95rem; }
.camera-name { flex: 1; }
.camera-model {
  font-family: var(--font-mono);
  font-size: 0.55rem;
  letter-spacing: 0.22em;
  opacity: 0.65;
}
.camera-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  background: var(--color-cream);
  color: var(--color-ink);
  border: 1px solid var(--color-ink);
  border-radius: 4px;
  cursor: pointer;
  transition:
    background-color 220ms var(--ease-pop),
    color 220ms var(--ease-pop);
}
.camera-close:hover {
  background: var(--color-pop-magenta);
  color: var(--color-cream);
}

/* ── Lens block + viewfinder readout */
.camera-viewport {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}
.viewfinder-readout {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0.6rem;
  background: var(--color-paper);
  border: 1px solid var(--color-ink);
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 0.55rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}
.readout-led {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: color-mix(in oklab, var(--color-ink) 35%, transparent);
  box-shadow: inset 0 0 0 1px var(--color-ink);
  transition: background-color 260ms var(--ease-pop), box-shadow 260ms var(--ease-pop);
}
.readout-led.is-on {
  background: var(--color-pop-magenta);
  box-shadow:
    inset 0 0 0 1px var(--color-ink),
    0 0 6px color-mix(in oklab, var(--color-pop-magenta) 70%, transparent);
  animation: readout-led-pulse 1.4s ease-in-out infinite;
}
@keyframes readout-led-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
}
.readout-label { flex: 1; color: var(--color-ink); }
.readout-meta {
  color: color-mix(in oklab, var(--color-ink) 55%, transparent);
  font-size: 0.55rem;
}

/* ── Camera picker — sibling chrome strip below the readout. Only
   rendered when 2+ cams are visible after permission. Same paper +
   ink-border vocabulary as the readout above so the two read as a
   stacked pair of LED strips on the camera body. */
.viewfinder-pick {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0.6rem;
  background: var(--color-paper);
  border: 1px solid var(--color-ink);
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 0.55rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
}
.pick-label {
  color: var(--color-pop-magenta);
  flex: 0 0 auto;
}
/* Native <select> stripped of OS chrome and re-skinned to match the
   readout. We keep `appearance: none` for cross-browser parity but
   draw our own chevron so the affordance still reads. min-width: 0
   on the flex item lets the option text truncate inside the strip
   instead of forcing the whole row to overflow. */
.pick-select {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: none;
  color: var(--color-ink);
  font-family: var(--font-mono);
  font-size: 0.55rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  cursor: pointer;
  padding: 0;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}
.pick-select:focus-visible {
  outline: 1px solid var(--color-pop-yellow);
  outline-offset: 2px;
  border-radius: 2px;
}
.pick-select:disabled {
  opacity: 0.55;
  cursor: progress;
}
/* Restore legible option text inside the OS-rendered popup — most
   browsers drop our 0.55rem font-size from the dropdown list, but
   not the letter-spacing, which makes options unreadable otherwise. */
.pick-select option {
  font-size: 0.8rem;
  letter-spacing: 0.04em;
  text-transform: none;
  color: var(--color-ink);
  background: var(--color-paper);
}
.pick-chevron {
  flex: 0 0 auto;
  color: color-mix(in oklab, var(--color-ink) 60%, transparent);
  font-size: 0.7rem;
  line-height: 1;
  pointer-events: none;
}

/* Lens — round halftone iris with the live video clipped inside. */
.camera-lens-block {
  display: flex;
  justify-content: center;
  padding: 0.3rem 0;
}
.camera-lens {
  position: relative;
  width: 240px;
  height: 240px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 36% 32%, color-mix(in oklab, var(--color-cream) 90%, transparent), transparent 55%),
    radial-gradient(circle at 50% 60%, color-mix(in oklab, var(--color-ink) 88%, transparent), var(--color-ink));
  border: 2px solid var(--color-ink);
  box-shadow:
    inset 0 0 0 6px color-mix(in oklab, var(--color-cream) 22%, transparent),
    inset 0 -10px 22px rgba(0, 0, 0, 0.55),
    0 6px 0 rgba(0, 0, 0, 0.35),
    0 12px 22px rgba(0, 0, 0, 0.42);
  overflow: hidden;
}
.lens-glass {
  position: absolute;
  inset: 14%;
  border-radius: 50%;
  overflow: hidden;
  background: var(--color-ink-soft);
  box-shadow:
    inset 0 0 0 1px color-mix(in oklab, var(--color-cream) 30%, transparent),
    inset 0 0 18px rgba(0, 0, 0, 0.7);
}
.lens-video,
.lens-fallback {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.lens-video {
  /* Mirror the preview so the user sees themselves selfie-style. */
  transform: scaleX(-1);
}
.lens-fallback {
  filter: brightness(0.65) contrast(1.1) saturate(0.75);
  opacity: 0.35;
}
.lens-iris-ring {
  position: absolute;
  inset: 6%;
  border-radius: 50%;
  border: 2px solid var(--color-pop-magenta);
  opacity: 0.65;
  box-shadow: 0 0 12px color-mix(in oklab, var(--color-pop-magenta) 50%, transparent);
  pointer-events: none;
}
.lens-glint {
  position: absolute;
  top: 22%; left: 28%;
  width: 16%; height: 10%;
  border-radius: 50%;
  background: color-mix(in oklab, white 70%, transparent);
  filter: blur(2px);
  opacity: 0.45;
  pointer-events: none;
}

/* Lens status overlay — the "Allow camera" CTA + status copy. */
.lens-status {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 0.6rem;
  background: rgba(13, 12, 10, 0.45);
  pointer-events: auto;
}
.lens-status__group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.55rem;
  color: var(--color-cream);
}
.lens-status__eyebrow {
  font-family: var(--font-mono);
  font-size: 0.55rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--color-pop-magenta);
  animation: status-flicker 1.8s ease-in-out infinite;
}
@keyframes status-flicker {
  0%, 100% { opacity: 1; }
  20% { opacity: 0.4; }
  22% { opacity: 1; }
  60% { opacity: 0.85; }
  62% { opacity: 1; }
}
.lens-status__cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.45rem 0.95rem;
  background: var(--color-pop-magenta);
  color: var(--color-cream);
  border: 1.5px solid var(--color-ink);
  border-radius: 4px;
  font-family: var(--font-display);
  font-size: 0.85rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  cursor: pointer;
  box-shadow:
    inset 0 -2px 0 rgba(0, 0, 0, 0.3),
    0 3px 0 rgba(0, 0, 0, 0.4);
  transition:
    transform 120ms var(--ease-pop),
    box-shadow 120ms var(--ease-pop);
}
.lens-status__cta:hover {
  transform: translateY(-1px);
}
.lens-status__cta:active {
  transform: translateY(2px);
  box-shadow:
    inset 0 2px 4px rgba(0, 0, 0, 0.5),
    0 0 0 transparent;
}
.lens-status__cta--small {
  padding: 0.28rem 0.7rem;
  font-size: 0.65rem;
}
.lens-status__hint {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 0.78rem;
  color: color-mix(in oklab, var(--color-cream) 80%, transparent);
  max-width: 18ch;
  line-height: 1.25;
}
.status-fade-enter-active,
.status-fade-leave-active {
  transition: opacity 240ms var(--ease-pop);
}
.status-fade-enter-from,
.status-fade-leave-to {
  opacity: 0;
}

/* ── Shutter row — the big magenta cap. */
.camera-shutter-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  padding-top: 0.25rem;
}
.camera-shutter {
  position: relative;
  width: 78px;
  height: 78px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 120ms var(--ease-pop);
}
.camera-shutter:active { transform: translateY(2px); }
.camera-shutter:disabled,
.camera-shutter.is-busy {
  cursor: progress;
  opacity: 0.85;
}
.camera-shutter:focus-visible {
  outline: 2px solid var(--color-pop-yellow);
  outline-offset: 4px;
  border-radius: 50%;
}
.shutter-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background:
    radial-gradient(circle at 32% 28%, color-mix(in oklab, var(--color-cream) 70%, transparent), transparent 55%),
    radial-gradient(circle at 50% 60%, color-mix(in oklab, var(--color-ink) 88%, transparent), var(--color-ink));
  border: 2px solid var(--color-ink);
  box-shadow:
    inset 0 0 0 3px color-mix(in oklab, var(--color-cream) 22%, transparent),
    inset 0 -5px 10px rgba(0, 0, 0, 0.55),
    0 3px 0 rgba(0, 0, 0, 0.4),
    0 5px 10px rgba(0, 0, 0, 0.32);
}
.shutter-cap {
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 35% 32%, color-mix(in oklab, white 35%, transparent), transparent 55%),
    var(--color-pop-magenta);
  border: 1.5px solid var(--color-ink);
  box-shadow:
    inset 0 -3px 6px rgba(0, 0, 0, 0.4),
    0 1px 0 rgba(0, 0, 0, 0.3);
}
.camera-shutter:active .shutter-cap {
  box-shadow:
    inset 0 3px 6px rgba(0, 0, 0, 0.55),
    0 0 0 transparent;
}
.camera-shutter__label {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: color-mix(in oklab, var(--color-ink) 70%, transparent);
}

/* ============================================================
   Stack — fan of prints below the camera. Same fan geometry as
   the previous iteration; pointer events handle riffle drag and
   click-to-focus / click-to-flip.
   ============================================================ */
.print-stack {
  position: relative;
  z-index: 1;
  perspective: 1400px;
  perspective-origin: 50% 40%;
  min-height: 280px;
  padding: 0.5rem 0.5rem 0.5rem 0.5rem;
  cursor: grab;
  touch-action: pan-y;
  user-select: none;
}
.print-stack.is-dragging { cursor: grabbing; }
.print-empty {
  position: absolute;
  inset: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  border: 1.5px dashed color-mix(in oklab, var(--color-ink) 35%, transparent);
  border-radius: 8px;
  font-family: var(--font-mono);
  font-size: 0.6rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: color-mix(in oklab, var(--color-ink) 55%, transparent);
}
.print-empty__line {
  display: inline-block;
  width: 24px;
  height: 1px;
  background: color-mix(in oklab, var(--color-ink) 45%, transparent);
}
.print-empty__cue {
  white-space: nowrap;
}

.print {
  position: absolute;
  top: 0.5rem;
  left: 50%;
  width: 200px;
  margin-left: -100px;
  aspect-ratio: 5 / 6.4;
  background: transparent;
  cursor: pointer;
  transform-style: preserve-3d;
  transition:
    transform 480ms var(--ease-pop),
    filter 320ms var(--ease-pop);
}
.print.is-front {
  filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.4));
}

.print.is-ejecting {
  animation: print-eject 0.85s var(--ease-pop) both;
}
@keyframes print-eject {
  0% {
    transform: translate3d(0, -120px, 0) rotate(2deg) scale(0.9);
    opacity: 0;
  }
  60% {
    transform: translate3d(8px, -4px, 0) rotate(2deg) scale(1.02);
    opacity: 1;
  }
  100% {
    opacity: 1;
  }
}

.print-flip {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 540ms var(--ease-pop);
}
.print.is-flipped .print-flip {
  transform: rotateY(180deg);
}
.print-face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  background: var(--color-paper);
  border: 1px solid color-mix(in oklab, var(--color-ink) 35%, transparent);
  border-radius: 4px;
  box-shadow:
    0 1px 0 color-mix(in oklab, var(--color-ink) 12%, transparent),
    0 6px 14px rgba(0, 0, 0, 0.32);
  background-image:
    radial-gradient(circle at 22% 30%, rgba(0, 0, 0, 0.025) 0, transparent 40%),
    radial-gradient(circle at 78% 70%, rgba(0, 0, 0, 0.03) 0, transparent 40%);
}
.print-face--back {
  transform: rotateY(180deg);
}

.print-face--front {
  display: grid;
  grid-template-rows: 1fr auto;
  padding: 8% 8% 0 8%;
}
.print-photo {
  position: relative;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  background: var(--color-cream-dim);
  border: 1px solid color-mix(in oklab, var(--color-ink) 25%, transparent);
}
.print-photo__base {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  opacity: 0;
  animation: photo-base-fade var(--develop-ms, 1500ms) ease-out forwards;
}
.print-photo__grain {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    radial-gradient(circle at 20% 10%, rgba(0, 0, 0, 0.06) 0, transparent 40%),
    radial-gradient(circle at 80% 90%, rgba(0, 0, 0, 0.05) 0, transparent 40%);
  mix-blend-mode: multiply;
}

/* CMY misregistration overlays — the riso bloom over the photo.
   Intentionally subtle on cam captures because the canvas filter
   already baked CMY layers into the pixels; the CSS layers mostly
   sell the resting misregistration so the print never reads as a
   clean digital photo. */
.print-photo__ink {
  position: absolute;
  inset: 0;
  pointer-events: none;
  -webkit-mask-image: var(--shot-mask, none);
  mask-image: var(--shot-mask, none);
  -webkit-mask-size: cover;
  mask-size: cover;
  -webkit-mask-position: center;
  mask-position: center;
  mix-blend-mode: multiply;
  transform: translate(0, 0);
  opacity: 0;
}
.print-photo__ink--c {
  background: #5ec8e5;
  animation: ink-cyan var(--develop-ms, 1500ms) var(--ease-pop) forwards;
}
.print-photo__ink--m {
  background: var(--color-pop-magenta);
  animation: ink-magenta var(--develop-ms, 1500ms) var(--ease-pop) forwards;
  animation-delay: 0.18s;
}
.print-photo__ink--y {
  background: var(--color-pop-yellow);
  animation: ink-yellow var(--develop-ms, 1500ms) var(--ease-pop) forwards;
  animation-delay: 0.34s;
}

/* For cam captures, drop the residual riso overlay even further —
   the canvas filter already did the heavy lifting. */
.print.is-cam .print-photo__ink--c {
  --rest-c-opacity: 0.18;
}
.print.is-cam .print-photo__ink--m {
  --rest-m-opacity: 0.20;
}
.print.is-cam .print-photo__ink--y {
  --rest-y-opacity: 0.14;
}

@keyframes photo-base-fade {
  0% { opacity: 0; }
  40% { opacity: 0; }
  100% { opacity: 1; }
}
@keyframes ink-cyan {
  0%   { transform: translate(-9px, 6px); opacity: 0; }
  20%  { opacity: 0.75; }
  60%  { opacity: 0.6; }
  100% { transform: translate(-1.5px, 1px); opacity: var(--rest-c-opacity, 0.32); }
}
@keyframes ink-magenta {
  0%   { transform: translate(7px, -5px); opacity: 0; }
  20%  { opacity: 0.85; }
  60%  { opacity: 0.65; }
  100% { transform: translate(1.5px, -1px); opacity: var(--rest-m-opacity, 0.38); }
}
@keyframes ink-yellow {
  0%   { transform: translate(2px, 8px); opacity: 0; }
  25%  { opacity: 0.7; }
  60%  { opacity: 0.55; }
  100% { transform: translate(0.5px, 1.5px); opacity: var(--rest-y-opacity, 0.28); }
}

.print:not(.is-developing) .print-photo__base {
  opacity: 1;
  animation: none;
}
.print:not(.is-developing) .print-photo__ink--c {
  animation: none;
  transform: translate(-1.5px, 1px);
  opacity: var(--rest-c-opacity, 0.32);
}
.print:not(.is-developing) .print-photo__ink--m {
  animation: none;
  transform: translate(1.5px, -1px);
  opacity: var(--rest-m-opacity, 0.38);
}
.print:not(.is-developing) .print-photo__ink--y {
  animation: none;
  transform: translate(0.5px, 1.5px);
  opacity: var(--rest-y-opacity, 0.28);
}

.print-border {
  padding: 0.55rem 0.1rem 0.65rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  text-align: center;
}
/* Front-face field note — the handwritten line under the photo. We
   render the same `backNote` here as on the back; the script picks
   each print's note at capture time so flips never contradict. Sized
   smaller than the back-face note (0.72 vs 0.95rem) because the front
   border has only ~52px of vertical room between photo and stamp,
   and a long line of italic serif at the back's size would force the
   stamp out the bottom. The 3-line clamp is the safety net for
   unusually long pool entries. `text-wrap: balance` keeps two-line
   notes from leaving an orphaned word on line 2. */
.print-front-note {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 0.72rem;
  line-height: 1.25;
  color: var(--color-ink);
  margin: 0;
  text-wrap: balance;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.print-stamp {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.3rem;
  font-family: var(--font-mono);
  font-size: 0.55rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: color-mix(in oklab, var(--color-ink) 65%, transparent);
}
.print-stamp__sep { opacity: 0.55; }
.print-stamp__num { color: var(--color-pop-magenta); }

/* ── "Flip me" sticker — small magenta tag pinned to the top-right
   of the front face. Only renders on the front (focused) print and
   only until that specific print has been flipped at least once.
   The tilt + soft pulse give it a "stuck-on-after-the-fact" feel,
   like a Post-It rather than baked print typography — so the front
   reads as the polaroid and the sticker reads as a hint laid on
   top of it. */
.print-flip-hint {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 4;
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.18rem 0.4rem 0.16rem;
  background: var(--color-pop-magenta);
  color: var(--color-cream);
  border: 1px solid var(--color-ink);
  border-radius: 3px;
  font-family: var(--font-mono);
  font-size: 0.5rem;
  font-weight: 500;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  pointer-events: none;
  /* Tilt and chunky riso shadow so the sticker reads as physical
     paper, not UI chrome. */
  transform: rotate(6deg);
  transform-origin: 100% 0;
  box-shadow:
    0.08em 0.08em 0 rgba(13, 12, 10, 0.32),
    0 2px 4px rgba(0, 0, 0, 0.3);
  animation: flip-hint-bob 1.8s ease-in-out infinite;
}
.print-flip-hint__icon {
  display: inline-block;
  font-size: 0.7rem;
  line-height: 1;
  /* The little arrow rotates so the sticker looks alive rather than
     printed. Slow enough to read as gesture, not animation. */
  animation: flip-hint-spin 3.2s linear infinite;
}
.print-flip-hint__label { font-size: 0.5rem; }
@keyframes flip-hint-bob {
  0%, 100% { transform: rotate(6deg) translateY(0); }
  50% { transform: rotate(8deg) translateY(-2px); }
}
@keyframes flip-hint-spin {
  from { transform: rotate(0); }
  to { transform: rotate(360deg); }
}
.flip-hint-fade-enter-active,
.flip-hint-fade-leave-active {
  transition:
    opacity 320ms var(--ease-pop),
    transform 320ms var(--ease-pop);
}
.flip-hint-fade-enter-from {
  opacity: 0;
  transform: rotate(6deg) translateY(-6px) scale(0.9);
}
.flip-hint-fade-leave-to {
  opacity: 0;
  transform: rotate(6deg) translate(8px, -8px) scale(0.95);
}

.print-back {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 1rem 1rem 0.85rem;
  background-image: repeating-linear-gradient(
    180deg,
    transparent 0,
    transparent 22px,
    color-mix(in oklab, var(--color-pop-magenta) 12%, transparent) 22px,
    color-mix(in oklab, var(--color-pop-magenta) 12%, transparent) 23px
  );
}
.print-back__eyebrow {
  font-family: var(--font-mono);
  font-size: 0.55rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--color-pop-magenta);
}
.print-back__line {
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 0.95rem;
  line-height: 1.35;
  color: var(--color-ink);
  margin-top: 0.45rem;
  text-wrap: balance;
}
.print-back__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: auto;
  padding-top: 0.6rem;
  font-family: var(--font-mono);
  font-size: 0.55rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: color-mix(in oklab, var(--color-ink) 70%, transparent);
}
.print-back__loc {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}
.print-back__date {
  color: color-mix(in oklab, var(--color-ink) 55%, transparent);
}
.print-back__signoff {
  margin-top: 0.4rem;
  text-align: right;
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 0.85rem;
  color: var(--color-pop-magenta);
}
.print-back__hand {
  display: inline-block;
  transform: rotate(-6deg);
}

/* ============================================================
   Footer — archive caption + keyboard cheatsheet
   ============================================================ */
.camera-footer {
  margin-top: 0.5rem;
  padding-top: 0.85rem;
  border-top: 1px dashed color-mix(in oklab, var(--color-ink) 35%, transparent);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.85rem;
}
.camera-archive {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}
.camera-archive__label {
  font-family: var(--font-mono);
  font-size: 0.55rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: color-mix(in oklab, var(--color-ink) 65%, transparent);
}
.camera-archive__id {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  color: var(--color-ink);
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
.camera-archive__dot { opacity: 0.45; }
.camera-archive__date { color: var(--color-pop-magenta); }

/* Save print — yellow sticker button between the archive caption
   and the keys cheatsheet. The hard ink shadow + small lift on
   hover mirrors the rest of the kit's "punched-out sticker" feel
   (same shadow vocabulary as the strap-handle's drop and the
   .print-flip-hint badge), so the button reads as part of the
   polaroid family rather than generic chrome. */
.camera-save {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.85rem;
  background: var(--color-pop-yellow);
  color: var(--color-ink);
  border: 1.5px solid var(--color-ink);
  border-radius: 4px;
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 0.65rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  white-space: nowrap;
  box-shadow:
    0.12em 0.12em 0 var(--color-ink),
    0 2px 4px rgba(0, 0, 0, 0.32);
  transition:
    transform 220ms var(--ease-pop),
    box-shadow 220ms var(--ease-pop),
    background 220ms ease;
}
.camera-save:hover:not(:disabled) {
  transform: translate(-1px, -1px);
  box-shadow:
    0.16em 0.16em 0 var(--color-ink),
    0 4px 8px rgba(0, 0, 0, 0.36);
  background: color-mix(in oklab, var(--color-pop-yellow) 88%, var(--color-pop-orange));
}
.camera-save:active:not(:disabled) {
  transform: translate(0.06em, 0.06em);
  box-shadow:
    0.04em 0.04em 0 var(--color-ink),
    0 1px 2px rgba(0, 0, 0, 0.32);
}
.camera-save:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  filter: grayscale(0.5);
}
.camera-save__spin {
  animation: camera-save-spin 0.9s linear infinite;
  transform-origin: center;
}
@keyframes camera-save-spin {
  from { transform: rotate(0); }
  to   { transform: rotate(360deg); }
}

.camera-keys {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem;
  font-family: var(--font-mono);
  font-size: 0.55rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: color-mix(in oklab, var(--color-ink) 70%, transparent);
}
.camera-keys kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  padding: 0.1rem 0.4rem;
  background: var(--color-cream);
  border: 1px solid var(--color-ink);
  border-radius: 3px;
  font-size: 0.55rem;
  font-family: var(--font-mono);
  color: var(--color-ink);
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.25);
}

/* ============================================================
   Modal enter/leave — backdrop fades, camera drops in from above
   on the strap, retracts back up on close.
   ============================================================ */
.cam-deploy-enter-active,
.cam-deploy-leave-active {
  transition:
    opacity 360ms var(--ease-pop),
    backdrop-filter 360ms var(--ease-pop);
}
.cam-deploy-enter-active .camera,
.cam-deploy-leave-active .camera {
  transition:
    transform 460ms var(--ease-pop),
    opacity 360ms var(--ease-pop);
}
.cam-deploy-enter-from,
.cam-deploy-leave-to {
  opacity: 0;
  -webkit-backdrop-filter: blur(0) saturate(1);
  backdrop-filter: blur(0) saturate(1);
}
.cam-deploy-enter-from .camera,
.cam-deploy-leave-to .camera {
  transform: translateY(-220px) rotate(-3deg);
  opacity: 0;
}
.cam-deploy-enter-active .cam-strap-ext,
.cam-deploy-leave-active .cam-strap-ext {
  transition: height 460ms var(--ease-pop);
}
.cam-deploy-enter-from .cam-strap-ext,
.cam-deploy-leave-to .cam-strap-ext {
  height: 0;
}

/* ============================================================
   Reduced motion — hold the strap still, drop the develop /
   deploy / sway animations. Keeps the artifact functional but
   visually flat for users who asked for it.
   ============================================================ */
@media (prefers-reduced-motion: reduce) {
  .strap-handle,
  .camera,
  .camera.is-flashing,
  .print,
  .print.is-ejecting,
  .print-flip,
  .print-flip-hint,
  .print-flip-hint__icon,
  .print-photo__base,
  .print-photo__ink--c,
  .print-photo__ink--m,
  .print-photo__ink--y,
  .lens-status__eyebrow,
  .readout-led.is-on,
  .camera-save__spin {
    animation: none !important;
    transition: none !important;
  }
  /* Hold the sticker still + readable for reduced-motion users. */
  .print-flip-hint { transform: rotate(6deg); }
  .print-flip-hint__icon { transform: none; }
  .print-photo__base { opacity: 1; }
  .print-photo__ink--c { transform: translate(-1.5px, 1px); opacity: 0.32; }
  .print-photo__ink--m { transform: translate(1.5px, -1px); opacity: 0.38; }
  .print-photo__ink--y { transform: translate(0.5px, 1.5px); opacity: 0.28; }
  .print.is-flipped .print-flip {
    transform: rotateY(180deg);
  }
  .cam-deploy-enter-active,
  .cam-deploy-leave-active,
  .cam-deploy-enter-active .camera,
  .cam-deploy-leave-active .camera,
  .cam-deploy-enter-active .cam-strap-ext,
  .cam-deploy-leave-active .cam-strap-ext {
    transition: opacity 200ms ease;
  }
  .cam-deploy-enter-from .camera,
  .cam-deploy-leave-to .camera {
    transform: none;
  }
}
</style>
