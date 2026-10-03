import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { formatShort, formatTick } from '../lib/time.js'
import HoverThumb from './HoverThumb.jsx'

// Pixels a pointer has to travel before a press becomes a drag. Below this a
// press is a click: it seeks or selects, and never edits a clip.
const DEAD_ZONE = 4
// How close (in pixels) a dragged edge has to come to something to stick to it.
const SNAP_PX = 8
const MIN_SPAN = 2
const TICK_STEPS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200]

// The whole cut plan, laid over the video's duration. Pressing anywhere scrubs
// — on empty strip or on a clip — so the rail is always safe to navigate with.
// Clip edges change only when you grab a grip and actually move it.
function TimelineRail({
  duration,
  currentTime,
  clips,
  activeId,
  overlapIds,
  videoUrl,
  fps,
  onSeek,
  onSelect,
  onScrubEmpty,
  onAdjust,
  onAdjustEnd
}) {
  const trackRef = useRef(null)
  const gestureRef = useRef(null)
  const [width, setWidth] = useState(800)
  const [view, setView] = useState({ start: 0, span: duration || 1 })
  const [hover, setHover] = useState(null)
  const [snapAt, setSnapAt] = useState(null)
  const [dragging, setDragging] = useState(null)

  const span = Math.min(view.span, duration || view.span) || 1
  const viewStart = Math.min(Math.max(0, view.start), Math.max(0, (duration || 0) - span))
  const zoomed = duration > 0 && span < duration - 1e-6

  // A new file means a new duration: show all of it.
  useEffect(() => {
    setView({ start: 0, span: duration || 1 })
  }, [duration])

  useLayoutEffect(() => {
    const el = trackRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width || 800))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const timeAt = useCallback(
    clientX => {
      const rect = trackRef.current?.getBoundingClientRect()
      if (!rect || !duration) return 0
      const ratio = (clientX - rect.left) / rect.width
      return Math.min(duration, Math.max(0, viewStart + ratio * span))
    },
    [duration, viewStart, span]
  )

  const pct = t => ((t - viewStart) / span) * 100

  // Keep the playhead on screen while zoomed: page the view when it walks off.
  useEffect(() => {
    if (!zoomed || gestureRef.current) return
    if (currentTime < viewStart || currentTime > viewStart + span) {
      setView(v => ({ ...v, start: Math.max(0, Math.min(duration - span, currentTime - span * 0.1)) }))
    }
  }, [currentTime, zoomed, viewStart, span, duration])

  const zoomAround = useCallback(
    (factor, anchorTime) => {
      if (!duration) return
      setView(v => {
        const cur = Math.min(v.span, duration)
        const next = Math.min(duration, Math.max(Math.min(MIN_SPAN, duration), cur * factor))
        const anchor = anchorTime ?? currentTime
        const ratio = cur ? (anchor - v.start) / cur : 0.5
        const start = Math.max(0, Math.min(duration - next, anchor - ratio * next))
        return { start, span: next }
      })
    },
    [duration, currentTime]
  )

  // Wheel: Ctrl/⌘ (and trackpad pinch) zooms around the cursor; a plain wheel
  // pans once zoomed in. Needs a non-passive listener to stop the page scroll.
  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    const onWheel = e => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        zoomAround(Math.exp(e.deltaY * 0.0025), timeAt(e.clientX))
        return
      }
      if (!zoomed) return
      e.preventDefault()
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      setView(v => ({ ...v, start: Math.max(0, Math.min(duration - span, v.start + (delta / width) * span)) }))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomAround, timeAt, zoomed, duration, span, width])

  /* ---------- snapping ---------- */

  const snapTargets = useMemo(() => {
    const out = [0, duration]
    for (const c of clips) {
      if (c.start != null) out.push(c.start)
      if (c.end != null) out.push(c.end)
    }
    return out
  }, [clips, duration])

  const snap = (t, ignoreClipId, head, disabled) => {
    if (disabled) return { t, snapped: null }
    const tolerance = (SNAP_PX / width) * span
    let best = null
    const consider = x => {
      if (x == null) return
      const d = Math.abs(x - t)
      if (d <= tolerance && (best == null || d < Math.abs(best - t))) best = x
    }
    consider(head)
    for (const c of clips) {
      if (c.id === ignoreClipId) continue
      consider(c.start)
      consider(c.end)
    }
    consider(0)
    consider(duration)
    return best == null ? { t, snapped: null } : { t: best, snapped: best }
  }

  /* ---------- gestures ---------- */

  const onPointerDown = e => {
    if (e.button !== 0 || !duration) return
    const track = trackRef.current
    track.setPointerCapture(e.pointerId)
    const grip = e.target.closest('[data-grip]')
    const seg = e.target.closest('[data-seg]')

    if (grip) {
      e.preventDefault()
      const clip = clips.find(c => c.id === grip.dataset.clip)
      if (!clip) return
      const edge = grip.dataset.grip
      gestureRef.current = {
        type: 'edge',
        pointerId: e.pointerId,
        clipId: clip.id,
        edge,
        // Grab offset: the edge moves by however far you drag, instead of
        // jumping to wherever inside the grip you happened to press.
        offset: timeAt(e.clientX) - clip[edge],
        originX: e.clientX,
        head: currentTime,
        moved: false,
        key: `drag-${clip.id}-${edge}-${e.timeStamp}`
      }
      onSelect(clip.id)
      return
    }

    gestureRef.current = {
      type: 'scrub',
      pointerId: e.pointerId,
      segId: seg?.dataset.seg ?? null,
      originX: e.clientX,
      moved: false
    }
    if (!seg) onScrubEmpty()
    onSeek(timeAt(e.clientX))
    setDragging('scrub')
  }

  const onPointerMove = e => {
    const t = timeAt(e.clientX)
    setHover(t)
    const g = gestureRef.current
    if (!g || g.pointerId !== e.pointerId) return
    if (!g.moved && Math.abs(e.clientX - g.originX) < DEAD_ZONE) return
    g.moved = true

    if (g.type === 'scrub') {
      onSeek(t)
      return
    }

    setDragging('edge')
    const { t: snapped, snapped: snapPoint } = snap(t - g.offset, g.clipId, g.head, e.altKey)
    setSnapAt(snapPoint)
    const applied = onAdjust(g.clipId, g.edge, snapped, g.key)
    onSeek(applied ?? snapped)
  }

  const finish = e => {
    const g = gestureRef.current
    if (!g || g.pointerId !== e.pointerId) return
    try {
      trackRef.current?.releasePointerCapture(e.pointerId)
    } catch {}
    gestureRef.current = null
    setDragging(null)
    setSnapAt(null)
    if (g.type === 'scrub' && !g.moved && g.segId) onSelect(g.segId)
    if (g.type === 'edge' && g.moved) onAdjustEnd()
  }

  /* ---------- ruler ---------- */

  const ticks = useMemo(() => {
    if (!duration) return []
    const minStep = (span / Math.max(width, 1)) * 84
    const step = TICK_STEPS.find(s => s >= minStep) ?? TICK_STEPS[TICK_STEPS.length - 1]
    const out = []
    for (let t = Math.ceil(viewStart / step) * step; t <= viewStart + span + 1e-6; t += step) out.push(t)
    return out.map(t => ({ t, label: formatTick(t, step) }))
  }, [duration, span, viewStart, width])

  const headPct = pct(currentTime)
  const headVisible = headPct >= -0.5 && headPct <= 100.5
  const hoverPct = hover == null ? null : pct(hover)
  const thumbX = hoverPct == null ? 0 : Math.min(width - 84, Math.max(84, (hoverPct / 100) * width))

  return (
    <div className="rail">
      <div className="rail__wrap">
        {videoUrl && (
          <HoverThumb
            videoUrl={videoUrl}
            time={hover ?? 0}
            x={thumbX}
            label={hover == null ? '' : formatTick(hover, fps ? 1 / fps : 0.1)}
            visible={hover != null && dragging !== 'edge'}
          />
        )}

        <div
          ref={trackRef}
          className={`rail__track ${dragging ? `is-${dragging}` : ''}`}
          role="slider"
          tabIndex={0}
          aria-label="Video timeline"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration || 0)}
          aria-valuenow={Math.round(currentTime || 0)}
          aria-valuetext={formatShort(currentTime)}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={finish}
          onPointerCancel={finish}
          onPointerLeave={() => !gestureRef.current && setHover(null)}
          onDoubleClick={e => {
            const seg = e.target.closest('[data-seg]')
            const clip = seg && clips.find(c => c.id === seg.dataset.seg)
            if (clip?.start != null) onSeek(clip.start)
          }}
        >
          <div className="rail__perfs rail__perfs--top" aria-hidden="true" />
          <div className="rail__perfs rail__perfs--bottom" aria-hidden="true" />

          {ticks.map(({ t }) => (
            <span key={t} className="rail__tick" style={{ left: `${pct(t)}%` }} aria-hidden="true" />
          ))}

          {clips.map((clip, i) => {
            if (clip.start == null) return null
            const complete = clip.end != null && clip.end > clip.start
            const bad = clip.end != null && clip.end <= clip.start
            const left = pct(clip.start)
            const right = pct(complete ? clip.end : Math.max(currentTime, clip.start))
            const widthPct = Math.max((3 / width) * 100, right - left)
            if (left > 101 || left + widthPct < -1) return null
            const label = String(i + 1).padStart(2, '0')
            return (
              <div
                key={clip.id}
                data-seg={clip.id}
                className={[
                  'seg',
                  complete ? 'seg--complete' : 'seg--open',
                  bad && 'seg--bad',
                  clip.id === activeId && 'is-active',
                  overlapIds?.has(clip.id) && 'is-overlap'
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{ left: `${left}%`, width: `${widthPct}%` }}
                title={`${label}${clip.name ? ` · ${clip.name}` : ''} · ${formatShort(clip.start)}${
                  complete ? ` → ${formatShort(clip.end)}` : ' → …'
                }\nClick to select · double-click to jump to its start`}
              >
                {(widthPct / 100) * width > 22 && <span className="seg__no">{label}</span>}
                <span className="seg__grip seg__grip--in" data-grip="start" data-clip={clip.id} title="Drag to move the in point (Alt: no snapping)" />
                {clip.end != null && (
                  <span className="seg__grip seg__grip--out" data-grip="end" data-clip={clip.id} title="Drag to move the out point (Alt: no snapping)" />
                )}
              </div>
            )
          })}

          {snapAt != null && <div className="rail__snap" style={{ left: `${pct(snapAt)}%` }} aria-hidden="true" />}

          {headVisible && (
            <div className="rail__head" style={{ left: `${headPct}%` }}>
              <span className="rail__head-cap" />
            </div>
          )}

          {hoverPct != null && !dragging && <div className="rail__ghost" style={{ left: `${hoverPct}%` }} aria-hidden="true" />}
        </div>
      </div>

      <div className="rail__ruler" aria-hidden="true">
        {ticks.map(({ t, label }) => (
          <span key={t} className={pct(t) < 2 ? 'is-first' : pct(t) > 97 ? 'is-last' : undefined} style={{ left: `${pct(t)}%` }}>
            {label}
          </span>
        ))}
      </div>

      <div className="rail__zoom">
        {zoomed ? (
          <Minimap
            duration={duration}
            viewStart={viewStart}
            span={span}
            currentTime={currentTime}
            clips={clips}
            onPan={start => setView(v => ({ ...v, start: Math.max(0, Math.min(duration - span, start)) }))}
          />
        ) : (
          <span className="rail__zoom-hint">
            <kbd>Ctrl</kbd> + scroll to zoom · drag a clip edge to trim · <kbd>Alt</kbd> while dragging turns off snapping
          </span>
        )}
        <div className="rail__zoom-ctl">
          <button type="button" className="micro" onClick={() => zoomAround(1.6)} disabled={!zoomed} title="Zoom out (-)">
            −
          </button>
          <span className="rail__zoom-val">{duration ? `${Math.round((duration / span) * 10) / 10}×` : '1×'}</span>
          <button
            type="button"
            className="micro"
            onClick={() => zoomAround(1 / 1.6)}
            disabled={!duration || span <= MIN_SPAN}
            title="Zoom in around the playhead (+)"
          >
            +
          </button>
          <button
            type="button"
            className="micro"
            onClick={() => setView({ start: 0, span: duration || 1 })}
            disabled={!zoomed}
            title="Show the whole video (0)"
          >
            Fit
          </button>
        </div>
      </div>
      <RailKeys zoomAround={zoomAround} fit={() => setView({ start: 0, span: duration || 1 })} />
    </div>
  )
}

// + / - / 0 zoom the rail from anywhere on the page, like an NLE.
function RailKeys({ zoomAround, fit }) {
  const ref = useRef({ zoomAround, fit })
  ref.current = { zoomAround, fit }
  useEffect(() => {
    const onKey = e => {
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable) return
      if (e.ctrlKey || e.metaKey || e.altKey || document.querySelector('.sheet, .keys-sheet')) return
      if (e.key === '+' || e.key === '=') ref.current.zoomAround(1 / 1.6)
      else if (e.key === '-' || e.key === '_') ref.current.zoomAround(1.6)
      else if (e.key === '0') ref.current.fit()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return null
}

function Minimap({ duration, viewStart, span, currentTime, clips, onPan }) {
  const ref = useRef(null)
  const grab = useRef(null)
  const toTime = clientX => {
    const r = ref.current.getBoundingClientRect()
    return ((clientX - r.left) / r.width) * duration
  }
  return (
    <div
      ref={ref}
      className="minimap"
      role="scrollbar"
      aria-label="Visible part of the timeline"
      aria-valuenow={Math.round(viewStart)}
      onPointerDown={e => {
        e.currentTarget.setPointerCapture(e.pointerId)
        const t = toTime(e.clientX)
        const inside = t >= viewStart && t <= viewStart + span
        grab.current = inside ? t - viewStart : span / 2
        onPan(t - grab.current)
      }}
      onPointerMove={e => grab.current != null && onPan(toTime(e.clientX) - grab.current)}
      onPointerUp={() => (grab.current = null)}
      onPointerCancel={() => (grab.current = null)}
    >
      {clips.map(c =>
        c.start != null && c.end != null && c.end > c.start ? (
          <span
            key={c.id}
            className="minimap__clip"
            style={{ left: `${(c.start / duration) * 100}%`, width: `${((c.end - c.start) / duration) * 100}%` }}
          />
        ) : null
      )}
      <span className="minimap__view" style={{ left: `${(viewStart / duration) * 100}%`, width: `${(span / duration) * 100}%` }} />
      <span className="minimap__head" style={{ left: `${(currentTime / duration) * 100}%` }} />
    </div>
  )
}

export default memo(TimelineRail)
