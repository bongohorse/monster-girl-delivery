import type { RunMotionValues } from '../config/RunMotionConfig';
import {
  isPlayerCollidingWithHazardDuringStep,
  type LogicalHazard,
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

/**
 * Evaluates lethal core collision and optional Graze from the same continuous trajectory/lifecycle
 * interval. Same-occurrence lethal overlap always wins. Different-hazard Graze candidates in a
 * terminal enclosing step are retained because collision exposes no chronological TOI; candidates
 * are sorted by stable occurrence identity so array order cannot become an event-order authority.
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
  const grazeCandidates = new Set<string>();
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
      if (occurrenceId) {
        lethalOccurrenceIds.add(occurrenceId);
      }
      continue;
    }

    if (
      occurrenceId &&
      !consumed.has(occurrenceId) &&
      isPlayerCollidingWithHazardDuringStep(
        initialRunState,
        trajectory,
        elapsedSeconds,
        runMotionTuning,
        hazard,
        PROTOTYPE_PLAYER_GRAZE_EXTENTS,
      )
    ) {
      grazeCandidates.add(occurrenceId);
    }
  }

  const awardedOccurrenceIds = [...grazeCandidates]
    .filter((occurrenceId) => !lethalOccurrenceIds.has(occurrenceId))
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
