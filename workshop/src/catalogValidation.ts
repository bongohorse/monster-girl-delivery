import { controlPreview } from '../prototypes/delivery-arrow/controls-v0/model.ts';
import { pilotV1 } from '../prototypes/delivery-arrow/v1/model.ts';
import type { Catalog } from './catalog.ts';

const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const revisionPattern = /^[a-f0-9]{40}$/;
const hashPattern = /^[a-f0-9]{64}$/;

export function safeRepositoryPath(path: string): boolean {
  return (
    path.length > 0 &&
    !path.startsWith('/') &&
    !path.includes('\\') &&
    ![...path].some((character) => character.charCodeAt(0) < 32) &&
    !path
      .split('/')
      .some((part) => part === '.' || part === '..' || part === '' || part.includes(':'))
  );
}

/** A small validator for the authored v1 records actually consumed by the Workshop. */
export function validateCatalog(input: unknown): string[] {
  const errors: string[] = [];
  const fail = (path: string, message: string) => {
    errors.push(`${path}: ${message}`);
  };
  const object = (value: unknown, path: string): Record<string, unknown> | undefined => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      fail(path, 'Objekt erwartet');
      return;
    }
    return value as Record<string, unknown>;
  };
  const text = (value: unknown, path: string, nullable = false) => {
    if (nullable && value === null) return;
    if (typeof value !== 'string') fail(path, 'Text erwartet');
  };
  const list = (value: unknown, path: string): unknown[] => {
    if (!Array.isArray(value)) {
      fail(path, 'Liste erwartet');
      return [];
    }
    return value;
  };
  const strings = (value: unknown, path: string) =>
    list(value, path).forEach((item, i) => {
      text(item, `${path}[${i}]`);
    });
  const fields = (value: Record<string, unknown>, names: string[], path: string) =>
    names.forEach((name) => {
      text(value[name], `${path}.${name}`);
    });
  const bool = (value: unknown, path: string) => {
    if (typeof value !== 'boolean') fail(path, 'Boolean erwartet');
  };
  const revision = (value: unknown, path: string, nullable = false) => {
    if (
      !(nullable && value === null) &&
      (typeof value !== 'string' || !revisionPattern.test(value))
    )
      fail(path, 'Voller Git-SHA erwartet');
  };
  const repoPath = (value: unknown, path: string, nullable = false) => {
    if (!(nullable && value === null) && (typeof value !== 'string' || !safeRepositoryPath(value)))
      fail(path, 'Sicherer relativer Repository-Pfad erwartet');
  };
  const choice = (value: unknown, values: string[], path: string) => {
    if (typeof value !== 'string' || !values.includes(value))
      fail(path, `Unbekannter Zustand: ${String(value)}`);
  };
  const url = (value: unknown, path: string) => {
    try {
      if (typeof value !== 'string' || new URL(value).protocol !== 'https:')
        fail(path, 'HTTPS-Link erwartet');
    } catch {
      fail(path, 'Ungültiger HTTPS-Link');
    }
  };
  const source = (value: unknown, path: string) => {
    const s = object(value, path);
    if (!s) return;
    fields(s, ['id', 'kind'], path);
    repoPath(s.path, `${path}.path`);
    revision(s.revision, `${path}.revision`);
    if (s.symbol !== undefined) text(s.symbol, `${path}.symbol`);
  };
  const sources = (value: unknown, path: string) =>
    list(value, path).forEach((s, i) => {
      source(s, `${path}[${i}]`);
    });
  const root = object(input, 'Katalog');
  if (!root) return errors;
  if (root.schemaVersion !== 1) fail('schemaVersion', 'Nicht unterstützte Version; erwartet 1');
  revision(root.codeReviewRevision, 'codeReviewRevision');
  revision(root.deployedGameRevision, 'deployedGameRevision', true);
  const records = (key: string, check: (r: Record<string, unknown>, p: string) => void) => {
    list(root[key], key).forEach((value, i) => {
      const path = `${key}[${i}]`;
      const r = object(value, path);
      if (!r) return;
      if (typeof r.id !== 'string' || !idPattern.test(r.id))
        fail(`${path}.id`, 'Stabile Slug-ID erwartet');
      check(r, path);
    });
  };
  records('categories', (r, p) => fields(r, ['name'], p));
  records('elements', (r, p) => {
    fields(r, ['name', 'type', 'categoryId', 'description'], p);
    strings(r.tags, `${p}.tags`);
    bool(r.archived, `${p}.archived`);
    choice(r.implementation, ['planned', 'partial', 'implemented'], `${p}.implementation`);
    text(r.previewArtifactId, `${p}.previewArtifactId`, true);
    for (const key of ['assetIds', 'relatedElementIds', 'openQuestions', 'sourceConflicts'])
      strings(r[key], `${p}.${key}`);
    sources(r.sources, `${p}.sources`);
    const doc = object(r.documentation, `${p}.documentation`);
    if (doc) {
      fields(doc, ['date', 'notes', 'coverage'], `${p}.documentation`);
      revision(doc.revision, `${p}.documentation.revision`);
      choice(doc.state, ['checked', 'unchecked', 'source-conflict'], `${p}.documentation.state`);
    }
    list(r.detailSections, `${p}.detailSections`).forEach((section, i) => {
      const sp = `${p}.detailSections[${i}]`;
      const s = object(section, sp);
      if (!s) return;
      fields(s, ['title'], sp);
      list(s.facts, `${sp}.facts`).forEach((value, j) => {
        const fp = `${sp}.facts[${j}]`;
        const f = object(value, fp);
        if (!f) return;
        fields(f, ['label'], fp);
        strings(f.sourceIds, `${fp}.sourceIds`);
        choice(f.certainty, ['confirmed', 'proposal', 'unknown'], `${fp}.certainty`);
        if (f.unit !== undefined) text(f.unit, `${fp}.unit`);
        if (f.maturity !== undefined) choice(f.maturity, ['prototype'], `${fp}.maturity`);
        if (
          f.value !== null &&
          typeof f.value !== 'string' &&
          typeof f.value !== 'boolean' &&
          !(typeof f.value === 'number' && Number.isFinite(f.value))
        )
          fail(`${fp}.value`, 'Endlicher Faktwert erwartet');
      });
    });
  });
  records('assets', (r, p) => {
    fields(r, ['name', 'description', 'variant'], p);
    bool(r.archived, `${p}.archived`);
    for (const key of ['elementIds', 'artifactIds', 'openQuestions'])
      strings(r[key], `${p}.${key}`);
    const review = object(r.review, `${p}.review`);
    if (review) {
      fields(review, ['date', 'reason'], `${p}.review`);
      choice(review.state, ['open', 'selected', 'rejected'], `${p}.review.state`);
      url(review.sourceUrl, `${p}.review.sourceUrl`);
    }
    const usage = object(r.usage, `${p}.usage`);
    if (usage) {
      fields(usage, ['reason'], `${p}.usage`);
      revision(usage.revision, `${p}.usage.revision`);
      sources(usage.evidence, `${p}.usage.evidence`);
      choice(
        usage.state,
        [
          'present',
          'loadable',
          'default-game',
          'conditional',
          'debug-workshop',
          'disabled',
          'unchecked',
        ],
        `${p}.usage.state`,
      );
    }
    list(r.history, `${p}.history`).forEach((h, i) => {
      const hp = `${p}.history[${i}]`;
      const history = object(h, hp);
      if (!history) return;
      fields(history, ['id', 'date', 'note'], hp);
      repoPath(history.path, `${hp}.path`);
      revision(history.revision, `${hp}.revision`);
    });
  });
  records('artifacts', (r, p) => {
    fields(r, ['assetId'], p);
    repoPath(r.sourcePath, `${p}.sourcePath`, true);
    revision(r.revision, `${p}.revision`, true);
    if (r.sha256 !== null && (typeof r.sha256 !== 'string' || !hashPattern.test(r.sha256)))
      fail(`${p}.sha256`, 'SHA-256 erwartet');
    choice(r.role, ['original', 'runtime', 'preview'], `${p}.role`);
    text(r.runtimeAssetId, `${p}.runtimeAssetId`, true);
    text(r.derivedFromArtifactId, `${p}.derivedFromArtifactId`, true);
    if (r.recipe !== null) source(r.recipe, `${p}.recipe`);
    if (r.runtimeAssetId === null && (!r.sourcePath || !r.revision || !r.sha256))
      fail(p, 'Quelldatei braucht Pfad, Revision und Hash');
    if (r.runtimeAssetId !== null && !r.recipe) fail(p, 'Runtime-Artefakt braucht Rezept');
    const metadata = object(r.metadata, `${p}.metadata`);
    if (metadata) {
      choice(metadata.format, ['png', 'jpg', 'webp'], `${p}.metadata.format`);
      bool(metadata.hasAlpha, `${p}.metadata.hasAlpha`);
      for (const k of ['width', 'height'])
        if (!Number.isInteger(metadata[k]) || Number(metadata[k]) <= 0)
          fail(`${p}.metadata.${k}`, 'Positive Pixelgröße erwartet');
      if (
        metadata.durationSeconds !== null &&
        !(
          typeof metadata.durationSeconds === 'number' &&
          Number.isFinite(metadata.durationSeconds) &&
          metadata.durationSeconds >= 0
        )
      )
        fail(`${p}.metadata.durationSeconds`, 'Gültige Dauer erwartet');
    }
    const provenance = object(r.provenance, `${p}.provenance`);
    if (provenance) {
      fields(provenance, ['text'], `${p}.provenance`);
      text(provenance.prompt, `${p}.provenance.prompt`, true);
      list(provenance.referenceUrls, `${p}.provenance.referenceUrls`).forEach((u, i) => {
        url(u, `${p}.provenance.referenceUrls[${i}]`);
      });
    }
  });
  records('references', (r, p) => {
    fields(r, ['name', 'purpose', 'categoryId'], p);
    for (const key of ['tags', 'elementIds', 'assetIds']) strings(r[key], `${p}.${key}`);
    sources(r.sources, `${p}.sources`);
  });
  records('ideas', (r, p) => {
    fields(r, ['name', 'question', 'categoryId'], p);
    for (const key of ['tags', 'elementIds', 'referenceIds']) strings(r[key], `${p}.${key}`);
    choice(r.reviewState, ['draft', 'in-review', 'selected', 'rejected'], `${p}.reviewState`);
    bool(r.archived, `${p}.archived`);
    if (r.prototypeId !== null && r.prototypeId !== controlPreview.versionId)
      fail(p, 'Unbekannter Controls-Vorläufer');
    if (r.prototypeId === controlPreview.versionId && r.id !== controlPreview.ideaId)
      fail(p, 'Controls-Vorläufer gehört zu anderer Idee');
  });
  records('versions', (r, p) => {
    fields(r, ['ideaId', 'name', 'date', 'changeNote'], p);
    if (r.id !== pilotV1.versionId || r.ideaId !== pilotV1.ideaId)
      fail(p, 'Nicht unterstützte Pilotversion');
    repoPath(r.entry, `${p}.entry`);
    revision(r.sourceRevision, `${p}.sourceRevision`, true);
    if (r.entry !== 'prototypes/delivery-arrow/v1/index.html')
      fail(p, 'Unbekannter Versions-Einstieg');
    for (const key of ['sourcePaths', 'capabilities', 'limitations'])
      strings(r[key], `${p}.${key}`);
    for (const path of list(r.sourcePaths, `${p}.sourcePaths`))
      if (
        typeof path !== 'string' ||
        !safeRepositoryPath(path) ||
        !path.startsWith('workshop/prototypes/delivery-arrow/v1/')
      )
        fail(p, 'Unsicherer Versionsquellpfad');
  });
  // Relationship checks only follow structurally valid records.
  if (errors.length) return errors;
  const data = input as Catalog;
  const ids = new Set<string>();
  for (const records of [
    data.categories,
    data.elements,
    data.assets,
    data.artifacts,
    data.references,
    data.ideas,
    data.versions,
  ])
    for (const record of records) {
      if (ids.has(record.id)) fail(record.id, 'Doppelte ID');
      ids.add(record.id);
    }
  const exists = (id: string, records: { id: string }[], path: string) => {
    if (!records.some((r) => r.id === id)) fail(path, `Fehlendes Ziel ${id}`);
  };
  for (const e of data.elements) {
    exists(e.categoryId, data.categories, e.id);
    for (const id of e.relatedElementIds) exists(id, data.elements, `${e.id}.relatedElementIds`);
    for (const id of e.assetIds) {
      exists(id, data.assets, e.id);
      if (!data.assets.find((a) => a.id === id)?.elementIds.includes(e.id))
        fail(e.id, `Asset-Zuordnung nicht gegenseitig: ${id}`);
    }
    if (e.previewArtifactId) {
      exists(e.previewArtifactId, data.artifacts, e.id);
      const artifact = data.artifacts.find((a) => a.id === e.previewArtifactId);
      if (artifact && !e.assetIds.includes(artifact.assetId))
        fail(e.id, 'Vorschau gehört nicht zu einem zugeordneten Asset');
    }
    const sourceIds = new Set<string>();
    for (const s of e.sources) {
      if (sourceIds.has(s.id)) fail(e.id, `Doppelte Quellen-ID ${s.id}`);
      sourceIds.add(s.id);
    }
    for (const section of e.detailSections)
      for (const fact of section.facts)
        for (const id of fact.sourceIds)
          if (!sourceIds.has(id)) fail(e.id, `Fakt ${fact.label}: fehlende Quelle ${id}`);
  }
  for (const a of data.assets) {
    for (const id of a.elementIds) {
      exists(id, data.elements, a.id);
      if (!data.elements.find((e) => e.id === id)?.assetIds.includes(a.id))
        fail(a.id, `Element-Zuordnung nicht gegenseitig: ${id}`);
    }
    for (const id of a.artifactIds) {
      exists(id, data.artifacts, a.id);
      if (data.artifacts.find((r) => r.id === id)?.assetId !== a.id)
        fail(a.id, `Artefakt-Zuordnung falsch: ${id}`);
    }
  }
  for (const a of data.artifacts) {
    exists(a.assetId, data.assets, a.id);
    if (!data.assets.find((asset) => asset.id === a.assetId)?.artifactIds.includes(a.id))
      fail(a.id, 'Artefakt fehlt beim Asset');
    if (a.derivedFromArtifactId) exists(a.derivedFromArtifactId, data.artifacts, a.id);
    const visited = new Set<string>([a.id]);
    let next = a.derivedFromArtifactId;
    while (next) {
      if (visited.has(next)) {
        fail(a.id, 'Zyklische Ableitung');
        break;
      }
      visited.add(next);
      next = data.artifacts.find((item) => item.id === next)?.derivedFromArtifactId ?? null;
    }
  }
  for (const r of data.references) {
    exists(r.categoryId, data.categories, r.id);
    for (const id of r.elementIds) exists(id, data.elements, r.id);
    for (const id of r.assetIds) exists(id, data.assets, r.id);
  }
  for (const idea of data.ideas) {
    exists(idea.categoryId, data.categories, idea.id);
    for (const id of idea.elementIds) exists(id, data.elements, idea.id);
    for (const id of idea.referenceIds) exists(id, data.references, idea.id);
  }
  for (const version of data.versions) exists(version.ideaId, data.ideas, version.id);
  return errors;
}

export function assertCatalog(input: unknown): asserts input is Catalog {
  const errors = validateCatalog(input);
  if (errors.length) throw new Error(`Workshop-Katalog ungültig:\n${errors.join('\n')}`);
}
