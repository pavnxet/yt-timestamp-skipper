# Troubleshooting

Find your symptom, then the cause, then the fix.

## The panel

| Symptom | Cause | Fix |
| :--- | :--- | :--- |
| No ⚡ button on YouTube | Content script not injected | Reload the tab; check the extension is enabled and not in another profile's window |
| Button appears but the panel is blank | CSS blocked by another extension | Disable other YouTube tweakers one at a time |
| Panel opens on some videos only | YouTube SPA navigation replaced the player node | Press the extension icon again; the panel re-mounts on `yt-navigate-finish` |
| "NO VIDEO" | Video ID not resolved | Reload; IDs resolve from `/watch`, `/live/`, `/shorts/`, `/embed/`, `/v/` and the canonical link |
| Panel overlaps YouTube's own sidebar | Narrow window | Collapse YouTube's chat or widen the window; the layout is responsive below 1,200 px |
| No ⚡ launcher on an embedded player | Launcher only injects on pages that contain an iframe player | Reload the host page after installing |

## Transcripts

| Symptom | Cause | Fix |
| :--- | :--- | :--- |
| "NO TRANSCRIPT" | Captions disabled, or the panel did not open | Open *Show transcript* manually once, then retry |
| Transcript is empty | Wrong node picked after a YouTube redesign | Update the extension; the node-walk fallback usually recovers |
| Transcript has no timestamps | Source returned plain text | The extension refuses untimed text by design — try another source |
| Live stream has no transcript | Nothing to transcribe until the stream ends | Generate after the stream |
| Embed gives no transcript | Embeds have no panel | The TranscriptAPI path runs automatically; add your own key if it fails |
| TranscriptAPI returns 401/429 | Built-in key exhausted | Add your own key in **Settings → TranscriptAPI key** |

## AI

| Symptom | Cause | Fix |
| :--- | :--- | :--- |
| "Unauthorized" / 401 | Bad or expired key | Re-paste; press **Verify** |
| "Model not found" / 404 | Wrong model slug | Copy the exact slug from the provider's model page |
| Empty table | Model returned prose, not a table | Switch to a more instruction-following model, or enable chunking |
| Chapters stop at ~30 minutes | Chunking stopped after the first chunk | Check the progress messages; a failed chunk aborts the merge |
| Long pause, then failure | Transcript exceeded the context window | Enable **Disable chunking** only on 128k models; otherwise keep chunking on |
| Everything duplicated | Merged chunks overlapped | Regenerate; de-duplication runs on merge, so a stale cached list is the usual culprit |
| CORS error in the console | Endpoint does not allow browser origins | Use a server that sends CORS headers, or a local proxy |

## Chapters and navigation

| Symptom | Cause | Fix |
| :--- | :--- | :--- |
| `]` does nothing | No chapters loaded, or focus is in an input | Generate first; click on the page |
| Jump lands slightly early/late | Transcript segment boundaries are coarse | Adjust the times in the table, then Save |
| Markers vanish after seeking | YouTube re-rendered the progress bar | They redraw on the next chapter change; a reload forces it |
| Filter shows nothing | Every chip is off | It falls back to **All** on the next toggle |

## SponsorBlock

| Symptom | Cause | Fix |
| :--- | :--- | :--- |
| 403 on upload | Public ID used instead of private | Copy the private 32-character UUID |
| 409 on upload | Duplicate segments | Already submitted |
| "Safety Block" error | Segments cover ≥ 80% of the video | Trim intervals; tighten the categories |
| Paste does nothing | Clipboard permission denied | Click **Paste segments** again; the first click may only prompt |

## Sound and UI

| Symptom | Cause | Fix |
| :--- | :--- | :--- |
| No chime | Muted tab, or volume at 0 | Check the tab is not muted; press **Test** |
| Custom sound does not play | File too large for `chrome.storage.local` | Use a URL, or a shorter file |
| Theme did not change | Cached panel | Close and reopen the panel |

## Resetting

1. `chrome://extensions/` → the extension's **service worker** → **Inspect** → Console.
2. Run `chrome.storage.local.clear()`.
3. Reload the extension and the tab.

If a reset does not fix it, [open an issue](https://github.com/pavnxet/yt-timestamp-skipper/issues) with the console output and the video URL.
