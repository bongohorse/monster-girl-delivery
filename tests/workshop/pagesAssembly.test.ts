import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { assemblePages } from '../../scripts/workshop/assemble-pages';

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'mgd-pages-assembly-'));
  roots.push(root);
  await Promise.all([
    mkdir(join(root, 'dist/assets'), { recursive: true }),
    mkdir(join(root, 'dist-workshop/assets'), { recursive: true }),
    mkdir(join(root, 'dist-pages'), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(join(root, 'dist/index.html'), '<html>game</html>'),
    writeFile(join(root, 'dist/assets/game.bin'), Buffer.from([0, 255, 12])),
    writeFile(join(root, 'dist-workshop/index.html'), '<html>workshop</html>'),
    writeFile(join(root, 'dist-workshop/assets/study.bin'), Buffer.from([16, 128, 0])),
    writeFile(join(root, 'dist-pages/stale.txt'), 'previous deployment'),
  ]);
  return root;
}

describe('composed Pages artifact', () => {
  it('copies exact game bytes at the root and Workshop bytes only under workshop, removing stale output', async () => {
    const root = await fixture();
    await assemblePages(root);
    expect(await readFile(join(root, 'dist-pages/index.html'), 'utf8')).toBe('<html>game</html>');
    expect(await readFile(join(root, 'dist-pages/workshop/index.html'), 'utf8')).toBe(
      '<html>workshop</html>',
    );
    expect(await readFile(join(root, 'dist-pages/assets/game.bin'))).toEqual(
      Buffer.from([0, 255, 12]),
    );
    expect(await readFile(join(root, 'dist-pages/workshop/assets/study.bin'))).toEqual(
      Buffer.from([16, 128, 0]),
    );
    await expect(readFile(join(root, 'dist-pages/stale.txt'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
    // Assembly must preserve the independently checked game/Capacitor package and Workshop build.
    expect(await readFile(join(root, 'dist/index.html'), 'utf8')).toBe('<html>game</html>');
    expect(await readFile(join(root, 'dist-workshop/index.html'), 'utf8')).toBe(
      '<html>workshop</html>',
    );
    await expect(readFile(join(root, 'dist/workshop/index.html'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it.each(['dist', 'dist-workshop'])(
    'preserves the previous artifact when %s is not built',
    async (directory) => {
      const root = await fixture();
      await rm(join(root, directory, 'index.html'));
      await expect(assemblePages(root)).rejects.toThrow('Pages-Eingabe fehlt:');
      expect(await readFile(join(root, 'dist-pages/stale.txt'), 'utf8')).toBe(
        'previous deployment',
      );
    },
  );

  it('rejects a game artifact occupying the reserved workshop path before replacing output', async () => {
    const root = await fixture();
    await mkdir(join(root, 'dist/workshop'));
    await writeFile(join(root, 'dist/workshop/index.html'), 'accidental game entry');
    await expect(assemblePages(root)).rejects.toThrow('Pages-Pfadkollision:');
    expect(await readFile(join(root, 'dist-pages/stale.txt'), 'utf8')).toBe('previous deployment');
    expect(await readFile(join(root, 'dist/workshop/index.html'), 'utf8')).toBe(
      'accidental game entry',
    );
  });
});
