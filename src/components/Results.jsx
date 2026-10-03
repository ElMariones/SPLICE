import { memo, useEffect, useState } from 'react'
import { downloadBytes, downloadZip } from '../lib/download.js'
import { formatShort } from '../lib/time.js'
import Icon from './Icon.jsx'

export const mime = ext =>
  ext === 'webm' ? 'video/webm' : ext === 'mkv' ? 'video/x-matroska' : ext === 'mov' ? 'video/quicktime' : 'video/mp4'

export function totalBytes(results) {
  return results.reduce((sum, r) => sum + r.bytes.byteLength, 0)
}

export function readableSize(bytes) {
  if (bytes > 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function downloadAll(results, baseName) {
  downloadZip(
    results.map(r => ({ name: r.name, bytes: r.bytes })),
    `${baseName || 'clips'}.zip`
  )
}

// A finished clip played back from memory, so you can check a cut before
// downloading it. The object URL lives exactly as long as the player.
function ResultPlayer({ result, ext }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    const u = URL.createObjectURL(new Blob([result.bytes], { type: mime(ext) }))
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [result, ext])
  if (!url) return null
  return <video className="result__player" src={url} controls autoPlay playsInline />
}

export function ResultList({ results, ext }) {
  const [open, setOpen] = useState(null)
  return (
    <ul className="results__list">
      {results.map(r => (
        <li key={r.name} className={`result ${open === r.name ? 'is-open' : ''}`}>
          <span className="result__no">{r.index}</span>
          <span className="result__name" title={r.name}>
            {r.name}
          </span>
          <span className="result__dur">{formatShort(r.duration)}</span>
          <span className="result__size">{readableSize(r.bytes.byteLength)}</span>
          <span className="result__actions">
            <button
              type="button"
              className="micro micro--icon"
              onClick={() => setOpen(o => (o === r.name ? null : r.name))}
              aria-label={open === r.name ? `Close preview of ${r.name}` : `Watch ${r.name}`}
              title={open === r.name ? 'Close preview' : 'Watch this clip'}
            >
              <Icon name={open === r.name ? 'close' : 'play'} size={11} />
            </button>
            <button type="button" className="micro" onClick={() => downloadBytes(r.bytes, r.name, mime(ext))}>
              <Icon name="download" size={11} /> Save
            </button>
          </span>
          {open === r.name && <ResultPlayer result={r} ext={ext} />}
        </li>
      ))}
    </ul>
  )
}

function Results({ results, baseName, ext, onClear }) {
  if (!results.length) return null

  return (
    <section className="results" aria-label="Finished clips">
      <div className="results__head">
        <h2 className="panel__title">
          {results.length} clip{results.length === 1 ? '' : 's'} cut
          <span className="results__size">{readableSize(totalBytes(results))}</span>
        </h2>
        <div className="results__actions">
          <button type="button" className="btn btn--primary" onClick={() => downloadAll(results, baseName)}>
            Download all as .zip
          </button>
          <button type="button" className="btn btn--quiet" onClick={onClear}>
            Clear
          </button>
        </div>
      </div>
      <ResultList results={results} ext={ext} />
    </section>
  )
}

export default memo(Results)
