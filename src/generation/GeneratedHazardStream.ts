import type { HazardPattern } from './HazardPattern';
import {
  type LogicalHazardSpawnInstance,
  PROTOTYPE_MAX_PATTERN_CANDIDATE_ATTEMPTS,
  scheduleNextPattern,
} from './PatternSpawnScheduler';
import {
  type PatternValidationConstraints,
  PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS,
} from './PatternValidator';
import { createRunGenerationState, type RunGenerationState } from './RunGenerationState';
import type { SeedInput } from './SeededPrng';

export interface GeneratedHazardStreamConfig {
  readonly firstPatternStartDistance: number;
  readonly maxCandidateAttempts: number;
  readonly retainBehindDistance: number;
  readonly spawnAheadDistance: number;
}

/** Prototype logical-space values; they are independent of physical viewport dimensions. */
export const PROTOTYPE_GENERATED_HAZARD_STREAM_CONFIG: Readonly<GeneratedHazardStreamConfig> =
  Object.freeze({
    firstPatternStartDistance: 600,
    maxCandidateAttempts: PROTOTYPE_MAX_PATTERN_CANDIDATE_ATTEMPTS,
    retainBehindDistance: 160,
    spawnAheadDistance: 1_800,
  });

/** Fixed prototype seed until the focused Director seed controls task lands. */
export const PROTOTYPE_LIVE_RUN_SEED: SeedInput = 'm3-live-run';

export type GeneratedHazardStreamStatus = 'active' | 'exhausted';

export interface GeneratedHazardStreamState {
  readonly generationState: Readonly<RunGenerationState>;
  readonly nextPatternStartDistance: number;
  readonly runDistance: number;
  readonly scheduledPatternCount: number;
  readonly spawns: ReadonlyArray<Readonly<LogicalHazardSpawnInstance>>;
  readonly status: GeneratedHazardStreamStatus;
}

export interface GeneratedHazardStreamContext {
  readonly catalog: ReadonlyArray<Readonly<HazardPattern>>;
  readonly config?: Readonly<GeneratedHazardStreamConfig>;
  readonly constraints?: Readonly<PatternValidationConstraints>;
}

const MAX_PATTERNS_PER_ADVANCE = 64;

const assertValidConfig = (config: Readonly<GeneratedHazardStreamConfig>): void => {
  if (
    !Number.isFinite(config.firstPatternStartDistance) ||
    config.firstPatternStartDistance < 0 ||
    !Number.isFinite(config.retainBehindDistance) ||
    config.retainBehindDistance < 0 ||
    !Number.isFinite(config.spawnAheadDistance) ||
    config.spawnAheadDistance <= 0
  ) {
    throw new RangeError('Hazard stream distances must be finite and use valid positive ranges.');
  }

  if (!Number.isSafeInteger(config.maxCandidateAttempts) || config.maxCandidateAttempts <= 0) {
    throw new RangeError('Hazard stream maxCandidateAttempts must be a positive safe integer.');
  }
};

const assertValidRunDistance = (runDistance: number): void => {
  if (!Number.isFinite(runDistance) || runDistance < 0) {
    throw new RangeError('Hazard stream runDistance must be a non-negative finite number.');
  }
};

const freezeState = (state: GeneratedHazardStreamState): Readonly<GeneratedHazardStreamState> =>
  Object.freeze({
    ...state,
    spawns: Object.freeze([...state.spawns]),
  });

const fillSpawnWindow = (
  state: Readonly<GeneratedHazardStreamState>,
  context: Readonly<GeneratedHazardStreamContext>,
  runDistance: number,
): Readonly<GeneratedHazardStreamState> => {
  const config = context.config ?? PROTOTYPE_GENERATED_HAZARD_STREAM_CONFIG;
  const constraints = context.constraints ?? PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS;
  const windowEnd = runDistance + config.spawnAheadDistance;

  if (!Number.isFinite(windowEnd)) {
    throw new RangeError('Hazard stream window end must remain finite.');
  }

  const retainedSpawns = state.spawns.filter(
    (spawn) => spawn.hitbox.right >= runDistance - config.retainBehindDistance,
  );
  let generationState = state.generationState;
  let nextPatternStartDistance = state.nextPatternStartDistance;
  let scheduledPatternCount = state.scheduledPatternCount;
  let status = state.status;
  let patternsScheduledThisAdvance = 0;

  while (status === 'active' && nextPatternStartDistance <= windowEnd) {
    if (patternsScheduledThisAdvance >= MAX_PATTERNS_PER_ADVANCE) {
      throw new RangeError('Hazard stream advance exceeded its bounded pattern scheduling limit.');
    }

    const schedule = scheduleNextPattern({
      catalog: context.catalog,
      constraints,
      maxCandidateAttempts: config.maxCandidateAttempts,
      patternStartDistance: nextPatternStartDistance,
      state: generationState,
    });
    generationState = schedule.state;
    patternsScheduledThisAdvance += 1;

    if (schedule.status === 'exhausted') {
      status = 'exhausted';
      break;
    }

    retainedSpawns.push(...schedule.spawns);
    nextPatternStartDistance = schedule.nextPatternStartDistance;
    scheduledPatternCount += 1;
  }

  return freezeState({
    generationState,
    nextPatternStartDistance,
    runDistance,
    scheduledPatternCount,
    spawns: retainedSpawns,
    status,
  });
};

/** Creates and pre-fills the first deterministic logical spawn window for a run. */
export const createGeneratedHazardStream = (
  seed: SeedInput,
  context: Readonly<GeneratedHazardStreamContext>,
): Readonly<GeneratedHazardStreamState> => {
  const config = context.config ?? PROTOTYPE_GENERATED_HAZARD_STREAM_CONFIG;
  assertValidConfig(config);

  return fillSpawnWindow(
    freezeState({
      generationState: createRunGenerationState(seed),
      nextPatternStartDistance: config.firstPatternStartDistance,
      runDistance: 0,
      scheduledPatternCount: 0,
      spawns: [],
      status: 'active',
    }),
    context,
    0,
  );
};

/** Advances the logical stream only when authoritative run distance moves forward. */
export const advanceGeneratedHazardStream = (
  state: Readonly<GeneratedHazardStreamState>,
  runDistance: number,
  context: Readonly<GeneratedHazardStreamContext>,
): Readonly<GeneratedHazardStreamState> => {
  assertValidRunDistance(runDistance);

  if (runDistance < state.runDistance) {
    throw new RangeError('Hazard stream runDistance cannot move backward; create a restart state.');
  }

  if (runDistance === state.runDistance) {
    return state;
  }

  const config = context.config ?? PROTOTYPE_GENERATED_HAZARD_STREAM_CONFIG;
  assertValidConfig(config);

  return fillSpawnWindow(state, context, runDistance);
};
