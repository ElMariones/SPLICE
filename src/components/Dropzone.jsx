import { useRef, useState } from 'react'
import ElectricBorder from './ElectricBorder.jsx'

export default function Dropzone({ onFile, compact }) {
  const inputRef = useRef(null)
  const [over, setOver] = useState(false)

  const take = files => {
    const file = Array.from(files || []).find(f => f.type.startsWith('video/') || /\.(mp4|mkv|mov|webm|m4v|avi|ts)$/i.test(f.name))
    if (file) onFile(file)
  }

  const zone = (
    <div
      className={`dropzone ${over ? 'is-over' : ''} ${compact ? 'dropzone--compact' : ''}`}
      onDragOver={e => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={e => {
        e.preventDefault()
        setOver(false)
        take(e.dataTransfer.files)
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="video/*,.mkv,.mov,.m4v,.ts"
        className="dropzone__input"
        onChange={e => take(e.target.files)}
      />
      <button type="button" className="btn btn--primary" onClick={() => inputRef.current?.click()}>
        {compact ? 'Choose another video' : 'Choose a video'}
      </button>
      {!compact && <p className="dropzone__hint">or drop it here</p>}
    </div>
  )

  // On the landing the drop target is the one thing to look at, so it gets
  // the live border. The in-session picker stays quiet.
  if (compact) return zone

  return (
    <ElectricBorder color="#7C5CFF" speed={0.7} chaos={0.07} borderRadius={20} className="dropzone__frame">
      {zone}
    </ElectricBorder>
  )
}
