import { formatPrecise } from './time.js'

const UTIL_VERSION = '0.12.1'
const CORE_VERSION = '0.12.6'
const CDN = 'https://unpkg.com'

// Single-threaded core on purpose: the multi-threaded build needs
// SharedArrayBuffer, which needs COOP/COEP headers, which GitHub Pages will
// not send. This build runs on any plain static host.
const CORE_BASE = `${CDN}/@ffmpeg/core@${CORE_VERSION}/dist/umd`

// ffmpeg.js and its worker chunk are served from our own origin (see
// scripts/vendor-ffmpeg.mjs). They have to be: the loader spawns its worker
// from whatever directory ffmpeg.js came from, and browsers refuse to start
// a worker from another origin. Passing classWorkerURL instead is not a way
// out — the library spawns that one as a module worker, and the worker code
// calls importScripts, which module workers do not have.
const LOADER = `${import.meta.env.BASE_URL}ffmpeg/ffmpeg.js`

let instance = null
let loading = null

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve()
    const el = document.createElement('script')
    el.src = src
    el.onload = () => resolve()
    el.onerror = () => reject(new Error(`Could not reach ${src}`))
    document.head.appendChild(el)
  })
}

export function isEngineReady() {
  return Boolean(instance)
}

export async function loadEngine({ onStage, onLog } = {}) {
  if (instance) return instance
  if (loading) return loading

  loading = (async () => {
    onStage?.('Starting the encoder')
    await loadScript(LOADER)
    await loadScript(`${CDN}/@ffmpeg/util@${UTIL_VERSION}/dist/umd/index.js`)

    const { FFmpeg } = window.FFmpegWASM || {}
    const { toBlobURL } = window.FFmpegUtil || {}
    if (!FFmpeg || !toBlobURL) throw new Error('The encoder scripts loaded but did not register.')

    const ffmpeg = new FFmpeg()
    ffmpeg.on('log', ({ message }) => onLog?.(message))

    onStage?.('Unpacking ffmpeg (about 32 MB, cached after this)')
    // No classWorkerURL here on purpose — see the note above.
    await ffmpeg.load({
      coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, 'application/wasm')
    })

    onStage?.('Ready')
    instance = ffmpeg
    return ffmpeg
  })()

  try {
    return await loading
  } catch (err) {
    loading = null
    throw err
  }
}

// The exact argument list, shared by the in-browser run and the exported
// shell script, so what you see in the UI is what actually runs.
// Fast mode matches clipper.py: -ss / -to before -i, then -c copy.
export function buildArgs({ input, output, start, end, mode }) {
  const head = ['-y', '-ss', formatPrecise(start), '-to', formatPrecise(end), '-i', input]
  const codec =
    mode === 'precise'
      ? ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-c:a', 'aac', '-b:a', '160k']
      : ['-c', 'copy']
  return [...head, ...codec, output]
}

export function commandLine(args, videoFileName) {
  return ['ffmpeg', ...args]
    .map(a => (a === 'input_source' ? quote(videoFileName) : quote(a)))
    .join(' ')
}

function quote(a) {
  return /[\s"'|&;<>()$`\\*?[\]]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a
}

// Cuts one clip. The source file is written into the virtual FS once by the
// caller and reused, because writing a multi-GB file per clip is what kills
// the tab.
export async function sliceOne(ffmpeg, { inputPath, outputName, start, end, mode, onProgress }) {
  const args = buildArgs({ input: inputPath, output: outputName, start, end, mode })

  const handler = ({ progress }) => onProgress?.(Math.min(1, Math.max(0, progress || 0)))
  ffmpeg.on('progress', handler)
  try {
    const code = await ffmpeg.exec(args)
    if (code !== 0) throw new Error(`ffmpeg exited with code ${code}`)
    const data = await ffmpeg.readFile(outputName)
    await ffmpeg.deleteFile(outputName).catch(() => {})
    return new Uint8Array(data)
  } finally {
    ffmpeg.off('progress', handler)
  }
}

export async function writeSource(ffmpeg, path, file) {
  const buffer = new Uint8Array(await file.arrayBuffer())
  await ffmpeg.writeFile(path, buffer)
  return buffer.byteLength
}

export async function clearSource(ffmpeg, path) {
  await ffmpeg.deleteFile(path).catch(() => {})
}
