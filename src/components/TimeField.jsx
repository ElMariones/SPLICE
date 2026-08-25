import { useEffect, useState } from 'react'
import { parseTime, formatMark } from '../lib/time.js'

// Accepts 1:34, 00:01:34, 94, 1:34.5 — the same shapes clipper.py took,
// plus bare seconds. Commits on blur or Enter.
export default function TimeField({ value, onCommit, tone, label, placeholder = '—:—' }) {
  const [text, setText] = useState(value == null ? '' : formatMark(value))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setText(value == null ? '' : formatMark(value))
  }, [value, focused])

  const invalid = text.trim() !== '' && parseTime(text) == null

  const commit = () => {
    setFocused(false)
    const raw = text.trim()
    if (raw === '') return onCommit(null)
    const parsed = parseTime(raw)
    if (parsed == null) return setText(value == null ? '' : formatMark(value))
    onCommit(parsed)
  }

  return (
    <input
      type="text"
      inputMode="numeric"
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
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') {
          setText(value == null ? '' : formatMark(value))
          e.currentTarget.blur()
        }
        e.stopPropagation()
      }}
    />
  )
}
