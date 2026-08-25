import ElectricBorder from './ElectricBorder.jsx'
import { commandLine } from '../lib/ffmpegRunner.js'

export default function RunPanel({
  ready,
  readyCount,
  mode,
  onMode,
  ext,
  onExt,
  extChoices,
  job,
  onRun,
  onCancel,
  sampleArgs,
  fileName
}) {
  const armed = ready && !job.running

  const runButton = (
    <button type="button" className="btn btn--run" disabled={!armed} onClick={onRun}>
      {job.running ? (
        'Slicing\u2026'
      ) : readyCount ? (
        <>
          Run slice <span className="btn__count">{readyCount}</span> clip{readyCount === 1 ? '' : 's'}
        </>
      ) : (
        'Run slice'
      )}
    </button>
  )

  return (
    <section className="run" aria-label="Slice">
      <h2 className="panel__title">Slice</h2>

      <div className="run__modes" role="radiogroup" aria-label="Cut mode">
        <button
          type="button"
          role="radio"
          aria-checked={mode === 'fast'}
          className={`mode ${mode === 'fast' ? 'is-on' : ''}`}
          onClick={() => onMode('fast')}
        >
          <span className="mode__name">Fast</span>
          <span className="mode__desc">Copies the stream. Seconds per clip, but cuts land on the nearest keyframe.</span>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={mode === 'precise'}
          className={`mode ${mode === 'precise' ? 'is-on' : ''}`}
          onClick={() => onMode('precise')}
        >
          <span className="mode__name">Precise</span>
          <span className="mode__desc">Re-encodes to hit the exact frame. Much slower, and quality drops slightly.</span>
        </button>
      </div>

      <label className="field field--inline">
        <span className="field__label">Container</span>
        <select className="field__input" value={ext} onChange={e => onExt(e.target.value)}>
          {extChoices.map(c => (
            <option key={c} value={c}>
              .{c}
            </option>
          ))}
        </select>
      </label>

      {sampleArgs && (
        <div className="run__cmd">
          <span className="run__cmd-label">Runs</span>
          <code>{commandLine(sampleArgs, fileName)}</code>
        </div>
      )}

      {armed ? (
        <ElectricBorder color="#4CE0B3" speed={1.15} chaos={0.14} thickness={2} borderRadius={14} className="run__arm">
          {runButton}
        </ElectricBorder>
      ) : (
        <div className="run__arm run__arm--idle">{runButton}</div>
      )}

      {job.running && (
        <div className="progress">
          <div className="progress__head">
            <span>{job.stage}</span>
            <span className="progress__pct">{Math.round(job.overall * 100)}%</span>
          </div>
          <div className="progress__bar">
            <div className="progress__fill" style={{ width: `${job.overall * 100}%` }} />
          </div>
          <button type="button" className="btn btn--quiet" onClick={onCancel}>
            Stop after this clip
          </button>
        </div>
      )}

      {job.error && <p className="notice notice--error">{job.error}</p>}
      {!ready && !job.running && (
        <p className="notice">Mark at least one clip with an end after its start.</p>
      )}

      {job.log.length > 0 && (
        <details className="log">
          <summary>ffmpeg output</summary>
          <pre>{job.log.slice(-60).join('\n')}</pre>
        </details>
      )}

    </section>
  )
}
