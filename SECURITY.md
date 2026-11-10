# Security policy

## Reporting a vulnerability

Do **not** open a public issue. Use GitHub's **Security → Report a vulnerability** on this repository, or email the address in `manifest.json` (`author` field).

Include: what the issue allows, the steps to reproduce, the browser version, and any proof-of-concept code. Expect an acknowledgement within a few days.

## Scope

In scope:

- Ways to read another site's data through the extension's permissions
- Bypasses of the SponsorBlock 80% safety check or the video-ID validation
- Injection of arbitrary script into the panel from video data (transcript text, chapter labels, comment text)
- Anything that leaks `chrome.storage.local` contents to a page context

Out of scope:

- Vulnerabilities in YouTube, SponsorBlock, Turso or any AI provider
- Phishing pages that imitate the extension
- Issues that require the attacker to already control your browser profile

## How the extension handles secrets

- API keys, database tokens and the SponsorBlock private ID are stored in `chrome.storage.local`, scoped to the extension's origin. No page script can read them directly.
- All network calls are made from the service worker, never from page context.
- Transcript text and AI output are rendered as text nodes, not as HTML, before they reach the panel.
- Nothing is sent to the author. There is no telemetry endpoint and no proxy.

## Practical advice

- Use a **database-scoped** Turso token, not an account token.
- Use a **private** SponsorBlock user ID; the public one cannot upload.
- Prefer your own TranscriptAPI key over the built-in one for anything you care about.
- Revoke any token you have pasted into a screenshot, an issue or a chat.
