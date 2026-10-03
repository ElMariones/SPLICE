import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon.jsx'

const GROUPS = [
  {
    title: 'Playback',
    keys: [
      [['Space'], 'Play / pause'],
      [['K'], 'Pause'],
      [['J'], 'Back 5 s'],
      [['L'], 'Forward 5 s'],
      [['←', '→'], '±1 second'],
      [['Shift', '←/→'], '±10 seconds'],
      [[',', '.'], 'Step one frame'],
      [['Home', 'End'], 'Jump to start / end'],
      [['↑', '↓'], 'Volume'],
      [['M'], 'Mute']
    ]
  },
  {
    title: 'Marking',
    keys: [
      [['I'], 'Mark in — starts a clip, or re-marks the open one'],
      [['O'], 'Mark out — closes the open clip, or adds one from the last cut'],
      [['Shift', 'I'], 'Trim the selected clip’s in point to the playhead'],
      [['Shift', 'O'], 'Trim the selected clip’s out point to the playhead'],
      [['N'], 'New clip at the playhead'],
      [['P'], 'Preview the selected clip'],
      [['[', ']'], 'Jump to the selected clip’s in / out'],
      [['Esc'], 'Deselect'],
      [['Del'], 'Remove the selected clip']
    ]
  },
  {
    title: 'Editing',
    keys: [
      [['Ctrl', 'Z'], 'Undo'],
      [['Ctrl', 'Shift', 'Z'], 'Redo'],
      [['+', '−'], 'Zoom the timeline'],
      [['0'], 'Fit the whole video'],
      [['Ctrl', 'Enter'], 'Run slice'],
      [['?'], 'This list']
    ]
  }
]

export default function KeysSheet({ onClose }) {
  const closeRef = useRef(null)

  useEffect(() => {
    const prev = document.activeElement
    closeRef.current?.focus()
    const onKey = e => {
      if (e.key === 'Escape' || e.key === '?') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      if (prev instanceof HTMLElement) prev.focus()
    }
  }, [onClose])

  return createPortal(
    <div className="sheet keys-sheet" onPointerDown={e => e.target === e.currentTarget && onClose()}>
      <div className="keys" role="dialog" aria-modal="true" aria-labelledby="keys-title">
        <div className="sheet__head">
          <div>
            <p className="sheet__eyebrow">Keyboard</p>
            <h2 className="sheet__title" id="keys-title">
              Shortcuts
            </h2>
          </div>
          <button ref={closeRef} type="button" className="sheet__close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={14} />
          </button>
        </div>
        <div className="keys__grid">
          {GROUPS.map(group => (
            <section key={group.title}>
              <h3 className="keys__group">{group.title}</h3>
              <dl className="keys__list">
                {group.keys.map(([combo, label]) => (
                  <div key={label} className="keys__row">
                    <dt>
                      {combo.map(k => (
                        <kbd key={k}>{k}</kbd>
                      ))}
                    </dt>
                    <dd>{label}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </div>
    </div>,
    document.body
  )
}
