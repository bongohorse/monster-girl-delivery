import { PACING_INTENSITIES, type PacingIntensity } from '../pacing/PacingSystem';

export type EncounterBehaviorTag = 'static-barrier';

export const ENCOUNTER_BEHAVIOR_TAGS: ReadonlyArray<EncounterBehaviorTag> = Object.freeze([
  'static-barrier',
]);

export interface EncounterDifficultyTierRange {
  readonly maximumTierIndex: number | null;
  readonly minimumTierIndex: number;
}

/**
 * Policy-facing pattern metadata only. Geometry, fairness, behavior state, and presentation remain
 * owned by their existing systems. Cost values use PROTOTYPE whole units from zero through ten.
 */
export interface EncounterProfile {
  readonly behaviorTags: ReadonlyArray<EncounterBehaviorTag>;
  readonly difficultyTierRange: Readonly<EncounterDifficultyTierRange>;
  readonly pacingIntensities: ReadonlyArray<PacingIntensity>;
  readonly pressureCost: number;
  readonly readabilityCost: number;
  readonly varietyFamilyId: string;
}

export const MAX_PROTOTYPE_ENCOUNTER_COST = 10;

const assertNonEmptyStableId = (id: string, name: string): void => {
  if (id.length === 0 || id !== id.trim()) {
    throw new TypeError(`${name} must be non-empty and have no surrounding whitespace.`);
  }
};

const assertValidTierIndex = (tierIndex: number, name: string): void => {
  if (!Number.isSafeInteger(tierIndex) || tierIndex < 0) {
    throw new RangeError(`${name} must be a non-negative safe integer.`);
  }
};

const assertValidPrototypeCost = (cost: number, name: string): void => {
  if (!Number.isSafeInteger(cost) || cost < 0 || cost > MAX_PROTOTYPE_ENCOUNTER_COST) {
    throw new RangeError(
      `${name} must be a safe integer from zero through ${MAX_PROTOTYPE_ENCOUNTER_COST}.`,
    );
  }
};

const assertUniqueValues = (values: ReadonlyArray<string>, name: string): void => {
  if (new Set(values).size !== values.length) {
    throw new TypeError(`${name} must not contain duplicates.`);
  }
};

/** Validates and deeply snapshots deterministic, Phaser-independent encounter policy metadata. */
export const createEncounterProfile = (
  definition: Readonly<EncounterProfile>,
): Readonly<EncounterProfile> => {
  assertNonEmptyStableId(definition.varietyFamilyId, 'Encounter varietyFamilyId');
  assertValidTierIndex(
    definition.difficultyTierRange.minimumTierIndex,
    'Encounter minimumTierIndex',
  );

  const maximumTierIndex = definition.difficultyTierRange.maximumTierIndex;
  if (maximumTierIndex !== null) {
    assertValidTierIndex(maximumTierIndex, 'Encounter maximumTierIndex');
    if (maximumTierIndex < definition.difficultyTierRange.minimumTierIndex) {
      throw new RangeError('Encounter maximumTierIndex must not be below minimumTierIndex.');
    }
  }

  if (definition.pacingIntensities.length === 0) {
    throw new RangeError('Encounter pacingIntensities must contain at least one intensity.');
  }
  assertUniqueValues(definition.pacingIntensities, 'Encounter pacingIntensities');
  for (const intensity of definition.pacingIntensities) {
    if (!PACING_INTENSITIES.includes(intensity)) {
      throw new TypeError(`Unsupported encounter pacing intensity: ${intensity}`);
    }
  }

  if (definition.behaviorTags.length === 0) {
    throw new RangeError('Encounter behaviorTags must contain at least one tag.');
  }
  assertUniqueValues(definition.behaviorTags, 'Encounter behaviorTags');
  for (const tag of definition.behaviorTags) {
    if (!ENCOUNTER_BEHAVIOR_TAGS.includes(tag)) {
      throw new TypeError(`Unsupported encounter behavior tag: ${tag}`);
    }
  }

  assertValidPrototypeCost(definition.pressureCost, 'Encounter pressureCost');
  assertValidPrototypeCost(definition.readabilityCost, 'Encounter readabilityCost');

  return Object.freeze({
    behaviorTags: Object.freeze([...definition.behaviorTags]),
    difficultyTierRange: Object.freeze({ ...definition.difficultyTierRange }),
    pacingIntensities: Object.freeze([...definition.pacingIntensities]),
    pressureCost: definition.pressureCost,
    readabilityCost: definition.readabilityCost,
    varietyFamilyId: definition.varietyFamilyId,
  });
};
