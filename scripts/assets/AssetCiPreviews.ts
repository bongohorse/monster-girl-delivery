import {
  appendFile,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { resolve } from 'node:path';
import { type CandidateReport, prepareAsset, validateAsset } from './AssetCandidate';
import { assetToolchain } from './AssetInputs';
import { assertAssetId, assetPath, sha256 } from './AssetRecipe';

export const CI_PREVIEW_LIMITS = { recipes: 8, bytes: 32 * 1024 * 1024 } as const;

interface PreviewEntry {
  id: string;
  fingerprint: string;
  bytes: number;
  source: CandidateReport['source'];
  output: CandidateReport['output'];
  warnings: string[];
}
export interface CiPreviewReport {
  schemaVersion: 1;
  kind: 'ci-candidate-previews';
  toolchain: Record<string, string>;
  limits: { recipes: number; bytes: number };
  previews: PreviewEntry[];
  omitted: { id: string; reason: 'recipe-limit' | 'byte-limit' }[];
  artifactBytes: number;
}

const escapeHtml = (text: string): string =>
  text.replace(/[&<>"']/g, (character) => `&#${character.charCodeAt(0)};`);

const indexHtml = (report: CiPreviewReport): string => `<!doctype html>
<html lang="en"><meta charset="utf-8"><title>MGD CI candidate previews</title>
<h1>MGD CI candidate previews</h1><p>Technical candidates only; not art approval or runtime activation.</p>
<p>${escapeHtml(report.toolchain.platform)} · ${escapeHtml(report.toolchain.runtime)}</p>
<ul>${report.previews.map((entry) => `<li><a href="${entry.id}/index.html">${entry.id}</a> · ${entry.fingerprint.slice(0, 12)} · ${entry.source.width}×${entry.source.height} → ${entry.output.width}×${entry.output.height}${entry.warnings.length ? ` · ${escapeHtml(entry.warnings.join('; '))}` : ''}</li>`).join('')}</ul>
${report.omitted.length ? `<p>Omitted by artifact limits: ${report.omitted.map((entry) => `${entry.id} (${entry.reason})`).join(', ')}</p>` : ''}</html>`;

/** CI-only bounded export of existing candidate reports; never changes active runtime files. */
export async function exportCiPreviews(
  root: string,
  options: { limits?: { recipes: number; bytes: number }; summaryPath?: string } = {},
): Promise<CiPreviewReport> {
  const limits = options.limits ?? CI_PREVIEW_LIMITS;
  if (
    !Number.isInteger(limits.recipes) ||
    limits.recipes < 1 ||
    limits.recipes > CI_PREVIEW_LIMITS.recipes ||
    !Number.isInteger(limits.bytes) ||
    limits.bytes < 1 ||
    limits.bytes > CI_PREVIEW_LIMITS.bytes
  ) {
    throw new Error('CI preview limits must be positive integers within the artifact defaults.');
  }
  const metadata = await assetPath(root, 'assets/metadata', 'assets');
  const ids = (await readdir(metadata))
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => name.slice(0, -5));
  for (const id of ids) assertAssetId(id);
  const report: CiPreviewReport = {
    schemaVersion: 1,
    kind: 'ci-candidate-previews',
    toolchain: await assetToolchain(root, 'candidate'),
    limits: { ...limits },
    previews: [],
    omitted: ids.slice(limits.recipes).map((id) => ({ id, reason: 'recipe-limit' })),
    artifactBytes: 0,
  };
  const files = new Map<string, Buffer>();
  for (const id of ids.slice(0, limits.recipes)) {
    await prepareAsset(root, { id });
    const candidate = await validateAsset(root, id);
    const entryFiles = new Map<string, Buffer>();
    for (const [name, hash] of Object.entries(candidate.report.files)) {
      const bytes = await readFile(
        await assetPath(root, `${candidate.directory}/${name}`, 'reports/assets/previews'),
      );
      if (sha256(bytes) !== hash)
        throw new Error(`Candidate changed while exporting CI preview: ${id}/${name}`);
      entryFiles.set(`${id}/${name}`, bytes);
    }
    entryFiles.set(
      `${id}/report.json`,
      Buffer.from(`${JSON.stringify(candidate.report, null, 2)}\n`),
    );
    const bytes = [...entryFiles.values()].reduce((total, file) => total + file.length, 0);
    if (
      bytes + [...files.values()].reduce((total, file) => total + file.length, 0) >
      limits.bytes
    ) {
      report.omitted.push({ id, reason: 'byte-limit' });
      continue;
    }
    for (const [name, file] of entryFiles) files.set(name, file);
    report.previews.push({
      id,
      fingerprint: candidate.report.fingerprint,
      bytes,
      source: candidate.report.source,
      output: candidate.report.output,
      warnings: candidate.report.warnings,
    });
  }
  // Include the index/report themselves in the bound, including the final numeric byte count.
  let outputReport: Buffer;
  let index: Buffer;
  for (;;) {
    report.omitted.sort((a, b) => a.id.localeCompare(b.id, 'en'));
    index = Buffer.from(indexHtml(report));
    const payloadBytes =
      [...files.values()].reduce((total, file) => total + file.length, 0) + index.length;
    for (;;) {
      outputReport = Buffer.from(`${JSON.stringify(report, null, 2)}\n`);
      const total = payloadBytes + outputReport.length;
      if (total === report.artifactBytes) break;
      report.artifactBytes = total;
    }
    if (report.artifactBytes <= limits.bytes) break;
    const removed = report.previews.pop();
    if (!removed) throw new Error('CI preview byte limit is too small for its omission report.');
    for (const name of files.keys()) if (name.startsWith(`${removed.id}/`)) files.delete(name);
    report.omitted.push({ id: removed.id, reason: 'byte-limit' });
  }
  const directory = await assetPath(root, 'reports/assets/ci-previews', 'reports/assets');
  await mkdir(resolve(root, 'reports/assets'), { recursive: true });
  const stage = await mkdtemp(resolve(root, 'reports/assets/.ci-previews-'));
  try {
    files.set('index.html', index);
    files.set('report.json', outputReport);
    for (const [name, bytes] of files) {
      const destination = resolve(stage, name);
      await mkdir(resolve(destination, '..'), { recursive: true });
      await writeFile(destination, bytes);
    }
    await rm(directory, { recursive: true, force: true });
    await rename(stage, directory);
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
  if (options.summaryPath) {
    const rows = report.previews
      .map(
        (entry) =>
          `| ${entry.id} | \`${entry.fingerprint.slice(0, 12)}\` | ${entry.source.width}×${entry.source.height} / ${entry.source.bytes} B | ${entry.output.width}×${entry.output.height} / ${entry.output.bytes} B | ${entry.output.rgba8Estimate} B | ${entry.warnings.length} |`,
      )
      .join('\n');
    await appendFile(
      options.summaryPath,
      `\n### Asset candidate previews\n\nTechnical evidence only; no art approval or activation. Native context: \`${report.toolchain.platform}\`, \`${report.toolchain.runtime}\`, Sharp \`${report.toolchain.sharp}\`, libvips \`${report.toolchain.vips}\`.\n\n| ID | Fingerprint | Source | Output | Decoded RGBA8 | Warnings |\n|---|---|---|---|---|---|\n${rows}\n\nArtifact: ${report.artifactBytes} bytes; ${report.previews.length} previews. ${report.omitted.length ? `Omitted: ${report.omitted.map((entry) => `${entry.id} (${entry.reason})`).join(', ')}.` : 'No omissions.'}\n`,
    );
  }
  return report;
}
