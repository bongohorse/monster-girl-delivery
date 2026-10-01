import {
  controlPreview,
  validArrowValues,
} from '../prototypes/delivery-arrow/controls-v0/model.ts';
import {
  isVariant as isV1,
  pilotV1,
  validPilotValues as validV1,
} from '../prototypes/delivery-arrow/v1/model.ts';
import {
  isVariant as isV2,
  pilotV2,
  validPilotValues as validV2,
} from '../prototypes/delivery-arrow/v2/model.ts';

export function validConfiguration(record: Record<string, unknown>): boolean {
  if (record.ideaId !== pilotV1.ideaId) return false;
  if (record.versionId === controlPreview.versionId)
    return record.variantId === controlPreview.variantId && validArrowValues(record.values);
  if (record.versionId === pilotV1.versionId)
    return isV1(record.variantId) && validV1(record.values);
  if (record.versionId === pilotV2.versionId)
    return isV2(record.variantId) && validV2(record.values);
  return false;
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
