# Installation

## From a release (recommended)

1. Open the [latest release](https://github.com/pavnxet/yt-timestamp-skipper/releases/latest).
2. Download `yt-smart-chapters.crx`.
3. Open `chrome://extensions`, enable **Developer mode**.
4. Drag the `.crx` onto the page.

Chrome blocks store-less CRX installs with `CRX_REQUIRED_PROOF_MISSING` unless the browser is configured to allow it. If you hit that, either follow the policy steps in [auto-update.md](auto-update.md#installing-the-part-that-is-genuinely-awkward), or install unpacked instead.

Installs done this way **update themselves** — Chrome polls the release's `updates.xml` every few hours.

## Unpacked (for development)

```bash
git clone https://github.com/pavnxet/yt-timestamp-skipper
```

Then `chrome://extensions` → Developer mode → **Load unpacked** → pick the folder. After editing files, press the reload icon on the extension card and refresh the YouTube tab.

## Requirements

- Chrome or any Chromium browser with Manifest V3 support (Edge, Brave, Vivaldi).
- No build step, no `npm install`, no bundler. The extension is plain JavaScript.
