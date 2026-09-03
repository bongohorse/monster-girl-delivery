import type { RunMotionState } from './RunMotionSimulation';
import type { VerticalFlightState } from './VerticalFlightSimulation';

export interface LogicalHitbox {
  bottom: number;
  left: number;
  right: number;
  top: number;
}

export interface LogicalHazard {
  hitbox: Readonly<LogicalHitbox>;
}

export interface PrototypePlayerCollisionExtents {
  bottom: number;
  left: number;
  right: number;
  top: number;
}

/**
 * Temporary M2 collision footprint around the player's logical position. Callers may supply tuned
 * extents later without coupling the rule to a sprite or Phaser body.
 */
export const PROTOTYPE_PLAYER_COLLISION_EXTENTS: Readonly<PrototypePlayerCollisionExtents> =
  Object.freeze({
    left: 18,
    right: 18,
    top: 24,
    bottom: 24,
  });

const assertFiniteNonNegativeExtents = (
  extents: Readonly<PrototypePlayerCollisionExtents>,
): void => {
  if (
    !Number.isFinite(extents.left) ||
    extents.left < 0 ||
    !Number.isFinite(extents.right) ||
    extents.right < 0 ||
    !Number.isFinite(extents.top) ||
    extents.top < 0 ||
    !Number.isFinite(extents.bottom) ||
    extents.bottom < 0
  ) {
    throw new RangeError('Player collision extents must be finite and non-negative.');
  }
};

/** Creates the player's world-space logical hitbox from deterministic run and flight state. */
export const createPrototypePlayerHitbox = (
  runState: Readonly<RunMotionState>,
  flightState: Readonly<VerticalFlightState>,
  extents: Readonly<PrototypePlayerCollisionExtents> = PROTOTYPE_PLAYER_COLLISION_EXTENTS,
): LogicalHitbox => {
  if (!Number.isFinite(runState.distance) || !Number.isFinite(flightState.positionY)) {
    throw new RangeError('Player run distance and vertical position must be finite.');
  }
  assertFiniteNonNegativeExtents(extents);

  return {
    left: runState.distance - extents.left,
    right: runState.distance + extents.right,
    top: flightState.positionY - extents.top,
    bottom: flightState.positionY + extents.bottom,
  };
};

/**
 * Pure positive-area AABB overlap. Hitboxes that only share an edge do not overlap, keeping the
 * collision boundary explicit and stable across renderers.
 */
export const doLogicalHitboxesOverlap = (
  first: Readonly<LogicalHitbox>,
  second: Readonly<LogicalHitbox>,
): boolean =>
  first.left < second.right &&
  first.right > second.left &&
  first.top < second.bottom &&
  first.bottom > second.top;

/** Tests the current logical player state against one hazard without consulting presentation. */
export const isPlayerCollidingWithHazard = (
  runState: Readonly<RunMotionState>,
  flightState: Readonly<VerticalFlightState>,
  hazard: Readonly<LogicalHazard>,
  playerExtents: Readonly<PrototypePlayerCollisionExtents> = PROTOTYPE_PLAYER_COLLISION_EXTENTS,
): boolean =>
  doLogicalHitboxesOverlap(
    createPrototypePlayerHitbox(runState, flightState, playerExtents),
    hazard.hitbox,
  );
