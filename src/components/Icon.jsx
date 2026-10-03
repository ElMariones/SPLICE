// Inline SVG icons. Glyph characters (▶ ❙❙ ◀|) render inconsistently across
// the UI faces, so every control symbol is drawn instead.
const PATHS = {
  play: <path d="M6 4.2v11.6a.6.6 0 0 0 .9.5l9.2-5.8a.6.6 0 0 0 0-1L6.9 3.7a.6.6 0 0 0-.9.5z" fill="currentColor" />,
  pause: (
    <g fill="currentColor">
      <rect x="5" y="4" width="3.4" height="12" rx="0.8" />
      <rect x="11.6" y="4" width="3.4" height="12" rx="0.8" />
    </g>
  ),
  'frame-back': (
    <g fill="currentColor">
      <rect x="4" y="4.5" width="2" height="11" rx="0.6" />
      <path d="M15.5 5.1v9.8a.5.5 0 0 1-.8.4L8 10.4a.5.5 0 0 1 0-.8l6.7-4.9a.5.5 0 0 1 .8.4z" />
    </g>
  ),
  'frame-fwd': (
    <g fill="currentColor">
      <rect x="14" y="4.5" width="2" height="11" rx="0.6" />
      <path d="M4.5 5.1v9.8a.5.5 0 0 0 .8.4l6.7-4.9a.5.5 0 0 0 0-.8L5.3 4.7a.5.5 0 0 0-.8.4z" />
    </g>
  ),
  undo: <path d="M7.5 5 3.8 8.7l3.7 3.7M4.3 8.7h7.2a4.6 4.6 0 0 1 0 9.2H9" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />,
  redo: <path d="m12.5 5 3.7 3.7-3.7 3.7m3.2-3.7H8.5a4.6 4.6 0 0 0 0 9.2H11" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />,
  keyboard: (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="2.2" y="5" width="15.6" height="10" rx="2" />
      <path d="M5.5 8.2h.01M8.5 8.2h.01M11.5 8.2h.01M14.5 8.2h.01M6.5 11.8h7" />
    </g>
  ),
  trash: (
    <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h12M8 6V4.5h4V6M5.6 6l.7 9.6a1 1 0 0 0 1 .9h5.4a1 1 0 0 0 1-.9L14.4 6" />
    </g>
  ),
  target: (
    <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M10 2.5v4M10 13.5v4M2.5 10h4M13.5 10h4" />
      <circle cx="10" cy="10" r="1.6" fill="currentColor" stroke="none" />
    </g>
  ),
  loop: (
    <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9.5V8a3 3 0 0 1 3-3h8.5M13 2.5 15.5 5 13 7.5M16 10.5V12a3 3 0 0 1-3 3H4.5M7 17.5 4.5 15 7 12.5" />
    </g>
  ),
  sort: (
    <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3.5v13M3 13.5l3 3 3-3M11 5h6M11 9h4.5M11 13h3" />
    </g>
  ),
  download: (
    <g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 3v9.5M6 8.8l4 3.9 4-3.9M3.8 16.5h12.4" />
    </g>
  ),
  upload: (
    <g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13V3.5M6 7.2l4-3.9 4 3.9M3.8 16.5h12.4" />
    </g>
  ),
  copy: (
    <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <rect x="7" y="7" width="9.5" height="9.5" rx="1.8" />
      <path d="M13 4.5v-.3A1.7 1.7 0 0 0 11.3 2.5H5.2a1.7 1.7 0 0 0-1.7 1.7v6.1A1.7 1.7 0 0 0 5.2 12h.3" />
    </g>
  ),
  check: <path d="m4.5 10.5 3.5 3.5 7.5-8" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />,
  close: (
    <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <line x1="5" y1="5" x2="15" y2="15" />
      <line x1="15" y1="5" x2="5" y2="15" />
    </g>
  )
}

export default function Icon({ name, size = 15 }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden="true" focusable="false" className="icon">
      {PATHS[name]}
    </svg>
  )
}
