import { spawnSync } from 'node:child_process';
import type { Catalog } from '../../workshop/src/catalog.ts';

/** Historical paths are checked at their recorded commit, including files since removed. */
export function validateCatalogFiles(root: string, data: Catalog): string[] {
  const sources = [
    ...data.elements.flatMap((e) => e.sources),
    ...data.references.flatMap((r) => r.sources),
    ...data.assets.flatMap((a) => [...a.usage.evidence, ...a.history]),
    ...data.artifacts.flatMap((a) => [
      ...(a.recipe ? [a.recipe] : []),
      ...(a.sourcePath && a.revision ? [{ path: a.sourcePath, revision: a.revision }] : []),
    ]),
  ];
  const commits = [
    data.codeReviewRevision,
    ...(data.deployedGameRevision ? [data.deployedGameRevision] : []),
    ...data.elements.map((e) => e.documentation.revision),
    ...data.assets.map((a) => a.usage.revision),
  ];
  const targets = [...new Set([...commits, ...sources.map((s) => `${s.revision}:${s.path}`)])];
  // One Git process keeps this inexpensive even during the concurrent full test suite.
  const result = spawnSync('git', ['cat-file', '--batch-check=%(objecttype)'], {
    cwd: root,
    encoding: 'utf8',
    input: `${targets.join('\n')}\n`,
  });
  if (result.status !== 0)
    return [`Git-Quellenprüfung fehlgeschlagen: ${result.error?.message ?? result.stderr.trim()}`];
  const types = result.stdout.trimEnd().split('\n');
  return targets
    .filter((target, i) => types[i] !== (target.includes(':') ? 'blob' : 'commit'))
    .map((target) => `Fehlende Repository-Quelle: ${target}`);
}
export async function assertCatalogFiles(root: string, data: Catalog): Promise<void> {
  const errors = validateCatalogFiles(root, data);
  if (errors.length) throw new Error(errors.join('\n'));
}
