import type { ArrowValues } from '../prototypes/delivery-arrow/controls-v0/model';
import { controlPreview, validArrowValues } from '../prototypes/delivery-arrow/controls-v0/model';
import {
  isVariant as isV1,
  pilotV1,
  validPilotValues as validV1,
} from '../prototypes/delivery-arrow/v1/model';
import {
  isVariant as isV2,
  pilotV2,
  validPilotValues as validV2,
} from '../prototypes/delivery-arrow/v2/model';
import type { LocalData, LocalNote, LocalPreset } from './localData';
import { workshopDrafts } from './localSession';

type LegacyPreset = Omit<LocalPreset, 'values'> & { values: ArrowValues };
type LegacyNote = Omit<LocalNote, 'values'> & { values: ArrowValues | null };
type LegacyData = Omit<LocalData, 'presets' | 'feedback'> & {
  presets: LegacyPreset[];
  feedback: LegacyNote[];
};
function legacy(p: {
  versionId: string | null;
  variantId: string | null;
  values: unknown;
}): boolean {
  if (p.versionId === controlPreview.versionId)
    return p.variantId === controlPreview.variantId && validArrowValues(p.values);
  if (p.versionId === pilotV1.versionId) return isV1(p.variantId) && validV1(p.values);
  if (p.versionId === pilotV2.versionId) return isV2(p.variantId) && validV2(p.values);
  return false;
}
/** Frozen-view compatibility boundary; one live store, immutable validation and order. */
export const legacyStore = {
  get message() {
    return workshopDrafts.message;
  },
  snapshot(): LegacyData {
    const data = workshopDrafts.snapshot();
    return {
      ...data,
      presets: data.presets.filter((p): p is LocalPreset & { values: ArrowValues } => legacy(p)),
      feedback: data.feedback.filter(
        (n): n is LocalNote & { values: ArrowValues | null } => n.values === null || legacy(n),
      ),
    };
  },
  update(data: LegacyData) {
    const current = workshopDrafts.snapshot();
    return workshopDrafts.update({
      ...data,
      presets: [
        ...current.presets.filter((p) => !legacy(p)),
        ...data.presets.map((p) => ({ ...p, values: { ...p.values } })),
      ],
      feedback: [
        ...current.feedback.filter((n) => n.values !== null && !legacy(n)),
        ...data.feedback.map((n) => ({ ...n, values: n.values ? { ...n.values } : null })),
      ],
    });
  },
};
