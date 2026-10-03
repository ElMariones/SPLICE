import { memo, useEffect, useRef } from 'react'
import TimeField from './TimeField.jsx'
import Icon from './Icon.jsx'
import { formatShort } from '../lib/time.js'
import { isBad, isReady } from '../lib/clips.js'

function ClipDeck({
  clips,
  names,
  activeId,
  baseName,
  overlapIds,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onBaseName,
  onFocusClip,
  onPatch,
  onDelete,
  onAdd,
  onClear,
  onSort,
  onPreview,
  onSetFromHead,
  onImport,
  onExport
}) {
  const listRef = useRef(null)
  const importRef = useRef(null)
  const ready = clips.filter(isReady)
  const total = ready.reduce((sum, c) => sum + (c.end - c.start), 0)
  const sorted = clips.every((c, i) => i === 0 || (c.start ?? Infinity) >= (clips[i - 1].start ?? Infinity))

  // Keep the selected card in view when it is chosen from the rail or by keys.
  useEffect(() => {
    if (!activeId) return
    const el = listRef.current?.querySelector(`[data-clip="${activeId}"]`)
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [activeId])

  return (
    <section className="deck" aria-label="Clip list">
      <div className="deck__head">
        <div className="deck__title">
          <h2 className="panel__title">Clips</h2>
          <span className="deck__count">
            {ready.length}/{clips.length} ready{total > 0 && <> · {formatShort(total)} total</>}
          </span>
        </div>
        <div className="deck__tools">
          <button type="button" className="tool" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)" aria-label="Undo">
            <Icon name="undo" />
          </button>
          <button type="button" className="tool" onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)" aria-label="Redo">
            <Icon name="redo" />
          </button>
          <button
            type="button"
            className="tool"
            onClick={onSort}
            disabled={sorted || clips.length < 2}
            title="Renumber clips in timeline order"
            aria-label="Sort clips by start time"
          >
            <Icon name="sort" />
          </button>
        </div>
      </div>

      <label className="field">
        <span className="field__label">Base name</span>
        <input
          type="text"
          className="field__input"
          value={baseName}
          placeholder="clip"
          spellCheck={false}
          onChange={e => onBaseName(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur()
            e.stopPropagation()
          }}
        />
        <span className="field__hint">
          Outputs are numbered from this: <code>{names[0] || `${baseName || 'clip'}01`}</code>
        </span>
      </label>

      <ol className="clips" ref={listRef}>
        {clips.map((clip, i) => {
          const ok = isReady(clip)
          const bad = isBad(clip)
          const overlap = overlapIds.has(clip.id)
          const no = String(i + 1).padStart(2, '0')
          return (
            <li
              key={clip.id}
              data-clip={clip.id}
              className={['clip', clip.id === activeId && 'is-active', bad && 'is-bad', !ok && !bad && 'is-open']
                .filter(Boolean)
                .join(' ')}
              onPointerDown={e => {
                // Typing into a field or pressing a button selects quietly;
                // pressing the card itself also brings its in point on screen.
                const interactive = e.target.closest('input, button')
                onFocusClip(clip.id, !interactive)
              }}
            >
              <div className="clip__no" title={`Clip ${no}`}>
                {no}
              </div>

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
                      title="Set the in point to the playhead (Shift+I)"
                      onClick={() => onSetFromHead(clip.id, 'start')}
                    >
                      <Icon name="target" size={11} /> head
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
                      title="Set the out point to the playhead (Shift+O)"
                      onClick={() => onSetFromHead(clip.id, 'end')}
                    >
                      <Icon name="target" size={11} /> head
                    </button>
                  </div>

                  <span className={`clip__dur ${ok ? 'is-ready' : ''} ${bad ? 'is-bad' : ''}`}>
                    {ok ? formatShort(clip.end - clip.start) : bad ? 'end ≤ start' : 'open'}
                  </span>
                </div>

                <div className="clip__meta">
                  <input
                    type="text"
                    className="clip__name"
                    value={clip.name || ''}
                    placeholder={names[i] || ''}
                    spellCheck={false}
                    aria-label={`Clip ${i + 1} file name`}
                    onChange={e => onPatch(clip.id, { name: e.target.value }, `name-${clip.id}`)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur()
                      e.stopPropagation()
                    }}
                  />
                  {overlap && (
                    <span className="clip__flag" title="This clip overlaps another one. That is allowed, but check it is intended.">
                      overlap
                    </span>
                  )}
                  <button
                    type="button"
                    className="micro"
                    disabled={!ok}
                    onClick={() => onPreview(clip)}
                    title="Play just this range (P)"
                  >
                    <Icon name="play" size={10} /> Preview
                  </button>
                  <button
                    type="button"
                    className="micro micro--danger micro--icon"
                    onClick={() => onDelete(clip.id)}
                    title="Remove this clip (Delete)"
                    aria-label={`Remove clip ${i + 1}`}
                  >
                    <Icon name="trash" size={12} />
                  </button>
                </div>
              </div>
            </li>
          )
        })}
      </ol>

      {!clips.length && (
        <div className="deck__empty">
          <p>No clips yet.</p>
          <p>
            Scrub to where a clip starts and press <kbd>I</kbd>, then <kbd>O</kbd> where it ends. Or import a cut list.
          </p>
        </div>
      )}

      <div className="deck__foot">
        <button type="button" className="btn btn--ghost" onClick={onAdd} title="New clip starting at the playhead (N)">
          + Add at playhead
        </button>
        <div className="deck__io">
          <input
            ref={importRef}
            type="file"
            accept=".txt,.csv,text/plain"
            hidden
            onChange={e => {
              const f = e.target.files?.[0]
              if (f) onImport(f)
              e.target.value = ''
            }}
          />
          <button type="button" className="tool" onClick={() => importRef.current?.click()} title="Import a cut list (.txt)" aria-label="Import cut list">
            <Icon name="upload" />
          </button>
          <button type="button" className="tool" onClick={onExport} disabled={!ready.length} title="Export the cut list (.txt)" aria-label="Export cut list">
            <Icon name="download" />
          </button>
          {clips.length > 0 && (
            <button type="button" className="btn btn--quiet" onClick={onClear} title="Remove every clip (undoable)">
              Clear all
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

export default memo(ClipDeck)
