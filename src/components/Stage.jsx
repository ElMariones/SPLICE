import { forwardRef, memo } from 'react'
import ElectricBorder from './ElectricBorder.jsx'
import TimelineRail from './TimelineRail.jsx'
import VolumeControl from './VolumeControl.jsx'
import Icon from './Icon.jsx'
import { useTheme } from '../lib/theme.js'
import { formatPrecise, formatShort } from '../lib/time.js'

const FRAME = { dark: '#7C5CFF', light: '#6039E8' }
const RATES = [0.25, 0.5, 1, 1.25, 1.5, 2]

const Stage = forwardRef(function Stage(
  {
    videoUrl,
    duration,
    currentTime,
    playing,
    rate,
    fps,
    volume,
    muted,
    clips,
    activeId,
    activeIndex,
    draftIndex,
    overlapIds,
    flash,
    onLoadedMetadata,
    onTimeUpdate,
    onPlayState,
    onTogglePlay,
    onSeek,
    onNudge,
    onRate,
    onVolume,
    onToggleMute,
    onMarkIn,
    onMarkOut,
    onSelect,
    onScrubEmpty,
    onAdjust,
    onAdjustEnd,
    onShowKeys
  },
  videoRef
) {
  const { theme } = useTheme()
  const draft = draftIndex >= 0 ? clips[draftIndex] : null
  const clipNo = i => String(i + 1).padStart(2, '0')

  return (
    <section className="stage" aria-label="Player">
      <ElectricBorder color={FRAME[theme]} speed={0.6} chaos={0.055} thickness={2} borderRadius={18}>
        <div className="stage__screen">
          <video
            ref={videoRef}
            src={videoUrl}
            className="stage__video"
            onLoadedMetadata={onLoadedMetadata}
            onTimeUpdate={onTimeUpdate}
            onSeeked={onTimeUpdate}
            onPlay={() => onPlayState(true)}
            onPause={() => onPlayState(false)}
            onEnded={() => onPlayState(false)}
            onClick={onTogglePlay}
            playsInline
          />
          {flash && (
            <div key={flash.key} className={`flash flash--${flash.tone}`} aria-hidden="true">
              {flash.text}
            </div>
          )}
          {!playing && duration > 0 && (
            <button type="button" className="stage__bigplay" onClick={onTogglePlay} aria-label="Play" tabIndex={-1}>
              <Icon name="play" size={26} />
            </button>
          )}
        </div>
      </ElectricBorder>

      <TimelineRail
        duration={duration}
        currentTime={currentTime}
        clips={clips}
        activeId={activeId}
        overlapIds={overlapIds}
        videoUrl={videoUrl}
        fps={fps}
        onSeek={onSeek}
        onSelect={onSelect}
        onScrubEmpty={onScrubEmpty}
        onAdjust={onAdjust}
        onAdjustEnd={onAdjustEnd}
      />

      <div className="transport">
        <div className="transport__counter">
          <span className="transport__tc">{formatPrecise(currentTime)}</span>
          <span className="transport__dur">/ {formatShort(duration)}</span>
        </div>

        <div className="transport__keys">
          <button type="button" className="key" onClick={() => onNudge(-10)} title="Back 10 s (Shift + ←)">
            −10s
          </button>
          <button type="button" className="key" onClick={() => onNudge(-1)} title="Back 1 s (←)">
            −1s
          </button>
          <button type="button" className="key key--icon" onClick={() => onNudge(-1 / fps)} title="Previous frame (,)" aria-label="Previous frame">
            <Icon name="frame-back" />
          </button>
          <button
            type="button"
            className="key key--play"
            onClick={onTogglePlay}
            title="Play / pause (Space or K)"
            aria-label={playing ? 'Pause' : 'Play'}
          >
            <Icon name={playing ? 'pause' : 'play'} />
          </button>
          <button type="button" className="key key--icon" onClick={() => onNudge(1 / fps)} title="Next frame (.)" aria-label="Next frame">
            <Icon name="frame-fwd" />
          </button>
          <button type="button" className="key" onClick={() => onNudge(1)} title="Forward 1 s (→)">
            +1s
          </button>
          <button type="button" className="key" onClick={() => onNudge(10)} title="Forward 10 s (Shift + →)">
            +10s
          </button>
        </div>

        <div className="transport__right">
          <VolumeControl volume={volume} muted={muted} onVolume={onVolume} onToggleMute={onToggleMute} />
          <label className="transport__rate" title="Playback speed">
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
        <button type="button" className="mark mark--in" onClick={onMarkIn} title={draft ? `Move clip ${clipNo(draftIndex)}'s in point here (I)` : 'Start a new clip here (I)'}>
          <span className="mark__key">I</span>
          {draft ? 'Re-mark in' : 'Mark in'}
        </button>
        <button type="button" className="mark mark--out" onClick={onMarkOut} title={draft ? `Close clip ${clipNo(draftIndex)} here (O)` : 'End a clip here (O)'}>
          <span className="mark__key">O</span>
          {draft ? `Close clip ${clipNo(draftIndex)}` : 'Mark out'}
        </button>

        <p className="marks__status" aria-live="polite">
          {draft ? (
            <>
              <span className="dot dot--live" />
              Clip {clipNo(draftIndex)} open from <b>{formatShort(draft.start)}</b> — press <kbd>O</kbd> where it ends
            </>
          ) : activeIndex >= 0 ? (
            <>
              <span className="dot" />
              Clip {clipNo(activeIndex)} selected · <kbd>Shift</kbd>+<kbd>I</kbd>/<kbd>O</kbd> trims it · <kbd>Esc</kbd> lets go
            </>
          ) : (
            <>
              <span className="dot dot--idle" />
              {fps ? `≈${fps} fps` : 'fps unknown'} · <kbd>I</kbd> starts a clip, <kbd>O</kbd> ends it
            </>
          )}
        </p>

        <button type="button" className="btn btn--ghost marks__keys" onClick={onShowKeys} title="Keyboard shortcuts (?)">
          <Icon name="keyboard" /> Shortcuts
        </button>
      </div>
    </section>
  )
})

export default memo(Stage)
