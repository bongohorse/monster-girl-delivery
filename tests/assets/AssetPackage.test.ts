import { copyFile, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import sharp from 'sharp';
import { afterEach, expect, test } from 'vitest';
import { prepareAsset } from '../../scripts/assets/AssetCandidate';
import { inspectRuntimePackage } from '../../scripts/assets/AssetPackage';
import { buildRuntime } from '../../scripts/assets/AssetRuntime';

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function fixture(profile: 'static-png' | 'pass-through' = 'static-png') {
  const root = await mkdtemp(join(tmpdir(), 'mgd-package-'));
  roots.push(root);
  const source = join(root, 'input.png');
  await writeFile(
    source,
    await sharp({ create: { width: 64, height: 32, channels: 4, background: '#ff0000' } })
      .png()
      .toBuffer(),
  );
  const candidate = await prepareAsset(root, {
    id: 'hazard',
    file: source,
    profile,
    width: 64,
    height: profile === 'pass-through' ? 32 : 64,
    displayWidth: 32,
    displayHeight: 32,
    provenance: 'package fixture',
  });
  await writeFile(
    join(root, 'assets/metadata/hazard.json'),
    JSON.stringify({ ...candidate.recipe, state: 'active' }),
  );
  const build = await buildRuntime(root);
  const directory = join(root, 'android/app/src/main/assets/public');
  const packagedFile = 'assets/hazard-ViteHash.png';
  await mkdir(dirname(join(directory, packagedFile)), { recursive: true });
  await copyFile(join(root, build.directory, build.assets[0].file), join(directory, packagedFile));
  await writeFile(join(directory, 'index.html'), '<html></html>');
  return { root, source, build, directory, packagedFile };
}

test('binds actual hashed package filenames to the verified runtime generation', async () => {
  const { root, build, directory, packagedFile } = await fixture();
  const result = await inspectRuntimePackage(root, directory);
  expect(result).toEqual({
    fingerprint: build.fingerprint,
    assets: [{ ...build.assets[0], file: packagedFile }],
    fileCount: 2,
  });
});

test.each(['missing', 'damaged'] as const)(
  'rejects a %s runtime export in the actual package',
  async (failure) => {
    const { root, directory, packagedFile } = await fixture();
    if (failure === 'missing') await rm(join(directory, packagedFile));
    else await writeFile(join(directory, packagedFile), 'truncated download');
    await expect(inspectRuntimePackage(root, directory)).rejects.toThrow(
      'Runtime image missing or damaged in package: hazard',
    );
  },
);

test('detects original source bytes even when copied under a misleading runtime filename', async () => {
  const { root, source, directory } = await fixture();
  await copyFile(source, join(directory, 'assets/small-export.png'));
  await expect(inspectRuntimePackage(root, directory)).rejects.toThrow(
    'Original image source shipped in package: assets/small-export.png',
  );
});

test('permits explicit pass-through bytes and legacy runtime images with preview in their names', async () => {
  const { root, source, directory, build } = await fixture('pass-through');
  expect(await readFile(source)).toEqual(
    await readFile(join(root, build.directory, build.assets[0].file)),
  );
  await writeFile(join(directory, 'assets/pose-a-concept-preview.png'), 'legacy runtime fixture');
  expect((await inspectRuntimePackage(root, directory)).assets[0].hash).toBe(build.assets[0].hash);
});

test.each([
  'assets/source/input.png',
  'assets/metadata/hazard.json',
  'reports/assets/index.html',
  'scripts/assets/tool.js',
  '.agents/skills/instructions.md',
  'node_modules/tool/index.js',
  'bun.lock',
  'package.json',
  'src/tool.ts',
  'export.py',
])('rejects build-only input %s copied into the package', async (file) => {
  const { root, directory } = await fixture();
  await mkdir(dirname(join(directory, file)), { recursive: true });
  await writeFile(join(directory, file), 'accidental package input');
  await expect(inspectRuntimePackage(root, directory)).rejects.toThrow(
    'Build-only asset input or tooling shipped in package',
  );
});

test('rejects a symlink rather than consuming bytes outside the package', async () => {
  const { root, directory, source } = await fixture();
  await symlink(source, join(directory, 'outside.png'));
  await expect(inspectRuntimePackage(root, directory)).rejects.toThrow(
    'Symlink shipped in package: outside.png',
  );
});
