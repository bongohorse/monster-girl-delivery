import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { expect, test } from 'vitest';

const execute = promisify(execFile);
const cli = resolve('scripts/assets/cli.ts');

test('real Bun CLI prepares, validates and shows a candidate; invalid commands fail clearly', async () => {
  const root = await mkdtemp(join(tmpdir(), 'mgd-asset-cli-'));
  const run = (args: string[]) => execute('bun', [cli, ...args], { cwd: root });
  try {
    await writeFile(
      join(root, 'input.png'),
      await sharp({ create: { width: 32, height: 16, channels: 4, background: '#00ff00' } })
        .png()
        .toBuffer(),
    );
    const result = await run([
      'prepare',
      '--id',
      'cli-image',
      '--file',
      'input.png',
      '--profile',
      'pass-through',
      '--display-width',
      '16',
      '--display-height',
      '8',
      '--provenance',
      'local fixture <script>',
    ]);
    const first = JSON.parse(result.stdout);
    expect(first.kind).toBe('candidate');
    const validate = JSON.parse((await run(['validate', '--id', 'cli-image'])).stdout);
    const preview = JSON.parse((await run(['preview', '--id', 'cli-image'])).stdout);
    expect(validate.fingerprint).toBe(first.fingerprint);
    expect(preview.preview).toBe(first.preview);
    const html = await readFile(preview.preview, 'utf8');
    expect(html).toContain('&lt;script&gt;');
    await expect(run(['prepare', '--id', 'cli-image', '--width', 'wrong'])).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining('Invalid numeric'),
    });
    await expect(
      run(['validate', '--id', 'cli-image', '--file', 'input.png']),
    ).rejects.toMatchObject({ code: 1, stderr: expect.stringContaining('accepts only --id') });
    await expect(run(['preview', '--id', 'cli-image', '--unknown'])).rejects.toMatchObject({
      code: 1,
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('real CLI builds and validates the complete active runtime set', async () => {
  const root = await mkdtemp(join(tmpdir(), 'mgd-runtime-cli-'));
  const run = (args: string[]) => execute('bun', [cli, ...args], { cwd: root });
  try {
    await writeFile(
      join(root, 'input.png'),
      await sharp({ create: { width: 32, height: 16, channels: 4, background: '#00ff00' } })
        .png()
        .toBuffer(),
    );
    await run([
      'prepare',
      '--id',
      'cli-image',
      '--file',
      'input.png',
      '--profile',
      'pass-through',
      '--display-width',
      '16',
      '--display-height',
      '8',
      '--provenance',
      'fixture',
    ]);
    const recipePath = join(root, 'assets/metadata/cli-image.json');
    const recipe = JSON.parse(await readFile(recipePath, 'utf8'));
    await writeFile(recipePath, JSON.stringify({ ...recipe, state: 'active' }));
    const built = JSON.parse((await run(['build'])).stdout);
    expect(built.assets.map((asset: { id: string }) => asset.id)).toEqual(['cli-image']);
    expect(JSON.parse((await run(['validate', '--runtime'])).stdout).fingerprint).toBe(
      built.fingerprint,
    );
    await expect(run(['build', '--id', 'cli-image'])).rejects.toMatchObject({ code: 1 });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
