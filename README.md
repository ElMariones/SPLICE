# Splice

A video splitter that runs in the browser. Load a file from your machine, mark
in and out points while you watch it, and cut the whole batch into numbered
clips.

Nothing is uploaded. ffmpeg is compiled to WebAssembly and runs inside the tab,
so the whole app is static files — it works on GitHub Pages with no server.

## What it does

- **Mark while you watch.** <kbd>I</kbd> starts a clip at the playhead and
  <kbd>O</kbd> closes it. Pressing <kbd>O</kbd> with nothing open cuts from the
  previous out point, so tapping <kbd>O</kbd> at each boundary tiles a video
  into back-to-back clips. Step one frame with <kbd>,</kbd> and <kbd>.</kbd> —
  the frame rate is measured from the file, not assumed.
- **Navigate without fear.** Pressing anywhere on the timeline scrubs, even on
  top of a clip. Finished clips only change when you mean it: dragging a grip,
  typing a time, the *head* buttons, or <kbd>Shift</kbd>+<kbd>I</kbd>/<kbd>O</kbd>
  on the selected clip. <kbd>I</kbd> and <kbd>O</kbd> never rewrite a finished cut.
- **Undo everything.** <kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd>.
  A whole drag or a burst of typing is one step; removing or clearing clips
  offers Undo right in the notification.
- **See the whole cut plan.** Every clip is a lit segment on the timeline. Drag
  either edge to trim — edges move by how far you drag and snap to the
  playhead and to other clips (hold <kbd>Alt</kbd> to drag freely). Hovering
  shows a frame preview. Zoom with <kbd>Ctrl</kbd>+scroll, <kbd>+</kbd>/<kbd>−</kbd>,
  or the buttons; a minimap shows where you are.
- **Type times instead, if you prefer.** The fields take `1:34`, `01:02:33`,
  bare seconds (`94`), and fractions (`7:13.5`). <kbd>↑</kbd>/<kbd>↓</kbd> nudge
  by a second (<kbd>Shift</kbd> 10 s, <kbd>Alt</kbd> 0.1 s).
- **Name the batch.** Outputs are numbered `{base}01.mp4`, `{base}02.mp4`, … and
  any single clip can override the name. The number in the list is the number
  in the file name, even if an unfinished clip sits in between.
- **Fast or precise.** Fast copies the stream — seconds per clip, cuts land on
  the nearest keyframe. Precise re-encodes to hit the exact frame.
- **Check, then download.** Every finished clip can be watched in place before
  you save it, singly or as one `.zip`. Stop aborts immediately and keeps what
  is already cut.
- **Take it elsewhere.** Export or import the cut list as plain text
  (`start  end  [name]` per line), or download the batch as a `.sh` script for
  a native ffmpeg.
- **Light and dark.** Follows your system theme and switches the moment you
  change it, no reload. The button in the corner cycles Auto → Light → Dark.

Your cut list is saved per file, so reopening the same video brings it back.
Drop a video anywhere on the page to open it.

### Keyboard

Press <kbd>?</kbd> in the app for the full list.

| Key | Action |
|---|---|
| <kbd>Space</kbd> / <kbd>K</kbd> | Play / pause · pause |
| <kbd>J</kbd> / <kbd>L</kbd> | −5 s / +5 s |
| <kbd>I</kbd> / <kbd>O</kbd> | Mark in / mark out |
| <kbd>Shift</kbd>+<kbd>I</kbd> / <kbd>O</kbd> | Trim the selected clip to the playhead |
| <kbd>[</kbd> / <kbd>]</kbd> | Jump to the selected clip's in / out |
| <kbd>N</kbd> | New clip at the playhead |
| <kbd>P</kbd> | Preview the selected clip |
| <kbd>Del</kbd> / <kbd>Esc</kbd> | Remove / deselect the selected clip |
| <kbd>,</kbd> / <kbd>.</kbd> | Step one frame |
| <kbd>←</kbd> / <kbd>→</kbd> | ±1 second (hold <kbd>Shift</kbd> for ±10) |
| <kbd>+</kbd> / <kbd>−</kbd> / <kbd>0</kbd> | Zoom the timeline in / out / fit |
| <kbd>↑</kbd> / <kbd>↓</kbd> | Volume up / down |
| <kbd>M</kbd> | Mute |
| <kbd>Home</kbd> / <kbd>End</kbd> | Jump to start / end |
| <kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> | Undo / redo |
| <kbd>Ctrl</kbd>+<kbd>Enter</kbd> | Run slice |

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

## How theming works

The palette lives entirely in CSS custom properties, so light mode is a
redefinition of the same roles rather than a second stylesheet.

In **Auto**, no `data-theme` attribute is set at all. That is deliberate: the
decision is left to a `prefers-color-scheme` block, so the palette tracks the
system even if no JavaScript event ever arrives. Choosing Light or Dark stamps
`data-theme` on `<html>`, which wins over the media query.

The canvas-based components (`MoltenMetal`, `ElectricBorder`, `DepthText`) paint
colours they are handed as props and cannot read CSS variables. They ask
`lib/theme.js` which palette won, and it answers by reading a `--scheme` token
back out of the computed style — so the stylesheet stays the single source of
truth and the two halves cannot disagree.

A small inline script in `index.html` stamps the theme before first paint, so
the page never flashes the wrong palette.

Contrast was checked against WCAG AA for normal text in both palettes.

## How ffmpeg gets into the page

`public/ffmpeg/` holds two small files (about 7 KB) from `@ffmpeg/ffmpeg`. They
are committed on purpose. The loader starts its worker from whatever directory
it was itself served from, and browsers refuse to start a worker from another
origin — so a CDN copy cannot work.

Passing `classWorkerURL` to point at a CDN copy looks like the fix and is not:
the library spawns that URL as a *module* worker, while the worker code calls
`importScripts`, which module workers do not have. Both routes fail, which is
why these two files are local.

The 32 MB core is fetched from unpkg in the background as soon as you have a
clip to cut, and cached by the browser afterwards. Refresh the vendored files with `npm run vendor:ffmpeg`.

The single-threaded core is deliberate: the multi-threaded build needs
`SharedArrayBuffer`, which needs COOP/COEP response headers, which GitHub Pages
does not send.

## Limits worth knowing

- The source is mounted into ffmpeg with WORKERFS, so it is read from disk on
  demand rather than copied into memory. Very large files can still strain a
  tab; the app warns past 1.2 GB, and the `.sh` export is the fallback.
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
