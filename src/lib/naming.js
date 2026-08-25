const ILLEGAL = /[\\/:*?"<>|]/g

export function sanitize(name) {
  return String(name || '').replace(ILLEGAL, '_').trim()
}

// clipper.py's scheme: base + zero-padded index. A per-clip name overrides it.
export function clipOutputName(clip, index, baseName, ext) {
  const custom = sanitize(clip.name)
  if (custom) return `${custom}.${ext}`
  const base = sanitize(baseName) || 'clip'
  return `${base}${String(index + 1).padStart(2, '0')}.${ext}`
}

export function allOutputNames(clips, baseName, ext) {
  const seen = new Map()
  return clips.map((clip, i) => {
    let name = clipOutputName(clip, i, baseName, ext)
    if (seen.has(name)) {
      const n = seen.get(name) + 1
      seen.set(name, n)
      name = name.replace(/\.([^.]+)$/, `_${n}.$1`)
    } else {
      seen.set(name, 1)
    }
    return name
  })
}
