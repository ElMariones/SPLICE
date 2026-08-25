import { downloadBytes, downloadZip } from '../lib/download.js'
import { formatShort } from '../lib/time.js'

const mime = ext => (ext === 'webm' ? 'video/webm' : ext === 'mkv' ? 'video/x-matroska' : 'video/mp4')

export function totalBytes(results) {
  return results.reduce((sum, r) => sum + r.bytes.byteLength, 0)
}

export function readableSize(bytes) {
  if (bytes > 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function downloadAll(results, baseName) {
  downloadZip(
    results.map(r => ({ name: r.name, bytes: r.bytes })),
    `${baseName || 'clips'}.zip`
  )
}

export function ResultList({ results, ext }) {
  return (
    <ul className="results__list">
      {results.map(r => (
        <li key={r.name} className="result">
          <span className="result__no">{r.index}</span>
          <span className="result__name">{r.name}</span>
          <span className="result__dur">{formatShort(r.duration)}</span>
          <span className="result__size">{readableSize(r.bytes.byteLength)}</span>
          <button type="button" className="micro" onClick={() => downloadBytes(r.bytes, r.name, mime(ext))}>
            Download
          </button>
        </li>
      ))}
    </ul>
  )
}

export default function Results({ results, baseName, ext, onClear }) {
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
