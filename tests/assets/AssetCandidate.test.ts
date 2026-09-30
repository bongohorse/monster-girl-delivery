import { createHash } from 'node:crypto';
import { watch } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { afterEach, expect, test } from 'vitest';
import { prepareAsset, previewAsset, validateAsset } from '../../scripts/assets/AssetCandidate';

const roots: string[] = [];
const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const fixture = async () => {
  const root = await mkdtemp(join(tmpdir(), 'mgd-asset-'));
  roots.push(root);
  const file = join(root, 'supplied.png');
  // A real decoded 4K input, with independently known aspect ratio and color.
  const bytes = await sharp({
    create: { width: 4096, height: 2160, channels: 4, background: '#ff0000' },
  })
    .png()
    .toBuffer();
  await writeFile(file, bytes);
  return { root, file, bytes };
};
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

test('prepare preserves a 4K original and publishes only a labelled isolated candidate', async () => {
  const { root, file, bytes } = await fixture();
  const candidate = await prepareAsset(root, {
    id: 'courier-trial',
    file,
    profile: 'static-png',
    width: 256,
    height: 256,
    displayWidth: 72,
    displayHeight: 72,
    padding: 16,
    provenance: 'test fixture',
  });
  expect(hash(await readFile(file))).toBe(hash(bytes));
  expect(hash(await readFile(join(root, candidate.recipe.source)))).toBe(hash(bytes));
  expect(candidate.report.source.width).toBe(4096);
  expect(candidate.report.output.width).toBe(256);
  expect(candidate.report.content).toMatchObject({ width: 224, height: 118, left: 16, top: 69 });
  expect(candidate.recipe.state).toBe('prepared');
  expect(candidate.directory).toContain('reports/assets/previews/courier-trial/');
  const html = await readFile(join(root, candidate.directory, 'index.html'), 'utf8');
  expect(html).toContain(candidate.report.fingerprint.slice(0, 12));
  expect(html).toContain('Candidate');
  expect(html).toContain('72 × 72');
  await expect(readFile(join(root, 'src/generated/assets.ts'))).rejects.toThrow();
  await expect(readFile(join(root, 'assets/processed/runtime.png'))).rejects.toThrow();
  expect((await validateAsset(root, 'courier-trial')).report.fingerprint).toBe(
    candidate.report.fingerprint,
  );
});

const prepareFixture = async () => {
  const f = await fixture();
  const candidate = await prepareAsset(f.root, {
    id: 'trial',
    file: f.file,
    profile: 'static-png',
    width: 128,
    height: 128,
    displayWidth: 64,
    displayHeight: 64,
    provenance: 'test fixture',
  });
  return { ...f, candidate };
};

test('existing IDs need explicit updates, preserving previous original bytes', async () => {
  const { root, file, bytes, candidate } = await prepareFixture();
  const updated = await sharp({
    create: { width: 96, height: 48, channels: 4, background: '#0000ff' },
  })
    .png()
    .toBuffer();
  await writeFile(file, updated);
  await expect(prepareAsset(root, { id: 'trial', file })).rejects.toThrow('requires --update');
  expect(hash(await readFile(join(root, candidate.recipe.source)))).toBe(hash(bytes));
  expect((await validateAsset(root, 'trial')).report.fingerprint).toBe(
    candidate.report.fingerprint,
  );
  const next = await prepareAsset(root, { id: 'trial', file, update: true });
  expect(next.report.fingerprint).not.toBe(candidate.report.fingerprint);
  expect(hash(await readFile(join(root, next.recipe.source)))).toBe(hash(updated));
  expect(hash(await readFile(join(root, candidate.recipe.source)))).toBe(hash(bytes));
  expect(next.report.content.width).toBe(96); // No enlargement of a smaller image.
});

test('recipe edits invalidate old previews; preview/validate do not silently rebuild', async () => {
  const { root, candidate } = await prepareFixture();
  const recipe = { ...candidate.recipe, display: { width: 48, height: 48, renderScale: 2 } };
  await writeFile(join(root, 'assets/metadata/trial.json'), JSON.stringify(recipe));
  const previous = await readFile(join(root, candidate.directory, 'index.html'));
  await expect(validateAsset(root, 'trial')).rejects.toThrow('stale');
  await expect(previewAsset(root, 'trial')).rejects.toThrow('stale');
  expect(await readFile(join(root, candidate.directory, 'index.html'))).toEqual(previous);
  const next = await prepareAsset(root, { id: 'trial' });
  expect(next.report.fingerprint).not.toBe(candidate.report.fingerprint);
  expect(next.recipe.display.width).toBe(48);
});

test('checks output hashes and missing files, then explicit preparation repairs the candidate', async () => {
  const { root, candidate } = await prepareFixture();
  const runtime = join(root, candidate.directory, 'runtime.png');
  const original = await readFile(runtime);
  await writeFile(runtime, 'corrupted');
  await expect(validateAsset(root, 'trial')).rejects.toThrow('damaged');
  const repaired = await prepareAsset(root, { id: 'trial' });
  expect(repaired.report.fingerprint).toBe(candidate.report.fingerprint);
  expect(await readFile(runtime)).toEqual(original);
  await validateAsset(root, 'trial');
  await rm(join(root, candidate.directory, 'index.html'));
  await expect(validateAsset(root, 'trial')).rejects.toThrow();
});

test('preparing an active asset cannot change runtime files, registry or recipe state', async () => {
  const { root, candidate } = await prepareFixture();
  await mkdir(join(root, 'assets/processed'), { recursive: true });
  await mkdir(join(root, 'src/generated'), { recursive: true });
  await mkdir(join(root, 'public/assets/m6'), { recursive: true });
  const sentinels = [
    'assets/processed/runtime.png',
    'src/generated/assets.ts',
    'public/assets/m6/molten-spike-trial.png',
  ];
  for (const file of sentinels) await writeFile(join(root, file), 'active runtime remains');
  await writeFile(
    join(root, 'assets/metadata/trial.json'),
    JSON.stringify({ ...candidate.recipe, state: 'active' }),
  );
  const preview = await prepareAsset(root, { id: 'trial', width: 192 });
  expect(preview.recipe.state).toBe('active');
  expect(preview.report.warnings.join(' ')).toContain('runtime freshness');
  for (const file of sentinels)
    expect(await readFile(join(root, file), 'utf8')).toBe('active runtime remains');
});

test('pass-through is intentional byte equality; opaque JPG retains its background', async () => {
  const { root } = await fixture();
  const file = join(root, 'opaque.jpg');
  const bytes = await sharp({
    create: { width: 64, height: 32, channels: 3, background: '#ffff00' },
  })
    .jpeg()
    .toBuffer();
  await writeFile(file, bytes);
  const candidate = await prepareAsset(root, {
    id: 'icon',
    file,
    profile: 'pass-through',
    displayWidth: 32,
    displayHeight: 16,
    provenance: 'fixture',
  });
  expect(await readFile(join(root, candidate.directory, 'runtime.jpg'))).toEqual(bytes);
  expect(candidate.report.warnings.join(' ')).toContain('fully opaque');
  expect(candidate.report.output.alpha.transparent).toBe(0);
  await validateAsset(root, 'icon');
});

test('explicit crop maps source pivot rather than recentering the subject implicitly', async () => {
  const { root } = await fixture();
  const file = join(root, 'asymmetric.png');
  const subject = await sharp({
    create: { width: 20, height: 10, channels: 4, background: '#ff0000' },
  })
    .png()
    .toBuffer();
  await sharp({ create: { width: 100, height: 60, channels: 4, background: '#00000000' } })
    .composite([{ input: subject, left: 60, top: 40 }])
    .png()
    .toFile(file);
  const candidate = await prepareAsset(root, {
    id: 'asymmetric',
    file,
    profile: 'static-png',
    width: 16,
    height: 16,
    padding: 2,
    trimAlpha: 24,
    pivotX: 0.7,
    pivotY: 0.75,
    displayWidth: 16,
    displayHeight: 16,
    provenance: 'fixture',
  });
  expect(candidate.report.content).toEqual({ left: 2, top: 5, width: 12, height: 6 });
  expect(candidate.report.sourceCrop).toEqual({ left: 60, top: 40, width: 20, height: 10 });
  expect(candidate.report.scale).toEqual({ x: 0.6, y: 0.6 });
  expect(candidate.report.pivot).toEqual({ x: 8, y: 8 });
});

test('rejects bad input/configuration without publishing a recipe', async () => {
  const { root, file } = await fixture();
  await expect(prepareAsset(root, { id: '../escape', file })).rejects.toThrow('Asset ID');
  await expect(prepareAsset(root, { id: 'new', update: true, file })).rejects.toThrow(
    'existing ID',
  );
  await expect(prepareAsset(root, { id: 'new', file })).rejects.toThrow();
  await writeFile(file, 'not an image');
  await expect(
    prepareAsset(root, {
      id: 'new',
      file,
      profile: 'pass-through',
      displayWidth: 1,
      displayHeight: 1,
      provenance: 'fixture',
    }),
  ).rejects.toThrow();
  await expect(readFile(join(root, 'assets/metadata/new.json'))).rejects.toThrow();
});

test('schema and owned source paths are validated before a candidate can be consumed', async () => {
  const { root, candidate } = await prepareFixture();
  const path = join(root, 'assets/metadata/trial.json');
  await writeFile(path, JSON.stringify({ ...candidate.recipe, schemaVersion: 99 }));
  await expect(validateAsset(root, 'trial')).rejects.toThrow('schemaVersion');
  await writeFile(
    path,
    JSON.stringify({ ...candidate.recipe, source: 'assets/source/../../supplied.png' }),
  );
  await expect(validateAsset(root, 'trial')).rejects.toThrow('Invalid asset path');
});

test('rejects symlinked preview destinations rather than writing outside the checkout', async () => {
  const { root, file } = await fixture();
  const outside = await mkdtemp(join(tmpdir(), 'mgd-asset-outside-'));
  roots.push(outside);
  await mkdir(join(root, 'reports'));
  await symlink(
    outside,
    join(root, 'reports/assets'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );
  await expect(prepareAsset(root, { id: 'new', file })).rejects.toThrow('Symlinks');
});

test('an external recipe edit during processing prevents candidate publication', async () => {
  const { root, candidate } = await prepareFixture();
  const path = join(root, 'assets/metadata/trial.json');
  const originalReport = await readFile(join(root, candidate.directory, 'report.json'));
  let mutation: Promise<void> | undefined;
  // Observe the supported filesystem boundary rather than modifying private builder state.
  const watcher = watch(join(root, 'reports/assets/previews/trial'), (_, name) => {
    if (!mutation && name?.toString().startsWith('staging-')) {
      mutation = writeFile(
        path,
        JSON.stringify({ ...candidate.recipe, provenance: 'changed by external editor' }),
      );
    }
  });
  try {
    await expect(prepareAsset(root, { id: 'trial', width: 192 })).rejects.toThrow(
      'Recipe changed during preparation',
    );
    expect(mutation).toBeDefined();
    await mutation;
    expect(await readFile(join(root, candidate.directory, 'report.json'))).toEqual(originalReport);
    expect(JSON.parse(await readFile(path, 'utf8')).provenance).toBe('changed by external editor');
  } finally {
    watcher.close();
  }
});
