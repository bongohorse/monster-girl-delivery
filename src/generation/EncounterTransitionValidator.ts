import {
  assertValidFlightTuningValues,
  type FlightTuningValues,
} from '../config/FlightTuningConfig';
import { getHazardSweptHitbox } from '../hazards/HazardArchetype';
import {
  assertValidPlayerCollisionExtents,
  type PrototypePlayerCollisionExtents,
} from '../systems/HazardCollision';
import type { VerticalFlightState } from '../systems/VerticalFlightSimulation';
import {
  evaluateFlightReachability,
  type FlightReachabilityResult,
  type VerticalCorridor,
} from './FlightReachability';
import type { HazardPattern } from './HazardPattern';
import {
  assertValidPatternValidationConstraints,
  getSafeVerticalCorridors,
  type PatternValidationConstraints,
} from './PatternValidator';

const MAX_PROTOTYPE_EXIT_STATES = 64;

/** Correlated representative states at the point where the previous encounter releases the player. */
export interface EncounterExitStateEnvelope {
  readonly runDistance: number;
  readonly states: ReadonlyArray<Readonly<VerticalFlightState>>;
}

export interface EncounterTransitionContext {
  readonly exitEnvelope: Readonly<EncounterExitStateEnvelope>;
  readonly flightTuning: Readonly<FlightTuningValues>;
  readonly playerExtents: Readonly<PrototypePlayerCollisionExtents>;
  /** Positive logical run-distance units per simulation second. */
  readonly scrollSpeed: number;
}

export interface EncounterEntryRequirement {
  readonly absoluteRunDistance: number;
  readonly entryIds: ReadonlyArray<string>;
  readonly localRunDistance: number;
  readonly safeCorridors: ReadonlyArray<Readonly<VerticalCorridor>>;
}

export interface EncounterTransitionStateEvaluation {
  readonly exitState: Readonly<VerticalFlightState>;
  readonly exitStateIndex: number;
  readonly reachability: Readonly<FlightReachabilityResult>;
}

export type EncounterTransitionFailureReason =
  | 'non-positive-transition-window'
  | 'next-entry-unreachable-from-exit-envelope';

export interface EncounterTransitionValidationResult {
  readonly availableTransitionTimeSeconds: number | null;
  readonly entryRequirement: Readonly<EncounterEntryRequirement> | null;
  readonly exitEnvelope: Readonly<EncounterExitStateEnvelope>;
  readonly failureReason: EncounterTransitionFailureReason | null;
  readonly reachableExitStateIndex: number | null;
  readonly stateEvaluations: ReadonlyArray<Readonly<EncounterTransitionStateEvaluation>>;
  readonly transitionDistance: number | null;
  readonly valid: boolean;
}

const assertNonNegativeFinite = (value: number, name: string): void => {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative finite number.`);
  }
};

/** Validates and snapshots a bounded, deterministic set of correlated exit states. */
export const createEncounterExitStateEnvelope = (
  envelope: Readonly<EncounterExitStateEnvelope>,
): Readonly<EncounterExitStateEnvelope> => {
  assertNonNegativeFinite(envelope.runDistance, 'Encounter exit runDistance');

  if (envelope.states.length === 0 || envelope.states.length > MAX_PROTOTYPE_EXIT_STATES) {
    throw new RangeError(
      `Encounter exit envelope must contain between 1 and ${MAX_PROTOTYPE_EXIT_STATES} states.`,
    );
  }

  const states = envelope.states.map((state) => {
    if (!Number.isFinite(state.positionY) || !Number.isFinite(state.velocityY)) {
      throw new RangeError('Encounter exit flight states must be finite.');
    }

    return Object.freeze({ positionY: state.positionY, velocityY: state.velocityY });
  });

  return Object.freeze({ runDistance: envelope.runDistance, states: Object.freeze(states) });
};

const getEntryRequirement = (
  pattern: Readonly<HazardPattern>,
  patternStartDistance: number,
  constraints: Readonly<PatternValidationConstraints>,
): Readonly<EncounterEntryRequirement> | null => {
  const relevantEntries = pattern.entries.filter((entry) => {
    const sweptHitbox = getHazardSweptHitbox(entry);
    return (
      sweptHitbox.bottom > constraints.playableTop && sweptHitbox.top < constraints.playableBottom
    );
  });

  if (relevantEntries.length === 0) {
    return null;
  }

  const localRunDistance = Math.min(
    ...relevantEntries.map((entry) => getHazardSweptHitbox(entry).left),
  );
  const activeEntries = relevantEntries.filter((entry) => {
    const sweptHitbox = getHazardSweptHitbox(entry);
    return sweptHitbox.left <= localRunDistance && sweptHitbox.right > localRunDistance;
  });
  const safeCorridors = getSafeVerticalCorridors(activeEntries, constraints).filter(
    (corridor) => corridor.bottom - corridor.top >= constraints.minimumVerticalCorridor,
  );
  const absoluteRunDistance = patternStartDistance + localRunDistance;

  if (!Number.isFinite(absoluteRunDistance)) {
    throw new RangeError('Encounter entry run distance must remain finite.');
  }

  return Object.freeze({
    absoluteRunDistance,
    entryIds: Object.freeze(activeEntries.map((entry) => entry.id)),
    localRunDistance,
    safeCorridors: Object.freeze(safeCorridors),
  });
};

const createResult = (
  result: EncounterTransitionValidationResult,
): Readonly<EncounterTransitionValidationResult> =>
  Object.freeze({
    ...result,
    stateEvaluations: Object.freeze([...result.stateEvaluations]),
  });

/**
 * Checks the next encounter's first safe-corridor requirement against representative states from
 * the preceding encounter. This is deliberately a conservative prototype, not exhaustive
 * pathfinding; callers retain correlated position/velocity samples instead of combining unrelated
 * extrema. Pattern-local validity remains the responsibility of `validatePattern`.
 */
export const validateEncounterTransition = (
  pattern: Readonly<HazardPattern>,
  patternStartDistance: number,
  constraints: Readonly<PatternValidationConstraints>,
  context: Readonly<EncounterTransitionContext>,
): Readonly<EncounterTransitionValidationResult> => {
  assertNonNegativeFinite(patternStartDistance, 'Pattern start distance');
  assertValidPatternValidationConstraints(constraints);
  assertValidFlightTuningValues(context.flightTuning);
  assertValidPlayerCollisionExtents(context.playerExtents);

  if (!Number.isFinite(context.scrollSpeed) || context.scrollSpeed <= 0) {
    throw new RangeError('Encounter transition scrollSpeed must be a positive finite number.');
  }

  const exitEnvelope = createEncounterExitStateEnvelope(context.exitEnvelope);
  const ceilingY = constraints.playableTop + context.playerExtents.top;
  const floorY = constraints.playableBottom - context.playerExtents.bottom;

  if (floorY < ceilingY) {
    throw new RangeError('Player collision extents must fit within the playable vertical band.');
  }

  for (const state of exitEnvelope.states) {
    if (state.positionY < ceilingY || state.positionY > floorY) {
      throw new RangeError('Encounter exit state position must remain within playable bounds.');
    }
  }

  const entryRequirement = getEntryRequirement(pattern, patternStartDistance, constraints);

  if (entryRequirement === null) {
    return createResult({
      availableTransitionTimeSeconds: null,
      entryRequirement: null,
      exitEnvelope,
      failureReason: null,
      reachableExitStateIndex: null,
      stateEvaluations: [],
      transitionDistance: null,
      valid: true,
    });
  }

  const transitionDistance = entryRequirement.absoluteRunDistance - exitEnvelope.runDistance;

  if (transitionDistance <= 0) {
    return createResult({
      availableTransitionTimeSeconds: 0,
      entryRequirement,
      exitEnvelope,
      failureReason: 'non-positive-transition-window',
      reachableExitStateIndex: null,
      stateEvaluations: [],
      transitionDistance,
      valid: false,
    });
  }

  const availableTransitionTimeSeconds = transitionDistance / context.scrollSpeed;
  const stateEvaluations = exitEnvelope.states.map((exitState, exitStateIndex) =>
    Object.freeze({
      exitState,
      exitStateIndex,
      reachability: evaluateFlightReachability(
        entryRequirement.safeCorridors,
        { ceilingY, floorY },
        {
          availableReactionTimeSeconds: availableTransitionTimeSeconds,
          flightState: exitState,
          flightTuning: context.flightTuning,
          playerExtents: context.playerExtents,
        },
      ),
    }),
  );
  const reachableExitStateIndex =
    stateEvaluations.find((evaluation) => evaluation.reachability.reachable)?.exitStateIndex ??
    null;
  const valid = reachableExitStateIndex !== null;

  return createResult({
    availableTransitionTimeSeconds,
    entryRequirement,
    exitEnvelope,
    failureReason: valid ? null : 'next-entry-unreachable-from-exit-envelope',
    reachableExitStateIndex,
    stateEvaluations,
    transitionDistance,
    valid,
  });
};
