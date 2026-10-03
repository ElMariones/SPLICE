import { useEffect, useRef, useState } from 'react'

const W = 160

// A frame preview above the rail, drawn from a second, hidden decoder so
// hovering never moves the real playhead. Seeks are serialised: while one is
// in flight only the latest requested time is kept, so a fast sweep across
// the rail cannot queue up dozens of decodes.
export default function HoverThumb({ videoUrl, time, x, label, visible }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const busy = useRef(false)
  const pending = useRef(null)
  const [ratio, setRatio] = useState(16 / 9)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const v = document.createElement('video')
    v.muted = true
    v.preload = 'auto'
    v.playsInline = true
    v.src = videoUrl
    videoRef.current = v

    const draw = () => {
      const c = canvasRef.current
      if (c && v.videoWidth) {
        const ctx = c.getContext('2d')
        ctx.drawImage(v, 0, 0, c.width, c.height)
        setReady(true)
      }
      busy.current = false
      if (pending.current != null) {
        const next = pending.current
        pending.current = null
        go(next)
      }
    }
    const go = t => {
      if (busy.current) {
        pending.current = t
        return
      }
      busy.current = true
      v.currentTime = t
    }
    v.__go = go
    v.addEventListener('seeked', draw)
    v.addEventListener('loadedmetadata', () => v.videoWidth && setRatio(v.videoWidth / v.videoHeight))
    return () => {
      v.removeEventListener('seeked', draw)
      v.removeAttribute('src')
      v.load()
    }
  }, [videoUrl])

  useEffect(() => {
    const v = videoRef.current
    if (visible && v?.__go && Number.isFinite(time)) v.__go(time)
  }, [time, visible])

  const h = Math.round(W / Math.min(3, Math.max(0.4, ratio)))

  return (
    <div className={`thumb ${visible ? 'is-visible' : ''}`} style={{ left: `${x}px` }} aria-hidden="true">
      <canvas ref={canvasRef} width={W} height={h} className={ready ? 'is-ready' : ''} />
      <span className="thumb__time">{label}</span>
    </div>
  )
}
