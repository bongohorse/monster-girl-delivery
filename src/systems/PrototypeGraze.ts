import type { RunMotionValues } from '../config/RunMotionConfig';
import {
  isPlayerCollidingWithHazardDuringStep,
  type LogicalHazard,
  type LogicalHazardCollisionInterval,
  PROTOTYPE_PLAYER_COLLISION_EXTENTS,
  type PrototypePlayerCollisionExtents,
} from './HazardCollision';
import type { RunMotionState } from './RunMotionSimulation';
import type { VerticalFlightTrajectory } from './VerticalFlightSimulation';

/**
 * PROTOTYPE M5 near-miss footprint. The lethal core continues to use
 * PROTOTYPE_PLAYER_COLLISION_EXTENTS; these larger logical extents are independent of sprite bounds.
 */
export const PROTOTYPE_PLAYER_GRAZE_EXTENTS: Readonly<PrototypePlayerCollisionExtents> =
  Object.freeze({
    left: 26,
    right: 26,
    top: 32,
    bottom: 32,
  });

export interface PrototypeGrazeRunState {
  /** Deduplication history for occurrences still in the collision stream, not the whole run. */
  readonly consumedOccurrenceIds: ReadonlyArray<string>;
  readonly count: number;
  readonly pendingOccurrenceIds: ReadonlyArray<string>;
}

export interface PrototypeGrazeStepResult {
  readonly grazeDelta: number;
  readonly lethalCollision: boolean;
  readonly state: Readonly<PrototypeGrazeRunState>;
}

export const EMPTY_PROTOTYPE_GRAZE_RUN_STATE: Readonly<PrototypeGrazeRunState> = Object.freeze({
  consumedOccurrenceIds: Object.freeze([]),
  count: 0,
  pendingOccurrenceIds: Object.freeze([]),
});

type IdentifiedLogicalHazard = LogicalHazard & {
  readonly grazeOccurrenceId?: unknown;
  readonly entryId?: unknown;
  readonly patternEntryIndex?: unknown;
  readonly patternId?: unknown;
  readonly runDistance?: unknown;
};

/**
 * Reuses the generated spawn identity tuple when present. Focused headless tests may supply the
 * explicit grazeOccurrenceId seam without needing generation-domain fixtures.
 */
const getGrazeOccurrenceId = (hazard: Readonly<LogicalHazard>): string | null => {
  const identified = hazard as Readonly<IdentifiedLogicalHazard>;
  if (typeof identified.grazeOccurrenceId === 'string' && identified.grazeOccurrenceId.length > 0) {
    return identified.grazeOccurrenceId;
  }

  if (
    typeof identified.patternId === 'string' &&
    Number.isInteger(identified.patternEntryIndex) &&
    typeof identified.entryId === 'string' &&
    typeof identified.runDistance === 'number' &&
    Number.isFinite(identified.runDistance)
  ) {
    return `${identified.patternId}:${identified.patternEntryIndex}:${identified.entryId}:${identified.runDistance}`;
  }

  return null;
};

const getHazardInterval = (
  hazard: Readonly<LogicalHazard>,
  elapsedSeconds: number,
): Readonly<LogicalHazardCollisionInterval> =>
  hazard.collisionInterval ?? { startSeconds: 0, endSeconds: elapsedSeconds };

const getHorizontalOpportunityBounds = (
  initialDistance: number,
  scrollSpeed: number,
  hazard: Readonly<LogicalHazard>,
  extents: Readonly<PrototypePlayerCollisionExtents>,
): Readonly<LogicalHazardCollisionInterval> | null => {
  const minimumDistance = hazard.hitbox.left - extents.right;
  const maximumDistance = hazard.hitbox.right + extents.left;
  if (scrollSpeed === 0) {
    return initialDistance > minimumDistance && initialDistance < maximumDistance
      ? { startSeconds: Number.NEGATIVE_INFINITY, endSeconds: Number.POSITIVE_INFINITY }
      : null;
  }

  const firstSeconds = (minimumDistance - initialDistance) / scrollSpeed;
  const secondSeconds = (maximumDistance - initialDistance) / scrollSpeed;
  return {
    startSeconds: Math.min(firstSeconds, secondSeconds),
    endSeconds: Math.max(firstSeconds, secondSeconds),
  };
};

/**
 * Returns the earliest point in this step after which a previously observed outer-zone contact is
 * fully qualified as a near miss. The complete outer horizontal opportunity must have passed, or an
 * explicitly final lifecycle interval must have ended. This is a conservative ordering boundary, not
 * a physical TOI, and deliberately cannot use the earlier end of the smaller lethal-core window as
 * proof that a vertically later Graze happened before another hazard's lethal contact.
 */
const getGrazeResolutionSeconds = (
  initialDistance: number,
  scrollSpeed: number,
  hazard: Readonly<LogicalHazard>,
  elapsedSeconds: number,
): number | null => {
  const bounds = getHorizontalOpportunityBounds(
    initialDistance,
    scrollSpeed,
    hazard,
    PROTOTYPE_PLAYER_GRAZE_EXTENTS,
  );
  let resolutionSeconds = bounds?.endSeconds ?? Number.POSITIVE_INFINITY;

  if (hazard.collisionEndsAtIntervalEnd && hazard.collisionInterval) {
    resolutionSeconds = Math.min(resolutionSeconds, hazard.collisionInterval.endSeconds);
  }

  return resolutionSeconds <= elapsedSeconds ? Math.max(0, resolutionSeconds) : null;
};

/**
 * Reuses the existing continuous collision authority on the prefix ending at a Graze resolution
 * boundary. This answers only whether a lethal overlap has already happened by that deterministic
 * boundary; it does not calculate or expose an exact physical time of impact.
 */
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
 * Evaluates lethal core collision and optional Graze from the same continuous trajectory/lifecycle
 * interval. Entering the outer zone only marks an occurrence pending. It is awarded after that outer
 * opportunity has safely resolved without a core hit, preventing a fine partition from counting a
 * pre-lethal outer-zone touch that a coarse terminal step would suppress. In a terminal step,
 * resolved different-hazard candidates are retained only when the existing continuous collision
 * authority confirms that no lethal overlap has happened by that candidate's resolution boundary.
 * The boundary is deterministic qualification state, not unsupported physical TOI ordering.
 */
export const evaluatePrototypeGrazeStep = (
  state: Readonly<PrototypeGrazeRunState>,
  initialRunState: Readonly<RunMotionState>,
  trajectory: Readonly<VerticalFlightTrajectory>,
  elapsedSeconds: number,
  runMotionTuning: Readonly<RunMotionValues>,
  hazards: ReadonlyArray<Readonly<LogicalHazard>>,
): PrototypeGrazeStepResult => {
  // The lifecycle adapter omits Active intervals on zero-delta pause/resize updates. Preserve
  // qualification history through that transient absence while retaining the core collision rule.
  if (elapsedSeconds === 0) {
    return {
      grazeDelta: 0,
      lethalCollision: hazards.some((hazard) =>
        isPlayerCollidingWithHazardDuringStep(
          initialRunState,
          trajectory,
          elapsedSeconds,
          runMotionTuning,
          hazard,
        ),
      ),
      state,
    };
  }

  // Persistent hazards remain until stream eviction; telegraphed occurrences have one contiguous
  // Active phase and never reactivate. On positive steps absence therefore retires their history.
  const retainedOccurrenceIds = new Set<string>();
  for (const hazard of hazards) {
    const occurrenceId = getGrazeOccurrenceId(hazard);
    if (occurrenceId) {
      retainedOccurrenceIds.add(occurrenceId);
    }
  }
  const consumed = new Set(
    state.consumedOccurrenceIds.filter((occurrenceId) => retainedOccurrenceIds.has(occurrenceId)),
  );
  const pending = new Set(
    state.pendingOccurrenceIds.filter((occurrenceId) => retainedOccurrenceIds.has(occurrenceId)),
  );
  const lethalOccurrenceIds = new Set<string>();
  const lethalHazards: Array<Readonly<LogicalHazard>> = [];
  const resolvedCandidates = new Map<string, number>();
  let lethalCollision = false;

  for (const hazard of hazards) {
    const occurrenceId = getGrazeOccurrenceId(hazard);
    const coreHit = isPlayerCollidingWithHazardDuringStep(
      initialRunState,
      trajectory,
      elapsedSeconds,
      runMotionTuning,
      hazard,
    );

    if (coreHit) {
      lethalCollision = true;
      lethalHazards.push(hazard);
      if (occurrenceId) {
        lethalOccurrenceIds.add(occurrenceId);
        pending.delete(occurrenceId);
      }
      continue;
    }

    if (!occurrenceId || consumed.has(occurrenceId)) {
      continue;
    }

    if (
      isPlayerCollidingWithHazardDuringStep(
        initialRunState,
        trajectory,
        elapsedSeconds,
        runMotionTuning,
        hazard,
        PROTOTYPE_PLAYER_GRAZE_EXTENTS,
      )
    ) {
      pending.add(occurrenceId);
    }

    if (pending.has(occurrenceId)) {
      const resolutionSeconds = getGrazeResolutionSeconds(
        initialRunState.distance,
        runMotionTuning.baseScrollSpeed,
        hazard,
        elapsedSeconds,
      );
      if (resolutionSeconds !== null) {
        resolvedCandidates.set(occurrenceId, resolutionSeconds);
      }
    }
  }

  const awardedOccurrenceIds = [...resolvedCandidates]
    .filter(
      ([occurrenceId, resolutionSeconds]) =>
        !lethalOccurrenceIds.has(occurrenceId) &&
        (!lethalCollision ||
          !lethalHazards.some((hazard) =>
            hasLethalCollisionBy(
              initialRunState,
              trajectory,
              elapsedSeconds,
              runMotionTuning,
              hazard,
              resolutionSeconds,
            ),
          )),
    )
    .map(([occurrenceId]) => occurrenceId)
    .sort();

  for (const occurrenceId of awardedOccurrenceIds) {
    pending.delete(occurrenceId);
  }
  if (lethalCollision) {
    pending.clear();
  }

  if (
    awardedOccurrenceIds.length === 0 &&
    pending.size === state.pendingOccurrenceIds.length &&
    consumed.size === state.consumedOccurrenceIds.length
  ) {
    const samePending = state.pendingOccurrenceIds.every((occurrenceId) =>
      pending.has(occurrenceId),
    );
    if (samePending) {
      return { grazeDelta: 0, lethalCollision, state };
    }
  }

  return {
    grazeDelta: awardedOccurrenceIds.length,
    lethalCollision,
    state: Object.freeze({
      consumedOccurrenceIds: Object.freeze([...consumed, ...awardedOccurrenceIds]),
      count: state.count + awardedOccurrenceIds.length,
      pendingOccurrenceIds: Object.freeze([...pending].sort()),
    }),
  };
};
