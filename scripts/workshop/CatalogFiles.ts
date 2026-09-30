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
  const errors: string[] = [];
  const commits = [
    data.codeReviewRevision,
    ...(data.deployedGameRevision ? [data.deployedGameRevision] : []),
    ...data.elements.map((e) => e.documentation.revision),
    ...data.assets.map((a) => a.usage.revision),
  ];
  for (const target of new Set([...commits, ...sources.map((s) => `${s.revision}:${s.path}`)])) {
    const result = spawnSync('git', ['cat-file', '-t', target], { cwd: root, encoding: 'utf8' });
    if (result.status !== 0 || result.stdout.trim() !== (target.includes(':') ? 'blob' : 'commit'))
      errors.push(`Fehlende Repository-Quelle: ${target}`);
  }
  return errors;
}
export async function assertCatalogFiles(root: string, data: Catalog): Promise<void> {
  const errors = validateCatalogFiles(root, data);
  if (errors.length) throw new Error(errors.join('\n'));
}
