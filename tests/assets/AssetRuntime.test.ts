import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { afterEach, expect, test } from 'vitest';
import { prepareAsset } from '../../scripts/assets/AssetCandidate';
import { buildRuntime, readRuntimeBuild } from '../../scripts/assets/AssetRuntime';

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'mgd-runtime-'));
  roots.push(root);
  const file = join(root, 'input.png');
  await writeFile(
    file,
    await sharp({ create: { width: 64, height: 32, channels: 4, background: '#ff0000' } })
      .png()
      .toBuffer(),
  );
  const candidate = await prepareAsset(root, {
    id: 'hazard',
    file,
    profile: 'static-png',
    width: 64,
    height: 64,
    displayWidth: 32,
    displayHeight: 32,
    provenance: 'fixture',
  });
  await writeFile(
    join(root, 'assets/metadata/hazard.json'),
    JSON.stringify({ ...candidate.recipe, state: 'active' }),
  );
  return { root, candidate };
}

test('build publishes an active image and statically imported registry as one verified generation', async () => {
  const { root } = await fixture();
  const { recipe } = await import('../../scripts/assets/AssetRecipe').then(({ readRecipe }) =>
    readRecipe(root, 'hazard'),
  );
  await writeFile(
    join(root, 'assets/metadata/prepared.json'),
    JSON.stringify({ ...recipe, id: 'prepared', state: 'prepared' }),
  );
  const first = await buildRuntime(root);
  expect(first.assets.map((asset) => asset.id)).toEqual(['hazard']);
  const registry = await readFile(join(root, 'src/generated/assets.ts'), 'utf8');
  expect(registry).toContain('export const ASSET_HAZARD');
  expect(registry).toContain('?no-inline');
  expect(registry).not.toContain('assets/source');
  const media = await readFile(join(root, first.directory, 'hazard.png'));
  expect((await sharp(media).metadata()).width).toBe(64);
  expect((await readRuntimeBuild(root)).fingerprint).toBe(first.fingerprint);
  const again = await buildRuntime(root);
  expect(again.fingerprint).toBe(first.fingerprint);
  expect(await readFile(join(root, 'src/generated/assets.ts'), 'utf8')).toBe(registry);
});

test('damaged outputs fail validation and are repaired deterministically', async () => {
  const { root } = await fixture();
  const first = await buildRuntime(root);
  const path = join(root, first.directory, 'hazard.png');
  const original = await readFile(path);
  await writeFile(path, 'damaged');
  await expect(readRuntimeBuild(root)).rejects.toThrow('damaged');
  const repaired = await buildRuntime(root);
  expect(repaired.fingerprint).toBe(first.fingerprint);
  expect(await readFile(path)).toEqual(original);
});

test('failed active-set processing preserves the published registry and images', async () => {
  const { root, candidate } = await fixture();
  const first = await buildRuntime(root);
  const registryPath = join(root, 'src/generated/assets.ts');
  const before = await readFile(registryPath);
  const broken = join(root, 'assets/source/broken.png');
  await writeFile(broken, 'not an image');
  const { sha256 } = await import('../../scripts/assets/AssetRecipe');
  await writeFile(
    join(root, 'assets/metadata/broken.json'),
    JSON.stringify({
      ...candidate.recipe,
      id: 'broken',
      state: 'active',
      source: 'assets/source/broken.png',
      sourceHash: sha256('not an image'),
    }),
  );
  await expect(buildRuntime(root)).rejects.toThrow();
  expect(await readFile(registryPath)).toEqual(before);
  expect(await readFile(join(root, first.directory, 'hazard.png'))).not.toEqual(
    Buffer.from('damaged'),
  );
  await expect(readRuntimeBuild(root)).rejects.toThrow('inputs changed');
});

test('deactivation removes runtime references and cleans only builder-owned old files', async () => {
  const { root, candidate } = await fixture();
  const first = await buildRuntime(root);
  const unknown = join(root, first.directory, 'handwritten.txt');
  await writeFile(unknown, 'keep');
  await writeFile(
    join(root, 'assets/metadata/hazard.json'),
    JSON.stringify({ ...candidate.recipe, state: 'prepared' }),
  );
  const next = await buildRuntime(root);
  expect(next.assets).toEqual([]);
  expect(await readFile(join(root, 'src/generated/assets.ts'), 'utf8')).not.toContain(
    'ASSET_HAZARD',
  );
  expect(await readFile(unknown, 'utf8')).toBe('keep');
  await expect(readFile(join(root, first.directory, 'hazard.png'))).rejects.toThrow();
});

test('an editor change during real runtime staging cannot publish stale output', async () => {
  const { root, candidate } = await fixture();
  const first = await buildRuntime(root);
  const registryPath = join(root, 'src/generated/assets.ts');
  const before = await readFile(registryPath);
  const recipePath = join(root, 'assets/metadata/hazard.json');
  await writeFile(
    recipePath,
    JSON.stringify({ ...candidate.recipe, state: 'active', provenance: 'before processing' }),
  );
  const { watch, writeFileSync } = await import('node:fs');
  let changed = false;
  const watcher = watch(join(root, 'reports/assets'), (_event, name) => {
    if (changed || !name?.startsWith('runtime-staging-')) return;
    changed = true;
    writeFileSync(
      recipePath,
      JSON.stringify({
        ...candidate.recipe,
        state: 'active',
        provenance: 'editor change while processing',
      }),
    );
  });
  try {
    await expect(buildRuntime(root)).rejects.toThrow('inputs changed during processing');
  } finally {
    watcher.close();
  }
  expect(changed).toBe(true);
  expect(await readFile(registryPath)).toEqual(before);
  expect(
    (await sharp(await readFile(join(root, first.directory, 'hazard.png'))).metadata()).width,
  ).toBe(64);
  await expect(readRuntimeBuild(root)).rejects.toThrow('inputs changed');
});
