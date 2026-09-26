export type PacingIntensity = 'breather' | 'low' | 'medium' | 'high' | 'peak';

export const PACING_INTENSITIES: ReadonlyArray<PacingIntensity> = Object.freeze([
  'breather',
  'low',
  'medium',
  'high',
  'peak',
]);

/** Pressure ceilings narrow allowed content; they never raise difficulty or waive fairness. */
export interface PacingPressureLimits {
  readonly maximumHazardsPer1000Distance: number;
  readonly maximumPatternEntries: number;
}

export interface PacingPhaseDefinition extends PacingPressureLimits {
  /** Positive whole logical distance units, independent of speed and physical viewport size. */
  readonly distanceLength: number;
  readonly intensity: PacingIntensity;
}

export interface PacingConfig {
  /** Authored order repeats forever; at least one phase must explicitly be a breather. */
  readonly phases: ReadonlyArray<Readonly<PacingPhaseDefinition>>;
}

/** Complete serializable pacing state for encounter requests, replay, and Director diagnostics. */
export interface PacingSnapshot extends PacingPressureLimits {
  readonly cycleIndex: number;
  readonly cycleLength: number;
  readonly intensity: PacingIntensity;
  readonly phaseEndDistance: number;
  readonly phaseIndex: number;
  readonly phaseStartDistance: number;
  readonly remainingPhaseDistance: number;
  readonly runDistance: number;
}

const createPhase = (phase: PacingPhaseDefinition): Readonly<PacingPhaseDefinition> =>
  Object.freeze({ ...phase });

/**
 * Mobile-first M5 rhythm. Every pressure beat is followed by an explicit hazard-free breather.
 * Low/medium admit one logical hazard entry. High may use a readable two-entry family pattern,
 * while authored cross-family combinations are reserved by their profiles for Peak. The longest
 * recovery still follows High, and more than half of every cycle is deliberate breathing room.
 */
export const PROTOTYPE_PACING_CONFIG: Readonly<PacingConfig> = Object.freeze({
  phases: Object.freeze([
    createPhase({
      intensity: 'breather',
      distanceLength: 1_600,
      maximumPatternEntries: 1,
      maximumHazardsPer1000Distance: 2,
    }),
    createPhase({
      intensity: 'low',
      distanceLength: 900,
      maximumPatternEntries: 1,
      maximumHazardsPer1000Distance: 2,
    }),
    createPhase({
      intensity: 'breather',
      distanceLength: 1_400,
      maximumPatternEntries: 1,
      maximumHazardsPer1000Distance: 2,
    }),
    createPhase({
      intensity: 'medium',
      distanceLength: 900,
      maximumPatternEntries: 1,
      maximumHazardsPer1000Distance: 2,
    }),
    createPhase({
      intensity: 'breather',
      distanceLength: 1_600,
      maximumPatternEntries: 1,
      maximumHazardsPer1000Distance: 2,
    }),
    createPhase({
      intensity: 'high',
      distanceLength: 2_300,
      maximumPatternEntries: 2,
      maximumHazardsPer1000Distance: 4,
    }),
    createPhase({
      intensity: 'breather',
      distanceLength: 2_800,
      maximumPatternEntries: 1,
      maximumHazardsPer1000Distance: 2,
    }),
    createPhase({
      intensity: 'peak',
      distanceLength: 2_300,
      maximumPatternEntries: 2,
      maximumHazardsPer1000Distance: 4,
    }),
  ]),
});

export const assertValidPacingPressureLimits = (limits: Readonly<PacingPressureLimits>): void => {
  if (!Number.isSafeInteger(limits.maximumPatternEntries) || limits.maximumPatternEntries <= 0) {
    throw new RangeError('Pacing maximumPatternEntries must be a positive safe integer.');
  }

  if (
    !Number.isFinite(limits.maximumHazardsPer1000Distance) ||
    limits.maximumHazardsPer1000Distance <= 0
  ) {
    throw new RangeError('Pacing maximumHazardsPer1000Distance must be positive and finite.');
  }
};

export const assertValidPacingConfig = (config: Readonly<PacingConfig>): void => {
  if (!config.phases.some((phase) => phase.intensity === 'breather')) {
    throw new RangeError('Pacing config must contain an explicit breather phase.');
  }

  let cycleLength = 0;

  for (const phase of config.phases) {
    if (!PACING_INTENSITIES.includes(phase.intensity)) {
      throw new TypeError('Unsupported pacing intensity.');
    }

    if (!Number.isSafeInteger(phase.distanceLength) || phase.distanceLength <= 0) {
      throw new RangeError('Pacing distanceLength must be a positive safe integer.');
    }

    assertValidPacingPressureLimits(phase);
    cycleLength += phase.distanceLength;

    if (!Number.isSafeInteger(cycleLength)) {
      throw new RangeError('Pacing cycle length must remain a safe integer.');
    }
  }
};

/**
 * Derives pacing solely from authoritative logical progress and explicit configuration.
 * Windows are [start, end). Skipped frames require no catch-up loop or random draws; pausing
 * distance freezes pacing, and restarting at zero restores the opening breather. The default
 * cycle is intentionally seed-independent, leaving the seeded PRNG to choose eligible content.
 */
export const calculatePacing = (
  runDistance: number,
  config: Readonly<PacingConfig> = PROTOTYPE_PACING_CONFIG,
): Readonly<PacingSnapshot> => {
  if (!Number.isFinite(runDistance) || runDistance < 0 || runDistance > Number.MAX_SAFE_INTEGER) {
    throw new RangeError(
      'Pacing runDistance must be finite and within the non-negative safe range.',
    );
  }

  assertValidPacingConfig(config);
  const cycleLength = config.phases.reduce((sum, phase) => sum + phase.distanceLength, 0);
  const cycleOffset = runDistance % cycleLength;
  const cycleIndex = Math.floor(runDistance / cycleLength);
  let phaseOffset = 0;

  for (const [phaseIndex, phase] of config.phases.entries()) {
    const phaseEndOffset = phaseOffset + phase.distanceLength;

    if (cycleOffset < phaseEndOffset) {
      const phaseStartDistance = cycleIndex * cycleLength + phaseOffset;
      const phaseEndDistance = cycleIndex * cycleLength + phaseEndOffset;

      if (phaseEndDistance > Number.MAX_SAFE_INTEGER) {
        throw new RangeError('Pacing phase boundary exceeds the safe distance range.');
      }

      return Object.freeze({
        cycleIndex,
        cycleLength,
        intensity: phase.intensity,
        maximumHazardsPer1000Distance: phase.maximumHazardsPer1000Distance,
        maximumPatternEntries: phase.maximumPatternEntries,
        phaseEndDistance,
        phaseIndex,
        phaseStartDistance,
        remainingPhaseDistance: phaseEndDistance - runDistance,
        runDistance,
      });
    }

    phaseOffset = phaseEndOffset;
  }

  throw new RangeError('Pacing config did not resolve a phase.');
};
