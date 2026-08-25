// Inline SVG rather than glyph characters — the arrow glyphs used earlier had
// no coverage in either UI face and rendered as blank boxes.
function SpeakerIcon({ level, muted }) {
  return (
    <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true" focusable="false">
      <path d="M4 7.5h2.6L10 4.4v11.2L6.6 12.5H4z" fill="currentColor" />
      {muted ? (
        <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <line x1="13" y1="7.5" x2="17" y2="12.5" />
          <line x1="17" y1="7.5" x2="13" y2="12.5" />
        </g>
      ) : (
        <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round">
          <path d="M12.6 7.6a3.4 3.4 0 0 1 0 4.8" />
          {level > 0.55 && <path d="M14.8 5.6a6.4 6.4 0 0 1 0 8.8" />}
        </g>
      )}
    </svg>
  )
}

export default function VolumeControl({ volume, muted, onVolume, onToggleMute }) {
  const shown = muted ? 0 : volume
  return (
    <div className="volume">
      <button
        type="button"
        className={`key key--icon ${muted ? 'is-muted' : ''}`}
        onClick={onToggleMute}
        title={muted ? 'Unmute (M)' : 'Mute (M)'}
        aria-label={muted ? 'Unmute' : 'Mute'}
        aria-pressed={muted}
      >
        <SpeakerIcon level={shown} muted={muted} />
      </button>
      <input
        type="range"
        className="volume__slider"
        min={0}
        max={1}
        step={0.01}
        value={shown}
        aria-label="Volume"
        aria-valuetext={`${Math.round(shown * 100)} percent`}
        style={{ '--volume-fill': `${shown * 100}%` }}
        onChange={e => onVolume(Number(e.target.value))}
        onKeyDown={e => e.stopPropagation()}
      />
    </div>
  )
}
