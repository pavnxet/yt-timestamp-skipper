<!-- verified-at: 8dc1daf · 2026-11-14 -->
# Persistent Learnings & Domain Knowledge

## [area: parsing]
- [PITFALL] `updateStateFromText` treated any line containing `|` as a markdown table row. Titles like `01:29 - Idioms [MCQ] | to bell the cat = …` were split into cells, found no timestamp, and were dropped — leaving the Chapters tab empty while the Editor still showed text. Fix: require `line.trim().startsWith('|') && line.split('|').length >= 3`. (v:2026-11-14 · high · S-20261114-0000)
- [PITFALL] The Editor renders `currentRawText`, assigned before parsing runs. Text visible in the Editor plus an empty chapter list means the parser failed, not the loader. (v:2026-11-14 · medium · S-20261114-0000)

## [area: layout]
- [PITFALL] Overlay UI parented to `.html5-video-player` vanishes in fullscreen: that element clips with `overflow: hidden`, and its transform makes `position: fixed` resolve against it. Append to `document.fullscreenElement || document.body`. (v:2026-11-14 · high · S-20261114-0000)
- [PITFALL] Mixing coordinate spaces: `getBoundingClientRect()` returns viewport coordinates. Using the host element's height as the viewport made `bottom` negative and pushed the card off-screen. Use `window.innerWidth` / `window.innerHeight`. (v:2026-11-14 · high · S-20261114-0000)
- [CONVENTION] Glass overlays use dark glass, not white — the panel sits over video that may be a white slide. (v:2026-11-14 · medium · S-20261114-0000)

## [area: timing]
- [PITFALL] `initMarkerProbe` bound once at boot; when `.ytp-progress-bar` had not rendered yet the listener never attached and hover was dead. Re-attempt the bind on each `timeupdate`. (v:2026-11-14 · high · S-20261114-0000)
- [CONVENTION] Chapter crossings are detected by comparing two samples (`last`, `now`). A jump larger than 1.5 s is a seek and must not raise a card. (v:2026-11-14 · high · S-20261114-0000)

## [area: build]
- [PITFALL] The `yt-allinone` skill text contains 41 backticks. Embed it with a JSON-escaped string; a template literal would terminate at the first backtick and break the whole file. (v:2026-11-14 · high · S-20261114-0000)
- [PITFALL] The Actions token cannot create files under `.github/workflows/` — `workflows` is not a valid `permissions:` key, so the workflow fails to parse. Workflow files must be pushed via the GitHub App/connector, not from inside a workflow. (v:2026-11-14 · high · S-20261114-0000)

## [area: release]
- [PITFALL] Never regenerate `CRX_PRIVATE_KEY`. The extension ID (`idcdhbjfemmhadnlijcohccpedihldhp`) is derived from it; a new key means every existing install stops updating. (v:2026-11-14 · high · S-20261114-0000)
- [CONVENTION] `manifest.version` must strictly increase — Chrome compares it as 1–4 dotted integers. (v:2026-11-14 · high · S-20261114-0000)

## [area: security]
- [PITFALL] `background.js` defines `DEFAULT_TRANSCRIPT_API_KEY` with a live key in plain text, and it ships in public releases. Rotate it and load it at runtime. (v:2026-11-14 · high · S-20261114-0000)
- [CONVENTION] The scanner's `sk-` token rule is tuned with `(?<![A-Za-z0-9-])` so the project's own `yt-sk-` CSS prefix is not a false positive. Do not rename classes to dodge a scanner hit. (v:2026-11-14 · medium · S-20261114-0000)
