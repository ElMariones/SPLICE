// The @ffmpeg/ffmpeg loader spawns its worker from wherever ffmpeg.js was
// served. Workers must be same-origin, so these two small files have to sit
// in our own /ffmpeg/ directory — a CDN copy is blocked by the browser.
// The 32 MB core stays on the CDN and is fetched as a blob at runtime.
import { mkdir, writeFile, access } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const VERSION = '0.12.10'
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'ffmpeg')
const FILES = ['ffmpeg.js', '814.ffmpeg.js']

await mkdir(OUT, { recursive: true })

for (const name of FILES) {
  const target = join(OUT, name)
  if (!process.argv.includes('--force')) {
    try {
      await access(target)
      console.log(`· ${name} already vendored`)
      continue
    } catch {}
  }
  const url = `https://unpkg.com/@ffmpeg/ffmpeg@${VERSION}/dist/umd/${name}`
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`${url} responded ${res.status}`)
    const bytes = Buffer.from(await res.arrayBuffer())
    await writeFile(target, bytes)
    console.log(`\u2713 ${name} (${bytes.length} bytes)`)
  } catch (err) {
    // These files are committed, so a failed refresh is not fatal.
    console.warn(`! could not refresh ${name}: ${err.message}`)
  }
}
