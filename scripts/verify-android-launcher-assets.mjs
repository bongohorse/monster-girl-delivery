import { readFileSync } from 'node:fs';

const ICON_PATH = 'android/app/src/main/res/mipmap-xxhdpi/mgd_app_icon.png';
const MANIFEST_PATH = 'android/app/src/main/AndroidManifest.xml';
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const fail = (message) => {
  throw new Error(`Android launcher asset verification failed: ${message}`);
};

const icon = readFileSync(ICON_PATH);
if (icon.length < 33) {
  fail(`${ICON_PATH} is too small to be a valid PNG.`);
}
if (!icon.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
  fail(`${ICON_PATH} does not start with the PNG signature.`);
}
if (icon.toString('ascii', 12, 16) !== 'IHDR') {
  fail(`${ICON_PATH} is missing the PNG IHDR chunk.`);
}

const width = icon.readUInt32BE(16);
const height = icon.readUInt32BE(20);
if (width !== 144 || height !== 144) {
  fail(`${ICON_PATH} must be 144x144 for xxhdpi, got ${width}x${height}.`);
}

const manifest = readFileSync(MANIFEST_PATH, 'utf8');
for (const attribute of [
  'android:icon="@mipmap/mgd_app_icon"',
  'android:roundIcon="@mipmap/mgd_app_icon"',
]) {
  if (!manifest.includes(attribute)) {
    fail(`${MANIFEST_PATH} is missing ${attribute}.`);
  }
}

console.log(`Android launcher asset OK: ${ICON_PATH} (${width}x${height}, ${icon.length} bytes)`);
