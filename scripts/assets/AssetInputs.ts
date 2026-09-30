import { readFile, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { IMAGE_LIMITS } from './AssetImage.ts';
import { type AssetRecipe, assetPath, sha256 } from './AssetRecipe.ts';

const moduleDirectory = dirname(fileURLToPath(import.meta.url));

/** Shared input identity for candidates and runtime generations, not a second manifest. */
export async function assetToolchain(
  root: string,
  kind: 'candidate' | 'runtime',
): Promise<Record<string, string>> {
  const names = [
    'AssetRecipe.ts',
    'AssetImage.ts',
    'AssetInputs.ts',
    kind === 'candidate' ? 'AssetCandidate.ts' : 'AssetRuntime.ts',
  ];
  let directory = resolve(root, 'scripts/assets');
  try {
    await stat(resolve(directory, 'AssetInputs.ts'));
  } catch {
    directory = moduleDirectory;
  } // Isolated fixture roots use the executing tool's code/dependencies.
  const files = await Promise.all(names.map((file) => readFile(resolve(directory, file))));
  return {
    builder: sha256(Buffer.concat(files)),
    lockfile: sha256(await readFile(resolve(directory, '../../bun.lock'))),
    runtime: process.versions.bun ? `bun-${process.versions.bun}` : `node-${process.versions.node}`,
    platform: `${process.platform}-${process.arch}`,
    ...sharp.versions,
  };
}

export async function assetSourceBytes(root: string, recipe: AssetRecipe): Promise<Buffer> {
  const path = await assetPath(root, recipe.source, 'assets/source');
  if ((await stat(path)).size > IMAGE_LIMITS.bytes)
    throw new Error('Image exceeds 64 MiB input limit.');
  const bytes = await readFile(path);
  if (sha256(bytes) !== recipe.sourceHash)
    throw new Error(
      'Source changed: use explicit prepare --update --file to record the new original.',
    );
  return bytes;
}
