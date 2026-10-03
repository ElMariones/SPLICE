import { useEffect } from 'react'

// One message at a time, optionally with an action (Undo).
export default function Toast({ toast, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, toast.action ? 6000 : 4000)
    return () => clearTimeout(t)
  }, [toast, onDone])

  return (
    <div className="toast" role="status" key={toast.key}>
      <span>{toast.text}</span>
      {toast.action && (
        <button
          type="button"
          className="toast__action"
          onClick={() => {
            toast.action.run()
            onDone()
          }}
        >
          {toast.action.label}
        </button>
      )}
    </div>
  )
}
