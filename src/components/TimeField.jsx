import { useEffect, useState } from 'react'
import { parseTime, formatMark } from '../lib/time.js'

const show = value => (value == null ? '' : formatMark(value))

// Accepts 1:34, 00:01:34, 94, 1:34.5 — the same shapes clipper.py took,
// plus bare seconds. Commits on blur or Enter; Escape reverts.
// ↑ / ↓ nudge by a second (Shift: 10 s, Alt: a tenth) and commit at once.
export default function TimeField({ value, onCommit, tone, label, placeholder = '—:—' }) {
  const [text, setText] = useState(show(value))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setText(show(value))
  }, [value, focused])

  const invalid = text.trim() !== '' && parseTime(text) == null

  const commit = () => {
    setFocused(false)
    const raw = text.trim()
    // Untouched text must not be written back: the display rounds to the
    // millisecond, and re-committing it would nudge the mark and add an undo step.
    if (raw === show(value)) return
    if (raw === '') return onCommit(null)
    const parsed = parseTime(raw)
    if (parsed == null) return setText(show(value))
    onCommit(parsed)
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      spellCheck={false}
      className={`timefield timefield--${tone} ${invalid ? 'is-invalid' : ''}`}
      aria-label={label}
      aria-invalid={invalid}
      placeholder={placeholder}
      value={text}
      onFocus={e => {
        setFocused(true)
        e.target.select()
      }}
      onChange={e => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        e.stopPropagation()
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') {
          setText(show(value))
          // Blur after the reset lands, so commit sees the original text.
          const el = e.currentTarget
          requestAnimationFrame(() => el.blur())
        }
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault()
          const base = parseTime(text) ?? value ?? 0
          const step = (e.shiftKey ? 10 : e.altKey ? 0.1 : 1) * (e.key === 'ArrowUp' ? 1 : -1)
          const next = Math.max(0, Math.round((base + step) * 1000) / 1000)
          setText(show(next))
          onCommit(next)
        }
      }}
    />
  )
}
