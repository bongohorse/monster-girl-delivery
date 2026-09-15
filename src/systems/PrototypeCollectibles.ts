import type { RunMotionValues } from '../config/RunMotionConfig';
import {
  getLogicalCollectibleSpawnIdentity,
  type LogicalCollectibleSpawnInstance,
} from '../generation/GeneratedCollectibles';
import {
  isPlayerCollidingWithHazardDuringStep,
  type LogicalHazard,
  type LogicalHazardCollisionInterval,
  PROTOTYPE_PLAYER_COLLISION_EXTENTS,
} from './HazardCollision';
import type { RunMotionState } from './RunMotionSimulation';
import type {
  VerticalFlightTrajectory,
  VerticalFlightTrajectorySegment,
} from './VerticalFlightSimulation';

/** Pickup footprint intentionally reaches beyond the visible core coin for forgiving arcade contact. */
export const PROTOTYPE_COLLECTIBLE_HALF_SIZE = 14;

export interface PrototypeCollectibleRunState {
  readonly collectedCount: number;
  readonly collectedValue: number;
  readonly consumedCollectibleIds: ReadonlyArray<string>;
  readonly earnedReward: number;
  readonly pendingCollectibleIds: ReadonlyArray<string>;
}

export const EMPTY_PROTOTYPE_COLLECTIBLE_RUN_STATE: Readonly<PrototypeCollectibleRunState> =
  Object.freeze({
    collectedCount: 0,
    collectedValue: 0,
    consumedCollectibleIds: Object.freeze([]),
    earnedReward: 0,
    pendingCollectibleIds: Object.freeze([]),
  });

const getHazardInterval = (
  hazard: Readonly<LogicalHazard>,
  elapsedSeconds: number,
): Readonly<LogicalHazardCollisionInterval> =>
  hazard.collisionInterval ?? { startSeconds: 0, endSeconds: elapsedSeconds };

const createCollectibleHitbox = (
  collectible: Readonly<LogicalCollectibleSpawnInstance>,
): Readonly<LogicalHazard> =>
  Object.freeze({
    hitbox: Object.freeze({
      left: collectible.runDistance - PROTOTYPE_COLLECTIBLE_HALF_SIZE,
      right: collectible.runDistance + PROTOTYPE_COLLECTIBLE_HALF_SIZE,
      top: collectible.y - PROTOTYPE_COLLECTIBLE_HALF_SIZE,
      bottom: collectible.y + PROTOTYPE_COLLECTIBLE_HALF_SIZE,
    }),
  });

const evaluateSegmentPosition = (
  segment: Readonly<VerticalFlightTrajectorySegment>,
  elapsedSeconds: number,
): number => {
  const localSeconds = elapsedSeconds - segment.startSeconds;
  return (
    segment.positionY +
    segment.velocityY * localSeconds +
    0.5 * segment.accelerationY * localSeconds * localSeconds
  );
};

const addBoundaryRoots = (
  candidates: number[],
  segment: Readonly<VerticalFlightTrajectorySegment>,
  boundaryY: number,
  startSeconds: number,
  endSeconds: number,
): void => {
  const localStart = startSeconds - segment.startSeconds;
  const localEnd = endSeconds - segment.startSeconds;
  const a = 0.5 * segment.accelerationY;
  const b = segment.velocityY;
  const c = segment.positionY - boundaryY;
  const epsilon = 1e-12;
  const addLocalRoot = (localSeconds: number): void => {
    if (localSeconds < localStart - epsilon || localSeconds > localEnd + epsilon) {
      return;
    }
    candidates.push(segment.startSeconds + Math.min(localEnd, Math.max(localStart, localSeconds)));
  };

  if (Math.abs(a) <= epsilon) {
    if (Math.abs(b) > epsilon) {
      addLocalRoot(-c / b);
    }
    return;
  }

  const discriminant = b * b - 4 * a * c;
  if (discriminant < -epsilon) {
    return;
  }

  const squareRoot = Math.sqrt(Math.max(0, discriminant));
  addLocalRoot((-b - squareRoot) / (2 * a));
  addLocalRoot((-b + squareRoot) / (2 * a));
};

const getFirstVerticalOverlapSeconds = (
  trajectory: Readonly<VerticalFlightTrajectory>,
  startSeconds: number,
  endSeconds: number,
  minimumCenterY: number,
  maximumCenterY: number,
): number | null => {
  for (const segment of trajectory.segments) {
    const segmentStart = Math.max(startSeconds, segment.startSeconds);
    const segmentEnd = Math.min(endSeconds, segment.endSeconds);
    if (segmentEnd < segmentStart) {
      continue;
    }

    const startPosition = evaluateSegmentPosition(segment, segmentStart);
    if (startPosition > minimumCenterY && startPosition < maximumCenterY) {
      return segmentStart;
    }

    const candidates = [segmentStart, segmentEnd];
    addBoundaryRoots(candidates, segment, minimumCenterY, segmentStart, segmentEnd);
    addBoundaryRoots(candidates, segment, maximumCenterY, segmentStart, segmentEnd);
    candidates.sort((first, second) => first - second);

    const uniqueCandidates: number[] = [];
    for (const candidate of candidates) {
      const previous = uniqueCandidates[uniqueCandidates.length - 1];
      if (previous === undefined || Math.abs(candidate - previous) > 1e-10) {
        uniqueCandidates.push(candidate);
      }
    }

    for (let index = 0; index < uniqueCandidates.length - 1; index += 1) {
      const intervalStart = uniqueCandidates[index];
      const intervalEnd = uniqueCandidates[index + 1];
      if (
        intervalStart === undefined ||
        intervalEnd === undefined ||
        intervalEnd <= intervalStart
      ) {
        continue;
      }
      const midpoint = intervalStart + (intervalEnd - intervalStart) / 2;
      const midpointPosition = evaluateSegmentPosition(segment, midpoint);
      if (midpointPosition > minimumCenterY && midpointPosition < maximumCenterY) {
        return intervalStart;
      }
    }
  }

  return null;
};

/** Returns the first contact boundary inside this step for immediate pickup and death ordering. */
const getFirstCollectibleContactSeconds = (
  initialDistance: number,
  scrollSpeed: number,
  trajectory: Readonly<VerticalFlightTrajectory>,
  collectible: Readonly<LogicalCollectibleSpawnInstance>,
  elapsedSeconds: number,
): number | null => {
  const hitbox = createCollectibleHitbox(collectible).hitbox;
  const minimumDistance = hitbox.left - PROTOTYPE_PLAYER_COLLISION_EXTENTS.right;
  const maximumDistance = hitbox.right + PROTOTYPE_PLAYER_COLLISION_EXTENTS.left;
  let horizontalStart = 0;
  let horizontalEnd = elapsedSeconds;

  if (scrollSpeed === 0) {
    if (initialDistance <= minimumDistance || initialDistance >= maximumDistance) {
      return null;
    }
  } else {
    const firstSeconds = (minimumDistance - initialDistance) / scrollSpeed;
    const secondSeconds = (maximumDistance - initialDistance) / scrollSpeed;
    horizontalStart = Math.max(0, Math.min(firstSeconds, secondSeconds));
    horizontalEnd = Math.min(elapsedSeconds, Math.max(firstSeconds, secondSeconds));
    if (horizontalEnd <= horizontalStart) {
      return null;
    }
  }

  return getFirstVerticalOverlapSeconds(
    trajectory,
    horizontalStart,
    horizontalEnd,
    hitbox.top - PROTOTYPE_PLAYER_COLLISION_EXTENTS.bottom,
    hitbox.bottom + PROTOTYPE_PLAYER_COLLISION_EXTENTS.top,
  );
};

const hasLethalCollisionBy = (
  initialRunState: Readonly<RunMotionState>,
  trajectory: Readonly<VerticalFlightTrajectory>,
  elapsedSeconds: number,
  runMotionTuning: Readonly<RunMotionValues>,
  hazard: Readonly<LogicalHazard>,
  boundarySeconds: number,
): boolean => {
  if (boundarySeconds <= 0) {
    return false;
  }

  const interval = getHazardInterval(hazard, elapsedSeconds);
  const boundedEndSeconds = Math.min(interval.endSeconds, boundarySeconds);
  if (boundedEndSeconds <= interval.startSeconds) {
    return false;
  }

  return isPlayerCollidingWithHazardDuringStep(
    initialRunState,
    trajectory,
    boundarySeconds,
    runMotionTuning,
    {
      ...hazard,
      collisionInterval: {
        startSeconds: interval.startSeconds,
        endSeconds: boundedEndSeconds,
      },
    },
  );
};

/**
 * Resolves M5 pickups from the same continuous player trajectory used by lethal collision/Graze.
 * A valid first overlap is awarded in the same simulation step, so presentation can remove the coin
 * immediately. If that step is also terminal, collision authority is queried only up to the exact
 * pickup contact boundary so a coin after an earlier lethal hit is never awarded.
 */
export const evaluatePrototypeCollectibleStep = (
  state: Readonly<PrototypeCollectibleRunState>,
  initialRunState: Readonly<RunMotionState>,
  trajectory: Readonly<VerticalFlightTrajectory>,
  elapsedSeconds: number,
  runMotionTuning: Readonly<RunMotionValues>,
  collectibles: ReadonlyArray<Readonly<LogicalCollectibleSpawnInstance>>,
  hazards: ReadonlyArray<Readonly<LogicalHazard>>,
): Readonly<PrototypeCollectibleRunState> => {
  if (elapsedSeconds === 0) {
    return state;
  }

  const retainedIds = new Set(collectibles.map(getLogicalCollectibleSpawnIdentity));
  const consumed = new Set(
    state.consumedCollectibleIds.filter((identity) => retainedIds.has(identity)),
  );
  const lethalHazards = hazards.filter((hazard) =>
    isPlayerCollidingWithHazardDuringStep(
      initialRunState,
      trajectory,
      elapsedSeconds,
      runMotionTuning,
      hazard,
    ),
  );
  const awarded: Array<Readonly<LogicalCollectibleSpawnInstance>> = [];

  for (const collectible of collectibles) {
    const identity = getLogicalCollectibleSpawnIdentity(collectible);
    if (consumed.has(identity)) {
      continue;
    }

    const pickupHazard = createCollectibleHitbox(collectible);
    if (
      !isPlayerCollidingWithHazardDuringStep(
        initialRunState,
        trajectory,
        elapsedSeconds,
        runMotionTuning,
        pickupHazard,
      )
    ) {
      continue;
    }

    const contactSeconds = getFirstCollectibleContactSeconds(
      initialRunState.distance,
      runMotionTuning.baseScrollSpeed,
      trajectory,
      collectible,
      elapsedSeconds,
    );
    if (
      contactSeconds === null ||
      lethalHazards.some((hazard) =>
        hasLethalCollisionBy(
          initialRunState,
          trajectory,
          elapsedSeconds,
          runMotionTuning,
          hazard,
          contactSeconds,
        ),
      )
    ) {
      continue;
    }

    consumed.add(identity);
    awarded.push(collectible);
  }

  if (awarded.length === 0) {
    return state;
  }

  awarded.sort((first, second) =>
    getLogicalCollectibleSpawnIdentity(first).localeCompare(
      getLogicalCollectibleSpawnIdentity(second),
    ),
  );
  const collectedValueDelta = awarded.reduce((total, collectible) => total + collectible.value, 0);

  return Object.freeze({
    collectedCount: state.collectedCount + awarded.length,
    collectedValue: state.collectedValue + collectedValueDelta,
    consumedCollectibleIds: Object.freeze([...consumed].sort()),
    earnedReward: state.earnedReward + collectedValueDelta,
    pendingCollectibleIds: Object.freeze([]),
  });
};
