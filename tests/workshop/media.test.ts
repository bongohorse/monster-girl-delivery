import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { afterEach, describe, expect, it } from 'vitest';
import { sha256 } from '../../scripts/assets/AssetRecipe';
import { prepareWorkshopMedia } from '../../scripts/workshop/WorkshopMedia';
import type { Artifact } from '../../workshop/src/catalog';

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function fixture(): Promise<{ root: string; artifact: Artifact; bytes: Buffer }> {
  const root = await mkdtemp(join(tmpdir(), 'mgd-workshop-media-'));
  roots.push(root);
  const sourcePath = 'public/assets/sample.png';
  await mkdir(join(root, 'public/assets'), { recursive: true });
  const bytes = await sharp({
    create: { width: 2, height: 2, channels: 4, background: { r: 20, g: 40, b: 60, alpha: 0.5 } },
  })
    .png()
    .toBuffer();
  await writeFile(join(root, sourcePath), bytes);
  execFileSync('git', ['init', '-q'], { cwd: root });
  execFileSync('git', ['add', '.'], { cwd: root });
  execFileSync(
    'git',
    [
      '-c',
      'user.name=Workshop Test',
      '-c',
      'user.email=workshop@example.invalid',
      'commit',
      '-qm',
      'sample',
    ],
    { cwd: root },
  );
  const revision = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
  }).trim();
  return {
    root,
    bytes,
    artifact: {
      id: 'sample',
      assetId: 'sample',
      sourcePath,
      revision,
      sha256: sha256(bytes),
      role: 'preview',
      runtimeAssetId: null,
      recipe: null,
      derivedFromArtifactId: null,
      metadata: { format: 'png', width: 2, height: 2, hasAlpha: true, durationSeconds: null },
      provenance: { text: 'Test fixture', prompt: null, referenceUrls: [] },
    },
  };
}

describe('Workshop hosted media identity', () => {
  it('hosts equal bytes once while preserving both artifact references and original files', async () => {
    const { root, artifact, bytes } = await fixture();
    const result = await prepareWorkshopMedia(root, [artifact, { ...artifact, id: 'shared' }]);
    expect(result.sample.url).toBe(result.shared.url);
    expect(await readFile(result.sample.url)).toEqual(bytes);
    expect(await readFile(join(root, artifact.sourcePath ?? ''))).toEqual(bytes);
    expect(result.sample.sha256).toBe(artifact.sha256);
  });

  it('rejects a source changed after its catalog revision instead of presenting old metadata', async () => {
    const { root, artifact } = await fixture();
    await writeFile(join(root, artifact.sourcePath ?? ''), 'different bytes');
    await expect(prepareWorkshopMedia(root, [artifact])).rejects.toThrow('Bildquelle geändert');
  });
});
