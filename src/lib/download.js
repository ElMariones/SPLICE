import { zipSync } from 'fflate'

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export function downloadBytes(bytes, filename, type = 'video/mp4') {
  downloadBlob(new Blob([bytes], { type }), filename)
}

// level 0 = store. The clips are already compressed video; deflating them
// costs seconds and saves nothing.
export function downloadZip(files, filename) {
  const entries = {}
  for (const f of files) entries[f.name] = [f.bytes, { level: 0 }]
  const zipped = zipSync(entries, { level: 0 })
  downloadBlob(new Blob([zipped], { type: 'application/zip' }), filename)
}
