import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import ElectricBorder from './ElectricBorder.jsx'
import { ResultList, downloadAll, totalBytes, readableSize } from './Results.jsx'
import { useTheme } from '../lib/theme.js'

const FRAME = { dark: '#4CE0B3', light: '#0E9F77' }

export default function ResultsModal({ results, baseName, ext, onClose }) {
  const { theme } = useTheme()
  const primaryRef = useRef(null)
  const returnFocusRef = useRef(null)

  useEffect(() => {
    returnFocusRef.current = document.activeElement
    primaryRef.current?.focus()
    const onKey = e => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (returnFocusRef.current instanceof HTMLElement) returnFocusRef.current.focus()
    }
  }, [onClose])

  if (!results.length) return null

  // Rendered outside .app so no ancestor's clipping or stacking context can
  // move or crop it.
  return createPortal(
    <div className="sheet" onPointerDown={e => e.target === e.currentTarget && onClose()}>
      <ElectricBorder color={FRAME[theme]} speed={1} chaos={0.1} borderRadius={20} className="sheet__frame">
        <div
          className="sheet__body"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sheet-title"
          onPointerDown={e => e.stopPropagation()}
        >
          <div className="sheet__head">
            <div>
              <p className="sheet__eyebrow">Slice complete</p>
              <h2 className="sheet__title" id="sheet-title">
                {results.length} clip{results.length === 1 ? '' : 's'} ready
                <span className="sheet__size">{readableSize(totalBytes(results))}</span>
              </h2>
            </div>
            <button type="button" className="sheet__close" onClick={onClose} aria-label="Close">
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <line x1="3" y1="3" x2="13" y2="13" />
                  <line x1="13" y1="3" x2="3" y2="13" />
                </g>
              </svg>
            </button>
          </div>

          <div className="sheet__scroll">
            <ResultList results={results} ext={ext} />
          </div>

          <div className="sheet__foot">
            <button
              ref={primaryRef}
              type="button"
              className="btn btn--primary"
              onClick={() => downloadAll(results, baseName)}
            >
              Download all as .zip
            </button>
            <button type="button" className="btn btn--quiet" onClick={onClose}>
              Keep working
            </button>
          </div>
        </div>
      </ElectricBorder>
    </div>,
    document.body
  )
}
