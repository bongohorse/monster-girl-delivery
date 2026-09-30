import { lstat, readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { readRecipe, sha256 } from './AssetRecipe.ts';
import { readRuntimeBuild } from './AssetRuntime.ts';

export interface RuntimePackage {
  fingerprint: string;
  assets: { id: string; file: string; hash: string; width: number; height: number }[];
  fileCount: number;
}

const excludedDirectories = [
  'assets/source',
  'assets/metadata',
  'reports',
  'scripts/assets',
  '.agents',
  'node_modules',
];

function assertShippable(file: string): void {
  if (
    excludedDirectories.some(
      (directory) => file === directory || file.startsWith(`${directory}/`),
    ) ||
    /(?:^|\/)(?:bun\.lock|package\.json)$/.test(file) ||
    /\.(?:ts|tsx|py)$/i.test(file)
  )
    throw new Error(`Build-only asset input or tooling shipped in package: ${file}`);
}

/** Inspect final web bytes; Vite, rather than this checker, owns emitted filenames. Caller holds the asset session while consuming the package. */
export async function inspectRuntimePackage(
  root: string,
  packageDirectory: string,
): Promise<RuntimePackage> {
  const build = await readRuntimeBuild(root);
  const directory = resolve(root, packageDirectory);
  const rootStat = await lstat(directory);
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory())
    throw new Error('Package root must be a real directory.');
  const runtimeHashes = new Set(build.assets.map((asset) => asset.hash));
  const sourceHashes = new Set<string>();
  let recipes: string[];
  try {
    recipes = await readdir(join(root, 'assets/metadata'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    recipes = [];
  }
  for (const name of recipes.sort()) {
    if (!name.endsWith('.json')) continue;
    const { recipe } = await readRecipe(root, name.slice(0, -5));
    sourceHashes.add(recipe.sourceHash);
  }
  const packagedHashes = new Map<string, string>();
  let fileCount = 0;
  async function inspect(relativeDirectory: string): Promise<void> {
    const current = join(directory, relativeDirectory);
    for (const entry of (await readdir(current, { withFileTypes: true })).sort((a, b) =>
      a.name.localeCompare(b.name, 'en'),
    )) {
      const file = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
      assertShippable(file);
      if (entry.isSymbolicLink()) throw new Error(`Symlink shipped in package: ${file}`);
      if (entry.isDirectory()) {
        await inspect(file);
        continue;
      }
      if (!entry.isFile()) throw new Error(`Unsupported package entry: ${file}`);
      fileCount += 1;
      const hash = sha256(await readFile(join(directory, file)));
      // Pass-through is an explicit runtime export, even when its bytes equal the source.
      if (sourceHashes.has(hash) && !runtimeHashes.has(hash)) {
        throw new Error(`Original image source shipped in package: ${file}`);
      }
      if (!packagedHashes.has(hash)) packagedHashes.set(hash, file);
    }
  }
  await inspect('');
  const assets = build.assets.map((asset) => {
    const file = packagedHashes.get(asset.hash);
    if (!file) throw new Error(`Runtime image missing or damaged in package: ${asset.id}`);
    return { ...asset, file };
  });
  return { fingerprint: build.fingerprint, assets, fileCount };
}
