import type { LocalData } from './localData.ts';
import { definitionFor } from './prototypes.ts';

/** Restore the imported preset's concept before remounting, while explicit links retain priority. */
export function importedVariantHash(data: LocalData, versionId: string, hash: string): string {
  const [route, query = ''] = hash.replace(/^#/, '').split('?');
  const params = new URLSearchParams(query);
  if (params.has('variant')) return hash;
  const preset = [...data.presets].reverse().find((p) => p.versionId === versionId);
  if (!preset || !validConfiguration({ ...preset })) return hash;
  params.set('variant', preset.variantId);
  return `#${route}?${params}`;
}

export function validConfiguration(record: Record<string, unknown>): boolean {
  const definition =
    typeof record.versionId === 'string' ? definitionFor(record.versionId) : undefined;
  return (
    !!definition &&
    record.ideaId === definition.ideaId &&
    definition.validateVariant(record.variantId) &&
    definition.validateValues(record.values)
  );
}
export interface ReviewDetails {
  likes: string;
  dislikes: string;
  desiredChange: string;
  decision: 'open' | 'selected' | 'rejected';
  decisionSource: string;
}
export function validReviewDetails(value: unknown): value is ReviewDetails {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const r = value as Record<string, unknown>;
  const keys = ['likes', 'dislikes', 'desiredChange', 'decision', 'decisionSource'];
  return (
    Object.keys(r).length === keys.length &&
    keys.every((k) => typeof r[k] === 'string' && (r[k] as string).length <= 4000) &&
    ['open', 'selected', 'rejected'].includes(r.decision as string) &&
    (r.decision === 'open' || !!(r.decisionSource as string).trim())
  );
}
