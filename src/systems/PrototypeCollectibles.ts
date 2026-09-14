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
import type { VerticalFlightTrajectory } from './VerticalFlightSimulation';

export const PROTOTYPE_COLLECTIBLE_HALF_SIZE = 8;

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

const getCollectibleResolutionSeconds = (
  initialDistance: number,
  scrollSpeed: number,
  collectible: Readonly<LogicalCollectibleSpawnInstance>,
  elapsedSeconds: number,
): number | null => {
  if (scrollSpeed === 0) {
    return null;
  }

  const hitbox = createCollectibleHitbox(collectible).hitbox;
  const minimumDistance = hitbox.left - PROTOTYPE_PLAYER_COLLISION_EXTENTS.right;
  const maximumDistance = hitbox.right + PROTOTYPE_PLAYER_COLLISION_EXTENTS.left;
  const firstSeconds = (minimumDistance - initialDistance) / scrollSpeed;
  const secondSeconds = (maximumDistance - initialDistance) / scrollSpeed;
  const resolutionSeconds = Math.max(firstSeconds, secondSeconds);

  return resolutionSeconds <= elapsedSeconds ? Math.max(0, resolutionSeconds) : null;
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
 * A touched collectible remains pending until its complete horizontal pickup opportunity has passed.
 * On a terminal frame, the existing collision authority is queried on the prefix ending at that
 * deterministic resolution boundary, preventing a coarse step from awarding a pickup that occurred
 * only after death while still preserving pickups that were fully resolved before a later collision.
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
  const pending = new Set(
    state.pendingCollectibleIds.filter((identity) => retainedIds.has(identity)),
  );
  const resolvedCandidates = new Map<
    string,
    { collectible: Readonly<LogicalCollectibleSpawnInstance>; resolutionSeconds: number }
  >();
  const lethalHazards = hazards.filter((hazard) =>
    isPlayerCollidingWithHazardDuringStep(
      initialRunState,
      trajectory,
      elapsedSeconds,
      runMotionTuning,
      hazard,
    ),
  );

  for (const collectible of collectibles) {
    const identity = getLogicalCollectibleSpawnIdentity(collectible);
    if (consumed.has(identity)) {
      continue;
    }

    if (
      isPlayerCollidingWithHazardDuringStep(
        initialRunState,
        trajectory,
        elapsedSeconds,
        runMotionTuning,
        createCollectibleHitbox(collectible),
      )
    ) {
      pending.add(identity);
    }

    if (!pending.has(identity)) {
      continue;
    }

    const resolutionSeconds = getCollectibleResolutionSeconds(
      initialRunState.distance,
      runMotionTuning.baseScrollSpeed,
      collectible,
      elapsedSeconds,
    );
    if (resolutionSeconds !== null) {
      resolvedCandidates.set(identity, { collectible, resolutionSeconds });
    }
  }

  const awarded = [...resolvedCandidates]
    .filter(([, candidate]) =>
      lethalHazards.every(
        (hazard) =>
          !hasLethalCollisionBy(
            initialRunState,
            trajectory,
            elapsedSeconds,
            runMotionTuning,
            hazard,
            candidate.resolutionSeconds,
          ),
      ),
    )
    .sort(([firstIdentity], [secondIdentity]) => firstIdentity.localeCompare(secondIdentity));

  let collectedValueDelta = 0;
  for (const [identity, candidate] of awarded) {
    pending.delete(identity);
    consumed.add(identity);
    collectedValueDelta += candidate.collectible.value;
  }

  if (lethalHazards.length > 0) {
    pending.clear();
  }

  if (
    awarded.length === 0 &&
    consumed.size === state.consumedCollectibleIds.length &&
    pending.size === state.pendingCollectibleIds.length &&
    state.consumedCollectibleIds.every((identity) => consumed.has(identity)) &&
    state.pendingCollectibleIds.every((identity) => pending.has(identity))
  ) {
    return state;
  }

  return Object.freeze({
    collectedCount: state.collectedCount + awarded.length,
    collectedValue: state.collectedValue + collectedValueDelta,
    consumedCollectibleIds: Object.freeze([...consumed].sort()),
    earnedReward: state.earnedReward + collectedValueDelta,
    pendingCollectibleIds: Object.freeze([...pending].sort()),
  });
};