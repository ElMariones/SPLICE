const KEY = 'splice.sessions.v1'
const MAX_SESSIONS = 12

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}')
  } catch {
    return {}
  }
}

export function sessionKey(file) {
  return file ? `${file.name}::${file.size}` : null
}

export function loadSession(key) {
  if (!key) return null
  const entry = readAll()[key]
  return entry ? entry.data : null
}

export function saveSession(key, data) {
  if (!key) return
  const all = readAll()
  all[key] = { at: Date.now(), data }
  const keys = Object.keys(all).sort((a, b) => all[b].at - all[a].at)
  for (const stale of keys.slice(MAX_SESSIONS)) delete all[stale]
  try {
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    /* quota — the cut list is recoverable via Export cuts.txt */
  }
}
