import { memo, useState } from 'react'
import ElectricBorder from './ElectricBorder.jsx'
import Icon from './Icon.jsx'
import { commandLine } from '../lib/ffmpegRunner.js'
import { useTheme } from '../lib/theme.js'

const ARM = { dark: '#4CE0B3', light: '#0E9F77' }
const ENGINE_LABEL = {
  idle: 'Encoder loads on first run',
  loading: 'Encoder downloading…',
  ready: 'Encoder ready',
  error: 'Encoder will retry on run'
}

function RunPanel({
  readyCount,
  mode,
  onMode,
  ext,
  onExt,
  extChoices,
  job,
  engine,
  onRun,
  onCancel,
  sampleArgs,
  fileName,
  onScript
}) {
  const { theme } = useTheme()
  const [copied, setCopied] = useState(false)
  const ready = readyCount > 0
  const armed = ready && !job.running

  const runButton = (
    <button type="button" className="btn btn--run" disabled={!armed} onClick={onRun} title="Run slice (Ctrl+Enter)">
      {job.running ? (
        'Slicing…'
      ) : readyCount ? (
        <>
          Run slice <span className="btn__count">{readyCount}</span> clip{readyCount === 1 ? '' : 's'}
        </>
      ) : (
        'Run slice'
      )}
    </button>
  )

  const command = sampleArgs ? commandLine(sampleArgs, fileName) : ''

  return (
    <section className="run" aria-label="Slice">
      <div className="run__head">
        <h2 className="panel__title">Slice</h2>
        <span className={`chip chip--${engine}`} title="ffmpeg runs inside this tab">
          <span className="chip__dot" />
          {ENGINE_LABEL[engine]}
        </span>
      </div>

      <div className="run__modes" role="radiogroup" aria-label="Cut mode">
        <button
          type="button"
          role="radio"
          aria-checked={mode === 'fast'}
          className={`mode ${mode === 'fast' ? 'is-on' : ''}`}
          onClick={() => onMode('fast')}
          disabled={job.running}
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
          disabled={job.running}
        >
          <span className="mode__name">Precise</span>
          <span className="mode__desc">Re-encodes to hit the exact frame. Much slower, and quality drops slightly.</span>
        </button>
      </div>

      <label className="field field--inline">
        <span className="field__label">Container</span>
        <select className="field__input" value={ext} onChange={e => onExt(e.target.value)} disabled={job.running}>
          {extChoices.map(c => (
            <option key={c} value={c}>
              .{c}
            </option>
          ))}
        </select>
      </label>

      {command && (
        <div className="run__cmd">
          <div className="run__cmd-top">
            <span className="run__cmd-label">Runs, per clip</span>
            <button
              type="button"
              className="micro"
              onClick={() => {
                navigator.clipboard?.writeText(command).then(() => {
                  setCopied(true)
                  setTimeout(() => setCopied(false), 1400)
                })
              }}
              title="Copy this command"
            >
              <Icon name={copied ? 'check' : 'copy'} size={11} /> {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <code>{command}</code>
        </div>
      )}

      {armed ? (
        <ElectricBorder color={ARM[theme]} speed={1.15} chaos={0.14} thickness={2} borderRadius={14} className="run__arm">
          {runButton}
        </ElectricBorder>
      ) : (
        <div className="run__arm run__arm--idle">{runButton}</div>
      )}

      {job.running && (
        <div className="progress" aria-live="polite">
          <div className="progress__head">
            <span>{job.stage}</span>
            <span className="progress__pct">{Math.round(job.overall * 100)}%</span>
          </div>
          <div className="progress__bar">
            <div className="progress__fill" style={{ width: `${job.overall * 100}%` }} />
          </div>
          <button type="button" className="btn btn--quiet" onClick={onCancel}>
            Stop — keep finished clips
          </button>
        </div>
      )}

      {!job.running && job.stage === 'Stopped' && <p className="notice">Stopped. Any clips finished before that are kept below.</p>}
      {job.error && <p className="notice notice--error">{job.error}</p>}
      {!ready && !job.running && <p className="notice">Mark at least one clip with an end after its start.</p>}

      {job.log.length > 0 && (
        <details className="log">
          <summary>ffmpeg output</summary>
          <pre>{job.log.slice(-80).join('\n')}</pre>
        </details>
      )}

      <div className="run__exchange">
        <p className="run__exchange-title">Prefer your terminal?</p>
        <div className="run__exchange-row">
          <button type="button" className="btn btn--ghost" onClick={onScript} disabled={!ready}>
            <Icon name="download" size={13} /> Download .sh script
          </button>
        </div>
        <p className="run__exchange-note">
          Same commands, run by a native ffmpeg. Handy for very large files or long precise encodes.
        </p>
      </div>
    </section>
  )
}

export default memo(RunPanel)
