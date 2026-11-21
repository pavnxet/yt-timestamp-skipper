<!-- verified-at: 9433d08 · 2026-11-21 -->
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

## [area: storage]
- [PITFALL] `shortcuts` is a single stored object. `shortcuts = res.shortcuts` replaces it wholesale, so any key added by a later version is `undefined` for existing users and the new shortcut silently never fires. Always `{ ...DEFAULT_SHORTCUTS, ...res.shortcuts }`. (v:2026-11-18 · high · S-20261118-0000)
- [CONVENTION] Treat `chrome.storage.local` key names as public API — renaming one silently drops user data. (v:2026-11-18 · medium · S-20261118-0000)

## [area: shortcuts]
- [PITFALL] The recorder adds a `window` keydown listener while the global handler listens on `document`. Both fire on the same press, so rebinding a key also triggers its current action (rebinding to `Alt+M` toggled the panel mid-record). Guard with a `recordingShortcut` flag checked first in the global handler. (v:2026-11-18 · high · S-20261118-0000)
- [PITFALL] `Alt+S` (sponsor marker) is hardcoded as `e.altKey && e.code === 'KeyS'`, and `recordShortcut` has no branch for `yt-sk-sc-sb`. Its Settings box looks editable but does nothing. Still open. (v:2026-11-18 · high · S-20261118-0000)
- [CONVENTION] Prefer `Alt+<letter>` for new bindings. YouTube claims most bare letters (`k`, `m`, `f`, `t`, `c`, `i`, `j`, `l`, digits), so a bare letter fights the player. (v:2026-11-18 · high · S-20261118-0000)
- [CONVENTION] Handle the panel toggle before the `<video>` guard so it still works when the player node is momentarily absent. (v:2026-11-18 · medium · S-20261118-0000)

## [area: build]
- [PITFALL] The `yt-allinone` skill text contains 41 backticks. Embed it with a JSON-escaped string; a template literal would terminate at the first backtick and break the whole file. (v:2026-11-14 · high · S-20261114-0000)
- [PITFALL] The Actions token cannot create files under `.github/workflows/` — `workflows` is not a valid `permissions:` key, so the workflow fails to parse. Workflow files must be pushed via the GitHub App/connector, not from inside a workflow. (v:2026-11-14 · high · S-20261114-0000)
- [PITFALL] A commit pushed by `github-actions[bot]` does not trigger other workflows (recursion guard). Trigger a follow-up run with a normal commit if CI must see the new tree. (v:2026-11-14 · medium · S-20261118-0000)

## [area: release]
- [PITFALL] Never regenerate `CRX_PRIVATE_KEY`. The extension ID (`idcdhbjfemmhadnlijcohccpedihldhp`) is derived from it; a new key means every existing install stops updating. (v:2026-11-14 · high · S-20261114-0000)
- [CONVENTION] `manifest.version` must strictly increase — Chrome compares it as 1–4 dotted integers. (v:2026-11-14 · high · S-20261114-0000)

## [area: security]
- [CONVENTION] No shared credentials ship in the extension. `DEFAULT_TRANSCRIPT_API_KEY` was removed in 3.9.0 and now defaults to `""`; users supply their own key, and the code throws an actionable error before the network call. See ADR-003. (v:2026-11-18 · high · S-20261118-0000)
- [CONVENTION] The scanner's `sk-` token rule is tuned with `(?<![A-Za-z0-9-])` so the project's own `yt-sk-` CSS prefix is not a false positive. Do not rename classes to dodge a scanner hit. (v:2026-11-14 · medium · S-20261114-0000)

## [area: sponsorblock]
- [PITFALL] In `POST /api/skipSegments`, `userAgent` must be `sponsorblock/<semver>` (e.g. `sponsorblock/5.10.4`). The server validator's pattern requires `sponsorblock/`; passing Chrome extension ID strings or third-party names triggers `action: "drop"`, silently returning HTTP 200 `"OK"` without saving. Fixed in 3.9.4. (v:2026-11-21 · high · S-20261121-0002)
- [PITFALL] When SponsorBlock silently drops a submission, it returns HTTP 200 with body `"OK"`. A genuinely accepted submission returns a JSON array of segment objects with UUIDs. Checking only `response.ok` or falling back when `json()` fails creates a false success toast. Fixed in 3.9.3. (v:2026-11-21 · high · S-20261121-0001)
- [CONVENTION] The official SponsorBlock client has `filler` and `selfpromo` **disabled by default**. Even after successful database upload, segments in these categories are not displayed on YouTube's seekbar until the user enables them in SponsorBlock extension options. (v:2026-11-21 · medium · S-20261121-0001)
- [PITFALL] `highlight` is **not** a SponsorBlock category — the valid one is `poi_highlight`. `resolveSponsorCategory` returned `highlight`, and a single invalid category makes the server reject the **entire batch** with a 400, so one stray word in one segment's reason killed all 18. Fixed in 3.9.2. (v:2026-11-21 · high · S-20261121-0000)
- [CONVENTION] `userID` in `POST /api/skipSegments` is the **raw private ID** (30+ chars), not a hash. The *public* ID is that string hashed with SHA-256 5000 times (64 hex chars). Pasting the public ID passes a `length >= 32` check and files segments under a phantom identity where nobody — including the submitter — can see them. (v:2026-11-21 · high · S-20261121-0000)
- [CONVENTION] SponsorBlock forbids automated submission: timings from automated tools are allowed, but a human must review before upload. Auto-uploading an AI-detected batch is what the auto-moderator targets — expect 403, or silent shadow-hiding. (v:2026-11-21 · high · S-20261121-0000)
- [PITFALL] A shadow-hidden segment returns 404 from the public `GET /api/skipSegments`, so "the video has no segments" does **not** prove the upload never reached the server. Distinguish accepted-but-hidden from rejected before changing code. (v:2026-11-21 · high · S-20261121-0000)
- [CONVENTION] The POST response is an array of only the segments the server accepted. Report *that* length, not the number sent, or partial rejections look like success. (v:2026-11-21 · medium · S-20261121-0000)
- [CONVENTION] A service worker `fetch` to a new host needs that host in `host_permissions`; `sponsor.ajay.app` is already listed. (v:2026-11-21 · medium · S-20261121-0000)
