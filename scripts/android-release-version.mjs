import { readFileSync } from 'node:fs';

const tag = process.argv[2] ?? process.env.GITHUB_REF_NAME;
if (!tag) {
  throw new Error('Expected release tag argument, for example v0.4.1');
}

const match = /^v(\d+)\.(\d+)\.(\d+)$/.exec(tag);
if (!match) {
  throw new Error(`Release tag must use stable SemVer vMAJOR.MINOR.PATCH; received ${tag}`);
}

const [, majorText, minorText, patchText] = match;
const major = Number(majorText);
const minor = Number(minorText);
const patch = Number(patchText);

if (minor > 999 || patch > 999) {
  throw new Error('Android release version mapping requires MINOR and PATCH <= 999');
}

const versionName = `${major}.${minor}.${patch}`;
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
if (packageJson.version !== versionName) {
  throw new Error(
    `package.json version (${packageJson.version}) must match release tag version (${versionName})`,
  );
}

const versionCode = major * 1_000_000 + minor * 1_000 + patch;
if (!Number.isSafeInteger(versionCode) || versionCode < 1 || versionCode > 2_100_000_000) {
  throw new Error(`Derived Android versionCode ${versionCode} is outside the supported range`);
}

process.stdout.write(`tag=${tag}\nversionName=${versionName}\nversionCode=${versionCode}\n`);
