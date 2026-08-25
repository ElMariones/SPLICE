// Time parsing that accepts everything clipper.py's normalize_time() accepted,
// plus bare seconds and fractional seconds:
//   "90"       -> 90
//   "1:34"     -> 94
//   "1:02:33"  -> 3753
//   "1:34.500" -> 94.5
export function parseTime(input) {
  if (typeof input === 'number') return Number.isFinite(input) ? Math.max(0, input) : null
  const raw = String(input ?? '').trim()
  if (!raw) return null
  if (!/^\d+(:\d{1,2}){0,2}(\.\d+)?$/.test(raw)) return null

  const parts = raw.split(':')
  const seconds = parseFloat(parts.pop())
  if (!Number.isFinite(seconds)) return null

  let total = seconds
  if (parts.length >= 1) total += parseInt(parts.pop(), 10) * 60
  if (parts.length >= 1) total += parseInt(parts.pop(), 10) * 3600
  return total
}

// HH:MM:SS — the shape clipper.py normalised to, and what cuts.txt exports use.
export function formatClock(seconds) {
  const t = Math.max(0, Math.floor(seconds || 0))
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = t % 60
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

// HH:MM:SS.mmm — what ffmpeg receives, and what the transport counter shows.
export function formatPrecise(seconds) {
  const t = Math.max(0, seconds || 0)
  const ms = Math.floor((t % 1) * 1000)
  return `${formatClock(t)}.${String(ms).padStart(3, '0')}`
}

// What a mark actually is. Whole seconds stay clean; a mark placed between
// frames keeps its fraction visible so editing the field cannot silently
// round it away.
export function formatMark(seconds) {
  const t = Math.max(0, seconds || 0)
  const whole = Math.floor(t)
  const frac = t - whole
  if (frac < 0.0005) return formatClock(whole)
  return `${formatClock(whole)}.${String(Math.round(frac * 1000)).padStart(3, '0').replace(/0+$/, '')}`
}

// cuts.txt holds whole seconds only — clipper.py parses them with int().
export function formatClockRounded(seconds) {
  return formatClock(Math.round(Math.max(0, seconds || 0)))
}

// Compact duration for badges: 1:34 / 1:02:33
export function formatShort(seconds) {
  const t = Math.max(0, Math.floor(seconds || 0))
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = t % 60
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

function pad(n) {
  return String(n).padStart(2, '0')
}
