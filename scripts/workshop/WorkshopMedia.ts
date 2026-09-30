import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { normalizePath, type Plugin } from 'vite';
import { type Artifact, catalog, type PublishedArtifact } from '../../workshop/src/catalog.ts';
import { openAssetSession } from '../assets/AssetEntrypoints.ts';
import { assetPath, sha256 } from '../assets/AssetRecipe.ts';
import { readRuntimeBuild } from '../assets/AssetRuntime.ts';

/** Copy verified bytes for hosting; processing and runtime identity remain with the existing builder. */
export async function prepareWorkshopMedia(
  root: string,
  artifacts: Artifact[] = catalog.artifacts,
): Promise<Record<string, PublishedArtifact>> {
  const session = await openAssetSession(root);
  try {
    const runtime = await readRuntimeBuild(root);
    const output: Record<string, PublishedArtifact> = {};
    for (const artifact of artifacts) {
      let path: string;
      let hash: string;
      let generation: string | null = null;
      if (artifact.runtimeAssetId) {
        const asset = runtime.assets.find((item) => item.id === artifact.runtimeAssetId);
        if (!asset || !artifact.recipe) throw new Error(`Runtime-Artefakt fehlt: ${artifact.id}`);
        // A catalog check revision must not silently describe a different recipe.
        const recipe = await readFile(
          await assetPath(root, artifact.recipe.path, 'assets/metadata'),
        );
        const checkedRecipe = execFileSync(
          'git',
          ['show', `${artifact.recipe.revision}:${artifact.recipe.path}`],
          { cwd: root },
        );
        if (!recipe.equals(checkedRecipe))
          throw new Error(
            `Rezept geändert: ${artifact.recipe.path}. Katalog-Prüfrevision aktualisieren.`,
          );
        path = `${runtime.directory}/${asset.file}`;
        hash = asset.hash;
        generation = runtime.fingerprint;
      } else {
        if (!artifact.sourcePath || !artifact.sha256 || !artifact.revision)
          throw new Error(`Quelldaten fehlen: ${artifact.id}`);
        path = artifact.sourcePath;
        hash = artifact.sha256;
      }
      const area = path.startsWith('public/assets/')
        ? 'public/assets'
        : artifact.runtimeAssetId
          ? 'assets/processed'
          : 'assets/source';
      const bytes = await readFile(await assetPath(root, path, area));
      if (sha256(bytes) !== hash)
        throw new Error(
          `Bildquelle geändert: ${path}. Katalog-Hash und Prüfrevision aktualisieren.`,
        );
      if (!artifact.runtimeAssetId) {
        const checkedBytes = execFileSync('git', ['show', `${artifact.revision}:${path}`], {
          cwd: root,
          maxBuffer: 16 * 1024 * 1024,
        });
        if (sha256(checkedBytes) !== hash)
          throw new Error(`Bild stimmt nicht mit Prüfrevision überein: ${path}`);
      }
      const metadata = await sharp(bytes).metadata();
      if (
        metadata.width !== artifact.metadata.width ||
        metadata.height !== artifact.metadata.height ||
        metadata.format !== artifact.metadata.format ||
        metadata.hasAlpha !== artifact.metadata.hasAlpha
      ) {
        throw new Error(`Bildmetadaten veraltet: ${artifact.id}`);
      }
      const target = join(root, 'workshop/.generated/media', `${hash}.${metadata.format}`);
      await mkdir(join(root, 'workshop/.generated/media'), { recursive: true });
      try {
        await writeFile(target, bytes, { flag: 'wx' });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
        if (sha256(await readFile(target)) !== hash)
          throw new Error(`Workshop-Snapshot beschädigt: ${target}`);
      }
      output[artifact.id] = { ...artifact, url: target, path, sha256: hash, generation };
    }
    return output;
  } finally {
    await session.close();
  }
}

/** Vite owns deploy-relative URLs; each equal byte hash is imported only once. */
export function workshopMediaPlugin(root: string): Plugin {
  const virtualId = '\0virtual:workshop-media';
  let prepared: Record<string, PublishedArtifact> = {};
  let preview = false;
  return {
    name: 'mgd-workshop-media',
    config(_config, env) {
      preview = env.isPreview === true;
    },
    async configResolved() {
      if (!preview) prepared = await prepareWorkshopMedia(root);
    },
    resolveId(id) {
      if (id === 'virtual:workshop-media') return virtualId;
    },
    load(id) {
      if (id !== virtualId) return;
      const urls = [...new Set(Object.values(prepared).map((artifact) => artifact.url))];
      return [
        ...urls.map(
          (url, index) =>
            `import media${index} from ${JSON.stringify(`${normalizePath(url)}?no-inline`)};`,
        ),
        'export default {',
        ...Object.entries(prepared).map(
          ([key, value]) =>
            `${JSON.stringify(key)}: { ...${JSON.stringify({ ...value, url: undefined })}, url: media${urls.indexOf(value.url)} },`,
        ),
        '};',
      ].join('\n');
    },
  };
}
