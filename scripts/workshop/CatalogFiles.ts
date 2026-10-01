import { spawnSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import type { Catalog } from '../../workshop/src/catalog.ts';

/** Historical paths are checked at their recorded commit, including files since removed. */
export function validateCatalogFiles(root: string, data: Catalog): string[] {
  const sources = [
    ...data.elements.flatMap((e) => e.sources),
    ...data.references.flatMap((r) => r.sources),
    ...data.assets.flatMap((a) => [...a.usage.evidence, ...a.history]),
    ...data.versions.flatMap((v) =>
      v.sourceRevision
        ? v.sourcePaths.map((path) => ({ path, revision: v.sourceRevision as string }))
        : [],
    ),
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
  const errors = targets
    .filter((target, i) => types[i] !== (target.includes(':') ? 'blob' : 'commit'))
    .map((target) => `Fehlende Repository-Quelle: ${target}`);
  const rootPath = realpathSync(root);
  for (const version of data.versions) {
    for (const path of new Set([`workshop/${version.entry}`, ...version.sourcePaths])) {
      try {
        const source = realpathSync(resolve(rootPath, path));
        if (!source.startsWith(`${rootPath}${sep}`)) {
          errors.push(`Versionsquelle außerhalb des Repository: ${path}`);
          continue;
        }
        const bytes = readFileSync(source);
        if (version.sourceRevision) {
          const recorded = spawnSync('git', ['show', `${version.sourceRevision}:${path}`], {
            cwd: rootPath,
            maxBuffer: 2 * 1024 * 1024,
          });
          if (recorded.status !== 0 || !bytes.equals(recorded.stdout))
            errors.push(
              `Versionsquelle verändert: ${path}; neue Version statt Änderung an ${version.id} anlegen.`,
            );
        }
      } catch {
        errors.push(`Fehlender Versions-Einstieg/Quellpfad: ${path}`);
      }
    }
  }
  return errors;
}
export async function assertCatalogFiles(root: string, data: Catalog): Promise<void> {
  const errors = validateCatalogFiles(root, data);
  if (errors.length) throw new Error(errors.join('\n'));
}
