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
import { getHazardSweptHitbox, isTelegraphedHazardBehavior } from '../hazards/HazardArchetype';
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
import {
  constrainVerticalFlightState,
  stepVerticalFlight,
  type VerticalFlightBounds,
} from '../systems/VerticalFlightSimulation';
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
  type EncounterVarietySelection,
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
  readonly flightTuning: Readonly<FlightTuningValues>;
  readonly exitEnvelope: Readonly<EncounterExitStateEnvelope>;
  readonly pacing: Readonly<PacingSnapshot>;
  readonly readability: Readonly<EncounterReadabilityBudgetState>;
  readonly variety: Readonly<EncounterVarietyHistoryState>;
}

/** Reconciles retained history at resize without advancing time or sampling new trajectories. */
export const constrainLiveEncounterPolicy = (
  state: Readonly<LiveEncounterPolicyState>,
  bounds: Readonly<VerticalFlightBounds>,
): Readonly<LiveEncounterPolicyState> => {
  const states = state.exitEnvelope.states.map((flight) =>
    constrainVerticalFlightState(flight, bounds),
  );
  if (
    states.every(
      (flight, index) =>
        flight.positionY === state.exitEnvelope.states[index]?.positionY &&
        flight.velocityY === state.exitEnvelope.states[index]?.velocityY,
    )
  ) {
    return state;
  }
  return Object.freeze({
    ...state,
    exitEnvelope: createEncounterExitStateEnvelope({
      runDistance: state.exitEnvelope.runDistance,
      states,
    }),
  });
};

export interface LiveEncounterCandidateSelection {
  readonly variety: Readonly<EncounterVarietySelection>;
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
    flightTuning: Object.freeze({ ...reachability.flightTuning }),
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
    variety,
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
      // Pending content retains its applied speed, so these simulation-time windows
      // map to deterministic pacing distances. Include lead-in and phase crossings.
      const occupiedLimits = createReservationPacingLimits(
        reservation,
        runDistance,
        scrollSpeed,
        config,
      );
      const candidateLimits = createReadabilityLimits(pacing.intensity);
      const requestedLimits = intersectReadabilityLimits(candidateLimits, occupiedLimits);
      return Object.freeze({
        decision: reserveEncounterReadabilityBudget(
          state.readability,
          { candidate: reservation, requestedLimits },
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

const intersectReadabilityLimits = (
  first: Readonly<EncounterReadabilityLimits>,
  second: Readonly<EncounterReadabilityLimits>,
): Readonly<EncounterReadabilityLimits> =>
  Object.freeze({
    maximumActivePressureCost: Math.min(
      first.maximumActivePressureCost,
      second.maximumActivePressureCost,
    ),
    maximumActiveReadabilityCost: Math.min(
      first.maximumActiveReadabilityCost,
      second.maximumActiveReadabilityCost,
    ),
    maximumConcurrentWarnings: Math.min(
      first.maximumConcurrentWarnings,
      second.maximumConcurrentWarnings,
    ),
    maximumConcurrentLethalWindows: Math.min(
      first.maximumConcurrentLethalWindows,
      second.maximumConcurrentLethalWindows,
    ),
  });

/** Use the strictest occupied phase; half-open windows allow an exact phase-end handoff. */
const createReservationPacingLimits = (
  reservation: Readonly<EncounterReadabilityReservation>,
  runDistance: number,
  scrollSpeed: number,
  config: Readonly<LiveEncounterPolicyConfig>,
): Readonly<EncounterReadabilityLimits> => {
  const startDistance = runDistance + reservation.activeWindow.startSeconds * scrollSpeed;
  const endDistance = runDistance + reservation.activeWindow.endSeconds * scrollSpeed;
  let phase = calculatePacing(startDistance, config.pacing);
  let limits = createReadabilityLimits(phase.intensity);
  if (endDistance - startDistance >= phase.cycleLength) {
    return config.pacing.phases.reduce(
      (result, definition) =>
        intersectReadabilityLimits(result, createReadabilityLimits(definition.intensity)),
      limits,
    );
  }
  while (phase.phaseEndDistance < endDistance) {
    phase = calculatePacing(phase.phaseEndDistance, config.pacing);
    limits = intersectReadabilityLimits(limits, createReadabilityLimits(phase.intensity));
  }
  return limits;
};

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

/**
 * Bounded one-switch trajectories, checked against every swept hazard slab. Correlated
 * samples must survive the accepted geometry; failure to find a sample is fail-closed.
 */
export const deriveLiveEncounterExitEnvelope = (
  envelope: Readonly<EncounterExitStateEnvelope>,
  pattern: Readonly<HazardPattern>,
  patternStartDistance: number,
  scrollSpeed: number,
  reachability: Readonly<Omit<PatternReachabilityContext, 'availableReactionTimeSeconds'>>,
  constraints: Readonly<PatternValidationConstraints>,
): Readonly<EncounterExitStateEnvelope> | null => {
  const bounds: Readonly<VerticalFlightBounds> = {
    ceilingY: constraints.playableTop + reachability.playerExtents.top,
    floorY: constraints.playableBottom - reachability.playerExtents.bottom,
  };
  const lastRight = Math.max(...pattern.entries.map((entry) => getHazardSweptHitbox(entry).right));
  const clearanceDistance = patternStartDistance + lastRight + reachability.playerExtents.left;
  const targetRunDistance = Math.max(patternStartDistance + pattern.runLength, clearanceDistance);
  const elapsedSeconds = (clearanceDistance - envelope.runDistance) / scrollSpeed;
  if (elapsedSeconds <= 0) return null;
  const states = envelope.states.flatMap((state) => {
    const samples = [];
    for (let index = 0; index <= 32; index += 1) {
      for (const thrustFirst of [true, false]) {
        const firstSeconds = (elapsedSeconds * index) / 32;
        const intermediate = stepVerticalFlight(
          state,
          firstSeconds,
          thrustFirst,
          reachability.flightTuning,
          bounds,
        );
        const exit = stepVerticalFlight(
          intermediate,
          elapsedSeconds - firstSeconds,
          !thrustFirst,
          reachability.flightTuning,
          bounds,
        );
        const survives = pattern.entries.every((entry) => {
          const hitbox = getHazardSweptHitbox(entry);
          const collisionStart =
            (patternStartDistance +
              hitbox.left -
              reachability.playerExtents.right -
              envelope.runDistance) /
            scrollSpeed;
          const collisionEnd =
            (patternStartDistance +
              hitbox.right +
              reachability.playerExtents.left -
              envelope.runDistance) /
            scrollSpeed;
          return [
            { initial: state, start: 0, end: firstSeconds, thrust: thrustFirst },
            {
              initial: intermediate,
              start: firstSeconds,
              end: elapsedSeconds,
              thrust: !thrustFirst,
            },
          ].every((segment) => {
            const from = Math.max(segment.start, collisionStart);
            const to = Math.min(segment.end, collisionEnd);
            if (to <= from) return true;
            const acceleration =
              reachability.flightTuning.gravity -
              (segment.thrust ? reachability.flightTuning.thrust : 0);
            const initialVelocity = Math.min(
              reachability.flightTuning.maxFallVelocity,
              Math.max(-reachability.flightTuning.maxRiseVelocity, segment.initial.velocityY),
            );
            const turningTime = segment.start - initialVelocity / acceleration;
            const times = [from, to];
            if (turningTime > from && turningTime < to) times.push(turningTime);
            const positions = times.map(
              (time) =>
                stepVerticalFlight(
                  segment.initial,
                  time - segment.start,
                  segment.thrust,
                  reachability.flightTuning,
                  bounds,
                ).positionY,
            );
            return (
              Math.max(...positions) + reachability.playerExtents.bottom <= hitbox.top ||
              Math.min(...positions) - reachability.playerExtents.top >= hitbox.bottom
            );
          });
        });
        if (survives) {
          const recoverySeconds = (targetRunDistance - clearanceDistance) / scrollSpeed;
          samples.push(
            stepVerticalFlight(exit, recoverySeconds, true, reachability.flightTuning, bounds),
          );
          samples.push(
            stepVerticalFlight(exit, recoverySeconds, false, reachability.flightTuning, bounds),
          );
        }
      }
    }
    return samples;
  });
  if (states.length === 0) return null;

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

/** Rebase the historical exit through free recovery using the parameters that actually applied. */
export const rebaseLiveEncounterExitEnvelope = (
  state: Readonly<LiveEncounterPolicyState>,
  runDistance: number,
  scrollSpeed: number,
  reachability: Readonly<Omit<PatternReachabilityContext, 'availableReactionTimeSeconds'>>,
  constraints: Readonly<PatternValidationConstraints>,
): Readonly<EncounterExitStateEnvelope> => {
  if (runDistance <= state.exitEnvelope.runDistance || scrollSpeed === 0) return state.exitEnvelope;
  const elapsedSeconds = (runDistance - state.exitEnvelope.runDistance) / scrollSpeed;
  const bounds = {
    ceilingY: constraints.playableTop + reachability.playerExtents.top,
    floorY: constraints.playableBottom - reachability.playerExtents.bottom,
  };
  return createEncounterExitStateEnvelope({
    runDistance,
    states: selectRepresentativeExitStates(
      state.exitEnvelope.states.flatMap((flight) => [
        stepVerticalFlight(flight, elapsedSeconds, true, state.flightTuning, bounds),
        stepVerticalFlight(flight, elapsedSeconds, false, state.flightTuning, bounds),
      ]),
    ),
  });
};

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
  const exitEnvelope = deriveLiveEncounterExitEnvelope(
    state.exitEnvelope,
    pattern,
    patternStartDistance,
    scrollSpeed,
    reachability,
    constraints,
  );
  if (exitEnvelope === null) {
    throw new TypeError('Accepted encounter must have a representative exit state.');
  }

  return Object.freeze({
    ...state,
    exitEnvelope,
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
