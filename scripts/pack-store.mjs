#!/usr/bin/env node
/**
 * Stages a Chrome Web Store upload: only the files that ship, with the release
 * version stamped in and no `update_url` (the store injects its own).
 *
 * Usage:  node scripts/pack-store.mjs <version>
 * Output: dist/store/  — pass this directory to chrome-webstore-upload-cli --source
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [version] = process.argv.slice(2);
if (!version || !/^\d+(\.\d+){1,3}$/.test(version)) {
  console.error('usage: node scripts/pack-store.mjs <version>   (e.g. 3.7.0)');
  process.exit(1);
}

const root = process.cwd();
const out = join(root, 'dist', 'store');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const SHIPPED = ['manifest.json', 'content.js', 'content.css', 'background.js', 'embed-launcher.js', 'icons', 'anime-wow.mp3'];
for (const entry of SHIPPED) {
  const src = join(root, entry);
  if (existsSync(src)) cpSync(src, join(out, entry), { recursive: true });
}

const manifestPath = join(out, 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
manifest.version = version;
delete manifest.update_url; // a self-hosted endpoint has no place in a store build
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

const files = SHIPPED.filter(e => existsSync(join(root, e)));
console.log(`staged dist/store at version ${version}: ${files.join(', ')}`);
