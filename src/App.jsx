import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Hero from './components/Hero.jsx'
import Dropzone from './components/Dropzone.jsx'
import Stage from './components/Stage.jsx'
import ClipDeck from './components/ClipDeck.jsx'
import RunPanel from './components/RunPanel.jsx'
import Results from './components/Results.jsx'
import ResultsModal from './components/ResultsModal.jsx'
import { formatShort } from './lib/time.js'
import { allOutputNames } from './lib/naming.js'
import { loadEngine, sliceOne, writeSource, clearSource, buildArgs } from './lib/ffmpegRunner.js'
import { sessionKey, loadSession, saveSession } from './lib/storage.js'
import { LARGE_SOURCE_BYTES } from './lib/limits.js'

const COMMON_FPS = [23.976, 24, 25, 29.97, 30, 48, 50, 59.94, 60]
const CONTAINERS = ['mp4', 'mkv', 'webm', 'mov']
const EMPTY_JOB = { running: false, overall: 0, stage: '', error: '', log: [] }

let seq = 0
const newClip = patch => ({ id: `c${Date.now().toString(36)}${seq++}`, start: null, end: null, name: '', ...patch })

const isReady = c => c.start != null && c.end != null && c.end > c.start

export default function App() {
  const [file, setFile] = useState(null)
  const [videoUrl, setVideoUrl] = useState('')
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [rate, setRate] = useState(1)
  const [fps, setFps] = useState(30)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)

  const [clips, setClips] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [baseName, setBaseName] = useState('clip')
  const [mode, setMode] = useState('fast')
  const [ext, setExt] = useState('mp4')

  const [job, setJob] = useState(EMPTY_JOB)
  const [results, setResults] = useState([])
  const [showSheet, setShowSheet] = useState(false)
  const [toast, setToast] = useState('')

  const videoRef = useRef(null)
  const previewEndRef = useRef(null)
  const cancelRef = useRef(false)
  const objectUrlRef = useRef('')
  const sheetOpenRef = useRef(false)
  const volumeRef = useRef(1)

  useEffect(() => {
    sheetOpenRef.current = showSheet
  }, [showSheet])
  const storeKey = useMemo(() => sessionKey(file), [file])

  const sourceExt = useMemo(() => {
    const m = /\.([a-z0-9]+)$/i.exec(file?.name || '')
    return m ? m[1].toLowerCase() : 'mp4'
  }, [file])

  const extChoices = useMemo(() => [...new Set([sourceExt, ...CONTAINERS])], [sourceExt])
  const readyClips = useMemo(() => clips.filter(isReady), [clips])
  const names = useMemo(() => allOutputNames(clips, baseName, ext), [clips, baseName, ext])
  const readyNames = useMemo(() => allOutputNames(readyClips, baseName, ext), [readyClips, baseName, ext])

  /* ---------- file intake ---------- */

  // The object URL is owned by a ref, not by an effect. An effect cleanup
  // keyed on videoUrl would revoke the URL it was just given whenever React
  // re-runs effects (StrictMode does exactly that), killing the player.
  const openFile = useCallback(nextFile => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    objectUrlRef.current = URL.createObjectURL(nextFile)
    setFile(nextFile)
    setVideoUrl(objectUrlRef.current)
    setResults([])
    setShowSheet(false)
    setJob(EMPTY_JOB)
    setCurrentTime(0)
    setPlaying(false)
  }, [])

  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    },
    []
  )

  // Restore a previous cut list for this exact file, or start from its name.
  useEffect(() => {
    if (!file) return
    const saved = loadSession(storeKey)
    const guess = file.name.replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9_-]+/g, '_')
    if (saved) {
      setClips(saved.clips || [])
      setBaseName(saved.baseName || guess)
      setMode(saved.mode || 'fast')
      setExt(saved.ext || (CONTAINERS.includes(sourceExt) ? sourceExt : 'mp4'))
      setActiveId(saved.clips?.[saved.clips.length - 1]?.id ?? null)
      setToast(`Restored ${saved.clips?.length || 0} clips from your last session`)
    } else {
      setClips([])
      setActiveId(null)
      setBaseName(guess || 'clip')
      setExt(CONTAINERS.includes(sourceExt) ? sourceExt : 'mp4')
    }
  }, [file, storeKey, sourceExt])

  useEffect(() => {
    if (storeKey) saveSession(storeKey, { clips, baseName, mode, ext })
  }, [storeKey, clips, baseName, mode, ext])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 4000)
    return () => clearTimeout(t)
  }, [toast])

  /* ---------- playback ---------- */

  const syncTime = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    setCurrentTime(v.currentTime)
    if (previewEndRef.current != null && v.currentTime >= previewEndRef.current) {
      v.pause()
      previewEndRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!playing) return
    let raf = 0
    const tick = () => {
      syncTime()
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, syncTime])

  useEffect(() => {
    const v = videoRef.current
    if (v) v.playbackRate = rate
  }, [rate, videoUrl])

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.volume = volume
    v.muted = muted
  }, [volume, muted, videoUrl])

  // The ref is updated synchronously so several key presses in one frame
  // compound. Reading v.volume instead would give every press the same stale
  // value, because the element is only written on the next effect pass.
  const changeVolume = useCallback(next => {
    const clamped = Math.round(Math.min(1, Math.max(0, next)) * 100) / 100
    volumeRef.current = clamped
    setVolume(clamped)
    setMuted(clamped === 0)
  }, [])

  const adjustVolume = useCallback(delta => changeVolume(volumeRef.current + delta), [changeVolume])

  const toggleMute = useCallback(() => {
    // Unmuting a track that was dragged to silence should give it a voice back.
    if (volumeRef.current === 0) {
      changeVolume(0.5)
      return
    }
    setMuted(prev => !prev)
  }, [changeVolume])

  // Estimate the frame rate from real frame callbacks so the step buttons
  // land on frames instead of an assumed 30.
  useEffect(() => {
    const v = videoRef.current
    if (!v || !videoUrl || typeof v.requestVideoFrameCallback !== 'function') return
    const deltas = []
    let last = null
    let handle = 0
    let cancelled = false

    const onFrame = (_now, meta) => {
      if (cancelled) return
      if (last != null) {
        const d = meta.mediaTime - last
        if (d > 0.001 && d < 0.5) deltas.push(d)
      }
      last = meta.mediaTime
      if (deltas.length >= 14) {
        const sorted = [...deltas].sort((a, b) => a - b)
        const median = sorted[Math.floor(sorted.length / 2)]
        const measured = 1 / median
        const snapped = COMMON_FPS.reduce((best, f) => (Math.abs(f - measured) < Math.abs(best - measured) ? f : best))
        setFps(Math.abs(snapped - measured) < 1.5 ? snapped : Math.round(measured))
        return
      }
      handle = v.requestVideoFrameCallback(onFrame)
    }

    handle = v.requestVideoFrameCallback(onFrame)
    return () => {
      cancelled = true
      try {
        v.cancelVideoFrameCallback(handle)
      } catch {}
    }
  }, [videoUrl])

  const togglePlay = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    previewEndRef.current = null
    if (v.paused) {
      v.play().then(() => setPlaying(true)).catch(() => {})
    } else {
      v.pause()
      setPlaying(false)
      syncTime()
    }
  }, [syncTime])

  const seek = useCallback(
    t => {
      const v = videoRef.current
      if (!v || !Number.isFinite(t)) return
      const clamped = Math.min(duration || v.duration || 0, Math.max(0, t))
      v.currentTime = clamped
      setCurrentTime(clamped)
    },
    [duration]
  )

  const nudge = useCallback(delta => seek((videoRef.current?.currentTime ?? 0) + delta), [seek])

  const preview = useCallback(clip => {
    const v = videoRef.current
    if (!v || !isReady(clip)) return
    v.currentTime = clip.start
    previewEndRef.current = clip.end
    v.play().then(() => setPlaying(true)).catch(() => {})
  }, [])

  /* ---------- clip editing ---------- */

  const patchClip = useCallback((id, patch) => {
    setClips(prev => prev.map(c => (c.id === id ? { ...c, ...patch } : c)))
  }, [])

  const addClip = useCallback(at => {
    const clip = newClip({ start: at ?? 0 })
    setClips(prev => [...prev, clip])
    setActiveId(clip.id)
    return clip
  }, [])

  const markIn = useCallback(() => {
    const t = videoRef.current?.currentTime ?? currentTime
    setClips(prev => {
      const active = prev.find(c => c.id === activeId)
      // A finished clip means you're starting the next one.
      if (!active || (active.start != null && active.end != null)) {
        const clip = newClip({ start: t })
        setActiveId(clip.id)
        return [...prev, clip]
      }
      return prev.map(c => (c.id === active.id ? { ...c, start: t } : c))
    })
  }, [activeId, currentTime])

  const markOut = useCallback(() => {
    const t = videoRef.current?.currentTime ?? currentTime
    setClips(prev => {
      if (!prev.length) {
        const clip = newClip({ start: 0, end: t })
        setActiveId(clip.id)
        return [clip]
      }
      const targetId = prev.some(c => c.id === activeId) ? activeId : prev[prev.length - 1].id
      setActiveId(targetId)
      return prev.map(c => (c.id === targetId ? { ...c, end: t } : c))
    })
  }, [activeId, currentTime])

  const setFromHead = useCallback(
    (id, edge) => patchClip(id, { [edge]: videoRef.current?.currentTime ?? currentTime }),
    [patchClip, currentTime]
  )

  const adjustFromRail = useCallback(
    (id, edge, t) => {
      setClips(prev =>
        prev.map(c => {
          if (c.id !== id) return c
          if (edge === 'start') return { ...c, start: Math.min(t, c.end ?? Infinity) }
          return { ...c, end: Math.max(t, c.start ?? 0) }
        })
      )
    },
    []
  )

  const deleteClip = useCallback(
    id =>
      setClips(prev => {
        const next = prev.filter(c => c.id !== id)
        setActiveId(cur => (cur === id ? next[next.length - 1]?.id ?? null : cur))
        return next
      }),
    []
  )

  /* ---------- keyboard ---------- */

  useEffect(() => {
    if (!videoUrl) return
    const onKey = e => {
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      // The results sheet is modal; transport keys would fire behind it.
      if (sheetOpenRef.current) return

      const map = {
        ' ': () => togglePlay(),
        i: () => markIn(),
        o: () => markOut(),
        n: () => addClip(videoRef.current?.currentTime ?? 0),
        ',': () => nudge(-1 / fps),
        '.': () => nudge(1 / fps),
        ArrowLeft: () => nudge(e.shiftKey ? -10 : -1),
        ArrowRight: () => nudge(e.shiftKey ? 10 : 1),
        Home: () => seek(0),
        End: () => seek(duration),
        m: () => toggleMute(),
        ArrowUp: () => adjustVolume(0.1),
        ArrowDown: () => adjustVolume(-0.1)
      }
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
      const action = map[key]
      if (action) {
        e.preventDefault()
        action()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [videoUrl, togglePlay, markIn, markOut, addClip, nudge, seek, duration, fps, toggleMute, adjustVolume])

  /* ---------- slicing ---------- */

  const run = useCallback(async () => {
    if (!file || !readyClips.length) return
    cancelRef.current = false
    setResults([])
    setJob({ running: true, overall: 0, stage: 'Starting the encoder', error: '', log: [] })

    const pushLog = message => setJob(j => (j.running ? { ...j, log: [...j.log, message].slice(-400) } : j))
    const inputPath = `source.${sourceExt}`
    let ffmpeg = null

    try {
      ffmpeg = await loadEngine({ onStage: stage => setJob(j => ({ ...j, stage })), onLog: pushLog })

      setJob(j => ({ ...j, stage: 'Loading the video into ffmpeg' }))
      await writeSource(ffmpeg, inputPath, file)

      const total = readyClips.length
      const collected = []

      for (let i = 0; i < total; i++) {
        if (cancelRef.current) break
        const clip = readyClips[i]
        const name = readyNames[i]
        setJob(j => ({ ...j, stage: `Cutting ${name} (${i + 1} of ${total})`, overall: i / total }))

        const bytes = await sliceOne(ffmpeg, {
          inputPath,
          outputName: name,
          start: clip.start,
          end: clip.end,
          mode,
          onProgress: p => setJob(j => (j.running ? { ...j, overall: (i + p) / total } : j))
        })

        collected.push({
          name,
          bytes,
          index: String(i + 1).padStart(2, '0'),
          duration: clip.end - clip.start
        })
        setResults([...collected])
      }

      setJob(j => ({
        ...j,
        running: false,
        overall: 1,
        stage: cancelRef.current ? 'Stopped' : 'Done'
      }))
      if (collected.length) setShowSheet(true)
    } catch (err) {
      setJob(j => ({ ...j, running: false, error: friendlyError(err, file) }))
    } finally {
      if (ffmpeg) await clearSource(ffmpeg, inputPath)
    }
  }, [file, readyClips, readyNames, mode, sourceExt])

  const sampleArgs = readyClips.length
    ? buildArgs({
        input: 'input_source',
        output: readyNames[0],
        start: readyClips[0].start,
        end: readyClips[0].end,
        mode
      })
    : null

  /* ---------- render ---------- */

  return (
    <div className="app">
      <Hero fileName={file?.name} duration={duration ? formatShort(duration) : ''} />

      <main className="shell">
        {!file ? (
          <div className="intake">
            <Dropzone onFile={openFile} />
            <ol className="intake__steps">
              <li>
                <span>1</span> Pick a video from your machine
              </li>
              <li>
                <span>2</span> Press <kbd>I</kbd> and <kbd>O</kbd> to mark each clip
              </li>
              <li>
                <span>3</span> Run slice and download the batch
              </li>
            </ol>
          </div>
        ) : (
          <>
            {file.size > LARGE_SOURCE_BYTES && (
              <p className="notice notice--warn">
                This file is {(file.size / 1024 / 1024 / 1024).toFixed(1)} GB. A browser tab may run out of memory
                loading it into ffmpeg. If the slice fails, cut a shorter source or run ffmpeg locally.
              </p>
            )}

            <div className="grid">
              <div className="bench">
                <Stage
                  ref={videoRef}
                  videoUrl={videoUrl}
                  fileName={file.name}
                  duration={duration}
                  currentTime={currentTime}
                  playing={playing}
                  rate={rate}
                  fps={fps}
                  clips={clips}
                  activeId={activeId}
                  onLoadedMetadata={e => setDuration(e.currentTarget.duration || 0)}
                  onTimeUpdate={syncTime}
                  onEnded={() => setPlaying(false)}
                  onTogglePlay={togglePlay}
                  onSeek={seek}
                  onNudge={nudge}
                  onRate={setRate}
                  onMarkIn={markIn}
                  onMarkOut={markOut}
                  onSelect={setActiveId}
                  onAdjust={adjustFromRail}
                  volume={volume}
                  muted={muted}
                  onVolume={changeVolume}
                  onToggleMute={toggleMute}
                />

                <Results results={results} baseName={baseName} ext={ext} onClear={() => setResults([])} />
              </div>

              <aside className="side">
                <ClipDeck
                  clips={clips}
                  names={names}
                  activeId={activeId}
                  baseName={baseName}
                  currentTime={currentTime}
                  onBaseName={setBaseName}
                  onSelect={setActiveId}
                  onPatch={patchClip}
                  onDelete={deleteClip}
                  onAdd={addClip}
                  onClear={() => {
                    setClips([])
                    setActiveId(null)
                  }}
                  onPreview={preview}
                  onSetFromHead={setFromHead}
                />

                <RunPanel
                  ready={readyClips.length > 0}
                  readyCount={readyClips.length}
                  mode={mode}
                  onMode={setMode}
                  ext={ext}
                  onExt={setExt}
                  extChoices={extChoices}
                  job={job}
                  onRun={run}
                  onCancel={() => {
                    cancelRef.current = true
                  }}
                  sampleArgs={sampleArgs}
                  fileName={file.name}
                />

                <Dropzone onFile={openFile} compact />
              </aside>
            </div>
          </>
        )}
      </main>

      {showSheet && (
        <ResultsModal results={results} baseName={baseName} ext={ext} onClose={() => setShowSheet(false)} />
      )}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  )
}

function friendlyError(err, file) {
  const message = String(err?.message || err)
  if (/memory|allocat|RangeError|Aborted/i.test(message)) {
    return `ffmpeg ran out of memory on a ${(file.size / 1024 / 1024 / 1024).toFixed(1)} GB file. Try a shorter source, or cut this one with a local ffmpeg install.`
  }
  if (/reach|network|fetch|Failed to/i.test(message)) {
    return `Could not download the ffmpeg build: ${message}. Check the connection and try again.`
  }
  return message
}
