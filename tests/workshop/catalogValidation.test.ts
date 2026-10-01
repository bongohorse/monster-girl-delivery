import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { validateCatalogFiles } from '../../scripts/workshop/CatalogFiles';
import { catalog } from '../../workshop/src/catalog';
import { safeRepositoryPath, validateCatalog } from '../../workshop/src/catalogValidation';

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});
async function historyFixture() {
  const root = await mkdtemp(join(tmpdir(), 'mgd-workshop-catalog-'));
  roots.push(root);
  const git = (...args: string[]) =>
    execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  git('init', '-q');
  await writeFile(join(root, 'history.md'), 'Historical source');
  git('add', 'history.md');
  git(
    '-c',
    'user.name=Workshop Test',
    '-c',
    'user.email=workshop@example.invalid',
    'commit',
    '-qm',
    'source',
  );
  const revision = git('rev-parse', 'HEAD');
  git('rm', '-q', 'history.md');
  git(
    '-c',
    'user.name=Workshop Test',
    '-c',
    'user.email=workshop@example.invalid',
    'commit',
    '-qm',
    'remove source',
  );
  const data = {
    ...catalog,
    codeReviewRevision: git('rev-parse', 'HEAD'),
    elements: [],
    assets: [],
    artifacts: [],
    ideas: [],
    references: [
      {
        ...catalog.references[0],
        elementIds: [],
        assetIds: [],
        sources: [{ id: 'historical', path: 'history.md', revision, kind: 'doc' }],
      },
    ],
  };
  return { root, data };
}

describe('authored Workshop catalog boundary', () => {
  it('accepts the real catalog structure and a historical source removed from its checkout', async () => {
    expect(validateCatalog(catalog)).toEqual([]);
    const { root, data } = await historyFixture();
    expect(validateCatalog(data)).toEqual([]);
    expect(validateCatalogFiles(root, data)).toEqual([]);
    data.references[0].sources[0].revision = data.codeReviewRevision;
    expect(validateCatalogFiles(root, data).join('\n')).toContain('history.md');
  });
  it('rejects duplicate IDs and dangling relationships', () => {
    const data = structuredClone(catalog);
    data.elements[1].id = data.elements[0].id;
    data.elements[0].relatedElementIds.push('missing-element');
    const errors = validateCatalog(data).join('\n');
    expect(errors).toContain('Doppelte ID');
    expect(errors).toContain('missing-element');
  });
  it('rejects malformed structures, unknown schema and invalid states before following relationships', () => {
    expect(validateCatalog(null)).not.toEqual([]);
    expect(validateCatalog({ ...catalog, schemaVersion: 2 })).not.toEqual([]);
    expect(validateCatalog({ ...catalog, elements: null })).not.toEqual([]);
    const data = structuredClone(catalog);
    data.assets[0].usage.state = 'selected';
    expect(validateCatalog(data).join('\n')).toContain('usage.state');
  });
  it('rejects broken fact sources, unowned assets and cyclic derivations', () => {
    const data = structuredClone(catalog);
    data.elements[0].detailSections[0].facts[0].sourceIds.push('missing-source');
    data.assets[0].elementIds = [];
    data.artifacts[0].derivedFromArtifactId = data.artifacts[0].id;
    const errors = validateCatalog(data).join('\n');
    expect(errors).toContain('missing-source');
    expect(errors).toContain('nicht gegenseitig');
    expect(errors).toContain('Zyklische Ableitung');
  });
  it('rejects unsafe repository paths and missing files at the cited revision', async () => {
    for (const path of [
      '../secret',
      '/etc/passwd',
      'a\\b',
      'a//b',
      'a/./b',
      'https://example.org/a',
    ])
      expect(safeRepositoryPath(path)).toBe(false);
    const { root, data } = await historyFixture();
    data.references[0].sources[0].path = 'docs/nonexistent-reference.md';
    expect(validateCatalogFiles(root, data).join('\n')).toContain('docs/nonexistent-reference.md');
    data.references[0].sources[0].path = '../outside';
    expect(validateCatalog(data).join('\n')).toContain('Repository-Pfad');
  });
});

it('rejects an idea ID colliding with an element or another idea before index construction', () => {
  const data = structuredClone(catalog);
  data.ideas.push({ ...data.ideas[0], prototypeId: null, id: 'parcel' });
  expect(validateCatalog(data).join('\n')).toContain('Doppelte ID');
  data.ideas[1] = { ...data.ideas[0], prototypeId: null };
  expect(validateCatalog(data).join('\n')).toContain('Doppelte ID');
});
