#!/usr/bin/env node
/**
 * Packs this extension into a signed CRX3 and writes the Omaha `updates.xml`
 * that Chrome polls through the `update_url` in the packaged manifest.
 *
 * Usage:  node scripts/pack-crx.mjs <version> <owner/repo>
 * Needs:  CRX_PRIVATE_KEY env var (PEM, or base64 of the PEM)
 *
 * Output: dist/yt-smart-chapters.crx, dist/updates.xml
 */
import { createPrivateKey, createPublicKey, createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import crx3 from 'crx3';

const [version, repo] = process.argv.slice(2);
if (!version || !repo) {
  console.error('usage: node scripts/pack-crx.mjs <version> <owner/repo>');
  process.exit(1);
}
if (!/^\d+(\.\d+){1,3}$/.test(version)) {
  console.error(`"${version}" is not a valid Chrome extension version (1-4 dotted integers).`);
  process.exit(1);
}

const rawKey = (process.env.CRX_PRIVATE_KEY || '').trim();
if (!rawKey) {
  console.error('CRX_PRIVATE_KEY is not set.\n');
  console.error('Create a signing key once, then store it as a repository secret:\n');
  console.error('  openssl genrsa -out key.pem 2048');
  console.error('  base64 -w0 key.pem            # macOS: base64 -i key.pem');
  console.error('  gh secret set CRX_PRIVATE_KEY < key.b64\n');
  console.error('Keep key.pem safe: every future update must be signed with the same key.');
  process.exit(1);
}

// Accept either the PEM itself or its base64 (repository secrets mangle newlines).
const keyBuf = rawKey.includes('-----BEGIN') ? Buffer.from(rawKey) : Buffer.from(rawKey, 'base64');
let privateKey;
try {
  privateKey = createPrivateKey(keyBuf);
} catch (e) {
  console.error('CRX_PRIVATE_KEY could not be parsed as a private key:', e.message);
  process.exit(1);
}

// Extension id = first 16 bytes of SHA-256 over the public key DER, hex mapped 0-f -> a-p
const spki = createPublicKey(privateKey).export({ type: 'spki', format: 'der' });
const extensionId = [...createHash('sha256').update(spki).digest('hex').slice(0, 32)]
  .map(c => String.fromCharCode(97 + parseInt(c, 16)))
  .join('');

// Stage only the files that ship — never docs, workflows, or the key itself
const root = process.cwd();
const stage = mkdtempSync(join(tmpdir(), 'yt-crx-'));
const SHIPPED = ['manifest.json', 'content.js', 'content.css', 'background.js', 'embed-launcher.js', 'icons', 'anime-wow.mp3'];
for (const entry of SHIPPED) {
  const src = join(root, entry);
  if (existsSync(src)) cpSync(src, join(stage, entry), { recursive: true });
}

// Stamp the release version and the update endpoint into the packaged manifest only
const manifestPath = join(stage, 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
manifest.version = version;
manifest.update_url = `https://github.com/${repo}/releases/latest/download/updates.xml`;
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

const dist = join(root, 'dist');
mkdirSync(dist, { recursive: true });

// The key must live OUTSIDE the staged extension, or crx3 zips it into the CRX.
const keyDir = mkdtempSync(join(tmpdir(), 'yt-key-'));
const keyPath = join(keyDir, 'signing-key.pem');
writeFileSync(keyPath, keyBuf, { mode: 0o600 });

try {
  await crx3([manifestPath], {
    keyPath,
    crxPath: join(dist, 'yt-smart-chapters.crx'),
    xmlPath: join(dist, 'updates.xml'),
    crxURL: `https://github.com/${repo}/releases/latest/download/yt-smart-chapters.crx`,
    appVersion: version
  });
} finally {
  rmSync(stage, { recursive: true, force: true });
  rmSync(keyDir, { recursive: true, force: true });
}

const crxSize = readFileSync(join(dist, 'yt-smart-chapters.crx')).length;
console.log(`extension id : ${extensionId}`);
console.log(`version      : ${version}`);
console.log(`crx          : dist/yt-smart-chapters.crx (${crxSize} bytes)`);
console.log(`update url   : https://github.com/${repo}/releases/latest/download/updates.xml`);
