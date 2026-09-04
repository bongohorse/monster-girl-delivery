import type { RunMotionValues } from '../config/RunMotionConfig';
import { PROTOTYPE_PLAYER_COLLISION_EXTENTS } from '../systems/HazardCollision';
import {
  type PatternReachabilityContext,
  PROTOTYPE_PATTERN_REACHABILITY_CONTEXT,
} from './FlightReachability';
import {
  createHazardReactionWindow,
  evaluateHazardApproachTiming,
  type HazardApproachTiming,
  type HazardReactionTimeConstraint,
  type HazardReactionWindow,
  PROTOTYPE_HAZARD_REACTION_TIME_CONSTRAINT,
} from './HazardApproachTiming';
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
  readonly maxCandidateAttempts: number;
  readonly reactionTime: Readonly<HazardReactionTimeConstraint>;
  readonly retainBehindDistance: number;
}

/** Prototype values; the scheduling horizon is derived from time and authoritative run speed. */
export const PROTOTYPE_GENERATED_HAZARD_STREAM_CONFIG: Readonly<GeneratedHazardStreamConfig> =
  Object.freeze({
    maxCandidateAttempts: PROTOTYPE_MAX_PATTERN_CANDIDATE_ATTEMPTS,
    reactionTime: PROTOTYPE_HAZARD_REACTION_TIME_CONSTRAINT,
    retainBehindDistance: 160,
  });

/** Fixed prototype live seed exposed by development-only Director diagnostics/restart tooling. */
export const PROTOTYPE_LIVE_RUN_SEED: SeedInput = 'm3-live-run';

export type GeneratedHazardStreamStatus = 'active' | 'exhausted';

export interface GeneratedHazardSpawnInstance extends LogicalHazardSpawnInstance {
  /** Immutable timing snapshot from when this logical hazard was accepted into the live stream. */
  readonly approachTiming: Readonly<HazardApproachTiming>;
}

export interface GeneratedHazardStreamState {
  readonly generationState: Readonly<RunGenerationState>;
  readonly nextPatternStartDistance: number;
  readonly runDistance: number;
  readonly scheduledPatternCount: number;
  /** Latest time-derived scheduling horizon, suitable for later Director diagnostics. */
  readonly schedulingWindow: Readonly<HazardReactionWindow>;
  readonly spawns: ReadonlyArray<Readonly<GeneratedHazardSpawnInstance>>;
  readonly status: GeneratedHazardStreamStatus;
}

export interface GeneratedHazardStreamContext {
  readonly catalog: ReadonlyArray<Readonly<HazardPattern>>;
  readonly config?: Readonly<GeneratedHazardStreamConfig>;
  readonly constraints?: Readonly<PatternValidationConstraints>;
  /** Representative logical flight state/tuning; reaction time comes from the scheduling window. */
  readonly reachability?: Readonly<
    Omit<PatternReachabilityContext, 'availableReactionTimeSeconds'>
  >;
}

export type HazardSpeedChangeStatus = 'applied' | 'deferred';

/** Structured transition-time decision for gameplay and later Director diagnostics. */
export interface HazardSpeedChangeResolution {
  readonly appliedScrollSpeed: number;
  readonly limitingTargetRunDistance: number | null;
  readonly maximumSafeScrollSpeed: number | null;
  readonly requestedScrollSpeed: number;
  readonly status: HazardSpeedChangeStatus;
}

const MAX_PATTERNS_PER_ADVANCE = 64;

const assertValidConfig = (config: Readonly<GeneratedHazardStreamConfig>): void => {
  if (!Number.isFinite(config.retainBehindDistance) || config.retainBehindDistance < 0) {
    throw new RangeError('Hazard stream retention distance must be non-negative and finite.');
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

const getPatternSchedulingBoundary = (
  runDistance: number,
  schedulingWindow: Readonly<HazardReactionWindow>,
): number => {
  const boundary =
    runDistance +
    schedulingWindow.minimumReactionDistance +
    PROTOTYPE_PLAYER_COLLISION_EXTENTS.right;

  if (!Number.isFinite(boundary)) {
    throw new RangeError('Hazard stream scheduling boundary must remain finite.');
  }

  return boundary;
};

/**
 * Resolves a requested speed against immutable future hazard targets at the transition instant.
 * Decreases apply immediately. An increase is deferred at the current applied speed unless every
 * scheduled future hazard would still provide the configured minimum reaction time.
 */
export const resolveHazardSafeSpeedChange = (
  state: Readonly<GeneratedHazardStreamState>,
  runDistance: number,
  context: Readonly<GeneratedHazardStreamContext>,
  requestedRunMotion: Readonly<RunMotionValues>,
): Readonly<HazardSpeedChangeResolution> => {
  assertValidRunDistance(runDistance);

  if (runDistance < state.runDistance) {
    throw new RangeError('Hazard speed resolution cannot observe runDistance moving backward.');
  }

  const config = context.config ?? PROTOTYPE_GENERATED_HAZARD_STREAM_CONFIG;
  assertValidConfig(config);
  const requestedWindow = createHazardReactionWindow(requestedRunMotion, config.reactionTime);
  const futureSpawns = state.spawns.filter(
    (spawn) => spawn.approachTiming.targetRunDistance >= runDistance,
  );
  const limitingTargetRunDistance = futureSpawns.reduce<number | null>((nearest, spawn) => {
    const { targetRunDistance } = spawn.approachTiming;

    if (nearest !== null && targetRunDistance >= nearest) {
      return nearest;
    }

    return targetRunDistance;
  }, null);
  const maximumSafeScrollSpeed =
    limitingTargetRunDistance === null
      ? null
      : (limitingTargetRunDistance - runDistance) / requestedWindow.minimumReactionTimeSeconds;

  if (maximumSafeScrollSpeed !== null && !Number.isFinite(maximumSafeScrollSpeed)) {
    throw new RangeError('Maximum safe hazard scroll speed must remain finite.');
  }

  const increaseRequested = requestedWindow.scrollSpeed > state.schedulingWindow.scrollSpeed;
  const increaseIsSafe =
    !increaseRequested ||
    futureSpawns.every(
      (spawn) =>
        evaluateHazardApproachTiming(
          spawn.approachTiming.targetRunDistance,
          runDistance,
          requestedWindow,
        ).meetsMinimumReactionTime,
    );
  const status: HazardSpeedChangeStatus =
    increaseRequested && !increaseIsSafe ? 'deferred' : 'applied';

  return Object.freeze({
    appliedScrollSpeed:
      status === 'applied' ? requestedWindow.scrollSpeed : state.schedulingWindow.scrollSpeed,
    limitingTargetRunDistance,
    maximumSafeScrollSpeed,
    requestedScrollSpeed: requestedWindow.scrollSpeed,
    status,
  });
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
  schedulingWindow: Readonly<HazardReactionWindow>,
): Readonly<GeneratedHazardStreamState> => {
  const config = context.config ?? PROTOTYPE_GENERATED_HAZARD_STREAM_CONFIG;
  const constraints = context.constraints ?? PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS;
  const reachabilitySource = context.reachability ?? PROTOTYPE_PATTERN_REACHABILITY_CONTEXT;
  const reachability = Object.freeze({
    availableReactionTimeSeconds: schedulingWindow.minimumReactionTimeSeconds,
    flightState: reachabilitySource.flightState,
    flightTuning: reachabilitySource.flightTuning,
    playerExtents: reachabilitySource.playerExtents,
  });
  const windowEnd = getPatternSchedulingBoundary(runDistance, schedulingWindow);

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
      reachability,
      state: generationState,
    });
    generationState = schedule.state;
    patternsScheduledThisAdvance += 1;

    if (schedule.status === 'exhausted') {
      status = 'exhausted';
      break;
    }

    retainedSpawns.push(
      ...schedule.spawns.map((spawn) =>
        Object.freeze({
          ...spawn,
          approachTiming: evaluateHazardApproachTiming(
            Math.max(0, spawn.runDistance - PROTOTYPE_PLAYER_COLLISION_EXTENTS.right),
            runDistance,
            schedulingWindow,
          ),
        }),
      ),
    );
    nextPatternStartDistance = schedule.nextPatternStartDistance;
    scheduledPatternCount += 1;
  }

  return freezeState({
    generationState,
    nextPatternStartDistance,
    runDistance,
    scheduledPatternCount,
    schedulingWindow,
    spawns: retainedSpawns,
    status,
  });
};

/** Creates and pre-fills the first deterministic logical spawn window for a run. */
export const createGeneratedHazardStream = (
  seed: SeedInput,
  context: Readonly<GeneratedHazardStreamContext>,
  runMotion: Readonly<RunMotionValues>,
): Readonly<GeneratedHazardStreamState> => {
  const config = context.config ?? PROTOTYPE_GENERATED_HAZARD_STREAM_CONFIG;
  assertValidConfig(config);
  const schedulingWindow = createHazardReactionWindow(runMotion, config.reactionTime);

  return fillSpawnWindow(
    freezeState({
      generationState: createRunGenerationState(seed),
      nextPatternStartDistance: getPatternSchedulingBoundary(0, schedulingWindow),
      runDistance: 0,
      scheduledPatternCount: 0,
      schedulingWindow,
      spawns: [],
      status: 'active',
    }),
    context,
    0,
    schedulingWindow,
  );
};

/**
 * Advances from authoritative run distance and speed without retroactively moving accepted hazards.
 * Unsafe speed increases retain the current applied speed. An accepted larger horizon pushes only
 * the unscheduled cursor far enough to preserve the new minimum; existing positions and timing
 * snapshots stay immutable, while a smaller horizon keeps extra lead.
 */
export const advanceGeneratedHazardStream = (
  state: Readonly<GeneratedHazardStreamState>,
  runDistance: number,
  context: Readonly<GeneratedHazardStreamContext>,
  runMotion: Readonly<RunMotionValues>,
): Readonly<GeneratedHazardStreamState> => {
  assertValidRunDistance(runDistance);

  if (runDistance < state.runDistance) {
    throw new RangeError('Hazard stream runDistance cannot move backward; create a restart state.');
  }

  const config = context.config ?? PROTOTYPE_GENERATED_HAZARD_STREAM_CONFIG;
  assertValidConfig(config);
  const speedChange = resolveHazardSafeSpeedChange(state, runDistance, context, runMotion);
  const schedulingWindow = createHazardReactionWindow(
    { baseScrollSpeed: speedChange.appliedScrollSpeed },
    config.reactionTime,
  );

  if (
    runDistance === state.runDistance &&
    schedulingWindow.minimumReactionDistance === state.schedulingWindow.minimumReactionDistance &&
    schedulingWindow.minimumReactionTimeSeconds ===
      state.schedulingWindow.minimumReactionTimeSeconds &&
    schedulingWindow.scrollSpeed === state.schedulingWindow.scrollSpeed
  ) {
    return state;
  }

  const horizonIncreased =
    schedulingWindow.minimumReactionDistance > state.schedulingWindow.minimumReactionDistance;
  const adjustedNextPatternStartDistance = horizonIncreased
    ? Math.max(
        state.nextPatternStartDistance,
        getPatternSchedulingBoundary(runDistance, schedulingWindow),
      )
    : state.nextPatternStartDistance;

  if (!Number.isFinite(adjustedNextPatternStartDistance)) {
    throw new RangeError('Adjusted next pattern start distance must remain finite.');
  }

  const adjustedState =
    adjustedNextPatternStartDistance === state.nextPatternStartDistance
      ? state
      : freezeState({
          ...state,
          nextPatternStartDistance: adjustedNextPatternStartDistance,
          schedulingWindow,
        });

  return fillSpawnWindow(adjustedState, context, runDistance, schedulingWindow);
};
