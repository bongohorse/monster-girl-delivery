import type { RunMotionValues } from '../config/RunMotionConfig';
import {
  isPlayerCollidingWithHazardDuringStep,
  PROTOTYPE_PLAYER_COLLISION_EXTENTS,
  type LogicalHazard,
  type LogicalHazardCollisionInterval,
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
  readonly consumedOccurrenceIds: ReadonlyArray<string>;
  readonly count: number;
}

export interface PrototypeGrazeStepResult {
  readonly grazeDelta: number;
  readonly lethalCollision: boolean;
  readonly state: Readonly<PrototypeGrazeRunState>;
}

export const EMPTY_PROTOTYPE_GRAZE_RUN_STATE: Readonly<PrototypeGrazeRunState> = Object.freeze({
  consumedOccurrenceIds: Object.freeze([]),
  count: 0,
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
): Readonly<LogicalHazardCollisionInterval> | null => {
  const interval = hazard.collisionInterval ?? { startSeconds: 0, endSeconds: elapsedSeconds };
  return interval.endSeconds > interval.startSeconds ? interval : null;
};

/**
 * Returns only the deterministic horizontal opportunity window. This is deliberately not a physical
 * TOI: vertical qualification remains owned by the existing continuous collision authority.
 */
const getHorizontalOpportunityWindow = (
  initialDistance: number,
  scrollSpeed: number,
  hazard: Readonly<LogicalHazard>,
  extents: Readonly<PrototypePlayerCollisionExtents>,
  elapsedSeconds: number,
): Readonly<LogicalHazardCollisionInterval> | null => {
  const interval = getHazardInterval(hazard, elapsedSeconds);
  if (!interval) {
    return null;
  }

  const minimumDistance = hazard.hitbox.left - extents.right;
  const maximumDistance = hazard.hitbox.right + extents.left;
  if (scrollSpeed === 0) {
    return initialDistance > minimumDistance && initialDistance < maximumDistance ? interval : null;
  }

  const firstSeconds = (minimumDistance - initialDistance) / scrollSpeed;
  const secondSeconds = (maximumDistance - initialDistance) / scrollSpeed;
  const startSeconds = Math.max(interval.startSeconds, Math.min(firstSeconds, secondSeconds));
  const endSeconds = Math.min(interval.endSeconds, Math.max(firstSeconds, secondSeconds));
  return endSeconds > startSeconds ? { startSeconds, endSeconds } : null;
};

/**
 * Evaluates lethal core collision and optional Graze from the same continuous trajectory/lifecycle
 * interval. Same-occurrence lethal overlap always wins. When a terminal step contains different
 * hazards, a Graze is retained only when its complete horizontal opportunity window ends no later
 * than the earliest horizontal core-opportunity window of any lethal hazard. This conservative rule
 * is partition-stable without claiming unsupported physical TOI ordering.
 */
export const evaluatePrototypeGrazeStep = (
  state: Readonly<PrototypeGrazeRunState>,
  initialRunState: Readonly<RunMotionState>,
  trajectory: Readonly<VerticalFlightTrajectory>,
  elapsedSeconds: number,
  runMotionTuning: Readonly<RunMotionValues>,
  hazards: ReadonlyArray<Readonly<LogicalHazard>>,
): PrototypeGrazeStepResult => {
  const consumed = new Set(state.consumedOccurrenceIds);
  const lethalOccurrenceIds = new Set<string>();
  const grazeCandidates = new Map<string, Readonly<LogicalHazardCollisionInterval>>();
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

    const grazes = isPlayerCollidingWithHazardDuringStep(
      initialRunState,
      trajectory,
      elapsedSeconds,
      runMotionTuning,
      hazard,
      PROTOTYPE_PLAYER_GRAZE_EXTENTS,
    );
    if (!grazes) {
      continue;
    }

    const grazeWindow = getHorizontalOpportunityWindow(
      initialRunState.distance,
      runMotionTuning.baseScrollSpeed,
      hazard,
      PROTOTYPE_PLAYER_GRAZE_EXTENTS,
      elapsedSeconds,
    );
    if (grazeWindow) {
      grazeCandidates.set(occurrenceId, grazeWindow);
    }
  }

  const awardedOccurrenceIds = [...grazeCandidates]
    .filter(
      ([occurrenceId, grazeWindow]) =>
        !lethalOccurrenceIds.has(occurrenceId) &&
        (!lethalCollision || grazeWindow.endSeconds <= earliestLethalOpportunityStart),
    )
    .map(([occurrenceId]) => occurrenceId)
    .sort();

  if (awardedOccurrenceIds.length === 0) {
    return { grazeDelta: 0, lethalCollision, state };
  }

  return {
    grazeDelta: awardedOccurrenceIds.length,
    lethalCollision,
    state: Object.freeze({
      consumedOccurrenceIds: Object.freeze([
        ...state.consumedOccurrenceIds,
        ...awardedOccurrenceIds,
      ]),
      count: state.count + awardedOccurrenceIds.length,
    }),
  };
};
