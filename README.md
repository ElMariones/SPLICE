# Splice

A video splitter that runs in the browser. Load a file from your machine, mark
in and out points while you watch it, and cut the whole batch into numbered
clips.

Nothing is uploaded. ffmpeg is compiled to WebAssembly and runs inside the tab,
so the whole app is static files — it works on GitHub Pages with no server.

## What it does

- **Mark while you watch.** <kbd>I</kbd> and <kbd>O</kbd> set the in and out
  points at the playhead. Step one frame with <kbd>,</kbd> and <kbd>.</kbd> —
  the frame rate is measured from the file, not assumed.
- **See the whole cut plan.** Every clip is a lit segment on the timeline strip
  under the video. Drag either edge to adjust it; the video scrubs as you drag.
- **Type times instead, if you prefer.** The fields take `1:34`, `01:02:33`,
  bare seconds (`94`), and fractions (`7:13.5`).
- **Name the batch.** Outputs are numbered `{base}01.mp4`, `{base}02.mp4`, … and
  any single clip can override the name.
- **Fast or precise.** Fast copies the stream — seconds per clip, cuts land on
  the nearest keyframe. Precise re-encodes to hit the exact frame.
- **Download the batch.** A panel under the player lists every finished clip,
  and a popup offers the whole set as one `.zip` the moment slicing ends.

Your cut list is saved per file, so reopening the same video brings it back.

### Keyboard

| Key | Action |
|---|---|
| <kbd>Space</kbd> | Play / pause |
| <kbd>I</kbd> / <kbd>O</kbd> | Mark in / mark out at the playhead |
| <kbd>N</kbd> | New clip at the playhead |
| <kbd>,</kbd> / <kbd>.</kbd> | Step one frame |
| <kbd>←</kbd> / <kbd>→</kbd> | ±1 second (hold <kbd>Shift</kbd> for ±10) |
| <kbd>↑</kbd> / <kbd>↓</kbd> | Volume up / down |
| <kbd>M</kbd> | Mute |
| <kbd>Home</kbd> / <kbd>End</kbd> | Jump to start / end |

## Run it locally

```bash
npm install
npm run dev
```

## Publish it to GitHub Pages

1. Push this repository to GitHub.
2. **Settings → Pages → Build and deployment → Source → GitHub Actions**.
3. Push to `main`. The workflow in `.github/workflows/deploy.yml` builds and
   publishes, and the site appears at `https://<user>.github.io/<repo>/`.

`vite.config.js` sets `base: './'`, so the same build works at a repo subpath or
at a domain root with no edits.

## How ffmpeg gets into the page

`public/ffmpeg/` holds two small files (about 7 KB) from `@ffmpeg/ffmpeg`. They
are committed on purpose. The loader starts its worker from whatever directory
it was itself served from, and browsers refuse to start a worker from another
origin — so a CDN copy cannot work.

Passing `classWorkerURL` to point at a CDN copy looks like the fix and is not:
the library spawns that URL as a *module* worker, while the worker code calls
`importScripts`, which module workers do not have. Both routes fail, which is
why these two files are local.

The 32 MB core is fetched from unpkg on first use and cached by the browser
afterwards. Refresh the vendored files with `npm run vendor:ffmpeg`.

The single-threaded core is deliberate: the multi-threaded build needs
`SharedArrayBuffer`, which needs COOP/COEP response headers, which GitHub Pages
does not send.

## Limits worth knowing

- The source has to fit in the tab's memory. Past roughly 1.2 GB you may run
  out; the app warns you before you start.
- Fast mode cuts on keyframes, so a clip can begin slightly early or run
  slightly long. Precise mode fixes that at the cost of speed.
- Cutting is stream-copy by default, so the output container must be able to
  hold the source codecs. The container defaults to the source's own.

## Origin

This started as `clipper.py`, a script that read a `cuts.txt` of start/end pairs
and shelled out to ffmpeg. Splice runs the same command — `ffmpeg -y -ss S -to E
-i video -c copy out.mp4` — and shows it in the interface before it runs.

## Credits

Visual components from [React Bits](https://reactbits.dev): `DepthText`,
`ElectricBorder` (inspired by [@BalintFerenczy](https://codepen.io/BalintFerenczy/pen/KwdoyEN)),
and `MoltenMetal`. Cutting by [ffmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm).
