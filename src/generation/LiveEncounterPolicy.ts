import type { FlightTuningValues } from '../config/FlightTuningConfig';
import type { RunMotionValues } from '../config/RunMotionConfig';
import {
  calculateDifficulty,
  createDifficultyPatternValidationConstraints,
  type DifficultyConfig,
  type DifficultySnapshot,
  filterPatternsForDifficulty,
  PROTOTYPE_DIFFICULTY_CONFIG,
  scaleRunMotionForDifficulty,
} from '../difficulty/DifficultySystem';
import { isTelegraphedHazardBehavior } from '../hazards/HazardArchetype';
import {
  createPacingPatternRequest,
  filterPatternsForPacing,
} from '../pacing/PacingPatternSelection';
import {
  calculatePacing,
  type PacingConfig,
  type PacingIntensity,
  type PacingSnapshot,
  PROTOTYPE_PACING_CONFIG,
} from '../pacing/PacingSystem';
import type { PrototypePlayerCollisionExtents } from '../systems/HazardCollision';
import { stepVerticalFlight, type VerticalFlightBounds } from '../systems/VerticalFlightSimulation';
import {
  createEncounterReadabilityBudgetState,
  createEncounterReadabilityCandidate,
  type EncounterReadabilityBudgetConfig,
  type EncounterReadabilityBudgetDecision,
  type EncounterReadabilityBudgetState,
  type EncounterReadabilityLimits,
  type EncounterReadabilityReservation,
  type EncounterReadabilityWindow,
  PROTOTYPE_ENCOUNTER_READABILITY_BUDGET_CONFIG,
  reserveEncounterReadabilityBudget,
  stepEncounterReadabilityBudget,
} from './EncounterReadabilityBudget';
import {
  createEncounterExitStateEnvelope,
  type EncounterExitStateEnvelope,
  type EncounterTransitionContext,
} from './EncounterTransitionValidator';
import {
  createEncounterVarietyHistoryState,
  type EncounterVarietyHistoryState,
  type EncounterVarietyPolicy,
  PROTOTYPE_ENCOUNTER_VARIETY_POLICY,
  recordAcceptedEncounterForVariety,
  selectPatternsForVariety,
} from './EncounterVarietyPolicy';
import type { PatternReachabilityContext } from './FlightReachability';
import type { HazardPattern } from './HazardPattern';
import {
  type PatternValidationConstraints,
  PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS,
} from './PatternValidator';

export interface LiveEncounterPolicyConfig {
  readonly difficulty: Readonly<DifficultyConfig>;
  readonly pacing: Readonly<PacingConfig>;
  readonly readability: Readonly<EncounterReadabilityBudgetConfig>;
  readonly variety: Readonly<EncounterVarietyPolicy>;
}

export const PROTOTYPE_LIVE_ENCOUNTER_POLICY_CONFIG: Readonly<LiveEncounterPolicyConfig> =
  Object.freeze({
    difficulty: PROTOTYPE_DIFFICULTY_CONFIG,
    pacing: PROTOTYPE_PACING_CONFIG,
    readability: PROTOTYPE_ENCOUNTER_READABILITY_BUDGET_CONFIG,
    variety: PROTOTYPE_ENCOUNTER_VARIETY_POLICY,
  });

export interface LiveEncounterPolicyState {
  readonly difficulty: Readonly<DifficultySnapshot>;
  readonly exitEnvelope: Readonly<EncounterExitStateEnvelope>;
  readonly pacing: Readonly<PacingSnapshot>;
  readonly readability: Readonly<EncounterReadabilityBudgetState>;
  readonly variety: Readonly<EncounterVarietyHistoryState>;
}

export interface LiveEncounterCandidateSelection {
  readonly constraints: Readonly<PatternValidationConstraints>;
  readonly deferredCatalog: ReadonlyArray<Readonly<HazardPattern>>;
  readonly difficulty: Readonly<DifficultySnapshot>;
  /** Used when no authored content satisfies the current hard policy request. */
  readonly nextPolicyBoundaryDistance: number;
  readonly pacing: Readonly<PacingSnapshot>;
  readonly primaryCatalog: ReadonlyArray<Readonly<HazardPattern>>;
}

export interface LiveEncounterReadabilityEvaluation {
  readonly decision: Readonly<EncounterReadabilityBudgetDecision>;
  /** False when this candidate exceeds the phase request even with no other active encounter. */
  readonly intrinsicallyEligible: boolean;
  readonly pattern: Readonly<HazardPattern>;
  readonly reservation: Readonly<EncounterReadabilityReservation>;
}

const createReadabilityLimits = (
  intensity: PacingIntensity,
): Readonly<EncounterReadabilityLimits> => {
  switch (intensity) {
    case 'breather':
      return Object.freeze({
        maximumActivePressureCost: 0,
        maximumActiveReadabilityCost: 0,
        maximumConcurrentWarnings: 0,
        maximumConcurrentLethalWindows: 0,
      });
    case 'low':
      return Object.freeze({
        maximumActivePressureCost: 2,
        maximumActiveReadabilityCost: 3,
        maximumConcurrentWarnings: 1,
        maximumConcurrentLethalWindows: 1,
      });
    case 'medium':
      return Object.freeze({
        maximumActivePressureCost: 4,
        maximumActiveReadabilityCost: 5,
        maximumConcurrentWarnings: 2,
        maximumConcurrentLethalWindows: 2,
      });
    case 'high':
    case 'peak':
      return PROTOTYPE_ENCOUNTER_READABILITY_BUDGET_CONFIG.hardLimits;
  }
};

const getNextPolicyBoundaryDistance = (
  difficulty: Readonly<DifficultySnapshot>,
  pacing: Readonly<PacingSnapshot>,
): number =>
  difficulty.nextTierStartDistance === null
    ? pacing.phaseEndDistance
    : Math.min(pacing.phaseEndDistance, difficulty.nextTierStartDistance);

export const createLiveEncounterPolicyState = (
  runDistance: number,
  reachability: Readonly<Omit<PatternReachabilityContext, 'availableReactionTimeSeconds'>>,
  config: Readonly<LiveEncounterPolicyConfig> = PROTOTYPE_LIVE_ENCOUNTER_POLICY_CONFIG,
): Readonly<LiveEncounterPolicyState> =>
  Object.freeze({
    difficulty: calculateDifficulty(runDistance, config.difficulty),
    exitEnvelope: createEncounterExitStateEnvelope({
      runDistance,
      states: [reachability.flightState],
    }),
    pacing: calculatePacing(runDistance, config.pacing),
    readability: createEncounterReadabilityBudgetState([], config.readability),
    variety: createEncounterVarietyHistoryState([], config.variety),
  });

/** Advances only progression-derived snapshots and the existing normalized simulation-time budget. */
export const stepLiveEncounterPolicyState = (
  state: Readonly<LiveEncounterPolicyState>,
  runDistance: number,
  elapsedSeconds: number,
  config: Readonly<LiveEncounterPolicyConfig> = PROTOTYPE_LIVE_ENCOUNTER_POLICY_CONFIG,
): Readonly<LiveEncounterPolicyState> => {
  const difficulty = calculateDifficulty(runDistance, config.difficulty);
  const pacing = calculatePacing(runDistance, config.pacing);
  const readability = stepEncounterReadabilityBudget(
    state.readability,
    elapsedSeconds,
    config.readability,
  );

  if (
    difficulty.tierIndex === state.difficulty.tierIndex &&
    difficulty.runDistance === state.difficulty.runDistance &&
    pacing.runDistance === state.pacing.runDistance &&
    readability === state.readability
  ) {
    return state;
  }

  return Object.freeze({ ...state, difficulty, pacing, readability });
};

/** Applies metadata policy before generator choice; authored catalog order remains unchanged. */
export const selectLiveEncounterCandidates = (
  catalog: ReadonlyArray<Readonly<HazardPattern>>,
  patternStartDistance: number,
  state: Readonly<LiveEncounterPolicyState>,
  config: Readonly<LiveEncounterPolicyConfig> = PROTOTYPE_LIVE_ENCOUNTER_POLICY_CONFIG,
  baseConstraints: Readonly<PatternValidationConstraints> = PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS,
): Readonly<LiveEncounterCandidateSelection> => {
  const difficulty = calculateDifficulty(patternStartDistance, config.difficulty);
  const pacing = calculatePacing(patternStartDistance, config.pacing);
  const difficultyEligible = filterPatternsForDifficulty(catalog, difficulty);
  const pacingEligible = filterPatternsForPacing(
    difficultyEligible,
    createPacingPatternRequest(pacing),
  );
  const variety = selectPatternsForVariety(pacingEligible, state.variety, config.variety);

  return Object.freeze({
    constraints: createDifficultyPatternValidationConstraints(difficulty, baseConstraints),
    deferredCatalog: variety.deferredCatalog,
    difficulty,
    nextPolicyBoundaryDistance: getNextPolicyBoundaryDistance(difficulty, pacing),
    pacing,
    primaryCatalog: variety.candidateCatalog,
  });
};

const createWindow = (startSeconds: number, endSeconds: number): EncounterReadabilityWindow =>
  Object.freeze({ startSeconds, endSeconds });

/** Converts one candidate into the relative-time windows consumed by the shared budget authority. */
export const createLiveEncounterReadabilityReservation = (
  pattern: Readonly<HazardPattern>,
  encounterId: string,
  patternStartDistance: number,
  runDistance: number,
  scrollSpeed: number,
  playerExtents: Readonly<PrototypePlayerCollisionExtents>,
): Readonly<EncounterReadabilityReservation> => {
  if (!Number.isFinite(scrollSpeed) || scrollSpeed <= 0) {
    throw new RangeError('Live encounter readability scrollSpeed must be positive and finite.');
  }

  const warningWindows: EncounterReadabilityWindow[] = [];
  const lethalWindows: EncounterReadabilityWindow[] = [];

  for (const entry of pattern.entries) {
    if (isTelegraphedHazardBehavior(entry.behavior)) {
      const { activeSeconds, lockSeconds, warningSeconds } = entry.behavior.lifecycle.durations;
      const lethalStart = warningSeconds + lockSeconds;
      warningWindows.push(createWindow(0, lethalStart));
      lethalWindows.push(createWindow(lethalStart, lethalStart + activeSeconds));
      continue;
    }

    const collisionStart = Math.max(
      0,
      (patternStartDistance + entry.hitbox.left - playerExtents.right - runDistance) / scrollSpeed,
    );
    const collisionEnd =
      (patternStartDistance + entry.hitbox.right + playerExtents.left - runDistance) / scrollSpeed;
    if (collisionEnd > collisionStart) {
      lethalWindows.push(createWindow(collisionStart, collisionEnd));
    }
  }

  const allWindows = [...warningWindows, ...lethalWindows];
  if (allWindows.length === 0) {
    throw new RangeError('Live encounter must contribute at least one readability window.');
  }

  return createEncounterReadabilityCandidate(pattern, encounterId, {
    activeWindow: createWindow(
      Math.min(...allWindows.map((window) => window.startSeconds)),
      Math.max(...allWindows.map((window) => window.endSeconds)),
    ),
    lethalWindows,
    warningWindows,
  });
};

export const evaluateLiveEncounterReadability = (
  catalog: ReadonlyArray<Readonly<HazardPattern>>,
  state: Readonly<LiveEncounterPolicyState>,
  pacing: Readonly<PacingSnapshot>,
  encounterSequence: number,
  patternStartDistance: number,
  runDistance: number,
  scrollSpeed: number,
  playerExtents: Readonly<PrototypePlayerCollisionExtents>,
  config: Readonly<LiveEncounterPolicyConfig> = PROTOTYPE_LIVE_ENCOUNTER_POLICY_CONFIG,
): ReadonlyArray<Readonly<LiveEncounterReadabilityEvaluation>> =>
  Object.freeze(
    catalog.map((pattern) => {
      const reservation = createLiveEncounterReadabilityReservation(
        pattern,
        `${encounterSequence}:${pattern.id}:${patternStartDistance}`,
        patternStartDistance,
        runDistance,
        scrollSpeed,
        playerExtents,
      );
      return Object.freeze({
        decision: reserveEncounterReadabilityBudget(
          state.readability,
          { candidate: reservation, requestedLimits: createReadabilityLimits(pacing.intensity) },
          config.readability,
        ),
        intrinsicallyEligible:
          reserveEncounterReadabilityBudget(
            createEncounterReadabilityBudgetState([], config.readability),
            {
              candidate: reservation,
              requestedLimits: createReadabilityLimits(pacing.intensity),
            },
            config.readability,
          ).status === 'reserved',
        pattern,
        reservation,
      });
    }),
  );

const selectRepresentativeExitStates = (
  states: ReadonlyArray<Readonly<{ positionY: number; velocityY: number }>>,
): ReadonlyArray<Readonly<{ positionY: number; velocityY: number }>> => {
  const unique = states.filter(
    (state, index) =>
      states.findIndex(
        (candidate) =>
          candidate.positionY === state.positionY && candidate.velocityY === state.velocityY,
      ) === index,
  );
  const byPosition = [...unique].sort(
    (first, second) => first.positionY - second.positionY || first.velocityY - second.velocityY,
  );
  const byVelocity = [...unique].sort(
    (first, second) => first.velocityY - second.velocityY || first.positionY - second.positionY,
  );
  const selected = [
    byPosition[0],
    byPosition[byPosition.length - 1],
    byVelocity[0],
    byVelocity[byVelocity.length - 1],
  ].filter(
    (state): state is Readonly<{ positionY: number; velocityY: number }> => state !== undefined,
  );

  return Object.freeze(
    selected.filter(
      (state, index) =>
        selected.findIndex(
          (candidate) =>
            candidate.positionY === state.positionY && candidate.velocityY === state.velocityY,
        ) === index,
    ),
  );
};

const advanceExitEnvelope = (
  envelope: Readonly<EncounterExitStateEnvelope>,
  targetRunDistance: number,
  scrollSpeed: number,
  flightTuning: Readonly<FlightTuningValues>,
  bounds: Readonly<VerticalFlightBounds>,
): Readonly<EncounterExitStateEnvelope> => {
  const elapsedSeconds = (targetRunDistance - envelope.runDistance) / scrollSpeed;
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) {
    throw new RangeError('Accepted encounter must advance beyond the previous exit envelope.');
  }
  const states = envelope.states.flatMap((state) => [
    Object.freeze(stepVerticalFlight(state, elapsedSeconds, true, flightTuning, bounds)),
    Object.freeze(stepVerticalFlight(state, elapsedSeconds, false, flightTuning, bounds)),
  ]);

  return createEncounterExitStateEnvelope({
    runDistance: targetRunDistance,
    states: selectRepresentativeExitStates(states),
  });
};

export const createLiveEncounterTransitionContext = (
  state: Readonly<LiveEncounterPolicyState>,
  reachability: Readonly<Omit<PatternReachabilityContext, 'availableReactionTimeSeconds'>>,
  scrollSpeed: number,
): Readonly<EncounterTransitionContext> =>
  Object.freeze({
    exitEnvelope: state.exitEnvelope,
    flightTuning: reachability.flightTuning,
    playerExtents: reachability.playerExtents,
    scrollSpeed,
  });

/** Commits only the accepted candidate to variety, readability, and the next transition envelope. */
export const recordAcceptedLiveEncounter = (
  state: Readonly<LiveEncounterPolicyState>,
  pattern: Readonly<HazardPattern>,
  readability: Readonly<EncounterReadabilityBudgetDecision>,
  patternStartDistance: number,
  scrollSpeed: number,
  reachability: Readonly<Omit<PatternReachabilityContext, 'availableReactionTimeSeconds'>>,
  constraints: Readonly<PatternValidationConstraints>,
  config: Readonly<LiveEncounterPolicyConfig> = PROTOTYPE_LIVE_ENCOUNTER_POLICY_CONFIG,
): Readonly<LiveEncounterPolicyState> => {
  if (readability.status !== 'reserved') {
    throw new TypeError('Only a readability-reserved encounter may enter the live stream.');
  }
  const bounds = Object.freeze({
    ceilingY: constraints.playableTop + reachability.playerExtents.top,
    floorY: constraints.playableBottom - reachability.playerExtents.bottom,
  });

  return Object.freeze({
    ...state,
    exitEnvelope: advanceExitEnvelope(
      state.exitEnvelope,
      patternStartDistance + pattern.runLength,
      scrollSpeed,
      reachability.flightTuning,
      bounds,
    ),
    readability: readability.state,
    variety: recordAcceptedEncounterForVariety(state.variety, pattern, config.variety),
  });
};

export const scaleLiveEncounterRunMotion = (
  baseRunMotion: Readonly<RunMotionValues>,
  runDistance: number,
  config: Readonly<LiveEncounterPolicyConfig> = PROTOTYPE_LIVE_ENCOUNTER_POLICY_CONFIG,
): Readonly<RunMotionValues> =>
  scaleRunMotionForDifficulty(baseRunMotion, calculateDifficulty(runDistance, config.difficulty));
