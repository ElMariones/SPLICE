import { formatMark, parseTime } from './time.js'

let seq = 0
export const newClip = patch => ({
  id: `c${Date.now().toString(36)}${(seq++).toString(36)}`,
  start: null,
  end: null,
  name: '',
  ...patch
})

export const isReady = c => c.start != null && c.end != null && c.end > c.start
export const isBad = c => c.start != null && c.end != null && c.end <= c.start
// A draft has an in point and is waiting for its out point.
export const isDraft = c => c.start != null && c.end == null

// The clip an O press should finish: the selected one if it is a draft,
// otherwise the most recent draft. Finished clips are never a target, so
// marking can never quietly rewrite a cut you already made.
export function findDraft(clips, activeId) {
  const active = clips.find(c => c.id === activeId)
  if (active && isDraft(active)) return active
  for (let i = clips.length - 1; i >= 0; i--) if (isDraft(clips[i])) return clips[i]
  return null
}

// Where a clip created by a bare O press should begin: the nearest out point
// before the playhead, so back-to-back cuts tile without gaps.
export function previousBoundary(clips, t) {
  let best = 0
  for (const c of clips) if (c.end != null && c.end <= t + 1e-6 && c.end > best) best = c.end
  return best
}

// Ids of finished clips whose ranges overlap another finished clip.
export function overlapping(clips) {
  const ready = clips.filter(isReady).sort((a, b) => a.start - b.start)
  const hit = new Set()
  let reach = null
  for (const c of ready) {
    if (reach && c.start < reach.end - 1e-6) {
      hit.add(c.id)
      hit.add(reach.id)
    }
    if (!reach || c.end > reach.end) reach = c
  }
  return hit
}

export const byStart = (a, b) => (a.start ?? Infinity) - (b.start ?? Infinity)

/* ---------- cut list text format ----------
   One clip per line: `start  end  [name]`. Times take any shape parseTime
   accepts. Separators can be spaces, tabs, commas, or a dash / arrow between
   the two times. Lines starting with # are comments. */

export function toCutList(clips) {
  const lines = ['# Splice cut list: start  end  [name]']
  for (const c of clips) {
    if (!isReady(c)) continue
    lines.push([formatMark(c.start), formatMark(c.end), c.name].filter(Boolean).join('  '))
  }
  return lines.join('\n') + '\n'
}

export function fromCutList(text) {
  const clips = []
  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, '').trim()
    if (!line) continue
    const tokens = line.split(/\s*(?:->|→|–|—|\s-\s|,|;|\t|\s)\s*/).filter(Boolean)
    if (tokens.length < 2) continue
    const start = parseTime(tokens[0])
    const end = parseTime(tokens[1])
    if (start == null || end == null) continue
    clips.push(newClip({ start, end, name: tokens.slice(2).join('_') }))
  }
  return clips
}
