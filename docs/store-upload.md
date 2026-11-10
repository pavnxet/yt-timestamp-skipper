# Publishing to the Chrome Web Store by hand

You do **not** need a Google Cloud project, an OAuth client, or a refresh token to publish.
That setup only exists to let a machine upload for you. Doing it by hand takes about two
minutes per release and needs nothing but a zip.

---

## What the workflow gives you

`.github/workflows/release-crx.yml` runs on every `v*` tag and attaches three files to the
release:

| Asset | Use |
| --- | --- |
| `yt-smart-chapters.crx` | self-hosted install (policy allowlist) |
| `updates.xml` | the update manifest Chrome polls for that CRX |
| `yt-smart-chapters-store.zip` | **upload this one to the store** |

The zip is built by `scripts/pack-store.mjs`, which stages only the shipped files, stamps
the release version, and strips `update_url` — a self-hosted endpoint must never appear in
a store build.

---

## Steps

1. **Register once.** Chrome Web Store Developer Dashboard → pay the one-time $5 fee. This
   is the store's own signup, unrelated to Google Cloud.
2. **First time only:** "Add new item", upload the zip, and fill in the listing —
   description, category, language, a 128×128 icon, and at least one 1280×800 or 640×400
   screenshot.
3. **Every release after that:** download `yt-smart-chapters-store.zip` from the latest
   GitHub release, open your item in the dashboard, and upload it as the new package.
4. Submit for review. Review usually takes a few days.

---

## When you *do* want the OAuth route

Only worth it once releases are frequent enough that clicking through the dashboard is
annoying. `.github/workflows/publish-cws.yml` already does it — see the Chrome Web Store
section of `docs/auto-update.md` for the five secrets it needs. Until those are set, that
workflow fails on every tag, so either set them or remove its `push: tags` trigger.

---

## Store vs self-hosted, one more time

| | Store zip | CRX |
| --- | --- | --- |
| Who can install | anyone, one click | only with a policy allowlist |
| Updates | Google handles it | your release + `updates.xml` |
| `CRX_REQUIRED_PROOF_MISSING` | never | unless policy allows |
| Effort per release | download zip, drag, submit | none — the tag does it |

Both come from the same tag, so you can ship the CRX immediately and upload the zip to the
store whenever you get a moment.
