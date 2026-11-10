# Auto-update (self-hosted CRX)

Chrome has no GitHub update channel. What it *does* support is an **update manifest XML**
that an installed extension polls every few hours — so this repo publishes its releases in
exactly the shape Chrome expects, and installed copies update themselves.

---

## How it works

1. You push a tag like `v3.7.0`.
2. `.github/workflows/release-crx.yml` runs `scripts/pack-crx.mjs`, which:
   - copies only the shipped files into a staging directory,
   - stamps `version` and `update_url` into the packaged `manifest.json`,
   - signs a CRX3 with your private key,
   - writes the Omaha `updates.xml` describing that build.
3. Both files are attached to the GitHub release.
4. Chrome reads `update_url` → `…/releases/latest/download/updates.xml`, sees a higher
   version than the installed one, downloads the CRX, verifies the signature, and installs.

The repo's own `manifest.json` is **not** modified — `update_url` exists only inside the
packaged build, so an unpacked developer copy stays clean.

---

## One-time setup

### 1. Create a signing key

```bash
openssl genrsa -out key.pem 2048
```

**Keep `key.pem`.** Every future update must be signed with the same key — a new key means
a new extension ID and Chrome will refuse to update an existing install.

### 2. Store it as a repository secret

```bash
base64 -w0 key.pem > key.b64        # macOS: base64 -i key.pem -o key.b64
gh secret set CRX_PRIVATE_KEY < key.b64
rm key.b64
```

`scripts/pack-crx.mjs` accepts either the raw PEM or its base64, because repository
secrets do not preserve newlines reliably.

### 3. (Optional) Pin the extension ID

An unpacked copy and a packed CRX otherwise get different IDs, which means separate
settings and a different ID in your policy allowlist. To make them match, add the
**public** key to `manifest.json`:

```bash
openssl rsa -in key.pem -pubout -outform DER | base64 -w0
```

```json
"key": "<the base64 above>"
```

This is the public half only — it is safe to commit.

---

## Releasing

```bash
# bump "version" in manifest.json first, then
git tag v3.7.0
git push origin v3.7.0
```

The workflow builds and publishes. You can also run it manually from the Actions tab with
a version input.

The build prints the extension ID — you need it for the install step:

```
extension id : gcpiljedebhlofedbbmkhkogdmppdnhk
```

---

## Installing (the part that is genuinely awkward)

Chrome refuses `.crx` files it did not get from the Web Store — that is the
`CRX_REQUIRED_PROOF_MISSING` error. There is no way around it from the extension side.
Your options:

### Windows / macOS — enterprise-style allowlist

Run once as administrator (Windows, Chrome):

```
reg add HKLM\SOFTWARE\Policies\Google\Chrome\ExtensionInstallAllowlist /v 1 /t REG_SZ /d <extension-id> /f
reg add HKLM\SOFTWARE\Policies\Google\Chrome\ExtensionInstallSources /v 1 /t REG_SZ /d https://github.com/* /f
```

For Edge, the same keys under `HKLM\SOFTWARE\Policies\Microsoft\Edge`. On macOS these
settings come from an MDM profile. Then restart the browser, enable Developer mode, and
drag the `.crx` from the latest release onto `chrome://extensions`.

### Linux

Developer mode plus a correct `update_url` is enough; drag the `.crx` onto
`chrome://extensions`.

Once installed this way, updates arrive on their own — no further clicks.

---

## Verifying a build locally

```bash
npm install --no-save crx3
CRX_PRIVATE_KEY="$(base64 -w0 key.pem)" node scripts/pack-crx.mjs 3.7.0 pavnxet/yt-timestamp-skipper
cat dist/updates.xml
```

Check that the `appid` matches the extension ID the script printed, and that `version`
matches the tag.

---

## Caveats

- **Unpacked installs never auto-update.** This only applies to a CRX installed through a
  policy allowlist or Developer mode.
- **Same key, always.** Losing `key.pem` means you can no longer update that extension ID.
- **Version must increase.** Chrome compares `manifest.version`, which must be 1–4 dotted
  integers (e.g. `3.7.0`).
- **Only real releases count.** `releases/latest/download/…` skips pre-releases and drafts.
- **Chrome updates when idle** — no open extension page, no running service worker — so an
  update may wait until the next browser restart.
- **For most users the Chrome Web Store is still better.** It is the only route that gives
  a one-click install *and* automatic updates without registry edits.

---

## The Chrome Web Store route

The store is the other channel, and the only one that gives users a one-click install
*and* automatic updates. `.github/workflows/publish-cws.yml` publishes to it on the same
tag push, so both channels ship from one `git tag`.

It needs an OAuth2 refresh token once:

1. Create a project in the [Google Cloud Console](https://console.cloud.google.com/), enable
   the **Chrome Web Store API**, and create an **OAuth client** of type *Desktop app*.
2. Run the [Chrome Web Store API quickstart](https://developer.chrome.com/docs/webstore/using-api)
   once to exchange your client ID/secret for a **refresh token**.
3. Add five repository secrets:

   | Secret | Where it comes from |
   | --- | --- |
   | `CWS_EXTENSION_ID` | the 32-character ID in your store listing |
   | `CWS_PUBLISHER_ID` | Chrome Web Store developer dashboard |
   | `CWS_CLIENT_ID` | the OAuth client |
   | `CWS_CLIENT_SECRET` | the OAuth client |
   | `CWS_REFRESH_TOKEN` | from the quickstart above |

The workflow runs `scripts/pack-store.mjs`, which stages only the shipped files and
**strips `update_url`** — a self-hosted endpoint must not appear in a store build.

The store takes over updates from there, and it is the only channel where users never see
`CRX_REQUIRED_PROOF_MISSING`.
