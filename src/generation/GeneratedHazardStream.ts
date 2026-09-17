import type { RunMotionValues } from '../config/RunMotionConfig';
import {
  calculateDifficulty,
  createDifficultyReactionTimeConstraint,
} from '../difficulty/DifficultySystem';
import {
  PROTOTYPE_PLAYER_COLLISION_EXTENTS,
  type PrototypePlayerCollisionExtents,
} from '../systems/HazardCollision';
import type { EncounterStreamObservation } from './EncounterStreamObservation';
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
  constrainLiveEncounterPolicy,
  createLiveEncounterPolicyState,
  createLiveEncounterTransitionContext,
  deriveLiveEncounterExitEnvelope,
  evaluateLiveEncounterReadability,
  type LiveEncounterPolicyConfig,
  type LiveEncounterPolicyState,
  rebaseLiveEncounterExitEnvelope,
  recordAcceptedLiveEncounter,
  scaleLiveEncounterRunMotion,
  selectLiveEncounterCandidates,
  stepLiveEncounterPolicyState,
} from './LiveEncounterPolicy';
import {
  type LogicalHazardSpawnInstance,
  PROTOTYPE_MAX_PATTERN_CANDIDATE_ATTEMPTS,
  scheduleNextPattern,
} from './PatternSpawnScheduler';
import {
  type PatternValidationConstraints,
  PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS,
} from './PatternValidator';
import { selectPrototypeLaserLaneCatalog } from './PrototypeLaserLaneCatalog';
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

/** Initial prototype live seed exposed by development-only Director diagnostics/restart tooling. */
export const PROTOTYPE_LIVE_RUN_SEED: SeedInput = 'm3-live-run';

export type GeneratedHazardStreamStatus = 'active' | 'exhausted';

export interface GeneratedHazardSpawnInstance extends LogicalHazardSpawnInstance {
  /** Immutable timing snapshot from when this logical hazard was accepted into the live stream. */
  readonly approachTiming: Readonly<HazardApproachTiming>;
}

export interface GeneratedHazardStreamState {
  readonly generationState: Readonly<RunGenerationState>;
  readonly nextPatternStartDistance: number;
  /** Present only when the integrated M4 encounter policy is enabled by the stream context. */
  readonly policy: Readonly<LiveEncounterPolicyState> | null;
  readonly runDistance: number;
  readonly scheduledPatternCount: number;
  /** Latest time-derived scheduling horizon, suitable for later Director diagnostics. */
  readonly schedulingWindow: Readonly<HazardReactionWindow>;
  readonly spawns: ReadonlyArray<Readonly<GeneratedHazardSpawnInstance>>;
  readonly status: GeneratedHazardStreamStatus;
}

/** Zero-time domain reconciliation; accepted content and generator state retain their identity. */
export const constrainGeneratedHazardStream = (
  state: Readonly<GeneratedHazardStreamState>,
  constraints: Readonly<PatternValidationConstraints>,
  playerExtents: Readonly<PrototypePlayerCollisionExtents>,
): Readonly<GeneratedHazardStreamState> => {
  if (state.policy === null) return state;
  // Match the center bounds used by transition validation, including encounter safety margins.
  const policy = constrainLiveEncounterPolicy(state.policy, {
    ceilingY: constraints.playableTop + playerExtents.top,
    floorY: constraints.playableBottom - playerExtents.bottom,
  });
  return policy === state.policy ? state : Object.freeze({ ...state, policy });
};

export interface GeneratedHazardStreamContext {
  /** Development observers receive existing decision evidence; absent in production. */
  readonly observeEncounter?: (observation: Readonly<EncounterStreamObservation>) => void;
  readonly catalog: ReadonlyArray<Readonly<HazardPattern>>;
  readonly config?: Readonly<GeneratedHazardStreamConfig>;
  readonly constraints?: Readonly<PatternValidationConstraints>;
  /** Presence enables the integrated difficulty, pacing, variety, transition, and budget policy. */
  readonly policy?: Readonly<LiveEncounterPolicyConfig>;
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

const hasPendingPolicyContent = (
  state: Readonly<GeneratedHazardStreamState>,
  runDistance: number,
): boolean =>
  state.policy !== null &&
  (state.policy.readability.reservations.length > 0 ||
    runDistance < state.policy.exitEnvelope.runDistance);

const flightTuningChanged = (
  state: Readonly<LiveEncounterPolicyState>,
  context: Readonly<GeneratedHazardStreamContext>,
): boolean => {
  const requested = (context.reachability ?? PROTOTYPE_PATTERN_REACHABILITY_CONTEXT).flightTuning;
  return (Object.keys(state.flightTuning) as Array<keyof typeof requested>).some(
    (key) => state.flightTuning[key] !== requested[key],
  );
};

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

const getReactionTimeConstraint = (
  context: Readonly<GeneratedHazardStreamContext>,
  runDistance: number,
): Readonly<HazardReactionTimeConstraint> => {
  if (context.policy === undefined) {
    return (context.config ?? PROTOTYPE_GENERATED_HAZARD_STREAM_CONFIG).reactionTime;
  }

  return createDifficultyReactionTimeConstraint(
    calculateDifficulty(runDistance, context.policy.difficulty),
  );
};

const getRequestedRunMotion = (
  context: Readonly<GeneratedHazardStreamContext>,
  runDistance: number,
  runMotion: Readonly<RunMotionValues>,
): Readonly<RunMotionValues> =>
  context.policy === undefined
    ? runMotion
    : scaleLiveEncounterRunMotion(runMotion, runDistance, context.policy);

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
 * Legacy decreases apply immediately; increases must preserve every future reaction window.
 * Policy mode additionally holds either direction until accepted policy content has cleared.
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
  const policyRequestedRunMotion = getRequestedRunMotion(context, runDistance, requestedRunMotion);
  const requestedWindow = createHazardReactionWindow(
    policyRequestedRunMotion,
    getReactionTimeConstraint(context, runDistance),
  );
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
    (increaseRequested && !increaseIsSafe) ||
    (requestedWindow.scrollSpeed !== state.schedulingWindow.scrollSpeed &&
      hasPendingPolicyContent(state, runDistance))
      ? 'deferred'
      : 'applied';

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

const fillLegacySpawnWindow = (
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

    const laneCatalog = selectPrototypeLaserLaneCatalog(
      context.catalog,
      constraints,
      generationState.prngState,
    );
    const schedule = scheduleNextPattern({
      catalog: laneCatalog,
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
    policy: state.policy,
    runDistance,
    scheduledPatternCount,
    schedulingWindow,
    spawns: retainedSpawns,
    status,
  });
};

const fillPolicySpawnWindow = (
  state: Readonly<GeneratedHazardStreamState>,
  context: Readonly<GeneratedHazardStreamContext>,
  runDistance: number,
  schedulingWindow: Readonly<HazardReactionWindow>,
): Readonly<GeneratedHazardStreamState> => {
  const policyConfig = context.policy;
  const initialPolicyState = state.policy;
  if (policyConfig === undefined || initialPolicyState === null) {
    throw new TypeError('Live encounter policy config and state must be enabled together.');
  }

  const config = context.config ?? PROTOTYPE_GENERATED_HAZARD_STREAM_CONFIG;
  const baseConstraints = context.constraints ?? PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS;
  const reachabilitySource = context.reachability ?? PROTOTYPE_PATTERN_REACHABILITY_CONTEXT;
  const retainedSpawns = state.spawns.filter(
    (spawn) => spawn.hitbox.right >= runDistance - config.retainBehindDistance,
  );
  const windowEnd = getPatternSchedulingBoundary(runDistance, schedulingWindow);
  let generationState = state.generationState;
  let nextPatternStartDistance = state.nextPatternStartDistance;
  let policyState = initialPolicyState;
  let scheduledPatternCount = state.scheduledPatternCount;
  const status = state.status;
  let policyIterations = 0;

  while (
    status === 'active' &&
    schedulingWindow.scrollSpeed > 0 &&
    nextPatternStartDistance <= windowEnd
  ) {
    if (policyIterations >= MAX_PATTERNS_PER_ADVANCE) {
      throw new RangeError('Hazard stream advance exceeded its bounded policy scheduling limit.');
    }
    policyIterations += 1;

    const laneCatalog = selectPrototypeLaserLaneCatalog(
      context.catalog,
      baseConstraints,
      generationState.prngState,
    );
    const selection = selectLiveEncounterCandidates(
      laneCatalog,
      nextPatternStartDistance,
      policyState,
      policyConfig,
      baseConstraints,
    );
    const evaluateCatalog = (catalog: ReadonlyArray<Readonly<HazardPattern>>) =>
      evaluateLiveEncounterReadability(
        catalog,
        policyState,
        selection.pacing,
        scheduledPatternCount,
        nextPatternStartDistance,
        runDistance,
        schedulingWindow.scrollSpeed,
        reachabilitySource.playerExtents,
        policyConfig,
      );
    const primaryEvaluations = evaluateCatalog(selection.primaryCatalog);
    const deferredEvaluations = evaluateCatalog(selection.deferredCatalog);
    const allEvaluations = [...primaryEvaluations, ...deferredEvaluations];
    const intrinsicallyEligible = allEvaluations.filter(
      (evaluation) => evaluation.intrinsicallyEligible,
    );

    if (intrinsicallyEligible.length === 0) {
      context.observeEncounter?.({
        kind: 'no-content',
        runDistance,
        patternStartDistance: nextPatternStartDistance,
        selection,
      });
      nextPatternStartDistance = selection.nextPolicyBoundaryDistance;
      continue;
    }

    const availablePrimary = primaryEvaluations.filter(
      (evaluation) => evaluation.intrinsicallyEligible && evaluation.decision.status === 'reserved',
    );
    const availableDeferred = deferredEvaluations.filter(
      (evaluation) => evaluation.intrinsicallyEligible && evaluation.decision.status === 'reserved',
    );

    // Existing active reservations can clear only through normalized simulation time.
    if (availablePrimary.length === 0 && availableDeferred.length === 0) {
      context.observeEncounter?.({
        kind: 'readability-deferred',
        runDistance,
        patternStartDistance: nextPatternStartDistance,
        selection,
        readability: intrinsicallyEligible[0]?.decision,
      });
      nextPatternStartDistance = windowEnd + Math.max(1, schedulingWindow.minimumReactionDistance);
      break;
    }

    const reachability = Object.freeze({
      availableReactionTimeSeconds: selection.difficulty.minimumReactionTimeSeconds,
      flightState: reachabilitySource.flightState,
      flightTuning: reachabilitySource.flightTuning,
      playerExtents: reachabilitySource.playerExtents,
    });
    const transition = createLiveEncounterTransitionContext(
      policyState,
      reachabilitySource,
      schedulingWindow.scrollSpeed,
    );
    let acceptedSchedule: ReturnType<typeof scheduleNextPattern> | null = null;
    let fallbackUsed = selection.variety.fallbackUsed;

    for (const evaluations of [availablePrimary, availableDeferred]) {
      if (evaluations.length === 0) {
        continue;
      }
      const schedule = scheduleNextPattern({
        catalog: evaluations.map((evaluation) => evaluation.pattern),
        constraints: selection.constraints,
        maxCandidateAttempts: config.maxCandidateAttempts,
        patternStartDistance: nextPatternStartDistance,
        reachability,
        state: generationState,
        transition,
      });
      generationState = schedule.state;
      if (schedule.status === 'accepted') {
        fallbackUsed ||= evaluations === availableDeferred;
        acceptedSchedule = schedule;
        break;
      }
      context.observeEncounter?.({
        kind: 'scheduler-rejected',
        runDistance,
        patternStartDistance: nextPatternStartDistance,
        selection,
        schedule,
      });
    }

    if (acceptedSchedule === null) {
      nextPatternStartDistance = windowEnd + Math.max(1, schedulingWindow.minimumReactionDistance);
      break;
    }

    const acceptedEvaluation = allEvaluations.find(
      (evaluation) => evaluation.pattern.id === acceptedSchedule.patternId,
    );
    if (acceptedEvaluation === undefined || acceptedEvaluation.decision.status !== 'reserved') {
      throw new TypeError('Accepted live encounter must have a reserved readability decision.');
    }

    if (
      deriveLiveEncounterExitEnvelope(
        policyState.exitEnvelope,
        acceptedEvaluation.pattern,
        nextPatternStartDistance,
        schedulingWindow.scrollSpeed,
        reachabilitySource,
        selection.constraints,
      ) === null
    ) {
      context.observeEncounter?.({
        kind: 'trajectory-rejected',
        runDistance,
        patternStartDistance: nextPatternStartDistance,
        selection,
        schedule: acceptedSchedule,
      });
      nextPatternStartDistance = windowEnd + Math.max(1, schedulingWindow.minimumReactionDistance);
      break;
    }

    const acceptedSpawns = acceptedSchedule.spawns.map((spawn) =>
      Object.freeze({
        ...spawn,
        approachTiming: evaluateHazardApproachTiming(
          Math.max(0, spawn.runDistance - PROTOTYPE_PLAYER_COLLISION_EXTENTS.right),
          runDistance,
          schedulingWindow,
        ),
      }),
    );
    if (acceptedSpawns.some((spawn) => !spawn.approachTiming.meetsMinimumReactionTime)) {
      context.observeEncounter?.({
        kind: 'reaction-rejected',
        runDistance,
        patternStartDistance: nextPatternStartDistance,
        selection,
        schedule: acceptedSchedule,
      });
      nextPatternStartDistance = windowEnd + Math.max(1, schedulingWindow.minimumReactionDistance);
      break;
    }
    retainedSpawns.push(...acceptedSpawns);
    context.observeEncounter?.({
      kind: 'accepted',
      runDistance,
      patternStartDistance: nextPatternStartDistance,
      selection,
      schedule: acceptedSchedule,
      readability: acceptedEvaluation.decision,
      fallbackUsed,
    });
    policyState = recordAcceptedLiveEncounter(
      policyState,
      acceptedEvaluation.pattern,
      acceptedEvaluation.decision,
      nextPatternStartDistance,
      schedulingWindow.scrollSpeed,
      reachabilitySource,
      selection.constraints,
      policyConfig,
    );
    nextPatternStartDistance = acceptedSchedule.nextPatternStartDistance;
    scheduledPatternCount += 1;
  }

  return freezeState({
    generationState,
    nextPatternStartDistance,
    policy: policyState,
    runDistance,
    scheduledPatternCount,
    schedulingWindow,
    spawns: retainedSpawns,
    status,
  });
};

const fillSpawnWindow = (
  state: Readonly<GeneratedHazardStreamState>,
  context: Readonly<GeneratedHazardStreamContext>,
  runDistance: number,
  schedulingWindow: Readonly<HazardReactionWindow>,
): Readonly<GeneratedHazardStreamState> =>
  state.policy === null
    ? fillLegacySpawnWindow(state, context, runDistance, schedulingWindow)
    : fillPolicySpawnWindow(state, context, runDistance, schedulingWindow);
/** Creates and pre-fills the first deterministic logical spawn window for a run. */
export const createGeneratedHazardStream = (
  seed: SeedInput,
  context: Readonly<GeneratedHazardStreamContext>,
  runMotion: Readonly<RunMotionValues>,
): Readonly<GeneratedHazardStreamState> => {
  const config = context.config ?? PROTOTYPE_GENERATED_HAZARD_STREAM_CONFIG;
  assertValidConfig(config);
  const reachabilitySource = context.reachability ?? PROTOTYPE_PATTERN_REACHABILITY_CONTEXT;
  const schedulingWindow = createHazardReactionWindow(
    getRequestedRunMotion(context, 0, runMotion),
    getReactionTimeConstraint(context, 0),
  );
  const policy =
    context.policy === undefined
      ? null
      : createLiveEncounterPolicyState(0, reachabilitySource, context.policy);

  return fillSpawnWindow(
    freezeState({
      generationState: createRunGenerationState(seed),
      nextPatternStartDistance: getPatternSchedulingBoundary(0, schedulingWindow),
      policy,
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
 * elapsedSeconds describes completed simulation time. A pre-step parameter-resolution pass
 * supplies zero elapsed time and disables scheduling; the post-step pass ages and fills once.
 */
export const advanceGeneratedHazardStream = (
  state: Readonly<GeneratedHazardStreamState>,
  runDistance: number,
  context: Readonly<GeneratedHazardStreamContext>,
  runMotion: Readonly<RunMotionValues>,
  elapsedSeconds = 0,
  scheduleEncounters = true,
): Readonly<GeneratedHazardStreamState> => {
  assertValidRunDistance(runDistance);

  if (runDistance < state.runDistance) {
    throw new RangeError('Hazard stream runDistance cannot move backward; create a restart state.');
  }

  const config = context.config ?? PROTOTYPE_GENERATED_HAZARD_STREAM_CONFIG;
  assertValidConfig(config);
  if ((state.policy === null) !== (context.policy === undefined)) {
    throw new TypeError('Hazard stream policy mode cannot change during a run.');
  }
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) {
    throw new RangeError('Hazard stream elapsedSeconds must be non-negative and finite.');
  }
  let policy =
    state.policy === null || context.policy === undefined
      ? null
      : stepLiveEncounterPolicyState(state.policy, runDistance, elapsedSeconds, context.policy);
  const steppedState = policy === state.policy ? state : freezeState({ ...state, policy });
  const speedChange = resolveHazardSafeSpeedChange(steppedState, runDistance, context, runMotion);
  const tuningChanged = policy !== null && flightTuningChanged(policy, context);
  const parametersDeferred =
    hasPendingPolicyContent(steppedState, runDistance) &&
    (speedChange.status === 'deferred' || tuningChanged);
  if (
    policy !== null &&
    !parametersDeferred &&
    (tuningChanged || speedChange.appliedScrollSpeed !== state.schedulingWindow.scrollSpeed)
  ) {
    policy = Object.freeze({
      ...policy,
      exitEnvelope: rebaseLiveEncounterExitEnvelope(
        policy,
        runDistance,
        state.schedulingWindow.scrollSpeed,
        context.reachability ?? PROTOTYPE_PATTERN_REACHABILITY_CONTEXT,
        context.constraints ?? PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS,
      ),
      flightTuning: Object.freeze({
        ...(context.reachability ?? PROTOTYPE_PATTERN_REACHABILITY_CONTEXT).flightTuning,
      }),
    });
  }
  const schedulingWindow = createHazardReactionWindow(
    { baseScrollSpeed: speedChange.appliedScrollSpeed },
    getReactionTimeConstraint(context, runDistance),
  );

  if (
    runDistance === state.runDistance &&
    schedulingWindow.minimumReactionDistance === state.schedulingWindow.minimumReactionDistance &&
    schedulingWindow.minimumReactionTimeSeconds ===
      state.schedulingWindow.minimumReactionTimeSeconds &&
    schedulingWindow.scrollSpeed === state.schedulingWindow.scrollSpeed &&
    policy === state.policy
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
    adjustedNextPatternStartDistance === state.nextPatternStartDistance && policy === state.policy
      ? state
      : freezeState({
          ...state,
          nextPatternStartDistance: adjustedNextPatternStartDistance,
          policy,
          schedulingWindow,
        });

  // Leave recovery space while accepted content drains under its original motion/tuning.
  if (parametersDeferred || !scheduleEncounters) {
    if (parametersDeferred)
      context.observeEncounter?.({
        kind: 'parameters-deferred',
        runDistance,
        patternStartDistance: adjustedState.nextPatternStartDistance,
      });
    return freezeState({ ...adjustedState, policy, runDistance, schedulingWindow });
  }

  return fillSpawnWindow(adjustedState, context, runDistance, schedulingWindow);
};

export interface GeneratedHazardMotionSegment {
  readonly durationSeconds: number;
  readonly endRunDistance: number;
  readonly scrollSpeed: number;
  readonly startRunDistance: number;
}

export interface GeneratedHazardMotionPlan {
  readonly averageScrollSpeed: number;
  readonly elapsedSeconds: number;
  readonly endRunDistance: number;
  readonly segments: ReadonlyArray<Readonly<GeneratedHazardMotionSegment>>;
  readonly startRunDistance: number;
  /** Stream aged through the planned motion with encounter admission disabled. */
  readonly stream: Readonly<GeneratedHazardStreamState>;
}

const MOTION_EVENT_EPSILON = 1e-9;
const MAX_MOTION_SEGMENTS = 64;

const createMotionPlanningContext = (
  state: Readonly<GeneratedHazardStreamState>,
  context: Readonly<GeneratedHazardStreamContext>,
): Readonly<GeneratedHazardStreamContext> => {
  if (state.policy === null || context.policy === undefined) {
    return context;
  }

  const reachability = context.reachability ?? PROTOTYPE_PATTERN_REACHABILITY_CONTEXT;
  return Object.freeze({
    ...context,
    reachability: Object.freeze({
      ...reachability,
      // Run-speed planning must not switch Director flight tuning part-way through one frame.
      // The normal zero-time commit applies a newly-safe flight tuning at the frame boundary.
      flightTuning: state.policy.flightTuning,
    }),
  });
};

const getReadabilityClearSeconds = (state: Readonly<GeneratedHazardStreamState>): number | null => {
  const reservations = state.policy?.readability.reservations ?? [];
  if (reservations.length === 0) {
    return null;
  }
  return Math.max(...reservations.map((reservation) => reservation.activeWindow.endSeconds));
};

const getNextMotionDistanceEvent = (
  state: Readonly<GeneratedHazardStreamState>,
  context: Readonly<GeneratedHazardStreamContext>,
): number | null => {
  const currentDistance = state.runDistance;
  const candidates: number[] = [];

  if (context.policy !== undefined) {
    const nextTierStartDistance = calculateDifficulty(
      currentDistance,
      context.policy.difficulty,
    ).nextTierStartDistance;
    if (
      nextTierStartDistance !== null &&
      nextTierStartDistance > currentDistance + MOTION_EVENT_EPSILON
    ) {
      candidates.push(nextTierStartDistance);
    }
  }

  const exitDistance = state.policy?.exitEnvelope.runDistance;
  if (exitDistance !== undefined && exitDistance > currentDistance + MOTION_EVENT_EPSILON) {
    candidates.push(exitDistance);
  }

  for (const spawn of state.spawns) {
    const targetDistance = spawn.approachTiming.targetRunDistance;
    if (targetDistance >= currentDistance) {
      candidates.push(
        Math.max(targetDistance + MOTION_EVENT_EPSILON, currentDistance + MOTION_EVENT_EPSILON),
      );
    }
  }

  return candidates.length === 0 ? null : Math.min(...candidates);
};

/**
 * Plans authoritative horizontal motion across difficulty/safety transition boundaries instead of
 * sampling a new speed only at the next rendered frame. Encounter admission stays disabled while
 * the plan ages policy state, so 30/60/144 Hz partitions reach the same logical distance.
 */
export const planGeneratedHazardMotion = (
  state: Readonly<GeneratedHazardStreamState>,
  context: Readonly<GeneratedHazardStreamContext>,
  runMotion: Readonly<RunMotionValues>,
  elapsedSeconds: number,
): Readonly<GeneratedHazardMotionPlan> => {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) {
    throw new RangeError('Generated hazard motion elapsedSeconds must be non-negative and finite.');
  }

  const startRunDistance = state.runDistance;
  let preview = advanceGeneratedHazardStream(
    state,
    startRunDistance,
    createMotionPlanningContext(state, context),
    runMotion,
    0,
    false,
  );
  let remainingSeconds = elapsedSeconds;
  const segments: GeneratedHazardMotionSegment[] = [];

  while (remainingSeconds > 0) {
    if (segments.length >= MAX_MOTION_SEGMENTS) {
      throw new RangeError('Generated hazard motion exceeded its bounded transition count.');
    }

    const scrollSpeed = preview.schedulingWindow.scrollSpeed;
    if (!Number.isFinite(scrollSpeed) || scrollSpeed <= 0) {
      throw new RangeError('Generated hazard motion scroll speed must remain positive and finite.');
    }

    const distanceEvent = getNextMotionDistanceEvent(preview, context);
    const distanceEventSeconds =
      distanceEvent === null
        ? Number.POSITIVE_INFINITY
        : (distanceEvent - preview.runDistance) / scrollSpeed;
    const readabilityClearSeconds = getReadabilityClearSeconds(preview) ?? Number.POSITIVE_INFINITY;
    let segmentSeconds = Math.min(remainingSeconds, distanceEventSeconds, readabilityClearSeconds);

    if (!Number.isFinite(segmentSeconds) || segmentSeconds <= 0) {
      segmentSeconds = remainingSeconds;
    }

    const hitsDistanceEvent =
      distanceEvent !== null && distanceEventSeconds <= segmentSeconds + Number.EPSILON;
    const startDistance = preview.runDistance;
    const endRunDistance = hitsDistanceEvent
      ? distanceEvent
      : startDistance + scrollSpeed * segmentSeconds;
    const planningContext = createMotionPlanningContext(preview, context);
    preview = advanceGeneratedHazardStream(
      preview,
      endRunDistance,
      planningContext,
      runMotion,
      segmentSeconds,
      false,
    );
    segments.push(
      Object.freeze({
        durationSeconds: segmentSeconds,
        endRunDistance,
        scrollSpeed,
        startRunDistance: startDistance,
      }),
    );

    remainingSeconds = Math.max(0, remainingSeconds - segmentSeconds);
  }

  const endRunDistance = preview.runDistance;
  const averageScrollSpeed =
    elapsedSeconds === 0
      ? preview.schedulingWindow.scrollSpeed
      : (endRunDistance - startRunDistance) / elapsedSeconds;

  return Object.freeze({
    averageScrollSpeed,
    elapsedSeconds,
    endRunDistance,
    segments: Object.freeze(segments),
    startRunDistance,
    stream: preview,
  });
};

/** Resolves the exact piecewise run distance at a sub-frame time inside a motion plan. */
export const resolveGeneratedHazardMotionRunDistance = (
  plan: Readonly<GeneratedHazardMotionPlan>,
  elapsedSeconds: number,
): number => {
  if (
    !Number.isFinite(elapsedSeconds) ||
    elapsedSeconds < 0 ||
    elapsedSeconds > plan.elapsedSeconds
  ) {
    throw new RangeError('Motion-plan elapsedSeconds must stay inside the planned frame.');
  }
  if (elapsedSeconds === 0 || plan.segments.length === 0) {
    return plan.startRunDistance;
  }

  let consumedSeconds = 0;
  for (const segment of plan.segments) {
    const segmentEndSeconds = consumedSeconds + segment.durationSeconds;
    if (elapsedSeconds <= segmentEndSeconds) {
      if (elapsedSeconds === segmentEndSeconds) {
        return segment.endRunDistance;
      }
      return segment.startRunDistance + segment.scrollSpeed * (elapsedSeconds - consumedSeconds);
    }
    consumedSeconds = segmentEndSeconds;
  }

  return plan.endRunDistance;
};