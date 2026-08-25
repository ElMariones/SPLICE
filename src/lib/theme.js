import { useSyncExternalStore } from 'react'

const KEY = 'splice.theme'
export const MODES = ['system', 'light', 'dark']

const query = window.matchMedia('(prefers-color-scheme: dark)')
const listeners = new Set()

let mode = readStored()
let theme = 'dark'

function readStored() {
  try {
    const stored = localStorage.getItem(KEY)
    return MODES.includes(stored) ? stored : 'system'
  } catch {
    return 'system'
  }
}

// CSS decides — either from [data-theme] or from the prefers-color-scheme
// block — and reports the winner in --scheme. Reading it back means the
// canvas-based components can never disagree with the stylesheet.
function readTheme() {
  const value = getComputedStyle(document.documentElement).getPropertyValue('--scheme')
  return value.replace(/['"\s]/g, '') === 'light' ? 'light' : 'dark'
}

function paint() {
  const root = document.documentElement
  if (mode === 'system') {
    // No attribute on purpose: this hands the decision to the media query, so
    // the palette follows the OS even if no change event ever reaches us.
    delete root.dataset.theme
    root.style.colorScheme = 'light dark'
  } else {
    root.dataset.theme = mode
    root.style.colorScheme = mode
  }
  theme = readTheme()
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.content = theme === 'dark' ? '#07070b' : '#f2f1f9'
}

function emit() {
  for (const listener of listeners) listener()
}

function refresh() {
  const before = theme
  paint()
  if (theme !== before) emit()
}

export function setMode(next) {
  mode = MODES.includes(next) ? next : 'system'
  try {
    localStorage.setItem(KEY, mode)
  } catch {
    /* private browsing — the choice just will not survive a reload */
  }
  paint()
  emit()
}

export function cycleMode() {
  setMode(MODES[(MODES.indexOf(mode) + 1) % MODES.length])
}

// The Twitter behaviour: while the preference is "system", flipping the OS or
// browser setting repaints straight away, with no reload.
query.addEventListener('change', refresh)

// Backstop. Some environments update the media query without dispatching
// change; re-checking when the page is looked at again closes that gap.
document.addEventListener('visibilitychange', () => !document.hidden && refresh())
window.addEventListener('focus', refresh)

// Another tab changing the preference should not leave this one stale.
window.addEventListener('storage', event => {
  if (event.key !== KEY) return
  mode = readStored()
  paint()
  emit()
})

paint()

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// One string keeps the snapshot referentially stable for useSyncExternalStore.
function snapshot() {
  return `${mode}:${theme}`
}

export function useTheme() {
  const [current, resolved] = useSyncExternalStore(subscribe, snapshot, () => 'system:dark').split(':')
  return { mode: current, theme: resolved, setMode, cycleMode }
}
