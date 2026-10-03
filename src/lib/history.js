import { useCallback, useRef, useState } from 'react'

const LIMIT = 150

// State with an undo stack. Every change is one step unless it passes a
// `coalesce` key: consecutive changes with the same key (one drag gesture, one
// burst of typing into one field) collapse into a single step, so undo walks
// back whole intentions rather than pointer events.
export function useUndoable(initial) {
  const [state, setState] = useState(() => ({ past: [], present: initial, future: [], key: null }))
  // Mirrors `present` synchronously so callers can compute the next value from
  // the latest state without side effects inside a setState updater.
  const presentRef = useRef(state.present)
  presentRef.current = state.present

  const set = useCallback((updater, { coalesce = null } = {}) => {
    setState(s => {
      const next = typeof updater === 'function' ? updater(s.present) : updater
      if (next === s.present) return s
      if (coalesce && s.key === coalesce) return { ...s, present: next, future: [] }
      return { past: [...s.past, s.present].slice(-LIMIT), present: next, future: [], key: coalesce }
    })
  }, [])

  const undo = useCallback(() => {
    setState(s => {
      if (!s.past.length) return s
      return { past: s.past.slice(0, -1), present: s.past[s.past.length - 1], future: [s.present, ...s.future], key: null }
    })
  }, [])

  const redo = useCallback(() => {
    setState(s => {
      if (!s.future.length) return s
      return { past: [...s.past, s.present], present: s.future[0], future: s.future.slice(1), key: null }
    })
  }, [])

  // Replace the value and forget the history — for loading a different file.
  const reset = useCallback(value => setState({ past: [], present: value, future: [], key: null }), [])

  // Ends a coalescing run, so the next change with the same key starts a new step.
  const seal = useCallback(() => setState(s => (s.key ? { ...s, key: null } : s)), [])

  return {
    value: state.present,
    ref: presentRef,
    set,
    undo,
    redo,
    reset,
    seal,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0
  }
}
