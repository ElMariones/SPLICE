import { useRef, useState } from 'react'
import ElectricBorder from './ElectricBorder.jsx'
import Icon from './Icon.jsx'
import { useTheme } from '../lib/theme.js'

const FRAME = { dark: '#7C5CFF', light: '#6039E8' }

export const pickVideo = files =>
  Array.from(files || []).find(f => f.type.startsWith('video/') || /\.(mp4|mkv|mov|webm|m4v|avi|ts|mts|m2ts)$/i.test(f.name))

export default function Dropzone({ onFile, compact, disabled }) {
  const inputRef = useRef(null)
  const [over, setOver] = useState(false)
  const { theme } = useTheme()

  const take = files => {
    const file = pickVideo(files)
    if (file) onFile(file)
  }

  const zone = (
    <div
      className={`dropzone ${over ? 'is-over' : ''} ${compact ? 'dropzone--compact' : ''}`}
      onDragOver={e => {
        e.preventDefault()
        if (!disabled) setOver(true)
      }}
      onDragLeave={e => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOver(false)
      }}
      onDrop={e => {
        e.preventDefault()
        setOver(false)
        if (!disabled) take(e.dataTransfer.files)
      }}
      onClick={e => {
        // The whole landing card is the target, not just the button.
        if (!compact && !disabled && e.target === e.currentTarget) inputRef.current?.click()
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="video/*,.mkv,.mov,.m4v,.ts,.mts,.m2ts"
        className="dropzone__input"
        onChange={e => {
          take(e.target.files)
          e.target.value = ''
        }}
      />
      {!compact && (
        <span className="dropzone__icon" aria-hidden="true">
          <Icon name="upload" size={22} />
        </span>
      )}
      <button type="button" className="btn btn--primary" onClick={() => inputRef.current?.click()} disabled={disabled}>
        {compact ? 'Open another video' : 'Choose a video'}
      </button>
      <p className="dropzone__hint">
        {compact ? 'or drop one anywhere on the page' : 'or drop it here — MP4, MOV, MKV, WebM'}
      </p>
    </div>
  )

  // On the landing the drop target is the one thing to look at, so it gets
  // the live border. The in-session picker stays quiet.
  if (compact) return zone

  return (
    <ElectricBorder color={FRAME[theme]} speed={0.7} chaos={0.07} borderRadius={20} className="dropzone__frame">
      {zone}
    </ElectricBorder>
  )
}
