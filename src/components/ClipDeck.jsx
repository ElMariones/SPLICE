import TimeField from './TimeField.jsx'
import { formatShort } from '../lib/time.js'

export default function ClipDeck({
  clips,
  names,
  activeId,
  baseName,
  onBaseName,
  onSelect,
  onPatch,
  onDelete,
  onAdd,
  onClear,
  onPreview,
  onSetFromHead,
  currentTime
}) {
  const complete = clips.filter(c => c.start != null && c.end != null && c.end > c.start).length

  return (
    <section className="deck" aria-label="Clip list">
      <div className="deck__head">
        <h2 className="panel__title">Clip list</h2>
        <span className="deck__count">
          {complete}/{clips.length} ready
        </span>
      </div>

      <label className="field">
        <span className="field__label">Base name</span>
        <input
          type="text"
          className="field__input"
          value={baseName}
          placeholder="clip"
          onChange={e => onBaseName(e.target.value)}
          onKeyDown={e => e.stopPropagation()}
        />
        <span className="field__hint">
          Outputs are numbered from this: <code>{names[0] || `${baseName || 'clip'}01.mp4`}</code>
        </span>
      </label>

      <ol className="clips">
        {clips.map((clip, i) => {
          const ready = clip.start != null && clip.end != null && clip.end > clip.start
          const bad = clip.start != null && clip.end != null && clip.end <= clip.start
          return (
            <li
              key={clip.id}
              className={`clip ${clip.id === activeId ? 'is-active' : ''} ${bad ? 'is-bad' : ''}`}
              onPointerDown={() => onSelect(clip.id)}
            >
              <div className="clip__no">{String(i + 1).padStart(2, '0')}</div>

              <div className="clip__body">
                <div className="clip__times">
                  <div className="clip__time">
                    <TimeField
                      value={clip.start}
                      tone="in"
                      label={`Clip ${i + 1} start`}
                      onCommit={v => onPatch(clip.id, { start: v })}
                    />
                    <button
                      type="button"
                      className="micro micro--in"
                      title="Set start to the playhead"
                      onClick={() => onSetFromHead(clip.id, 'start')}
                    >
                      ← head
                    </button>
                  </div>

                  <span className="clip__arrow" aria-hidden="true">
                    →
                  </span>

                  <div className="clip__time">
                    <TimeField
                      value={clip.end}
                      tone="out"
                      label={`Clip ${i + 1} end`}
                      onCommit={v => onPatch(clip.id, { end: v })}
                    />
                    <button
                      type="button"
                      className="micro micro--out"
                      title="Set end to the playhead"
                      onClick={() => onSetFromHead(clip.id, 'end')}
                    >
                      ← head
                    </button>
                  </div>

                  <span className={`clip__dur ${ready ? 'is-ready' : ''}`}>
                    {ready ? formatShort(clip.end - clip.start) : bad ? 'end ≤ start' : 'open'}
                  </span>
                </div>

                <div className="clip__meta">
                  <input
                    type="text"
                    className="clip__name"
                    value={clip.name || ''}
                    placeholder={names[i] || ''}
                    aria-label={`Clip ${i + 1} file name`}
                    onChange={e => onPatch(clip.id, { name: e.target.value })}
                    onKeyDown={e => e.stopPropagation()}
                  />
                  <button
                    type="button"
                    className="micro"
                    disabled={!ready}
                    onClick={() => onPreview(clip)}
                    title="Play just this range"
                  >
                    Preview
                  </button>
                  <button
                    type="button"
                    className="micro micro--danger"
                    onClick={() => onDelete(clip.id)}
                    title="Remove this clip"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          )
        })}
      </ol>

      {!clips.length && (
        <p className="deck__empty">
          No clips yet. Scrub to where the clip starts and press <kbd>I</kbd>, then <kbd>O</kbd> where it ends.
        </p>
      )}

      <div className="deck__foot">
        <button type="button" className="btn btn--ghost" onClick={() => onAdd(currentTime)}>
          Add clip at playhead
        </button>
        {clips.length > 0 && (
          <button type="button" className="btn btn--quiet" onClick={onClear}>
            Clear all
          </button>
        )}
      </div>
    </section>
  )
}
