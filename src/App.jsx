import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Hero from './components/Hero.jsx'
import Dropzone, { pickVideo } from './components/Dropzone.jsx'
import Stage from './components/Stage.jsx'
import ClipDeck from './components/ClipDeck.jsx'
import RunPanel from './components/RunPanel.jsx'
import Results from './components/Results.jsx'
import ResultsModal from './components/ResultsModal.jsx'
import KeysSheet from './components/KeysSheet.jsx'
import Toast from './components/Toast.jsx'
import { formatShort, formatTick } from './lib/time.js'
import { allOutputNames } from './lib/naming.js'
import {
  loadEngine,
  isEngineReady,
  abortEngine,
  sliceOne,
  prepareSource,
  buildArgs,
  buildScript
} from './lib/ffmpegRunner.js'
import { sessionKey, loadSession, saveSession } from './lib/storage.js'
import { LARGE_SOURCE_BYTES } from './lib/limits.js'
import { useUndoable } from './lib/history.js'
import { downloadBlob } from './lib/download.js'
import {
  newClip,
  isReady,
  isDraft,
  findDraft,
  previousBoundary,
  overlapping,
  byStart,
  toCutList,
  fromCutList
} from './lib/clips.js'

const COMMON_FPS = [23.976, 24, 25, 29.97, 30, 48, 50, 59.94, 60]
const CONTAINERS = ['mp4', 'mkv', 'webm', 'mov']
const EMPTY_JOB = { running: false, overall: 0, stage: '', error: '', log: [] }
const TITLE = 'Splice — browser video splitter'

const no = i => String(i + 1).padStart(2, '0')

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

  const history = useUndoable([])
  const clips = history.value
  const clipsRef = history.ref
  const { set: setClips, undo, redo, reset: resetClips, seal } = history

  const [activeId, setActiveId] = useState(null)
  const [baseName, setBaseName] = useState('clip')
  const [mode, setMode] = useState('fast')
  const [ext, setExt] = useState('mp4')

  const [job, setJob] = useState(EMPTY_JOB)
  const [engine, setEngine] = useState(isEngineReady() ? 'ready' : 'idle')
  const [results, setResults] = useState([])
  const [showSheet, setShowSheet] = useState(false)
  const [showKeys, setShowKeys] = useState(false)
  const [toast, setToast] = useState(null)
  const [flash, setFlash] = useState(null)

  const videoRef = useRef(null)
  const previewEndRef = useRef(null)
  const cancelRef = useRef(false)
  const objectUrlRef = useRef('')
  const volumeRef = useRef(1)
  const activeRef = useRef(null)
  activeRef.current = activeId
  const modalOpen = showSheet || showKeys

  const storeKey = useMemo(() => sessionKey(file), [file])

  const sourceExt = useMemo(() => {
    const m = /\.([a-z0-9]+)$/i.exec(file?.name || '')
    return m ? m[1].toLowerCase() : 'mp4'
  }, [file])

  const extChoices = useMemo(() => [...new Set([sourceExt, ...CONTAINERS])], [sourceExt])
  const names = useMemo(() => allOutputNames(clips, baseName, ext), [clips, baseName, ext])
  // Ready clips keep the name and number they show in the list, even when an
  // unfinished clip sits between them. Numbering only the ready ones would
  // make clip 03 come out as clip02.mp4.
  const readyEntries = useMemo(
    () => clips.map((clip, index) => ({ clip, index, name: names[index] })).filter(e => isReady(e.clip)),
    [clips, names]
  )
  const overlapIds = useMemo(() => overlapping(clips), [clips])
  const activeIndex = clips.findIndex(c => c.id === activeId)
  const draft = useMemo(() => findDraft(clips, activeId), [clips, activeId])
  const draftIndex = draft ? clips.indexOf(draft) : -1

  const say = useCallback((text, action) => setToast({ text, action, key: Date.now() }), [])
  const pulse = useCallback((text, tone) => setFlash({ text, tone, key: Date.now() }), [])

  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(null), 1100)
    return () => clearTimeout(t)
  }, [flash])

  /* ---------- file intake ---------- */

  // The object URL is owned by a ref, not by an effect. An effect cleanup
  // keyed on videoUrl would revoke the URL it was just given whenever React
  // re-runs effects (StrictMode does exactly that), killing the player.
  const openFile = useCallback(nextFile => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    objectUrlRef.current = URL.createObjectURL(nextFile)
    previewEndRef.current = null
    setFile(nextFile)
    setVideoUrl(objectUrlRef.current)
    setDuration(0)
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
    const defaultExt = CONTAINERS.includes(sourceExt) ? sourceExt : 'mp4'
    if (saved) {
      const restored = saved.clips || []
      resetClips(restored)
      setBaseName(saved.baseName || guess)
      setMode(saved.mode || 'fast')
      setExt(saved.ext || defaultExt)
      setActiveId(null)
      if (restored.length) say(`Restored ${restored.length} clip${restored.length === 1 ? '' : 's'} from your last session`)
    } else {
      resetClips([])
      setActiveId(null)
      setBaseName(guess || 'clip')
      setExt(defaultExt)
    }
  }, [file, storeKey, sourceExt, resetClips, say])

  useEffect(() => {
    if (storeKey) saveSession(storeKey, { clips, baseName, mode, ext })
  }, [storeKey, clips, baseName, mode, ext])

  // A selection that no longer exists (undo, delete) should not linger.
  useEffect(() => {
    if (activeId && !clips.some(c => c.id === activeId)) setActiveId(null)
  }, [clips, activeId])

  // Drop a video anywhere on the page, not just on the drop target. Also
  // stops the browser from navigating away to a file dropped off-target.
  useEffect(() => {
    const over = e => {
      if (e.dataTransfer?.types?.includes('Files')) e.preventDefault()
    }
    const drop = e => {
      if (!e.dataTransfer?.files?.length) return
      e.preventDefault()
      // The drop targets handle their own drops.
      if (e.target.closest?.('.dropzone')) return
      if (job.running) return say('Wait for the slice to finish before opening another video')
      const next = pickVideo(e.dataTransfer.files)
      if (next) openFile(next)
      else say('That file does not look like a video')
    }
    window.addEventListener('dragover', over)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragover', over)
      window.removeEventListener('drop', drop)
    }
  }, [job.running, openFile, say])

  /* ---------- playback ---------- */

  const syncTime = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    if (previewEndRef.current != null && v.currentTime >= previewEndRef.current) {
      v.pause()
      v.currentTime = previewEndRef.current
      previewEndRef.current = null
    }
    setCurrentTime(v.currentTime)
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

  const head = useCallback(() => videoRef.current?.currentTime ?? 0, [])

  // `playing` follows the element's own play/pause events, so it stays true
  // to the video even when playback stops by itself (end of a preview, end of file).
  const togglePlay = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    previewEndRef.current = null
    if (v.paused) v.play().catch(() => {})
    else v.pause()
  }, [])

  const pause = useCallback(() => videoRef.current?.pause(), [])

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

  const nudge = useCallback(delta => seek(head() + delta), [seek, head])

  const preview = useCallback(clip => {
    const v = videoRef.current
    if (!v || !isReady(clip)) return
    v.currentTime = clip.start
    previewEndRef.current = clip.end
    v.play().catch(() => {})
  }, [])

  /* ---------- clip editing ---------- */

  const patchClip = useCallback(
    (id, patch, coalesce) => setClips(prev => prev.map(c => (c.id === id ? { ...c, ...patch } : c)), { coalesce }),
    [setClips]
  )

  const addClip = useCallback(() => {
    const clip = newClip({ start: head() })
    setClips(prev => [...prev, clip])
    setActiveId(clip.id)
    pulse(`IN ${formatTick(clip.start, 0.01)}`, 'in')
  }, [setClips, head, pulse])

  // I and O only ever touch a clip that is still open. A finished clip
  // changes when you mean it to: dragging its grips, typing its times, the
  // "head" buttons, or Shift+I / Shift+O on the selected clip.
  const markIn = useCallback(() => {
    const t = head()
    const list = clipsRef.current
    const open = findDraft(list, activeRef.current)
    if (open) {
      setClips(prev => prev.map(c => (c.id === open.id ? { ...c, start: t } : c)))
      setActiveId(open.id)
      pulse(`IN ${formatTick(t, 0.01)} · clip ${no(list.indexOf(open))}`, 'in')
      return
    }
    const clip = newClip({ start: t })
    setClips(prev => [...prev, clip])
    setActiveId(clip.id)
    pulse(`IN ${formatTick(t, 0.01)} · clip ${no(list.length)}`, 'in')
  }, [head, clipsRef, setClips, pulse])

  const markOut = useCallback(() => {
    const t = head()
    const list = clipsRef.current
    const open = findDraft(list, activeRef.current)
    if (open) {
      const i = list.indexOf(open)
      if (t <= open.start + 0.001) {
        say(`The out point has to come after clip ${no(i)}'s in point (${formatShort(open.start)})`)
        return
      }
      setClips(prev => prev.map(c => (c.id === open.id ? { ...c, end: t } : c)))
      setActiveId(open.id)
      pulse(`OUT ${formatTick(t, 0.01)} · clip ${no(i)} · ${formatShort(t - open.start)}`, 'out')
      return
    }
    // Nothing open: cut from the last out point before here, so pressing O
    // at each boundary tiles the video into back-to-back clips.
    const start = previousBoundary(list, t)
    if (t - start < 0.04) {
      say('Nothing to close here. Press I to start a clip first.')
      return
    }
    const clip = newClip({ start, end: t })
    setClips(prev => [...prev, clip])
    setActiveId(clip.id)
    pulse(`OUT ${formatTick(t, 0.01)} · clip ${no(list.length)} · ${formatShort(t - start)}`, 'out')
  }, [head, clipsRef, setClips, pulse, say])

  const setFromHead = useCallback(
    (id, edge) => {
      const t = head()
      patchClip(id, { [edge]: t })
      setActiveId(id)
      pulse(`${edge === 'start' ? 'IN' : 'OUT'} ${formatTick(t, 0.01)}`, edge === 'start' ? 'in' : 'out')
    },
    [patchClip, head, pulse]
  )

  // Rail drags: an edge may not cross its partner. Returns the time actually
  // applied so the rail can park the playhead on it.
  const adjustFromRail = useCallback(
    (id, edge, t, key) => {
      const clip = clipsRef.current.find(c => c.id === id)
      if (!clip) return t
      const gap = 1 / (fps || 30)
      let value = t
      if (edge === 'start' && clip.end != null) value = Math.min(t, clip.end - gap)
      if (edge === 'end' && clip.start != null) value = Math.max(t, clip.start + gap)
      value = Math.max(0, Math.min(duration || value, value))
      patchClip(id, { [edge]: value }, key)
      return value
    },
    [clipsRef, fps, duration, patchClip]
  )

  const deleteClip = useCallback(
    id => {
      const list = clipsRef.current
      const i = list.findIndex(c => c.id === id)
      if (i < 0) return
      setClips(prev => prev.filter(c => c.id !== id))
      if (activeRef.current === id) setActiveId(list[i + 1]?.id ?? list[i - 1]?.id ?? null)
      say(`Removed clip ${no(i)}`, { label: 'Undo', run: undo })
    },
    [clipsRef, setClips, say, undo]
  )

  const clearClips = useCallback(() => {
    const count = clipsRef.current.length
    setClips([])
    setActiveId(null)
    say(`Cleared ${count} clip${count === 1 ? '' : 's'}`, { label: 'Undo', run: undo })
  }, [clipsRef, setClips, say, undo])

  const sortClips = useCallback(() => setClips(prev => [...prev].sort(byStart)), [setClips])

  // Selecting from the list. A press on the card itself also brings the clip
  // on screen, unless the playhead is already inside it.
  const focusClip = useCallback(
    (id, reveal) => {
      setActiveId(id)
      if (!reveal) return
      const clip = clipsRef.current.find(c => c.id === id)
      if (!clip || clip.start == null) return
      const t = head()
      const inside = t >= clip.start && (clip.end == null || t <= clip.end)
      if (!inside) seek(clip.start)
    },
    [clipsRef, head, seek]
  )

  // Pressing the empty strip is navigation, not editing: let go of a
  // finished clip so the next I or O cannot be mistaken as aimed at it. An
  // open clip stays selected — it is the one O is about to close.
  const releaseSelection = useCallback(() => {
    setActiveId(cur => {
      const clip = clipsRef.current.find(c => c.id === cur)
      return clip && isDraft(clip) ? cur : null
    })
  }, [clipsRef])

  const importCuts = useCallback(
    async f => {
      const parsed = fromCutList(await f.text())
      if (!parsed.length) return say(`No "start end" lines found in ${f.name}`)
      setClips(prev => [...prev, ...parsed])
      say(`Imported ${parsed.length} clip${parsed.length === 1 ? '' : 's'}`, { label: 'Undo', run: undo })
    },
    [setClips, say, undo]
  )

  const exportCuts = useCallback(() => {
    downloadBlob(new Blob([toCutList(clipsRef.current)], { type: 'text/plain' }), `${baseName || 'clips'}_cuts.txt`)
  }, [clipsRef, baseName])

  const exportScript = useCallback(() => {
    if (!file) return
    const text = buildScript({
      clips: readyEntries.map(e => e.clip),
      names: readyEntries.map(e => e.name),
      mode,
      fileName: file.name
    })
    downloadBlob(new Blob([text], { type: 'text/x-shellscript' }), `${baseName || 'clips'}_slice.sh`)
  }, [file, readyEntries, mode, baseName])

  /* ---------- slicing ---------- */

  // Fetch the encoder in the background once there is something to cut, so
  // the first Run does not start with a 32 MB download.
  useEffect(() => {
    if (engine !== 'idle' || !readyEntries.length) return
    const t = setTimeout(() => {
      setEngine('loading')
      loadEngine()
        .then(() => setEngine('ready'))
        .catch(() => setEngine('error'))
    }, 1200)
    return () => clearTimeout(t)
  }, [engine, readyEntries.length])

  const run = useCallback(async () => {
    if (!file || !readyEntries.length || job.running) return
    const entries = readyEntries
    cancelRef.current = false
    setResults([])
    setJob({ running: true, overall: 0, stage: 'Starting the encoder', error: '', log: [] })

    const pushLog = message => setJob(j => (j.running ? { ...j, log: [...j.log, message].slice(-400) } : j))
    let source = null
    let ffmpeg = null
    const collected = []

    try {
      setEngine(e => (e === 'ready' ? e : 'loading'))
      ffmpeg = await loadEngine({ onStage: stage => setJob(j => ({ ...j, stage })), onLog: pushLog })
      setEngine('ready')

      setJob(j => ({ ...j, stage: 'Opening the video' }))
      source = await prepareSource(ffmpeg, file, `source.${sourceExt}`)

      const total = entries.length
      for (let i = 0; i < total; i++) {
        if (cancelRef.current) break
        const { clip, name, index } = entries[i]
        setJob(j => ({ ...j, stage: `Cutting ${name} (${i + 1} of ${total})`, overall: i / total }))

        const bytes = await sliceOne(ffmpeg, {
          inputPath: source.path,
          outputName: name,
          start: clip.start,
          end: clip.end,
          mode,
          onProgress: p => setJob(j => (j.running ? { ...j, overall: (i + p) / total } : j))
        })

        collected.push({ name, bytes, index: no(index), duration: clip.end - clip.start })
        setResults([...collected])
      }

      setJob(j => ({ ...j, running: false, overall: 1, stage: cancelRef.current ? 'Stopped' : 'Done' }))
      if (collected.length) setShowSheet(true)
    } catch (err) {
      if (cancelRef.current) {
        setJob(j => ({ ...j, running: false, stage: 'Stopped' }))
        if (collected.length) setShowSheet(true)
      } else {
        setJob(j => ({ ...j, running: false, error: friendlyError(err, file) }))
      }
    } finally {
      if (source && !cancelRef.current) await source.release()
    }
  }, [file, readyEntries, mode, sourceExt, job.running])

  const cancel = useCallback(() => {
    cancelRef.current = true
    abortEngine()
    setEngine('idle')
  }, [])

  const firstReady = readyEntries[0]
  const sampleArgs = firstReady
    ? buildArgs({ input: 'input_source', output: firstReady.name, start: firstReady.clip.start, end: firstReady.clip.end, mode })
    : null

  // Progress in the tab title, so a long run can sit in a background tab.
  useEffect(() => {
    if (job.running) document.title = `${Math.round(job.overall * 100)}% · Slicing · Splice`
    else if (job.stage === 'Done' && results.length) document.title = `✓ ${results.length} clips ready · Splice`
    else document.title = TITLE
  }, [job.running, job.overall, job.stage, results.length])

  // Leaving mid-run, or with cut clips not yet saved, loses work.
  useEffect(() => {
    if (!job.running && !results.length) return
    const warn = e => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [job.running, results.length])

  /* ---------- keyboard ---------- */

  const keyActions = useRef({})
  keyActions.current = {
    togglePlay,
    pause,
    markIn,
    markOut,
    addClip,
    nudge,
    seek,
    toggleMute,
    adjustVolume,
    undo,
    redo,
    run,
    preview,
    deleteClip,
    setFromHead,
    duration,
    fps,
    activeId,
    clips
  }

  useEffect(() => {
    if (!videoUrl) return
    const onKey = e => {
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable) return
      if (modalOpen) return
      const a = keyActions.current
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
      const active = a.clips.find(c => c.id === a.activeId)

      if (e.ctrlKey || e.metaKey) {
        if (key === 'z' && !e.shiftKey) a.undo()
        else if ((key === 'z' && e.shiftKey) || key === 'y') a.redo()
        else if (key === 'Enter') a.run()
        else return
        e.preventDefault()
        return
      }
      if (e.altKey) return

      const map = {
        ' ': () => a.togglePlay(),
        k: () => a.pause(),
        j: () => a.nudge(-5),
        l: () => a.nudge(5),
        i: () => (e.shiftKey ? active && a.setFromHead(active.id, 'start') : a.markIn()),
        o: () => (e.shiftKey ? active && a.setFromHead(active.id, 'end') : a.markOut()),
        n: () => a.addClip(),
        p: () => active && a.preview(active),
        '[': () => active?.start != null && a.seek(active.start),
        ']': () => active?.end != null && a.seek(active.end),
        ',': () => a.nudge(-1 / a.fps),
        '.': () => a.nudge(1 / a.fps),
        '<': () => a.nudge(-1 / a.fps),
        '>': () => a.nudge(1 / a.fps),
        ArrowLeft: () => a.nudge(e.shiftKey ? -10 : -1),
        ArrowRight: () => a.nudge(e.shiftKey ? 10 : 1),
        Home: () => a.seek(0),
        End: () => a.seek(a.duration),
        m: () => a.toggleMute(),
        ArrowUp: () => a.adjustVolume(0.1),
        ArrowDown: () => a.adjustVolume(-0.1),
        Escape: () => setActiveId(null),
        Delete: () => active && a.deleteClip(active.id),
        Backspace: () => active && a.deleteClip(active.id),
        '?': () => setShowKeys(true)
      }
      const action = map[key]
      if (action) {
        e.preventDefault()
        action()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [videoUrl, modalOpen])

  /* ---------- render ---------- */

  const closeSheet = useCallback(() => setShowSheet(false), [])
  const dismissToast = useCallback(() => setToast(null), [])
  const closeKeys = useCallback(() => setShowKeys(false), [])
  const openKeys = useCallback(() => setShowKeys(true), [])
  const clearResults = useCallback(() => setResults([]), [])
  const onLoadedMetadata = useCallback(e => setDuration(e.currentTarget.duration || 0), [])

  return (
    <div className="app">
      <Hero
        fileName={file?.name}
        fileSize={file?.size}
        duration={duration ? formatShort(duration) : ''}
      />

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
            <p className="intake__privacy">Nothing is uploaded. The video never leaves this tab.</p>
          </div>
        ) : (
          <>
            {file.size > LARGE_SOURCE_BYTES && (
              <p className="notice notice--warn">
                This file is {(file.size / 1024 / 1024 / 1024).toFixed(1)} GB. Splice reads it straight from disk, but
                the browser may still struggle. If a slice fails, download the .sh script and run it with a local ffmpeg.
              </p>
            )}

            <div className="grid">
              <div className="bench">
                <Stage
                  ref={videoRef}
                  videoUrl={videoUrl}
                  duration={duration}
                  currentTime={currentTime}
                  playing={playing}
                  rate={rate}
                  fps={fps}
                  clips={clips}
                  activeId={activeId}
                  activeIndex={activeIndex}
                  draftIndex={draftIndex}
                  overlapIds={overlapIds}
                  flash={flash}
                  onLoadedMetadata={onLoadedMetadata}
                  onTimeUpdate={syncTime}
                  onPlayState={setPlaying}
                  onTogglePlay={togglePlay}
                  onSeek={seek}
                  onNudge={nudge}
                  onRate={setRate}
                  onMarkIn={markIn}
                  onMarkOut={markOut}
                  onSelect={setActiveId}
                  onScrubEmpty={releaseSelection}
                  onAdjust={adjustFromRail}
                  onAdjustEnd={seal}
                  volume={volume}
                  muted={muted}
                  onVolume={changeVolume}
                  onToggleMute={toggleMute}
                  onShowKeys={openKeys}
                />

                <Results results={results} baseName={baseName} ext={ext} onClear={clearResults} />
              </div>

              <aside className="side">
                <ClipDeck
                  clips={clips}
                  names={names}
                  activeId={activeId}
                  baseName={baseName}
                  overlapIds={overlapIds}
                  canUndo={history.canUndo}
                  canRedo={history.canRedo}
                  onUndo={undo}
                  onRedo={redo}
                  onBaseName={setBaseName}
                  onFocusClip={focusClip}
                  onPatch={patchClip}
                  onDelete={deleteClip}
                  onAdd={addClip}
                  onClear={clearClips}
                  onSort={sortClips}
                  onPreview={preview}
                  onSetFromHead={setFromHead}
                  onImport={importCuts}
                  onExport={exportCuts}
                />

                <RunPanel
                  readyCount={readyEntries.length}
                  mode={mode}
                  onMode={setMode}
                  ext={ext}
                  onExt={setExt}
                  extChoices={extChoices}
                  job={job}
                  engine={engine}
                  onRun={run}
                  onCancel={cancel}
                  sampleArgs={sampleArgs}
                  fileName={file.name}
                  onScript={exportScript}
                />

                <Dropzone onFile={openFile} compact disabled={job.running} />
              </aside>
            </div>
          </>
        )}
      </main>

      <footer className="foot">
        <span>Splice runs ffmpeg in your browser</span>
        <span className="foot__sep" />
        <span>Nothing is uploaded</span>
        <span className="foot__sep" />
        <button type="button" className="foot__link" onClick={openKeys} disabled={!file}>
          Keyboard shortcuts <kbd>?</kbd>
        </button>
      </footer>

      {showSheet && <ResultsModal results={results} baseName={baseName} ext={ext} onClose={closeSheet} />}
      {showKeys && <KeysSheet onClose={closeKeys} />}
      {toast && <Toast toast={toast} onDone={dismissToast} />}
    </div>
  )
}

function friendlyError(err, file) {
  const message = String(err?.message || err)
  if (/memory|allocat|RangeError|Aborted/i.test(message)) {
    return `ffmpeg ran out of memory on a ${(file.size / 1024 / 1024 / 1024).toFixed(1)} GB file. Try a shorter source, or download the .sh script and cut it with a local ffmpeg.`
  }
  if (/reach|network|fetch|Failed to/i.test(message)) {
    return `Could not download the ffmpeg build: ${message}. Check the connection and try again.`
  }
  if (/exited with code/i.test(message)) {
    return `${message}. Open "ffmpeg output" below for the reason — a container that cannot hold the source codecs is the usual cause; try .mkv or Precise mode.`
  }
  return message
}
