import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

function git(root: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' });
}
function revision(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-f0-9]{40}$/.test(value) || /^0+$/.test(value))
    throw new Error('Android scope requires an available, nonzero Git revision.');
  return value;
}
function manifestAt(root: string, sha: string): Record<string, unknown> {
  const data: unknown = JSON.parse(git(root, 'show', `${revision(sha)}:package.json`));
  if (!data || typeof data !== 'object' || Array.isArray(data))
    throw new Error('Invalid package.json for Android scope.');
  return data as Record<string, unknown>;
}
function withoutWorkshopCommands(manifest: Record<string, unknown>): Record<string, unknown> {
  const scripts = manifest.scripts;
  if (!scripts || typeof scripts !== 'object' || Array.isArray(scripts))
    throw new Error('Invalid package.json scripts for Android scope.');
  return {
    ...manifest,
    scripts: Object.fromEntries(
      Object.entries(scripts).filter(([name]) => !/^(workshop|pages):/.test(name)),
    ),
  };
}
const files = new Set([
  '.github/workflows/android-ci.yml',
  '.github/workflows/android-release.yml',
  'capacitor.config.ts',
  'index.html',
  'scripts/android-change-scope.ts',
  'scripts/android-gradle.mjs',
  'scripts/android-release-version.mjs',
  'scripts/verify-android-launcher-assets.mjs',
  'scripts/verify-web-package.mjs',
  'tsconfig.json',
  'bun.lock',
  '.bun-version',
]);
/** Classify the complete event diff; shared package edits require a content comparison. */
export function androidBuildRequired(root: string, before: string, after: string): boolean {
  const paths = git(
    root,
    'diff',
    '--name-only',
    '-z',
    '--no-renames',
    revision(before),
    revision(after),
  )
    .split('\0')
    .filter(Boolean);
  return paths.some((path) => {
    if (path === 'vite/config.workshop.mjs' || path === 'scripts/assets/package-smoke.ts')
      return false;
    if (path === 'package.json')
      return !isDeepStrictEqual(
        withoutWorkshopCommands(manifestAt(root, before)),
        withoutWorkshopCommands(manifestAt(root, after)),
      );
    return (
      files.has(path) ||
      ['android/', 'src/', 'public/', 'assets/', 'scripts/assets/', 'vite/'].some((directory) =>
        path.startsWith(directory),
      )
    );
  });
}
/** An unchanged version is not a release request; existing-tag checks still own immutability. */
export function releaseVersionChanged(root: string, before: string, after: string): boolean {
  const previous = manifestAt(root, before).version;
  const current = manifestAt(root, after).version;
  if (typeof previous !== 'string' || typeof current !== 'string')
    throw new Error('Invalid package version for Android release scope.');
  return previous !== current;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = process.cwd();
  const mode = process.argv[2];
  if (mode === 'ci' && process.env.GITHUB_EVENT_NAME === 'workflow_dispatch') {
    console.log('build_android=true');
  } else {
    const event: {
      before?: unknown;
      pull_request?: { base?: { sha?: unknown }; head?: { sha?: unknown } };
    } = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH ?? '', 'utf8'));
    const after =
      process.env.GITHUB_EVENT_NAME === 'pull_request'
        ? revision(event.pull_request?.head?.sha)
        : revision(process.env.GITHUB_SHA);
    const before =
      process.env.GITHUB_EVENT_NAME === 'pull_request'
        ? git(
            root,
            'merge-base',
            revision(event.pull_request?.base?.sha),
            revision(event.pull_request?.head?.sha),
          ).trim()
        : revision(event.before);
    if (mode === 'ci') console.log(`build_android=${androidBuildRequired(root, before, after)}`);
    else if (mode === 'release')
      console.log(`version_changed=${releaseVersionChanged(root, before, after)}`);
    else throw new Error('Expected Android scope mode ci or release.');
  }
}
