import { useTheme } from '../lib/theme.js'

const LABEL = {
  system: 'Following your system theme',
  light: 'Light',
  dark: 'Dark'
}

const NEXT = { system: 'light', light: 'dark', dark: 'system' }

function Icon({ mode }) {
  if (mode === 'light') {
    return (
      <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true">
        <circle cx="10" cy="10" r="3.9" fill="currentColor" />
        <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <line x1="10" y1="1.6" x2="10" y2="3.4" />
          <line x1="10" y1="16.6" x2="10" y2="18.4" />
          <line x1="1.6" y1="10" x2="3.4" y2="10" />
          <line x1="16.6" y1="10" x2="18.4" y2="10" />
          <line x1="4.1" y1="4.1" x2="5.4" y2="5.4" />
          <line x1="14.6" y1="14.6" x2="15.9" y2="15.9" />
          <line x1="15.9" y1="4.1" x2="14.6" y2="5.4" />
          <line x1="5.4" y1="14.6" x2="4.1" y2="15.9" />
        </g>
      </svg>
    )
  }
  if (mode === 'dark') {
    return (
      <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true">
        <path
          d="M16.3 12.4A6.9 6.9 0 0 1 7.6 3.7a7 7 0 1 0 8.7 8.7z"
          fill="currentColor"
        />
      </svg>
    )
  }
  // system — a small display, the shape people read as "match my device"
  return (
    <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true">
      <rect x="2.4" y="3.6" width="15.2" height="10" rx="1.8" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <line x1="7" y1="16.6" x2="13" y2="16.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export default function ThemeToggle() {
  const { mode, theme, cycleMode } = useTheme()
  const detail = mode === 'system' ? `${LABEL.system} (${theme})` : `${LABEL[mode]} theme`

  return (
    <button
      type="button"
      className="theme"
      onClick={cycleMode}
      title={`${detail}. Switch to ${NEXT[mode]}.`}
      aria-label={`Theme: ${detail}. Switch to ${NEXT[mode]}.`}
    >
      <span className="theme__icon">
        <Icon mode={mode} />
      </span>
      <span className="theme__label">{mode === 'system' ? 'Auto' : LABEL[mode]}</span>
    </button>
  )
}
