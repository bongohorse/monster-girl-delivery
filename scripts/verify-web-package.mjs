import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

// Check the output that will actually be published/copied, not the Vite dev server.
const root = path.resolve(process.argv[2] ?? 'dist');
const readAsset = (reference) => {
  assert(reference.startsWith('./'), `Asset must be deployment-relative: ${reference}`);
  const filename = path.resolve(root, reference);
  assert(filename.startsWith(`${root}${path.sep}`), `Asset escapes package: ${reference}`);
  const bytes = readFileSync(filename);
  assert(bytes.length > 0, `Empty asset: ${reference}`);
  return bytes;
};

const html = readAsset('./index.html').toString('utf8');
const references = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1]);
assert(references.includes('./manifest.webmanifest'), 'PWA manifest link is missing');
for (const reference of references) readAsset(reference);
const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map((match) => match[1]);
assert(scripts.length > 0, 'No bundled application script');
for (const script of scripts) {
  assert(/^\.\/assets\/.+\.js$/.test(script), `Unbuilt application script: ${script}`);
}

const manifest = JSON.parse(readAsset('./manifest.webmanifest').toString('utf8'));
assert.equal(manifest.short_name, 'MGD');
for (const key of ['id', 'start_url', 'scope']) assert.equal(manifest[key], './', key);
assert.equal(manifest.display, 'fullscreen');
assert(manifest.display_override.includes('standalone'), 'Missing standalone fallback');
assert.equal(manifest.orientation, 'landscape');
for (const size of [192, 512]) {
  const icon = manifest.icons.find((candidate) => candidate.sizes === `${size}x${size}`);
  assert(icon, `Missing ${size}px install icon`);
  const bytes = readAsset(icon.src);
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'Invalid PNG');
  assert.equal(bytes.readUInt32BE(16), size, 'Wrong PNG width');
  assert.equal(bytes.readUInt32BE(20), size, 'Wrong PNG height');
}
console.log(`Production PWA package verified: ${root}`);
