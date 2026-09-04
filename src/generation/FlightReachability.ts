import {
  assertValidFlightTuningValues,
  type FlightTuningValues,
  PROTOTYPE_FLIGHT_TUNING_DEFAULTS,
} from '../config/FlightTuningConfig';
import {
  assertValidPlayerCollisionExtents,
  PROTOTYPE_PLAYER_COLLISION_EXTENTS,
  type PrototypePlayerCollisionExtents,
} from '../systems/HazardCollision';
import {
  stepVerticalFlight,
  type VerticalFlightBounds,
  type VerticalFlightState,
} from '../systems/VerticalFlightSimulation';
import { PROTOTYPE_HAZARD_REACTION_TIME_CONSTRAINT } from './HazardApproachTiming';

export interface VerticalCorridor {
  readonly bottom: number;
  readonly top: number;
}

export interface VerticalCenterRange {
  readonly bottom: number;
  readonly top: number;
}

export interface PatternReachabilityContext {
  readonly availableReactionTimeSeconds: number;
  readonly flightState: Readonly<VerticalFlightState>;
  readonly flightTuning: Readonly<FlightTuningValues>;
  readonly playerExtents: Readonly<PrototypePlayerCollisionExtents>;
}

/** PROTOTYPE centered/resting validation context; callers may supply current logical state. */
export const PROTOTYPE_PATTERN_REACHABILITY_CONTEXT: Readonly<PatternReachabilityContext> =
  Object.freeze({
    availableReactionTimeSeconds:
      PROTOTYPE_HAZARD_REACTION_TIME_CONSTRAINT.minimumReactionTimeSeconds,
    flightState: Object.freeze({ positionY: 195, velocityY: 0 }),
    flightTuning: PROTOTYPE_FLIGHT_TUNING_DEFAULTS,
    playerExtents: PROTOTYPE_PLAYER_COLLISION_EXTENTS,
  });

export type FlightReachabilityFailureReason =
  | 'no-player-sized-corridor'
  | 'safe-corridor-above-reachable-envelope'
  | 'safe-corridor-below-reachable-envelope'
  | 'safe-corridors-outside-reachable-envelope';

export interface FlightReachabilityResult {
  readonly availableReactionTimeSeconds: number;
  readonly downwardExtreme: Readonly<VerticalFlightState>;
  readonly failureReason: FlightReachabilityFailureReason | null;
  readonly reachable: boolean;
  readonly reachableCenterRange: Readonly<VerticalCenterRange>;
  readonly reachableTargetCenterRange: Readonly<VerticalCenterRange> | null;
  readonly targetCenterRanges: ReadonlyArray<Readonly<VerticalCenterRange>>;
  readonly upwardExtreme: Readonly<VerticalFlightState>;
}

const assertFiniteFlightState = (state: Readonly<VerticalFlightState>): void => {
  if (!Number.isFinite(state.positionY) || !Number.isFinite(state.velocityY)) {
    throw new RangeError('Reachability flight state must be finite.');
  }
};

const assertPositiveReactionTime = (availableReactionTimeSeconds: number): void => {
  if (!Number.isFinite(availableReactionTimeSeconds) || availableReactionTimeSeconds <= 0) {
    throw new RangeError('Reachability reaction time must be a positive finite number.');
  }
};

const createCenterRange = (top: number, bottom: number): Readonly<VerticalCenterRange> =>
  Object.freeze({ top, bottom });

const createTargetCenterRanges = (
  corridors: ReadonlyArray<Readonly<VerticalCorridor>>,
  playerExtents: Readonly<PrototypePlayerCollisionExtents>,
): ReadonlyArray<Readonly<VerticalCenterRange>> => {
  const ranges = corridors
    .map((corridor) => {
      if (
        !Number.isFinite(corridor.top) ||
        !Number.isFinite(corridor.bottom) ||
        corridor.bottom <= corridor.top
      ) {
        throw new RangeError('Reachability corridors must be finite and have positive height.');
      }

      return {
        top: corridor.top + playerExtents.top,
        bottom: corridor.bottom - playerExtents.bottom,
      };
    })
    .filter((range) => range.top <= range.bottom)
    .sort((first, second) => first.top - second.top || first.bottom - second.bottom)
    .map((range) => createCenterRange(range.top, range.bottom));

  return Object.freeze(ranges);
};

const intersectRanges = (
  first: Readonly<VerticalCenterRange>,
  second: Readonly<VerticalCenterRange>,
): Readonly<VerticalCenterRange> | null => {
  const top = Math.max(first.top, second.top);
  const bottom = Math.min(first.bottom, second.bottom);

  return top <= bottom ? createCenterRange(top, bottom) : null;
};

const classifyFailure = (
  reachableCenterRange: Readonly<VerticalCenterRange>,
  targetCenterRanges: ReadonlyArray<Readonly<VerticalCenterRange>>,
): FlightReachabilityFailureReason => {
  if (targetCenterRanges.length === 0) {
    return 'no-player-sized-corridor';
  }

  if (targetCenterRanges.every((range) => range.bottom < reachableCenterRange.top)) {
    return 'safe-corridor-above-reachable-envelope';
  }

  if (targetCenterRanges.every((range) => range.top > reachableCenterRange.bottom)) {
    return 'safe-corridor-below-reachable-envelope';
  }

  return 'safe-corridors-outside-reachable-envelope';
};

/**
 * Computes a conservative vertical center-position envelope at one encounter time.
 * The existing analytical flight integrator supplies the continuous-thrust upward extreme and
 * released-input downward extreme. Touching a safe-range edge is reachable because collision uses
 * positive-area overlap rather than treating edge contact as a hit.
 */
export const evaluateFlightReachability = (
  corridors: ReadonlyArray<Readonly<VerticalCorridor>>,
  bounds: Readonly<VerticalFlightBounds>,
  context: Readonly<PatternReachabilityContext>,
): Readonly<FlightReachabilityResult> => {
  assertPositiveReactionTime(context.availableReactionTimeSeconds);
  assertFiniteFlightState(context.flightState);
  assertValidFlightTuningValues(context.flightTuning);
  assertValidPlayerCollisionExtents(context.playerExtents);

  const targetCenterRanges = createTargetCenterRanges(corridors, context.playerExtents);
  const upwardExtreme = Object.freeze(
    stepVerticalFlight(
      context.flightState,
      context.availableReactionTimeSeconds,
      true,
      context.flightTuning,
      bounds,
    ),
  );
  const downwardExtreme = Object.freeze(
    stepVerticalFlight(
      context.flightState,
      context.availableReactionTimeSeconds,
      false,
      context.flightTuning,
      bounds,
    ),
  );
  const reachableCenterRange = createCenterRange(
    Math.min(upwardExtreme.positionY, downwardExtreme.positionY),
    Math.max(upwardExtreme.positionY, downwardExtreme.positionY),
  );
  const reachableTargetCenterRange =
    targetCenterRanges
      .map((targetRange) => intersectRanges(reachableCenterRange, targetRange))
      .find((intersection) => intersection !== null) ?? null;
  const reachable = reachableTargetCenterRange !== null;

  return Object.freeze({
    availableReactionTimeSeconds: context.availableReactionTimeSeconds,
    downwardExtreme,
    failureReason: reachable ? null : classifyFailure(reachableCenterRange, targetCenterRanges),
    reachable,
    reachableCenterRange,
    reachableTargetCenterRange,
    targetCenterRanges,
    upwardExtreme,
  });
};
