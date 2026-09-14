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
 * Returns only the deterministic horizontal opportunity window inside this simulation step. This is
 * deliberately not a physical TOI: vertical qualification remains owned by continuous collision.
 */
const getHorizontalOpportunityWindow = (
  initialDistance: number,
  scrollSpeed: number,
  hazard: Readonly<LogicalHazard>,
  extents: Readonly<PrototypePlayerCollisionExtents>,
  elapsedSeconds: number,
): Readonly<LogicalHazardCollisionInterval> | null => {
  const interval = getHazardInterval(hazard, elapsedSeconds);
  if (interval.endSeconds <= interval.startSeconds) {
    return null;
  }

  const bounds = getHorizontalOpportunityBounds(initialDistance, scrollSpeed, hazard, extents);
  if (!bounds) {
    return null;
  }

  const startSeconds = Math.max(interval.startSeconds, bounds.startSeconds);
  const endSeconds = Math.min(interval.endSeconds, bounds.endSeconds);
  return endSeconds > startSeconds ? { startSeconds, endSeconds } : null;
};

/**
 * Returns the earliest point in this step after which this occurrence can no longer become a lethal
 * core hit. Horizontal passage is deterministic; an explicitly ending lifecycle interval can also
 * resolve the candidate. The value is a conservative qualification boundary, not a physical TOI.
 */
const getCoreResolutionSeconds = (
  initialDistance: number,
  scrollSpeed: number,
  hazard: Readonly<LogicalHazard>,
  elapsedSeconds: number,
): number | null => {
  const bounds = getHorizontalOpportunityBounds(
    initialDistance,
    scrollSpeed,
    hazard,
    PROTOTYPE_PLAYER_COLLISION_EXTENTS,
  );
  let resolutionSeconds = bounds?.endSeconds ?? Number.POSITIVE_INFINITY;

  if (hazard.collisionEndsAtIntervalEnd && hazard.collisionInterval) {
    resolutionSeconds = Math.min(resolutionSeconds, hazard.collisionInterval.endSeconds);
  }

  return resolutionSeconds <= elapsedSeconds ? Math.max(0, resolutionSeconds) : null;
};

/**
 * Evaluates lethal core collision and optional Graze from the same continuous trajectory/lifecycle
 * interval. Entering the outer zone only marks an occurrence pending. It is awarded after its lethal
 * core opportunity has safely resolved without a core hit, preventing a fine partition from counting
 * a pre-lethal outer-zone touch that a coarse terminal step would suppress. In a terminal step,
 * resolved different-hazard candidates are retained only when their resolution boundary is no later
 * than the earliest horizontal core-opportunity window of any lethal hazard. These are conservative
 * deterministic bounds, not unsupported physical TOI ordering.
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
  const resolvedCandidates = new Map<string, number>();
  let lethalCollision = false;
  let earliestLethalOpportunityStart = Number.POSITIVE_INFINITY;

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
      if (occurrenceId) {
        lethalOccurrenceIds.add(occurrenceId);
        pending.delete(occurrenceId);
      }
      const coreWindow = getHorizontalOpportunityWindow(
        initialRunState.distance,
        runMotionTuning.baseScrollSpeed,
        hazard,
        PROTOTYPE_PLAYER_COLLISION_EXTENTS,
        elapsedSeconds,
      );
      if (coreWindow) {
        earliestLethalOpportunityStart = Math.min(
          earliestLethalOpportunityStart,
          coreWindow.startSeconds,
        );
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
      const resolutionSeconds = getCoreResolutionSeconds(
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
        (!lethalCollision || resolutionSeconds <= earliestLethalOpportunityStart),
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
