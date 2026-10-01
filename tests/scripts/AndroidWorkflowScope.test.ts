import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { androidBuildRequired, releaseVersionChanged } from '../../scripts/android-change-scope';

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'mgd-android-scope-'));
  roots.push(root);
  const manifest: {
    version: string;
    scripts: Record<string, string>;
    dependencies: Record<string, string>;
  } = JSON.parse(readFileSync('package.json', 'utf8'));
  delete manifest.scripts['workshop:check'];
  delete manifest.scripts['pages:assemble'];
  const git = (...args: string[]) =>
    execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  git('init', '-q');
  git('config', 'user.name', 'Android scope test');
  git('config', 'user.email', 'scope@example.invalid');
  const commit = () => {
    git('add', '.');
    git('commit', '-qm', 'fixture');
    return git('rev-parse', 'HEAD');
  };
  writeFileSync(join(root, 'package.json'), JSON.stringify(manifest));
  const before = commit();
  const write = (path: string, text: string) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  };
  return { root, manifest, before, commit, git, write };
}
it('does not build or release when package changes only add Workshop and Pages commands', () => {
  const { root, manifest, before, commit } = fixture();
  manifest.scripts['workshop:check'] = 'bun scripts/workshop/check.ts';
  manifest.scripts['pages:assemble'] = 'bun scripts/workshop/assemble-pages.ts';
  writeFileSync(join(root, 'package.json'), JSON.stringify(manifest));
  const after = commit();
  expect(androidBuildRequired(root, before, after)).toBe(false);
  expect(releaseVersionChanged(root, before, after)).toBe(false);
});

it.each([
  'android/app/build.gradle',
  'capacitor.config.ts',
  'src/game/scenes/Foundation.ts',
  'public/assets/example.png',
  'assets/metadata/example.json',
  'scripts/assets/AssetRuntime.ts',
  'vite/config.prod.mjs',
  'vite/buildMetadata.mjs',
  'bun.lock',
  '.bun-version',
  '.github/workflows/android-ci.yml',
  '.github/workflows/android-release.yml',
  'scripts/android-change-scope.ts',
])('retains Android checks for %s even alongside Workshop changes', (path) => {
  const { root, before, commit, write } = fixture();
  write('workshop/src/main.ts', 'Workshop fixture');
  write(path, 'Changed Android input fixture');
  expect(androidBuildRequired(root, before, commit())).toBe(true);
});
it('skips browser-only inputs but detects a renamed game file leaving its original path', () => {
  const { root, before, commit, write, git } = fixture();
  for (const path of [
    'workshop/src/main.ts',
    'vite/config.workshop.mjs',
    'scripts/assets/package-smoke.ts',
    'scripts/browser/ChromeDom.ts',
  ])
    write(path, 'Workshop/browser test fixture');
  const browser = commit();
  expect(androidBuildRequired(root, before, browser)).toBe(false);
  write('src/example.ts', 'Game fixture');
  const game = commit();
  git('mv', 'src/example.ts', 'workshop/example.ts');
  expect(androidBuildRequired(root, game, commit())).toBe(true);
});
it.each(['dependency', 'build command', 'version'] as const)(
  'retains shared package changes: %s',
  (kind) => {
    const { root, before, commit, manifest, write } = fixture();
    if (kind === 'dependency') manifest.dependencies.phaser = '5.0.0';
    if (kind === 'build command') manifest.scripts.build += ' --mode production';
    if (kind === 'version') manifest.version = '0.5.1';
    manifest.scripts['workshop:check'] = 'bun scripts/workshop/check.ts';
    write('package.json', JSON.stringify(manifest));
    const after = commit();
    expect(androidBuildRequired(root, before, after)).toBe(true);
    expect(releaseVersionChanged(root, before, after)).toBe(kind === 'version');
  },
);

const script = resolve('scripts/android-change-scope.ts');
function scope(
  root: string,
  mode: 'ci' | 'release',
  eventName: string,
  event: object,
  head: string,
) {
  const eventPath = join(root, 'event.json');
  writeFileSync(eventPath, JSON.stringify(event));
  return execFileSync('bun', [script, mode], {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      GITHUB_EVENT_NAME: eventName,
      GITHUB_EVENT_PATH: eventPath,
      GITHUB_SHA: head,
    },
  }).trim();
}
it('checks the full push range rather than only the last Workshop commit', () => {
  const { root, before, commit, write } = fixture();
  write('src/example.ts', 'First commit changes the game');
  commit();
  write('workshop/example.ts', 'Last commit changes only Workshop');
  const after = commit();
  expect(scope(root, 'ci', 'push', { before }, after)).toBe('build_android=true');
  expect(scope(root, 'release', 'push', { before }, after)).toBe('version_changed=false');
});
it('uses the PR merge base and head diff, not unrelated new base changes', () => {
  const { root, before, commit, write, git } = fixture();
  write('workshop/example.ts', 'Workshop PR');
  const head = commit();
  git('checkout', '-q', before);
  write('src/example.ts', 'New base commit');
  const base = commit();
  const event = { pull_request: { base: { sha: base }, head: { sha: head } } };
  expect(scope(root, 'ci', 'pull_request', event, base)).toBe('build_android=false');
});
it('preserves explicit manual builds and fails before building when event history is unavailable', () => {
  const { root, before } = fixture();
  expect(scope(root, 'ci', 'workflow_dispatch', {}, before)).toBe('build_android=true');
  expect(() => scope(root, 'ci', 'push', { before: '0'.repeat(40) }, before)).toThrow();
});
