import { describe, expect, it } from 'vitest';
import { validateCatalogFiles } from '../../scripts/workshop/CatalogFiles';
import { catalog } from '../../workshop/src/catalog';
import { safeRepositoryPath, validateCatalog } from '../../workshop/src/catalogValidation';

describe('authored Workshop catalog boundary', () => {
  it('accepts the real catalog including a historical source removed from the current checkout', () => {
    expect(validateCatalog(catalog)).toEqual([]);
    expect(validateCatalogFiles(process.cwd(), catalog)).toEqual([]);
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
  it('rejects unsafe repository paths and missing files at the cited revision', () => {
    for (const path of [
      '../secret',
      '/etc/passwd',
      'a\\b',
      'a//b',
      'a/./b',
      'https://example.org/a',
    ])
      expect(safeRepositoryPath(path)).toBe(false);
    const data = structuredClone(catalog);
    data.references[0].sources[0].path = 'docs/nonexistent-reference.md';
    expect(validateCatalogFiles(process.cwd(), data).join('\n')).toContain(
      'docs/nonexistent-reference.md',
    );
    data.references[0].sources[0].path = '../outside';
    expect(validateCatalog(data).join('\n')).toContain('Repository-Pfad');
  });
});
