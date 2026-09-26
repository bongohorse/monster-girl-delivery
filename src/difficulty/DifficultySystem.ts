import {
  assertValidFlightTuningValues,
  type FlightTuningValues,
} from '../config/FlightTuningConfig';
import { assertValidBaseScrollSpeed, type RunMotionValues } from '../config/RunMotionConfig';
import type { HazardReactionTimeConstraint } from '../generation/HazardApproachTiming';
import type { HazardPattern } from '../generation/HazardPattern';
import {
  type PatternValidationConstraints,
  PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS,
} from '../generation/PatternValidator';

export interface DifficultyParameters {
  readonly maximumHazardsPer1000Distance: number;
  readonly maximumPatternEntries: number;
  readonly minimumReactionSpacing: number;
  readonly minimumReactionTimeSeconds: number;
  readonly minimumVerticalCorridor: number;
  readonly scrollSpeedMultiplier: number;
}

export interface DifficultyTierDefinition extends DifficultyParameters {
  readonly id: string;
  readonly startDistance: number;
}

export interface DifficultyConfig {
  readonly tiers: ReadonlyArray<Readonly<DifficultyTierDefinition>>;
}

export interface DifficultySnapshot extends DifficultyParameters {
  readonly capped: boolean;
  readonly nextTierStartDistance: number | null;
  readonly runDistance: number;
  readonly tierId: string;
  readonly tierIndex: number;
}

export type PatternDifficultyIneligibilityReason =
  | 'profile-difficulty-tier'
  | 'pattern-density-limit'
  | 'pattern-entry-limit';

export interface PatternDifficultyEligibility {
  readonly eligible: boolean;
  readonly hazardDensityPer1000Distance: number;
  readonly patternEntryCount: number;
  readonly reasons: ReadonlyArray<PatternDifficultyIneligibilityReason>;
}

const createTier = (definition: DifficultyTierDefinition): Readonly<DifficultyTierDefinition> =>
  Object.freeze({ ...definition });

/**
 * PROTOTYPE M5 feel-pass progression. Speed now carries more of the late-run intensity while
 * density, spacing and corridor pressure rise deliberately instead of all tightening at once.
 */
export const PROTOTYPE_DIFFICULTY_CONFIG: Readonly<DifficultyConfig> = Object.freeze({
  tiers: Object.freeze([
    createTier({
      id: 'tier-0',
      startDistance: 0,
      scrollSpeedMultiplier: 1,
      minimumReactionTimeSeconds: 2,
      minimumReactionSpacing: 96,
      minimumVerticalCorridor: 96,
      maximumPatternEntries: 3,
      maximumHazardsPer1000Distance: 5,
    }),
    createTier({
      id: 'tier-1',
      startDistance: 3_000,
      scrollSpeedMultiplier: 1.12,
      minimumReactionTimeSeconds: 1.95,
      minimumReactionSpacing: 96,
      minimumVerticalCorridor: 96,
      maximumPatternEntries: 3,
      maximumHazardsPer1000Distance: 5,
    }),
    createTier({
      id: 'tier-2',
      startDistance: 7_000,
      scrollSpeedMultiplier: 1.25,
      minimumReactionTimeSeconds: 1.9,
      minimumReactionSpacing: 94,
      minimumVerticalCorridor: 94,
      maximumPatternEntries: 3,
      maximumHazardsPer1000Distance: 5,
    }),
    createTier({
      id: 'tier-3',
      startDistance: 12_000,
      scrollSpeedMultiplier: 1.38,
      minimumReactionTimeSeconds: 1.85,
      minimumReactionSpacing: 92,
      minimumVerticalCorridor: 92,
      maximumPatternEntries: 4,
      maximumHazardsPer1000Distance: 5.5,
    }),
    createTier({
      id: 'tier-4',
      startDistance: 18_000,
      scrollSpeedMultiplier: 1.5,
      minimumReactionTimeSeconds: 1.8,
      minimumReactionSpacing: 90,
      minimumVerticalCorridor: 90,
      maximumPatternEntries: 4,
      maximumHazardsPer1000Distance: 5.5,
    }),
    createTier({
      id: 'tier-5',
      startDistance: 26_000,
      scrollSpeedMultiplier: 1.6,
      minimumReactionTimeSeconds: 1.75,
      minimumReactionSpacing: 88,
      minimumVerticalCorridor: 88,
      maximumPatternEntries: 5,
      maximumHazardsPer1000Distance: 6,
    }),
  ]),
});

const assertPositiveFinite = (value: number, name: string): void => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive finite number.`);
  }
};

const assertNonNegativeFinite = (value: number, name: string): void => {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative finite number.`);
  }
};

const assertValidParameters = (parameters: Readonly<DifficultyParameters>): void => {
  assertPositiveFinite(parameters.maximumHazardsPer1000Distance, 'maximumHazardsPer1000Distance');

  if (
    !Number.isSafeInteger(parameters.maximumPatternEntries) ||
    parameters.maximumPatternEntries <= 0
  ) {
    throw new RangeError('maximumPatternEntries must be a positive safe integer.');
  }

  assertNonNegativeFinite(parameters.minimumReactionSpacing, 'minimumReactionSpacing');
  assertPositiveFinite(parameters.minimumReactionTimeSeconds, 'minimumReactionTimeSeconds');
  assertPositiveFinite(parameters.minimumVerticalCorridor, 'minimumVerticalCorridor');
  assertPositiveFinite(parameters.scrollSpeedMultiplier, 'scrollSpeedMultiplier');
};

const assertMonotonicProgression = (
  previous: Readonly<DifficultyTierDefinition>,
  current: Readonly<DifficultyTierDefinition>,
): void => {
  if (
    current.scrollSpeedMultiplier < previous.scrollSpeedMultiplier ||
    current.maximumPatternEntries < previous.maximumPatternEntries ||
    current.maximumHazardsPer1000Distance < previous.maximumHazardsPer1000Distance ||
    current.minimumReactionTimeSeconds > previous.minimumReactionTimeSeconds ||
    current.minimumReactionSpacing > previous.minimumReactionSpacing ||
    current.minimumVerticalCorridor > previous.minimumVerticalCorridor
  ) {
    throw new RangeError(
      'Difficulty tiers must progress monotonically in their intended directions.',
    );
  }
};

export const assertValidDifficultyConfig = (config: Readonly<DifficultyConfig>): void => {
  if (config.tiers.length === 0) {
    throw new RangeError('Difficulty config must contain at least one tier.');
  }

  const ids = new Set<string>();

  for (const [index, tier] of config.tiers.entries()) {
    if (tier.id.trim().length === 0 || ids.has(tier.id)) {
      throw new TypeError('Difficulty tier ids must be non-empty and unique.');
    }
    ids.add(tier.id);
    assertNonNegativeFinite(tier.startDistance, 'Difficulty tier startDistance');
    assertValidParameters(tier);

    if (index === 0 && tier.startDistance !== 0) {
      throw new RangeError('The first difficulty tier must start at run distance zero.');
    }

    const previous = config.tiers[index - 1];

    if (previous !== undefined) {
      if (tier.startDistance <= previous.startDistance) {
        throw new RangeError('Difficulty tier start distances must increase strictly.');
      }
      assertMonotonicProgression(previous, tier);
    }
  }
};

/** Derives the complete deterministic difficulty state from logical run distance alone. */
export const calculateDifficulty = (
  runDistance: number,
  config: Readonly<DifficultyConfig> = PROTOTYPE_DIFFICULTY_CONFIG,
): Readonly<DifficultySnapshot> => {
  assertNonNegativeFinite(runDistance, 'Difficulty runDistance');
  assertValidDifficultyConfig(config);

  let tierIndex = 0;

  for (let index = 1; index < config.tiers.length; index += 1) {
    const tier = config.tiers[index];

    if (tier === undefined || runDistance < tier.startDistance) {
      break;
    }
    tierIndex = index;
  }

  const tier = config.tiers[tierIndex];

  if (tier === undefined) {
    throw new RangeError('Difficulty config did not resolve a tier.');
  }

  const nextTier = config.tiers[tierIndex + 1];

  return Object.freeze({
    capped: nextTier === undefined,
    maximumHazardsPer1000Distance: tier.maximumHazardsPer1000Distance,
    maximumPatternEntries: tier.maximumPatternEntries,
    minimumReactionSpacing: tier.minimumReactionSpacing,
    minimumReactionTimeSeconds: tier.minimumReactionTimeSeconds,
    minimumVerticalCorridor: tier.minimumVerticalCorridor,
    nextTierStartDistance: nextTier?.startDistance ?? null,
    runDistance,
    scrollSpeedMultiplier: tier.scrollSpeedMultiplier,
    tierId: tier.id,
    tierIndex,
  });
};

export const scaleRunMotionForDifficulty = (
  baseRunMotion: Readonly<RunMotionValues>,
  difficulty: Readonly<DifficultySnapshot>,
): Readonly<RunMotionValues> => {
  assertValidBaseScrollSpeed(baseRunMotion.baseScrollSpeed);
  assertValidParameters(difficulty);
  const baseScrollSpeed = baseRunMotion.baseScrollSpeed * difficulty.scrollSpeedMultiplier;
  assertValidBaseScrollSpeed(baseScrollSpeed);

  return Object.freeze({ baseScrollSpeed });
};

/**
 * Keeps useful vertical authority as horizontal reaction time shrinks.
 *
 * Velocity caps follow the level-speed multiplier linearly. Acceleration follows its square, so a
 * similarly shaped vertical correction completes in proportionally less time as the world speeds up.
 * The caller still owns the base Director tuning; this derives only the effective difficulty snapshot.
 */
export const scaleFlightTuningForDifficulty = (
  baseFlightTuning: Readonly<FlightTuningValues>,
  difficulty: Readonly<DifficultySnapshot>,
): Readonly<FlightTuningValues> => {
  assertValidFlightTuningValues(baseFlightTuning);
  assertValidParameters(difficulty);
  const velocityMultiplier = difficulty.scrollSpeedMultiplier;
  const accelerationMultiplier = velocityMultiplier * velocityMultiplier;
  const flightTuning = {
    gravity: baseFlightTuning.gravity * accelerationMultiplier,
    thrust: baseFlightTuning.thrust * accelerationMultiplier,
    maxFallVelocity: baseFlightTuning.maxFallVelocity * velocityMultiplier,
    maxRiseVelocity: baseFlightTuning.maxRiseVelocity * velocityMultiplier,
  };
  assertValidFlightTuningValues(flightTuning);
  return Object.freeze(flightTuning);
};

export const createDifficultyReactionTimeConstraint = (
  difficulty: Readonly<DifficultySnapshot>,
): Readonly<HazardReactionTimeConstraint> => {
  assertValidParameters(difficulty);

  return Object.freeze({
    minimumReactionTimeSeconds: difficulty.minimumReactionTimeSeconds,
  });
};

export const createDifficultyPatternValidationConstraints = (
  difficulty: Readonly<DifficultySnapshot>,
  base: Readonly<PatternValidationConstraints> = PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS,
): Readonly<PatternValidationConstraints> => {
  assertValidParameters(difficulty);

  return Object.freeze({
    ...base,
    minimumReactionSpacing: difficulty.minimumReactionSpacing,
    minimumVerticalCorridor: difficulty.minimumVerticalCorridor,
  });
};

export const evaluatePatternDifficultyEligibility = (
  pattern: Readonly<HazardPattern>,
  difficulty: Readonly<DifficultySnapshot>,
): Readonly<PatternDifficultyEligibility> => {
  assertValidParameters(difficulty);
  const patternEntryCount = pattern.entries.length;
  const hazardDensityPer1000Distance = (patternEntryCount / pattern.runLength) * 1_000;

  if (!Number.isFinite(hazardDensityPer1000Distance)) {
    throw new RangeError('Pattern hazard density must remain finite.');
  }

  const reasons: PatternDifficultyIneligibilityReason[] = [];
  const { minimumTierIndex, maximumTierIndex } = pattern.profile.difficultyTierRange;

  if (
    difficulty.tierIndex < minimumTierIndex ||
    (maximumTierIndex !== null && difficulty.tierIndex > maximumTierIndex)
  ) {
    reasons.push('profile-difficulty-tier');
  }

  if (patternEntryCount > difficulty.maximumPatternEntries) {
    reasons.push('pattern-entry-limit');
  }

  if (hazardDensityPer1000Distance > difficulty.maximumHazardsPer1000Distance) {
    reasons.push('pattern-density-limit');
  }

  return Object.freeze({
    eligible: reasons.length === 0,
    hazardDensityPer1000Distance,
    patternEntryCount,
    reasons: Object.freeze(reasons),
  });
};

/** Narrows candidate availability only; callers must still run geometry/reachability validation. */
export const filterPatternsForDifficulty = (
  catalog: ReadonlyArray<Readonly<HazardPattern>>,
  difficulty: Readonly<DifficultySnapshot>,
): ReadonlyArray<Readonly<HazardPattern>> =>
  Object.freeze(
    catalog.filter((pattern) => evaluatePatternDifficultyEligibility(pattern, difficulty).eligible),
  );
