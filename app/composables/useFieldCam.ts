/**
 * useFieldCam — webcam plumbing for `FieldPolaroid.vue`. Owns the
 * permission state machine, the active `MediaStream`, the `<video>`
 * element ref, and the canvas-based riso filter that turns a frame
 * into a print.
 *
 * Splits cleanly from `useTodaysShot` so the polaroid component can
 * keep both as inputs: live cam frames when the visitor grants
 * permission, today's curated daily shot as a graceful fallback when
 * they decline (or no cam is available — server-rendered, ancient
 * browser, mobile without one). Either path produces a print; the
 * border + caption + flipped field-note overlays are identical.
 *
 * State machine:
 *   'idle'        — never asked. Strap pulled, no preview yet.
 *   'requesting'  — `getUserMedia` in flight. Spinner-ish UI.
 *   'live'        — stream attached to `videoEl`, ready to capture.
 *   'denied'      — user said no, or browser blocked. Fallback path.
 *   'unavailable' — no `navigator.mediaDevices` at all (SSR / very old).
 *   'error'       — anything else (NotReadableError, AbortError, etc.).
 *
 * Device selection:
 *   - First `start()` defaults to `facingMode: 'user'` (front-facing).
 *   - After permission is granted we enumerate `videoinput` devices —
 *     labels are intentionally blanked by browsers until the user has
 *     consented at least once, so the list only becomes useful then.
 *   - `switchCamera(deviceId)` stops the live stream and re-acquires
 *     against the picked device. We pin the actual deviceId from the
 *     live track's `getSettings()` so `selectedDeviceId` matches what
 *     the browser actually handed us (which can differ from the hint).
 *   - `devicechange` listener keeps the list fresh while live (USB cam
 *     plugged in mid-session, OBS virtual cam toggled on, etc.).
 *
 * Lifecycle care:
 *   - `stop()` MUST be called when the polaroid is retracted so the
 *     browser's camera-in-use indicator goes off — losing user trust
 *     is the single worst outcome here.
 *   - SSR-safe: every `navigator` access is guarded by `typeof
 *     window !== 'undefined'`. The composable's refs are still
 *     reactive on the server, just inert.
 */

const FILTER_SIZE = 600 // square output, a touch larger than the print's display size for crispness

export type FieldCamStatus
  = | 'idle'
    | 'requesting'
    | 'live'
    | 'denied'
    | 'unavailable'
    | 'error'

export function useFieldCam() {
  const status = ref<FieldCamStatus>('idle')
  const videoEl = ref<HTMLVideoElement | null>(null)
  // Discovered `videoinput` devices, refreshed after each successful
  // start (when labels become available) and on `devicechange`. Empty
  // before the first permission grant — browsers blank the labels
  // until the user has consented at least once, so an empty list here
  // means "we haven't been told what's available yet" not "no cams".
  const videoDevices = ref<MediaDeviceInfo[]>([])
  // The deviceId we're currently streaming from. `null` means "browser
  // picked the default" — we pin it the first time a stream goes live
  // so the picker reflects reality. Persists across deploy/retract so
  // the user's choice survives within a session.
  const selectedDeviceId = ref<string | null>(null)
  // The stream sits outside Vue's reactive system — Mediastream
  // objects don't play well with deep reactivity, and we only ever
  // need to flip a switch when the status changes.
  let stream: MediaStream | null = null
  // Bound while live so we react to USB cams being plugged/unplugged
  // mid-session. Tracked in module scope so we can detach symmetrically
  // on stop().
  let devicechangeHandler: (() => void) | null = null

  function isAvailable(): boolean {
    return typeof window !== 'undefined'
      && typeof navigator !== 'undefined'
      && !!navigator.mediaDevices
      && typeof navigator.mediaDevices.getUserMedia === 'function'
  }

  /**
   * Refresh `videoDevices` from `enumerateDevices()`. Cheap call;
   * fail-silent. Labels are only populated after the first successful
   * permission grant — pre-grant the list will contain entries with
   * empty `label` strings (or be entirely empty in some browsers).
   */
  async function enumerateVideoInputs(): Promise<void> {
    if (!isAvailable() || typeof navigator.mediaDevices.enumerateDevices !== 'function') {
      videoDevices.value = []
      return
    }
    try {
      const all = await navigator.mediaDevices.enumerateDevices()
      videoDevices.value = all.filter(d => d.kind === 'videoinput')
    }
    catch {
      videoDevices.value = []
    }
  }

  function bindDevicechange() {
    if (devicechangeHandler || !isAvailable()) return
    devicechangeHandler = () => { void enumerateVideoInputs() }
    navigator.mediaDevices.addEventListener('devicechange', devicechangeHandler)
  }

  function unbindDevicechange() {
    if (!devicechangeHandler || !isAvailable()) return
    navigator.mediaDevices.removeEventListener('devicechange', devicechangeHandler)
    devicechangeHandler = null
  }

  /**
   * Request camera permission and start streaming into `videoEl`.
   * Idempotent — calling it while already 'live' is a no-op. Pass an
   * explicit `deviceId` to target a specific camera; otherwise we use
   * the previously-selected one (if any), falling back to a generic
   * front-facing hint on first use.
   */
  async function start(deviceId?: string): Promise<void> {
    if (status.value === 'live' || status.value === 'requesting') return
    if (!isAvailable()) {
      status.value = 'unavailable'
      return
    }
    status.value = 'requesting'

    // Build constraints. When we know which device we want we ask for
    // it `exact` so the browser doesn't silently substitute; when we
    // don't, fall back to the front-facing hint we shipped with — the
    // selfie path is still the most common first-use intent.
    const targetId = deviceId ?? selectedDeviceId.value
    const videoConstraint: MediaTrackConstraints = {
      // Square-ish ideal so the filter's center-crop isn't too
      // aggressive on either axis. We don't constrain hard — any
      // reasonable webcam will satisfy `ideal`.
      width: { ideal: 1280 },
      height: { ideal: 720 },
    }
    if (targetId) {
      videoConstraint.deviceId = { exact: targetId }
    }
    else {
      videoConstraint.facingMode = 'user'
    }

    try {
      const next = await navigator.mediaDevices.getUserMedia({
        video: videoConstraint,
        audio: false,
      })
      stream = next
      // Pin the actual deviceId from the live track. With `facingMode`
      // the browser made the choice; with `deviceId: exact` we already
      // know what matched, but reading back keeps `selectedDeviceId`
      // honest in both paths and surfaces the truth to the picker UI.
      const track = next.getVideoTracks()[0]
      const liveId = track?.getSettings().deviceId
      if (liveId) selectedDeviceId.value = liveId

      // Wait a tick so the template ref is bound before we attach.
      // Without this nextTick, the very first deploy can race the
      // `<video ref="videoEl">` mount and miss it.
      await nextTick()
      const v = videoEl.value
      if (v) {
        v.srcObject = next
        v.muted = true
        // iOS Safari refuses to play full-screen unless inline is set.
        v.setAttribute('playsinline', '')
        v.setAttribute('autoplay', '')
        try { await v.play() }
        catch { /* play() can reject if the user backgrounded the tab */ }
      }
      status.value = 'live'

      // Now that permission is granted, device labels are exposed —
      // refresh the list so the picker has human-readable names.
      // Bind devicechange too so the list stays fresh while live.
      await enumerateVideoInputs()
      bindDevicechange()
    }
    catch (err) {
      // Distinguish denied vs other errors. Modern browsers throw
      // NotAllowedError for explicit deny; older Safari throws
      // PermissionDeniedError. Either way: treat as denied so the UI
      // can switch to the fallback path.
      const name = (err as { name?: string } | null)?.name ?? ''

      // The pinned device is gone (unplugged between sessions, OBS
      // virtual cam quit, etc.). Clear the saved deviceId and retry
      // once with the default — better UX than dumping the user into
      // the error state because we held a stale reference.
      if ((name === 'OverconstrainedError' || name === 'NotFoundError') && targetId) {
        selectedDeviceId.value = null
        status.value = 'idle'
        await start()
        return
      }
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        status.value = 'denied'
      }
      else {
        status.value = 'error'
      }
    }
  }

  /**
   * Stop the live stream and start a new one against the requested
   * device. No-op if we're already on it. We tear down before
   * re-acquiring because most platforms refuse a second
   * `getUserMedia` while the first track is still live (mobile in
   * particular — the camera hardware feeds one consumer at a time).
   */
  async function switchCamera(deviceId: string): Promise<void> {
    if (!deviceId) return
    if (deviceId === selectedDeviceId.value && status.value === 'live') return
    stop()
    selectedDeviceId.value = deviceId
    await start(deviceId)
  }

  /**
   * Stop the stream and detach from the video element. Safe to call
   * repeatedly. Critical: when the user retracts the polaroid, this
   * is what makes the browser's camera-in-use indicator turn off.
   */
  function stop(): void {
    if (stream) {
      for (const track of stream.getTracks()) track.stop()
      stream = null
    }
    const v = videoEl.value
    if (v) {
      try { v.pause() }
      catch { /* ignore */ }
      v.srcObject = null
    }
    // Detach the devicechange listener while we're idle — we'll
    // re-enumerate on the next start() anyway, so an unbound listener
    // here is just a leak waiting to happen on hot-reload.
    unbindDevicechange()
    // Don't reset status all the way to 'idle' — preserve 'denied' /
    // 'error' so the UI keeps showing the fallback path. Only the
    // happy 'live' state reverts to 'idle'.
    if (status.value === 'live' || status.value === 'requesting') {
      status.value = 'idle'
    }
  }

  /**
   * Grab a frame from `videoEl`, run the riso filter, return a
   * data URL the caller can assign as a print's image source.
   * Resolves to `null` if the cam isn't live or the canvas blew up.
   */
  async function capture(): Promise<string | null> {
    const v = videoEl.value
    if (!v || status.value !== 'live') return null
    if (!v.videoWidth || !v.videoHeight) return null

    try {
      // Cast bridges the gap between Vue's template-ref DOM type
      // (a deeply specific structural type derived from the project's
      // vue-tsc DOM lib) and the canonical lib-dom `HTMLVideoElement`
      // expected by the canvas helper. Same shape, different declaration
      // origin — same hazard as `obs.observe(el.value)` elsewhere in
      // this codebase. Narrow type assertion keeps it tight.
      return applyRisoFilter(v as unknown as HTMLVideoElement)
    }
    catch {
      return null
    }
  }

  // ── Lifecycle: defensive cleanup. Component-level callers will
  // typically own the lifecycle, but if they forget, the composable
  // shouldn't leak the camera light.
  onBeforeUnmount(() => stop())

  return {
    status,
    videoEl,
    videoDevices,
    selectedDeviceId,
    start,
    stop,
    capture,
    switchCamera,
    isAvailable,
  }
}

/**
 * applyRisoFilter — turn a `<video>` frame into a riso-print-feeling
 * data URL. Pure helper; lives here because it's only ever called
 * from inside the composable. The chain:
 *
 *   1. Center-crop the live frame into a square, mirrored (selfie).
 *   2. Boost contrast + drop saturation slightly for a printed feel.
 *   3. Three offset color passes (cyan, magenta, yellow) drawn in
 *      `multiply` mode — the same misregistration trick the static
 *      polaroids use, just baked into pixels.
 *   4. A halftone dot pattern overlay at low alpha so the print
 *      doesn't read as a clean digital photo.
 *   5. Per-pixel grain noise.
 *   6. A faint vignette so attention lands on the subject's face.
 *
 * Every step uses Canvas2D APIs that have shipped in every browser
 * since 2018, so there's no feature-detection path. If something
 * fails the caller catches and falls back.
 */
function applyRisoFilter(video: HTMLVideoElement): string {
  const W = FILTER_SIZE
  const H = FILTER_SIZE

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas-context-unavailable')

  // Cream paper — anything left transparent ends up this color, which
  // matches the polaroid border and the rest of the design system.
  ctx.fillStyle = '#fbf6e9'
  ctx.fillRect(0, 0, W, H)

  // Center-crop calculation. We pull the largest square that fits
  // inside the frame, centered, so we never letterbox on a wide cam.
  const vw = video.videoWidth
  const vh = video.videoHeight
  const sz = Math.min(vw, vh)
  const sx = (vw - sz) / 2
  const sy = (vh - sz) / 2

  // Helper: draw the video frame into the canvas, mirrored, with an
  // optional filter and offset. We always mirror because the user
  // sees themselves the way a real selfie cam would show them.
  function drawFrame(filter: string, dx: number, dy: number, alpha: number, comp: GlobalCompositeOperation = 'source-over') {
    if (!ctx) return
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.globalCompositeOperation = comp
    ctx.filter = filter
    ctx.translate(W, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, sx, sy, sz, sz, dx, dy, W, H)
    ctx.restore()
  }

  // Pass 1 — base photograph. Bumped contrast + slight desaturation
  // gives the riso print look (most riso printers can't carry full
  // saturation, so a touch flat reads as "actually printed").
  drawFrame('contrast(1.25) saturate(0.7) brightness(1.05)', 0, 0, 0.92)

  // Pass 2 — magenta misregistration. Each colored pass is a
  // hue-rotated heavily-saturated copy of the same frame, drawn
  // offset by a few pixels in `multiply` mode. The hue-rotate
  // approach beats a flat colored fill because it preserves the
  // tonal information in that channel — exactly how a riso plate
  // works in real life.
  drawFrame('sepia(1) saturate(8) hue-rotate(310deg) contrast(1.1)', 4, -3, 0.42, 'multiply')

  // Pass 3 — cyan. Offset opposite the magenta so the misregistration
  // reads as a real two-color overprint, not a uniform shift.
  drawFrame('sepia(1) saturate(6) hue-rotate(160deg) contrast(1.1)', -4, 2, 0.38, 'multiply')

  // Pass 4 — yellow highlights. Subtler than the other two; yellow
  // ink on cream paper barely shows, but it warms up the highlights.
  drawFrame('sepia(1) saturate(5) hue-rotate(20deg) brightness(1.15)', 1, 4, 0.26, 'multiply')

  // Reset compositing for the overlay passes.
  ctx.globalCompositeOperation = 'source-over'
  ctx.filter = 'none'
  ctx.globalAlpha = 1

  // Pass 5 — halftone dots. Drawn in `multiply` so they only deepen
  // shadows, not lift highlights. Spacing chosen to sit just below
  // print resolution so it reads as ink-on-paper rather than moiré.
  drawHalftoneDots(ctx, W, H)

  // Pass 6 — per-pixel grain. Tiny luminance noise added to the
  // current image data. Doing this after the color passes means the
  // grain rides on top of the riso layers, which is what you see on
  // real prints (the paper grain is the last thing the eye reads).
  applyGrain(ctx, W, H)

  // Pass 7 — vignette. Soft, off-center, so the corners feel printed
  // rather than scanned.
  drawVignette(ctx, W, H)

  // Export as JPEG — small files, fine for a print that's never
  // going to be zoomed into past 260px wide. Quality 0.85 keeps
  // grain crunchy without bloating the data URL.
  return canvas.toDataURL('image/jpeg', 0.85)
}

/** Tiny multiply-blended halftone overlay — sells the riso print look. */
function drawHalftoneDots(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.save()
  ctx.globalCompositeOperation = 'multiply'
  ctx.globalAlpha = 0.09
  ctx.fillStyle = '#0d0c0a'
  const SPACING = 5
  const RADIUS = 0.9
  for (let y = SPACING / 2; y < h; y += SPACING) {
    for (let x = SPACING / 2; x < w; x += SPACING) {
      ctx.beginPath()
      ctx.arc(x, y, RADIUS, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()
}

/** Per-pixel luminance noise — readPixels, mutate, writePixels. */
function applyGrain(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const img = ctx.getImageData(0, 0, w, h)
  const data = img.data
  // Amplitude — big enough to read as paper grain, small enough to
  // not overwhelm the riso layers.
  const AMP = 14
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * AMP
    data[i] = clamp255(data[i]! + n)
    data[i + 1] = clamp255(data[i + 1]! + n)
    data[i + 2] = clamp255(data[i + 2]! + n)
    // alpha stays — the cream backplate handles transparency.
  }
  ctx.putImageData(img, 0, 0)
}

function clamp255(v: number): number {
  if (v < 0) return 0
  if (v > 255) return 255
  return v
}

/** Soft radial vignette — the corners get pushed toward ink. */
function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.save()
  const grad = ctx.createRadialGradient(w * 0.5, h * 0.45, w * 0.25, w * 0.5, h * 0.5, w * 0.7)
  grad.addColorStop(0, 'rgba(13, 12, 10, 0)')
  grad.addColorStop(1, 'rgba(13, 12, 10, 0.45)')
  ctx.globalCompositeOperation = 'multiply'
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)
  ctx.restore()
}
