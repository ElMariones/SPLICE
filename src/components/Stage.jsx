import { forwardRef } from 'react'
import ElectricBorder from './ElectricBorder.jsx'
import TimelineRail from './TimelineRail.jsx'
import VolumeControl from './VolumeControl.jsx'
import { formatPrecise } from '../lib/time.js'

const RATES = [0.25, 0.5, 1, 1.5, 2]

const Stage = forwardRef(function Stage(
  {
    videoUrl,
    fileName,
    duration,
    currentTime,
    playing,
    rate,
    fps,
    volume,
    muted,
    clips,
    activeId,
    onLoadedMetadata,
    onTimeUpdate,
    onTogglePlay,
    onSeek,
    onNudge,
    onRate,
    onVolume,
    onToggleMute,
    onMarkIn,
    onMarkOut,
    onSelect,
    onAdjust,
    onEnded
  },
  videoRef
) {
  return (
    <section className="stage" aria-label="Player">
      <ElectricBorder color="#7C5CFF" speed={0.6} chaos={0.055} thickness={2} borderRadius={18}>
        <div className="stage__screen">
          <video
            ref={videoRef}
            src={videoUrl}
            className="stage__video"
            onLoadedMetadata={onLoadedMetadata}
            onTimeUpdate={onTimeUpdate}
            onEnded={onEnded}
            onClick={onTogglePlay}
            playsInline
          />
        </div>
      </ElectricBorder>

      <TimelineRail
        duration={duration}
        currentTime={currentTime}
        clips={clips}
        activeId={activeId}
        onSeek={onSeek}
        onSelect={onSelect}
        onAdjust={onAdjust}
      />

      <div className="transport">
        <div className="transport__counter">
          <span className="transport__tc">{formatPrecise(currentTime)}</span>
        </div>

        <div className="transport__keys">
          <button type="button" className="key" onClick={() => onNudge(-10)} title="Back 10s (Shift + ←)">
            −10s
          </button>
          <button type="button" className="key" onClick={() => onNudge(-1)} title="Back 1s (←)">
            −1s
          </button>
          <button type="button" className="key" onClick={() => onNudge(-1 / fps)} title="Previous frame (,)">
            ◀|
          </button>
          <button
            type="button"
            className="key key--play"
            onClick={onTogglePlay}
            title="Play / pause (Space)"
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? '❙❙' : '▶'}
          </button>
          <button type="button" className="key" onClick={() => onNudge(1 / fps)} title="Next frame (.)">
            |▶
          </button>
          <button type="button" className="key" onClick={() => onNudge(1)} title="Forward 1s (→)">
            +1s
          </button>
          <button type="button" className="key" onClick={() => onNudge(10)} title="Forward 10s (Shift + →)">
            +10s
          </button>
        </div>

        <div className="transport__right">
          <VolumeControl volume={volume} muted={muted} onVolume={onVolume} onToggleMute={onToggleMute} />
          <label className="transport__rate">
            <span className="sr-only">Playback speed</span>
            <select value={rate} onChange={e => onRate(Number(e.target.value))}>
              {RATES.map(r => (
                <option key={r} value={r}>
                  {r}×
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="marks">
        <button type="button" className="mark mark--in" onClick={onMarkIn}>
          <span className="mark__key">I</span>
          Mark in
        </button>
        <button type="button" className="mark mark--out" onClick={onMarkOut}>
          <span className="mark__key">O</span>
          Mark out
        </button>
        <p className="marks__hint">
          {fps ? `≈${fps} fps` : 'fps unknown'} · <kbd>I</kbd> <kbd>O</kbd> mark · <kbd>Space</kbd> play · <kbd>,</kbd>{' '}
          <kbd>.</kbd> step a frame · <kbd>M</kbd> mute · <kbd>↑</kbd> <kbd>↓</kbd> volume
        </p>
      </div>
    </section>
  )
})

export default Stage
