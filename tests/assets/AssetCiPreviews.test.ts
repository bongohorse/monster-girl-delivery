import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { afterEach, expect, test } from 'vitest';
import { prepareAsset } from '../../scripts/assets/AssetCandidate';
import { exportCiPreviews } from '../../scripts/assets/AssetCiPreviews';
import { sha256 } from '../../scripts/assets/AssetRecipe';

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function fixture(ids = ['alpha', 'beta']) {
  const root = await mkdtemp(join(tmpdir(), 'mgd-ci-previews-'));
  roots.push(root);
  const file = join(root, 'supplied.png');
  await writeFile(
    file,
    await sharp({ create: { width: 64, height: 32, channels: 4, background: '#f00' } })
      .png()
      .toBuffer(),
  );
  for (const id of ids) {
    await prepareAsset(root, {
      id,
      file,
      profile: 'static-png',
      width: 32,
      height: 32,
      displayWidth: 16,
      displayHeight: 16,
      provenance: 'CI export fixture',
    });
  }
  return root;
}

async function byteCount(directory: string): Promise<number> {
  let total = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    total += entry.isDirectory() ? await byteCount(path) : (await stat(path)).size;
  }
  return total;
}

test('exports current validated candidates with native context and preserves recipes/runtime', async () => {
  const root = await fixture();
  await mkdir(join(root, 'src/generated'), { recursive: true });
  const runtime = 'existing runtime, untouched by CI export';
  await writeFile(join(root, 'src/generated/assets.ts'), runtime);
  const before = await readFile(join(root, 'assets/metadata/alpha.json'));
  const summaryPath = join(root, 'summary.md');
  const report = await exportCiPreviews(root, { summaryPath });
  const directory = join(root, 'reports/assets/ci-previews');
  expect(report.previews.map((entry) => entry.id)).toEqual(['alpha', 'beta']);
  expect(report.toolchain.platform).toBe(`${process.platform}-${process.arch}`);
  expect(report.toolchain.sharp).toBe(sharp.versions.sharp);
  expect(report.artifactBytes).toBe(await byteCount(directory));
  expect(await readFile(join(root, 'assets/metadata/alpha.json'))).toEqual(before);
  expect(await readFile(join(root, 'src/generated/assets.ts'), 'utf8')).toBe(runtime);
  const candidate = JSON.parse(await readFile(join(directory, 'alpha/report.json'), 'utf8'));
  expect(sha256(await readFile(join(directory, 'alpha/runtime.png')))).toBe(
    candidate.files['runtime.png'],
  );
  expect(await readFile(join(directory, 'alpha/index.html'), 'utf8')).toContain(
    'data:image/png;base64,',
  );
  expect(await readFile(summaryPath, 'utf8')).toContain('No omissions');
});

test('bounds recipe count, records omitted IDs and replaces stale export directories', async () => {
  const root = await fixture(['zeta', 'alpha', 'beta']);
  await exportCiPreviews(root);
  const report = await exportCiPreviews(root, { limits: { recipes: 1, bytes: 32 * 1024 * 1024 } });
  expect(report.previews.map((entry) => entry.id)).toEqual(['alpha']);
  expect(report.omitted).toEqual([
    { id: 'beta', reason: 'recipe-limit' },
    { id: 'zeta', reason: 'recipe-limit' },
  ]);
  await expect(stat(join(root, 'reports/assets/ci-previews/zeta'))).rejects.toThrow();
});

test('counts report/index overhead in the artifact byte budget and reports truncation', async () => {
  const root = await fixture();
  const full = await exportCiPreviews(root);
  const limit = full.artifactBytes - 100;
  const report = await exportCiPreviews(root, { limits: { recipes: 8, bytes: limit } });
  expect(report.artifactBytes).toBeLessThanOrEqual(limit);
  expect(report.artifactBytes).toBe(await byteCount(join(root, 'reports/assets/ci-previews')));
  expect(report.previews).toHaveLength(1);
  expect(report.omitted).toEqual([{ id: 'beta', reason: 'byte-limit' }]);
});

test('fails on source drift instead of publishing a misleading stale CI artifact', async () => {
  const root = await fixture(['alpha']);
  const recipe = JSON.parse(await readFile(join(root, 'assets/metadata/alpha.json'), 'utf8'));
  await writeFile(
    join(root, recipe.source),
    await sharp({ create: { width: 64, height: 32, channels: 4, background: '#00f' } })
      .png()
      .toBuffer(),
  );
  await expect(exportCiPreviews(root)).rejects.toThrow('Source changed');
  await expect(stat(join(root, 'reports/assets/ci-previews'))).rejects.toThrow();
});
