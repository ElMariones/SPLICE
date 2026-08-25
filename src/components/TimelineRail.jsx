import { useCallback, useRef, useState } from 'react'
import { formatShort } from '../lib/time.js'

// The whole cut plan, laid over the video's duration. Every clip is a lit
// segment you can grab by either edge; the rail doubles as the scrubber.
export default function TimelineRail({ duration, currentTime, clips, activeId, onSeek, onSelect, onAdjust }) {
  const trackRef = useRef(null)
  const [drag, setDrag] = useState(null)
  const [hover, setHover] = useState(null)

  const timeAt = useCallback(
    clientX => {
      const track = trackRef.current
      if (!track || !duration) return 0
      const rect = track.getBoundingClientRect()
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
      return ratio * duration
    },
    [duration]
  )

  const pct = t => (duration ? Math.min(100, Math.max(0, (t / duration) * 100)) : 0)

  const startDrag = (event, clipId, edge) => {
    event.stopPropagation()
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrag({ clipId, edge, pointerId: event.pointerId })
    onSelect(clipId)
  }

  const handleMove = event => {
    const t = timeAt(event.clientX)
    setHover(t)
    if (!drag) return
    onAdjust(drag.clipId, drag.edge, t)
    onSeek(t)
  }

  const endDrag = event => {
    if (!drag) return
    try {
      event.currentTarget.releasePointerCapture(drag.pointerId)
    } catch {}
    setDrag(null)
  }

  return (
    <div className="rail">
      <div
        ref={trackRef}
        className={`rail__track ${drag ? 'is-dragging' : ''}`}
        role="slider"
        tabIndex={0}
        aria-label="Video timeline"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration || 0)}
        aria-valuenow={Math.round(currentTime || 0)}
        aria-valuetext={formatShort(currentTime)}
        onPointerDown={e => {
          if (e.target === e.currentTarget || e.target.classList.contains('rail__perfs')) onSeek(timeAt(e.clientX))
        }}
        onPointerMove={handleMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={() => setHover(null)}
        onKeyDown={e => {
          if (e.key === 'ArrowLeft') onSeek(Math.max(0, currentTime - (e.shiftKey ? 10 : 1)))
          if (e.key === 'ArrowRight') onSeek(Math.min(duration, currentTime + (e.shiftKey ? 10 : 1)))
        }}
      >
        <div className="rail__perfs rail__perfs--top" aria-hidden="true" />
        <div className="rail__perfs rail__perfs--bottom" aria-hidden="true" />

        {clips.map((clip, i) => {
          if (clip.start == null) return null
          const complete = clip.end != null && clip.end > clip.start
          const left = pct(clip.start)
          const right = pct(complete ? clip.end : currentTime)
          const width = Math.max(0.35, right - left)
          return (
            <div
              key={clip.id}
              className={`seg ${complete ? 'seg--complete' : 'seg--open'} ${clip.id === activeId ? 'is-active' : ''}`}
              style={{ left: `${left}%`, width: `${width}%` }}
              onPointerDown={e => {
                e.stopPropagation()
                onSelect(clip.id)
                onSeek(clip.start)
              }}
              title={`${String(i + 1).padStart(2, '0')} · ${formatShort(clip.start)}${complete ? ` → ${formatShort(clip.end)}` : ''}`}
            >
              <span className="seg__no">{String(i + 1).padStart(2, '0')}</span>
              <span
                className="seg__grip seg__grip--in"
                onPointerDown={e => startDrag(e, clip.id, 'start')}
                onPointerMove={handleMove}
                onPointerUp={endDrag}
              />
              {complete && (
                <span
                  className="seg__grip seg__grip--out"
                  onPointerDown={e => startDrag(e, clip.id, 'end')}
                  onPointerMove={handleMove}
                  onPointerUp={endDrag}
                />
              )}
            </div>
          )
        })}

        <div className="rail__head" style={{ left: `${pct(currentTime)}%` }}>
          <span className="rail__head-cap" />
        </div>

        {hover != null && !drag && (
          <div className="rail__ghost" style={{ left: `${pct(hover)}%` }}>
            <span>{formatShort(hover)}</span>
          </div>
        )}
      </div>

      <div className="rail__scale">
        <span>0:00</span>
        <span>{formatShort(duration / 2)}</span>
        <span>{formatShort(duration)}</span>
      </div>
    </div>
  )
}
