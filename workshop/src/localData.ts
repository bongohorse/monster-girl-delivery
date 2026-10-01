import type { ArrowValues } from '../prototypes/delivery-arrow/controls-v0/model';
import type { Catalog, Source } from './catalog';
import { safeRepositoryPath } from './catalogValidation';
import {
  type ReviewDetails,
  validConfiguration,
  validReviewDetails,
} from './prototypeConfiguration';

export interface Draft {
  id: string;
  name: string;
  question: string;
  categoryId: string;
  tags: string[];
  origins: { elementId: string; revision: string; sources: Source[] }[];
  referenceIds: string[];
  desiredChange: string;
  preserve: string;
  date: string;
}
export interface LocalPreset {
  id: string;
  name: string;
  ideaId: string;
  versionId: string;
  variantId: string;
  values: ArrowValues;
  date: string;
}
export interface LocalNote {
  review?: ReviewDetails;
  id: string;
  ideaId: string;
  versionId: string | null;
  variantId: string | null;
  values: ArrowValues | null;
  text: string;
  date: string;
}
export type LocalConfiguration = Pick<LocalPreset, 'ideaId' | 'versionId' | 'variantId' | 'values'>;

export interface LocalData {
  schemaVersion: 1;
  kind: 'mgd-workshop-local';
  drafts: Draft[];
  presets: LocalPreset[];
  feedback: LocalNote[];
}
export type LocalResult = { ok: true; data: LocalData } | { ok: false; errors: string[] };
export const maxImportBytes = 512 * 1024;
export function emptyLocalData(): LocalData {
  return { schemaVersion: 1, kind: 'mgd-workshop-local', drafts: [], presets: [], feedback: [] };
}
export function createDraft(data: Catalog, elementIds: string[], id: string, date: string): Draft {
  const elements = elementIds.map((elementId) => {
    const element = data.elements.find((e) => e.id === elementId);
    if (!element) throw new Error(`Unbekanntes Ausgangselement: ${elementId}`);
    return element;
  });
  return {
    id,
    name: elements.length ? `Idee zu ${elements.map((e) => e.name).join(', ')}` : 'Neue freie Idee',
    question: '',
    categoryId: elements[0]?.categoryId ?? data.categories[0].id,
    tags: [],
    origins: elements.map((e) => ({
      elementId: e.id,
      revision: e.documentation.revision,
      sources: structuredClone(e.sources),
    })),
    referenceIds: [],
    desiredChange: '',
    preserve: '',
    date,
  };
}
export function serializeLocalData(data: LocalData): string {
  return JSON.stringify(data, null, 2);
}

/** Strict external boundary; no partial import, clamping, executable fields or implicit migration. */
export function parseLocalData(json: string, data: Catalog): LocalResult {
  if (new TextEncoder().encode(json).length > maxImportBytes)
    return { ok: false, errors: ['JSON ist größer als 512 KiB.'] };
  let input: unknown;
  try {
    input = JSON.parse(json);
  } catch {
    return { ok: false, errors: ['Ungültiges JSON.'] };
  }
  const errors: string[] = [];
  const fail = (path: string, message: string) => {
    errors.push(`${path}: ${message}`);
  };
  const record = (
    value: unknown,
    path: string,
    keys: string[],
  ): Record<string, unknown> | undefined => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      fail(path, 'Objekt erwartet');
      return;
    }
    const object = value as Record<string, unknown>;
    for (const key of Object.keys(object))
      if (!keys.includes(key)) fail(path, `Unbekanntes Feld ${key}`);
    return object;
  };
  const text = (value: unknown, path: string, max = 4000) => {
    if (typeof value !== 'string' || value.length > max)
      fail(path, `Text mit höchstens ${max} Zeichen erwartet`);
  };
  const list = (value: unknown, path: string, max = 100): unknown[] => {
    if (!Array.isArray(value) || value.length > max) {
      fail(path, `Liste mit höchstens ${max} Einträgen erwartet`);
      return [];
    }
    return value;
  };
  const strings = (value: unknown, path: string, known?: string[]) => {
    const items = list(value, path, 30);
    for (const item of items) {
      text(item, path, 100);
      if (known && (typeof item !== 'string' || !known.includes(item)))
        fail(path, `Unbekanntes Ziel ${String(item)}`);
    }
    if (new Set(items).size !== items.length) fail(path, 'Doppelte Einträge');
  };
  const revision = (value: unknown, path: string) => {
    if (typeof value !== 'string' || !/^[a-f0-9]{40}$/.test(value))
      fail(path, 'Voller Git-SHA erwartet');
  };
  const ids = new Set<string>();
  const identity = (r: Record<string, unknown>, path: string) => {
    if (typeof r.id !== 'string' || r.id.length > 100 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(r.id))
      fail(path, 'Stabile ID erwartet');
    else {
      if (
        ids.has(r.id) ||
        [
          ...data.categories,
          ...data.elements,
          ...data.ideas,
          ...data.assets,
          ...data.artifacts,
          ...data.references,
          ...data.versions,
          ...data.reviews,
        ].some((e) => e.id === r.id)
      )
        fail(path, `Doppelte oder reservierte ID ${r.id}`);
      ids.add(r.id);
    }
    if (
      typeof r.date !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(r.date) ||
      !Number.isFinite(Date.parse(r.date))
    )
      fail(path, 'ISO-Datum erwartet');
  };
  const configuration = (r: Record<string, unknown>, path: string) => {
    if (!validConfiguration(r))
      fail(
        path,
        'Unbekannte oder nicht passende Idee/Controls-Version/Variante oder ungültige Reglerwerte/Grenzen/Schritte',
      );
  };
  const root = record(input, 'Import', ['schemaVersion', 'kind', 'drafts', 'presets', 'feedback']);
  if (!root) return { ok: false, errors };
  if (root.schemaVersion !== 1 || root.kind !== 'mgd-workshop-local')
    fail(
      'Import',
      'Nicht unterstütztes Workshop-Format; erwartet schemaVersion 1 und mgd-workshop-local',
    );
  const drafts = list(root.drafts, 'drafts');
  drafts.forEach((value, i) => {
    const path = `drafts[${i}]`;
    const r = record(value, path, [
      'id',
      'name',
      'question',
      'categoryId',
      'tags',
      'origins',
      'referenceIds',
      'desiredChange',
      'preserve',
      'date',
    ]);
    if (!r) return;
    identity(r, path);
    text(r.name, `${path}.name`, 160);
    for (const field of ['question', 'desiredChange', 'preserve'])
      text(r[field], `${path}.${field}`);
    if (!data.categories.some((c) => c.id === r.categoryId)) fail(path, 'Unbekannte Kategorie');
    strings(r.tags, `${path}.tags`);
    strings(
      r.referenceIds,
      `${path}.referenceIds`,
      data.references.map((ref) => ref.id),
    );
    const originIds = new Set<unknown>();
    list(r.origins, `${path}.origins`, 30).forEach((origin, j) => {
      const op = `${path}.origins[${j}]`;
      const o = record(origin, op, ['elementId', 'revision', 'sources']);
      if (!o) return;
      if (!data.elements.some((e) => e.id === o.elementId)) fail(op, 'Unbekanntes Ausgangselement');
      if (originIds.has(o.elementId)) fail(op, 'Doppeltes Ausgangselement');
      originIds.add(o.elementId);
      revision(o.revision, op);
      list(o.sources, `${op}.sources`, 30).forEach((source, k) => {
        const sp = `${op}.sources[${k}]`;
        const s = record(source, sp, ['id', 'path', 'revision', 'kind', 'symbol']);
        if (!s) return;
        text(s.id, sp, 100);
        text(s.kind, sp, 100);
        revision(s.revision, sp);
        if (typeof s.path !== 'string' || s.path.length > 300 || !safeRepositoryPath(s.path))
          fail(sp, 'Unsicherer Repository-Pfad');
        if (s.symbol !== undefined) text(s.symbol, sp, 300);
      });
    });
  });
  list(root.presets, 'presets', 200).forEach((value, i) => {
    const path = `presets[${i}]`;
    const r = record(value, path, [
      'id',
      'name',
      'ideaId',
      'versionId',
      'variantId',
      'values',
      'date',
    ]);
    if (!r) return;
    identity(r, path);
    text(r.name, `${path}.name`, 100);
    if (typeof r.name === 'string' && !r.name.trim()) fail(path, 'Presetname fehlt');
    configuration(r, path);
  });
  const knownIdeas: unknown[] = [
    ...data.ideas.map((idea) => idea.id),
    ...drafts.flatMap((draft) =>
      draft && typeof draft === 'object' && 'id' in draft ? [draft.id] : [],
    ),
  ];
  list(root.feedback, 'feedback', 200).forEach((value, i) => {
    const path = `feedback[${i}]`;
    const r = record(value, path, [
      'id',
      'ideaId',
      'versionId',
      'variantId',
      'values',
      'text',
      'date',
      'review',
    ]);
    if (!r) return;
    identity(r, path);
    text(r.text, `${path}.text`);
    if (r.review !== undefined && !validReviewDetails(r.review))
      fail(path, 'Ungültiges Review oder fehlende Entscheidungsquelle');
    if (r.review !== undefined && r.versionId === null)
      fail(path, 'Review benötigt konkrete Version und Konfiguration');
    if (!knownIdeas.includes(r.ideaId)) fail(path, 'Unbekannte Idee');
    if (r.versionId === null && r.variantId === null && r.values === null) return;
    configuration(r, path);
  });
  return errors.length ? { ok: false, errors } : { ok: true, data: input as LocalData };
}
