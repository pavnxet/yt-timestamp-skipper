# Changelog

All notable changes to **YT Smart Chapters Pro** are recorded here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows the `manifest.json` version.

## [Unreleased]

### Added
- `docs/` guide set: getting started, installation, configuration, AI providers, transcripts, chapters & filters, SponsorBlock, Turso, shortcuts, troubleshooting, architecture, development, FAQ.
- `CONTRIBUTING.md`, `SECURITY.md`, this changelog.
- Brand refresh: minimal play / skip / spark mark, regenerated icon set (16–128 px), SVG logo, light and dark lockups in `assets/`.

### Changed
- README rewritten for discoverability: keyword-led title and summary, badges, table of contents, feature index, configuration and shortcut tables, FAQ, browser support matrix.
- Landing page metadata: canonical URL, Open Graph and Twitter cards, JSON-LD `SoftwareApplication`, `robots.txt` and `sitemap.xml`.

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
