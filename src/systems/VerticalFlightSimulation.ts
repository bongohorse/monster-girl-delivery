import type { FlightTuningValues } from '../config/FlightTuningConfig';

/** Positive Y and positive velocity point downward; negative velocity points upward. */
export interface VerticalFlightState {
  positionY: number;
  velocityY: number;
}

/**
 * Inclusive limits for positionY. Callers derive these values from the safe world area and the
 * player's extents, so this simulation does not depend on a sprite size, resolution, or orientation.
 * Values must be finite and ceilingY must not exceed floorY; an equal pair is a valid pinned range.
 */
export interface VerticalFlightBounds {
  ceilingY: number;
  floorY: number;
}

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

const assertValidBounds = (bounds: Readonly<VerticalFlightBounds>): void => {
  if (
    !Number.isFinite(bounds.ceilingY) ||
    !Number.isFinite(bounds.floorY) ||
    bounds.ceilingY > bounds.floorY
  ) {
    throw new RangeError(
      'Flight bounds must be finite with ceilingY less than or equal to floorY.',
    );
  }
};

/**
 * Contains an existing state inside new bounds without advancing simulation time.
 * Velocity is preserved unless it points farther out of a boundary the state had to meet.
 */
export const constrainVerticalFlightState = (
  state: Readonly<VerticalFlightState>,
  bounds: Readonly<VerticalFlightBounds>,
): VerticalFlightState => {
  assertValidBounds(bounds);
  const positionY = clamp(state.positionY, bounds.ceilingY, bounds.floorY);
  const velocityPointsAboveCeiling = positionY === bounds.ceilingY && state.velocityY < 0;
  const velocityPointsBelowFloor = positionY === bounds.floorY && state.velocityY > 0;

  return {
    positionY,
    velocityY: velocityPointsAboveCeiling || velocityPointsBelowFloor ? 0 : state.velocityY,
  };
};

const calculateDisplacement = (
  initialVelocity: number,
  acceleration: number,
  finalVelocity: number,
  elapsedSeconds: number,
): number => {
  const acceleratedVelocity = initialVelocity + acceleration * elapsedSeconds;

  if (acceleration === 0 || acceleratedVelocity === finalVelocity) {
    return initialVelocity * elapsedSeconds + 0.5 * acceleration * elapsedSeconds * elapsedSeconds;
  }

  const secondsUntilLimit = clamp(
    (finalVelocity - initialVelocity) / acceleration,
    0,
    elapsedSeconds,
  );
  const acceleratingDisplacement =
    initialVelocity * secondsUntilLimit +
    0.5 * acceleration * secondsUntilLimit * secondsUntilLimit;

  return acceleratingDisplacement + finalVelocity * (elapsedSeconds - secondsUntilLimit);
};

interface VerticalBoundaryContact {
  readonly positionY: number;
  readonly seconds: number;
}

/** Forward-error budget for the bounded multiply/add operations in one analytical segment. */
const INTEGRATION_ROUNDING_OPERATIONS = 8;

const normalizeRootWithinDuration = (root: number, durationSeconds: number): number | null => {
  if (root <= 0) {
    return null;
  }

  // A root calculated from rounded state can exceed an exact segment endpoint by one arithmetic
  // rounding step. Keep this allowance at machine precision rather than gameplay time scale.
  const roundingAllowance = Number.EPSILON * Math.max(1, Math.abs(durationSeconds));
  return root <= durationSeconds + roundingAllowance ? Math.min(root, durationSeconds) : null;
};

const findFirstPositiveRoot = (
  positionY: number,
  velocityY: number,
  accelerationY: number,
  boundaryY: number,
  durationSeconds: number,
): number | null => {
  const constant = positionY - boundaryY;

  if (accelerationY === 0) {
    if (velocityY === 0) {
      return null;
    }

    const root = -constant / velocityY;
    return normalizeRootWithinDuration(root, durationSeconds);
  }

  const quadratic = 0.5 * accelerationY;
  const discriminant = velocityY * velocityY - 4 * quadratic * constant;
  if (discriminant < 0) {
    return null;
  }

  const squareRoot = Math.sqrt(discriminant);
  const q = -0.5 * (velocityY + (velocityY >= 0 ? squareRoot : -squareRoot));
  const firstRoot = q === 0 ? -velocityY / (2 * quadratic) : q / quadratic;
  const secondRoot = q === 0 ? null : constant / q;
  const validFirstRoot = normalizeRootWithinDuration(firstRoot, durationSeconds);
  const validSecondRoot =
    secondRoot === null ? null : normalizeRootWithinDuration(secondRoot, durationSeconds);

  if (validSecondRoot === null) {
    return validFirstRoot;
  }
  return validFirstRoot === null ? validSecondRoot : Math.min(validFirstRoot, validSecondRoot);
};

const findFirstContactInSegment = (
  positionY: number,
  velocityY: number,
  accelerationY: number,
  durationSeconds: number,
  bounds: Readonly<VerticalFlightBounds>,
): VerticalBoundaryContact | null => {
  const ceilingSeconds = findFirstPositiveRoot(
    positionY,
    velocityY,
    accelerationY,
    bounds.ceilingY,
    durationSeconds,
  );
  const floorSeconds = findFirstPositiveRoot(
    positionY,
    velocityY,
    accelerationY,
    bounds.floorY,
    durationSeconds,
  );

  if (ceilingSeconds === null) {
    return floorSeconds === null ? null : { positionY: bounds.floorY, seconds: floorSeconds };
  }
  if (floorSeconds === null || ceilingSeconds <= floorSeconds) {
    return { positionY: bounds.ceilingY, seconds: ceilingSeconds };
  }
  return { positionY: bounds.floorY, seconds: floorSeconds };
};

/** Finds the first bound reached along the same acceleration/cap path used for free flight. */
const findFirstBoundaryContact = (
  positionY: number,
  velocityY: number,
  elapsedSeconds: number,
  acceleration: number,
  finalVelocity: number,
  bounds: Readonly<VerticalFlightBounds>,
): VerticalBoundaryContact | null => {
  const acceleratedVelocity = velocityY + acceleration * elapsedSeconds;
  const reachesVelocityLimit = acceleration !== 0 && acceleratedVelocity !== finalVelocity;
  const secondsUntilLimit = reachesVelocityLimit
    ? clamp((finalVelocity - velocityY) / acceleration, 0, elapsedSeconds)
    : elapsedSeconds;
  const acceleratingContact = findFirstContactInSegment(
    positionY,
    velocityY,
    acceleration,
    secondsUntilLimit,
    bounds,
  );

  if (acceleratingContact !== null) {
    return acceleratingContact;
  }

  if (secondsUntilLimit >= elapsedSeconds) {
    return null;
  }

  const positionAtLimit =
    positionY + calculateDisplacement(velocityY, acceleration, finalVelocity, secondsUntilLimit);
  const cappedContact = findFirstContactInSegment(
    positionAtLimit,
    finalVelocity,
    0,
    elapsedSeconds - secondsUntilLimit,
    bounds,
  );

  return cappedContact === null
    ? null
    : { positionY: cappedContact.positionY, seconds: secondsUntilLimit + cappedContact.seconds };
};

const constrainIntegratedFlightState = (
  state: Readonly<VerticalFlightState>,
  bounds: Readonly<VerticalFlightBounds>,
): VerticalFlightState => {
  const ceilingRoundingAllowance =
    INTEGRATION_ROUNDING_OPERATIONS *
    Number.EPSILON *
    Math.max(1, Math.abs(state.positionY), Math.abs(bounds.ceilingY));
  const floorRoundingAllowance =
    INTEGRATION_ROUNDING_OPERATIONS *
    Number.EPSILON *
    Math.max(1, Math.abs(state.positionY), Math.abs(bounds.floorY));
  const outwardAtCeilingWithinResolution =
    state.velocityY < 0 &&
    state.positionY >= bounds.ceilingY &&
    state.positionY - bounds.ceilingY <= ceilingRoundingAllowance;
  const outwardAtFloorWithinResolution =
    state.velocityY > 0 &&
    state.positionY <= bounds.floorY &&
    bounds.floorY - state.positionY <= floorRoundingAllowance;

  if (outwardAtCeilingWithinResolution) {
    return { positionY: bounds.ceilingY, velocityY: 0 };
  }
  if (outwardAtFloorWithinResolution) {
    return { positionY: bounds.floorY, velocityY: 0 };
  }
  return constrainVerticalFlightState(state, bounds);
};

/**
 * Advances vertical flight using an elapsed-seconds value already normalized by TimeService.
 * Constant acceleration, velocity-limit crossings, and boundary contacts are integrated
 * analytically, limiting timestep-subdivision differences to floating-point rounding rather than
 * Euler drift. A mid-step boundary contact resets outward velocity at the exact contact time and
 * processes the remaining interval from the constrained state.
 * A positive-time step normalizes state against current bounds before advancing, so changed bounds
 * take effect without retaining outward velocity. Zero elapsed time validates bounds but preserves
 * the existing no-movement contract.
 */
export const stepVerticalFlight = (
  state: Readonly<VerticalFlightState>,
  elapsedSeconds: number,
  thrustHeld: boolean,
  tuning: Readonly<FlightTuningValues>,
  bounds: Readonly<VerticalFlightBounds>,
): VerticalFlightState => {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) {
    throw new RangeError('elapsedSeconds must be a non-negative finite number.');
  }

  assertValidBounds(bounds);

  if (elapsedSeconds === 0) {
    return { ...state };
  }

  const constrainedState = constrainVerticalFlightState(state, bounds);
  const minimumVelocity = -tuning.maxRiseVelocity;
  const maximumVelocity = tuning.maxFallVelocity;
  const initialVelocity = clamp(constrainedState.velocityY, minimumVelocity, maximumVelocity);
  const acceleration = tuning.gravity - (thrustHeld ? tuning.thrust : 0);

  if (bounds.ceilingY === bounds.floorY) {
    return { positionY: bounds.ceilingY, velocityY: 0 };
  }

  const pinnedAtCeiling =
    constrainedState.positionY === bounds.ceilingY && initialVelocity === 0 && acceleration <= 0;
  const pinnedAtFloor =
    constrainedState.positionY === bounds.floorY && initialVelocity === 0 && acceleration >= 0;
  if (pinnedAtCeiling || pinnedAtFloor) {
    return { positionY: constrainedState.positionY, velocityY: 0 };
  }

  const finalVelocity = clamp(
    initialVelocity + acceleration * elapsedSeconds,
    minimumVelocity,
    maximumVelocity,
  );
  const displacement = calculateDisplacement(
    initialVelocity,
    acceleration,
    finalVelocity,
    elapsedSeconds,
  );
  const contact = findFirstBoundaryContact(
    constrainedState.positionY,
    initialVelocity,
    elapsedSeconds,
    acceleration,
    finalVelocity,
    bounds,
  );

  if (contact !== null) {
    const remainingSeconds = elapsedSeconds - contact.seconds;
    const accelerationPointsOutward =
      contact.positionY === bounds.ceilingY ? acceleration <= 0 : acceleration >= 0;

    if (remainingSeconds === 0 || accelerationPointsOutward) {
      return { positionY: contact.positionY, velocityY: 0 };
    }

    // From rest, fixed inward acceleration is monotone until the opposite bound. If that bound is
    // reached, the same acceleration points outward there, so endpoint constraint is the exact
    // remaining-time result rather than another sampled contact response.
    const remainingFinalVelocity = clamp(
      acceleration * remainingSeconds,
      minimumVelocity,
      maximumVelocity,
    );
    const remainingDisplacement = calculateDisplacement(
      0,
      acceleration,
      remainingFinalVelocity,
      remainingSeconds,
    );

    return constrainIntegratedFlightState(
      {
        positionY: contact.positionY + remainingDisplacement,
        velocityY: remainingFinalVelocity,
      },
      bounds,
    );
  }

  return constrainIntegratedFlightState(
    {
      positionY: constrainedState.positionY + displacement,
      velocityY: finalVelocity,
    },
    bounds,
  );
};
