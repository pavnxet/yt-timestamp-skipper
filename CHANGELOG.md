# Changelog

All notable changes to **YT Smart Chapters Pro** are recorded here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows the `manifest.json` version.

## [Unreleased]

### Added
- `docs/` guide set: getting started, installation, configuration, AI providers, transcripts, chapters & filters, SponsorBlock, Turso, shortcuts, troubleshooting, architecture, development, FAQ.
- `CONTRIBUTING.md`, `SECURITY.md`, this changelog.
- Brand refresh: minimal play / skip / spark mark, regenerated icon set (16–128 px), SVG logo, light and dark lockups in `assets/`.
- Self-hosted CRX auto-update: `scripts/pack-crx.mjs` and `.github/workflows/release-crx.yml` sign a CRX3 on tag push, publish `updates.xml` beside it, and installed copies update from the release. Setup and caveats in `docs/auto-update.md`.

### Changed
- README rewritten for discoverability: keyword-led title and summary, badges, table of contents, feature index, configuration and shortcut tables, FAQ, browser support matrix.
- Landing page metadata: canonical URL, Open Graph and Twitter cards, JSON-LD `SoftwareApplication`, `robots.txt` and `sitemap.xml`.

## [3.8.1]

### Fixed
- The chapter marker tooltip showed only the chapter name. It now shows the chapter's own timestamp beside it — for example `2:29:15 │ Q38: Question Start (Ans: D: 75s)` — with the time in a dim monospace badge, separated from the name by a hairline.

## [3.8.0]

### Added
- **Generation mode.** A setting chooses how chapters get written. In **API mode** nothing changes; in **Manual mode** every AI-provider control is hidden and a **🧠 Copy skill** button appears in the Editor. It copies the `yt-allinone` skill together with the video URL and the transcript as one paste-ready prompt, so anyone without an API key can use a free AI website.
- Manual mode is the default for new installs.
- The Chapters empty state now points at the right button for the active mode.

### Changed
- Switching to Manual mode also clears "Generate chapters when a video opens", so a hidden toggle cannot fire on the next video.
- Both generate handlers early-return in Manual mode rather than relying on the buttons being hidden.

## [3.7.1]

### Fixed
- The chapter card never appeared in normal view. `getBoundingClientRect()` returns viewport coordinates, but the anchor maths was handed the player's height, so `bottom` went negative and the card rendered below the screen.
- The card was invisible in fullscreen. It was parented to `.html5-video-player`, which clips with `overflow: hidden`; it now attaches to `document.fullscreenElement` (or `body`), so it survives fullscreen.
- Hovering a chapter marker showed no tooltip. The probe bound once at boot, and if the progress bar had not rendered yet it never attached; it now retries until the bar exists.

### Changed
- The card is smaller and uses dark glass, so it stays readable over a light page as well as a dark video.

## [3.7.0]

### Added
- **Chapter moment card.** When playback crosses a chapter timestamp, a glass card rises out of the seek bar anchored above that chapter's marker, names it, and dismisses itself after 3.6 s. It sits on the fullscreen element so it survives fullscreen, and uses `pointer-events: none` so it can never swallow a click on the video.
- Hovering a chapter marker on the seek bar now shows that chapter's name in a tooltip. The probe listens on the progress bar rather than the markers, so seek-dragging is untouched.
- Settings toggle **Show chapter card during playback**, on by default.

### Notes
- No new permissions. The card follows the active chapter filter, so filtering to Questions + Answers also limits which chapters raise a card.

## [3.6.2]

### Fixed
- Chapter lists came out empty when a chapter title contained `|` — for example `01:29 - Idioms [MCQ] | to bell the cat = …`. Every line with a pipe was treated as a markdown table row, so the timestamp was read out of the wrong cell and the line was silently dropped. A line now only counts as a table row when it starts with `|`. The same over-broad test was fixed in the auto-comment formatter.

## [3.6.1]

### Changed
- Manifest description tightened for store listing limits.
- Panel header shows the running version.

## [3.5.2]

### Added
- Embedded player support with a ⚡ launcher on host pages.
- Multi-select section filter (Questions / Answers / Explain as independent toggles).
- **📥 Paste segments** for SponsorBlock intervals.
- **☁️ Save** inside the Editor tab.
- Auto-copy transcript option.
- Modern tabbed transcript panel support (`transcript-segment-view-model`).
- Video ID resolution for `/live/`, `/shorts/`, `/embed/` and `/v/`.

### Changed
- Auto-comments use the correct-option timestamp instead of the explanation timestamp.

## [3.4.x]

- Never emit or copy transcript lines without a timestamp.
- Filter chips drive skip navigation.

## [3.2 – 3.3]

- Paste button, one-click segments, auto-copy toggle.

## [3.1.0]

- Warm Claude theme UI redesign.
- Full 128k context (no chunking for GLM 5.3), 30-minute intelligent chunking.
- Multi-segment SponsorBlock detection, completion chime, Turso cloud sync.
