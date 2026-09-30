import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import sharp from 'sharp';
import {
  IMAGE_LIMITS,
  type ImageResult,
  inspectImage,
  previewHtml,
  processImage,
} from './AssetImage';
import { assetToolchain, assetSourceBytes as sourceBytes } from './AssetInputs';
import { withAssetLock } from './AssetLock';
import {
  type AssetRecipe,
  assertAssetId,
  assetPath,
  parseRecipe,
  readRecipe,
  recipePath,
  sha256,
  stableJson,
} from './AssetRecipe';

export interface PrepareOptions {
  id: string;
  file?: string;
  update?: boolean;
  profile?: AssetRecipe['profile'];
  width?: number;
  height?: number;
  displayWidth?: number;
  displayHeight?: number;
  renderScale?: number;
  padding?: number;
  sampling?: AssetRecipe['canvas']['sampling'];
  trimAlpha?: number;
  pivotX?: number;
  pivotY?: number;
  provenance?: string;
  signal?: AbortSignal;
}

export interface CandidateReport {
  schemaVersion: 1;
  kind: 'candidate';
  id: string;
  fingerprint: string;
  toolchain: Record<string, string>;
  recipe: AssetRecipe;
  source: ImageResult['source'];
  output: ImageResult['output'];
  content: ImageResult['content'];
  sourceCrop: ImageResult['sourceCrop'];
  scale: { x: number; y: number };
  pivot: ImageResult['pivot'];
  files: Record<string, string>;
  warnings: string[];
}
export interface Candidate {
  recipe: AssetRecipe;
  report: CandidateReport;
  directory: string;
}

const errorCode = (error: unknown): string | undefined => (error as NodeJS.ErrnoException).code;
const checkAbort = (signal?: AbortSignal): void => {
  signal?.throwIfAborted();
};
const candidateDirectory = (id: string, fingerprint: string) =>
  `reports/assets/previews/${id}/${fingerprint}`;

async function currentState(
  root: string,
  id: string,
): Promise<{
  recipe: AssetRecipe;
  bytes: Buffer;
  text: string;
  tools: Record<string, string>;
  fingerprint: string;
}> {
  const { recipe, text } = await readRecipe(root, id);
  const bytes = await sourceBytes(root, recipe);
  const tools = await assetToolchain(root, 'candidate');
  return {
    recipe,
    bytes,
    text,
    tools,
    fingerprint: sha256(stableJson({ recipe, toolchain: tools })),
  };
}

async function requireUnchanged(
  root: string,
  id: string,
  previous: string | undefined,
  signal?: AbortSignal,
): Promise<void> {
  checkAbort(signal);
  let current: string | undefined;
  try {
    current = await readFile(await recipePath(root, id), 'utf8');
  } catch (error) {
    if (errorCode(error) !== 'ENOENT') throw error;
  }
  if (current !== previous)
    throw new Error(
      'Recipe changed during preparation; candidate was not published. Retry with current inputs.',
    );
}

async function checkedReport(
  root: string,
  recipe: AssetRecipe,
  fingerprint: string,
): Promise<Candidate> {
  const directory = candidateDirectory(recipe.id, fingerprint);
  const path = await assetPath(root, `${directory}/report.json`, 'reports/assets/previews');
  let report: CandidateReport;
  try {
    report = JSON.parse(await readFile(path, 'utf8')) as CandidateReport;
  } catch {
    throw new Error('Candidate is missing or stale; run assets:prepare --id again.');
  }
  if (
    report.schemaVersion !== 1 ||
    report.kind !== 'candidate' ||
    report.id !== recipe.id ||
    report.fingerprint !== fingerprint ||
    stableJson(report.recipe) !== stableJson(recipe)
  ) {
    throw new Error('Candidate identity is invalid or stale; run assets:prepare --id again.');
  }
  const extension =
    recipe.profile === 'static-png' ? 'png' : await inspectImage(await sourceBytes(root, recipe));
  const expected = [`runtime.${extension}`, 'source-preview.png', 'index.html'];
  if (!report.files || stableJson(Object.keys(report.files).sort()) !== stableJson(expected.sort()))
    throw new Error('Candidate output manifest is invalid.');
  for (const file of expected) {
    const bytes = await readFile(
      await assetPath(root, `${directory}/${file}`, 'reports/assets/previews'),
    );
    if (sha256(bytes) !== report.files[file])
      throw new Error(`Candidate output is damaged: ${file}. Run assets:prepare --id again.`);
  }
  return { recipe, directory, report };
}

async function guarded<T>(
  root: string,
  action: () => Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  await assetPath(root, 'reports/assets/lock-sentinel', 'reports/assets');
  return withAssetLock(root, action, {
    signal,
    onWait: () => process.stderr.write('Waiting for another asset operation…\n'),
  });
}

/** Import/update + candidate build. This path never owns processed media or the runtime registry. */
export async function prepareAsset(root: string, options: PrepareOptions): Promise<Candidate> {
  assertAssetId(options.id);
  return guarded(
    root,
    async () => {
      let previous: { recipe: AssetRecipe; text: string } | undefined;
      try {
        previous = await readRecipe(root, options.id);
      } catch (error) {
        if (errorCode(error) !== 'ENOENT') throw error;
      }
      if (options.update && (!previous || !options.file))
        throw new Error('Update requires an existing ID and --file.');
      if (options.file && previous && !options.update)
        throw new Error('ID already exists; replacing its source requires --update and --file.');
      if (!options.file && !previous)
        throw new Error(
          'New asset requires --file, profile, target canvas/display and provenance.',
        );
      const importing = options.file !== undefined;
      const inputPath = importing
        ? resolve(root, options.file as string)
        : await assetPath(
            root,
            (previous as { recipe: AssetRecipe }).recipe.source,
            'assets/source',
          );
      if ((await stat(inputPath)).size > IMAGE_LIMITS.bytes)
        throw new Error('Image exceeds 64 MiB input limit.');
      const bytes = await readFile(inputPath);
      const hash = sha256(bytes);
      const extension = await inspectImage(bytes);
      const metadata = await sharp(bytes).autoOrient().metadata();
      const rel = relative(resolve(root), inputPath).split(sep).join('/');
      const source =
        rel.startsWith('assets/source/') && !isAbsolute(rel)
          ? rel
          : `assets/source/imported/${options.id}/${hash}.${extension}`;
      const old = previous?.recipe;
      if (!importing && old?.sourceHash !== hash)
        throw new Error('Source changed: use explicit prepare --update --file to record it.');
      const profile = options.profile ?? old?.profile;
      const recipe = parseRecipe(
        {
          schemaVersion: 1,
          id: options.id,
          source,
          sourceHash: hash,
          provenance: options.provenance ?? old?.provenance,
          state: old?.state ?? 'prepared',
          profile,
          canvas: {
            width:
              options.width ??
              old?.canvas.width ??
              (profile === 'pass-through' ? metadata.width : undefined),
            height:
              options.height ??
              old?.canvas.height ??
              (profile === 'pass-through' ? metadata.height : undefined),
            padding: options.padding ?? old?.canvas.padding ?? 0,
            sampling: options.sampling ?? old?.canvas.sampling ?? 'lanczos3',
            trimAlpha: options.trimAlpha ?? old?.canvas.trimAlpha ?? null,
          },
          pivot: {
            x: options.pivotX ?? old?.pivot.x ?? 0.5,
            y: options.pivotY ?? old?.pivot.y ?? 0.5,
          },
          display: {
            width: options.displayWidth ?? old?.display.width,
            height: options.displayHeight ?? old?.display.height,
            renderScale: options.renderScale ?? old?.display.renderScale ?? 2,
          },
        },
        options.id,
      );
      // Validate future owned locations before expensive processing or creating directories.
      const sourcePath = await assetPath(root, recipe.source, 'assets/source');
      const targetRecipe = await recipePath(root, options.id);
      const tools = await assetToolchain(root, 'candidate');
      const fingerprint = sha256(stableJson({ recipe, toolchain: tools }));
      const directory = candidateDirectory(recipe.id, fingerprint);
      if (previous && stableJson(previous.recipe) === stableJson(recipe)) {
        let reusable: Candidate | undefined;
        try {
          reusable = await checkedReport(root, recipe, fingerprint);
        } catch {
          /* Explicit prepare repairs missing/damaged output. */
        }
        if (reusable) {
          await requireUnchanged(root, options.id, previous.text, options.signal);
          if (sha256(await readFile(inputPath)) !== hash)
            throw new Error('Source changed during preparation; retry with current inputs.');
          await sourceBytes(root, recipe);
          return reusable;
        }
      }
      const candidateParent = await assetPath(
        root,
        `reports/assets/previews/${recipe.id}/staging`,
        'reports/assets/previews',
      );
      await mkdir(dirname(candidateParent), { recursive: true });
      const staging = await mkdtemp(`${candidateParent}-`);
      try {
        checkAbort(options.signal);
        const result = await processImage(bytes, recipe);
        const files: Record<string, Buffer> = {
          [`runtime.${result.extension}`]: result.bytes,
          'source-preview.png': result.sourcePreview,
          'index.html': Buffer.from(previewHtml(recipe, result, fingerprint)),
        };
        const warnings: string[] = [];
        if (!result.source.alpha.transparent && !result.source.alpha.translucent)
          warnings.push('Source is fully opaque; this is not a transparent cutout.');
        if (
          result.output.width < recipe.display.width * recipe.display.renderScale ||
          result.output.height < recipe.display.height * recipe.display.renderScale
        )
          warnings.push('Texture canvas is below requested display/render-factor pixel demand.');
        if (
          recipe.display.width / recipe.display.height !==
          result.output.width / result.output.height
        )
          warnings.push(
            'Target and canvas aspect ratios differ; game presentation must preserve proportions.',
          );
        if (recipe.state === 'active')
          warnings.push(
            'Candidate only: active runtime freshness is not established until a full runtime build.',
          );
        const report: CandidateReport = {
          schemaVersion: 1,
          kind: 'candidate',
          id: recipe.id,
          fingerprint,
          toolchain: tools,
          recipe,
          source: result.source,
          output: result.output,
          content: result.content,
          sourceCrop: result.sourceCrop,
          scale: {
            x: result.content.width / result.sourceCrop.width,
            y: result.content.height / result.sourceCrop.height,
          },
          pivot: result.pivot,
          files: Object.fromEntries(
            Object.entries(files).map(([file, data]) => [file, sha256(data)]),
          ),
          warnings,
        };
        for (const [file, data] of Object.entries(files))
          await writeFile(resolve(staging, file), data);
        await writeFile(resolve(staging, 'report.json'), `${stableJson(report)}\n`);
        await requireUnchanged(root, options.id, previous?.text, options.signal);
        if (sha256(await readFile(inputPath)) !== hash)
          throw new Error('Source changed during preparation; candidate was not published.');
        await mkdir(dirname(sourcePath), { recursive: true });
        if (sourcePath !== inputPath) {
          try {
            await writeFile(sourcePath, bytes, { flag: 'wx' });
          } catch (error) {
            if (errorCode(error) !== 'EEXIST' || sha256(await readFile(sourcePath)) !== hash)
              throw error;
          }
        }
        const target = await assetPath(root, `${directory}/report.json`, 'reports/assets/previews');
        // Only this fingerprint's disposable candidate may be replaced after successful processing.
        await rm(dirname(target), { recursive: true, force: true });
        await rename(staging, dirname(target));
        if (!previous || stableJson(previous.recipe) !== stableJson(recipe)) {
          await mkdir(dirname(targetRecipe), { recursive: true });
          const temporaryRecipe = `${targetRecipe}.${randomUUID()}.tmp`;
          try {
            await writeFile(temporaryRecipe, `${JSON.stringify(recipe, null, 2)}\n`, {
              flag: 'wx',
            });
            await requireUnchanged(root, options.id, previous?.text, options.signal);
            await rename(temporaryRecipe, targetRecipe);
          } finally {
            await rm(temporaryRecipe, { force: true });
          }
        }
        checkAbort(options.signal);
        return checkedReport(root, recipe, fingerprint);
      } finally {
        await rm(staging, { recursive: true, force: true });
      }
    },
    options.signal,
  );
}

/** Read-only: fingerprints and every expected output hash must agree. */
export async function validateAsset(
  root: string,
  id: string,
  signal?: AbortSignal,
): Promise<Candidate> {
  return guarded(
    root,
    async () => {
      const state = await currentState(root, id);
      const candidate = await checkedReport(root, state.recipe, state.fingerprint);
      await requireUnchanged(root, id, state.text, signal);
      await sourceBytes(root, state.recipe);
      return candidate;
    },
    signal,
  );
}

/** A view of valid existing output; it does not repair a stale/damaged candidate. */
export async function previewAsset(
  root: string,
  id: string,
  signal?: AbortSignal,
): Promise<Candidate> {
  return validateAsset(root, id, signal);
}
