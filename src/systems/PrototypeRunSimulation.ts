import type { FlightTuningValues } from '../config/FlightTuningConfig';
import type { RunMotionValues } from '../config/RunMotionConfig';
import type { LogicalCollectibleSpawnInstance } from '../generation/GeneratedCollectibles';
import type { LogicalHazard, PrototypeZapperCollisionWorkCounters } from './HazardCollision';
import type { PrototypeBroadphaseWorkCounters } from './PrototypeBroadphaseWork';
import {
  EMPTY_PROTOTYPE_COLLECTIBLE_RUN_STATE,
  evaluatePrototypeCollectibleStep,
  type PrototypeCollectibleRunState,
} from './PrototypeCollectibles';
import {
  EMPTY_PROTOTYPE_GRAZE_RUN_STATE,
  evaluatePrototypeGrazeStep,
  filterPrototypeHazardCandidatesForStep,
  type PrototypeGrazeRunState,
} from './PrototypeGraze';
import {
  createPrototypeRunResultSnapshot,
  EMPTY_PROTOTYPE_RUN_RESULT_TOTALS,
  type PrototypeRunResultSnapshot,
  type PrototypeRunResultTotals,
} from './PrototypeRunResult';
import { type RunMotionState, stepRunMotion } from './RunMotionSimulation';
import {
  constrainVerticalFlightState,
  createVerticalFlightTrajectory,
  type VerticalFlightBounds,
  type VerticalFlightState,
} from './VerticalFlightSimulation';

export type PrototypeRunPhase = 'running' | 'dead';

export interface PrototypeRunState {
  collectibles?: Readonly<PrototypeCollectibleRunState>;
  flight: VerticalFlightState;
  motion: RunMotionState;
  phase: PrototypeRunPhase;
  graze?: Readonly<PrototypeGrazeRunState>;
  finalResult?: Readonly<PrototypeRunResultSnapshot>;
}

export interface PrototypeRunStepContext {
  /** Generated collectible stream ordered by nondecreasing runDistance. */
  collectibles?: ReadonlyArray<Readonly<LogicalCollectibleSpawnInstance>>;
  flightBounds: Readonly<VerticalFlightBounds>;
  flightTuning: Readonly<FlightTuningValues>;
  hazards: ReadonlyArray<Readonly<LogicalHazard>>;
  resultTotals?: Readonly<PrototypeRunResultTotals>;
  runMotionTuning: Readonly<RunMotionValues>;
  thrustHeld: boolean;
  /** Benchmark-only switch used to reproduce the pre-#330 shared hazard broadphase workload. */
  disableSharedHazardBroadphaseForPerformanceEvidence?: boolean;
  /** Optional additive instrumentation sink; gameplay writes counters but never reads them. */
  broadphaseWorkCounters?: PrototypeBroadphaseWorkCounters;
  /** Optional additive instrumentation sink; gameplay writes counters but never reads them. */
  zapperCollisionWorkCounters?: PrototypeZapperCollisionWorkCounters;
}

export interface PrototypeRunStepResult {
  enteredDead: boolean;
  state: PrototypeRunState;
}

export const createPrototypeRunState = (
  flightBounds: Readonly<VerticalFlightBounds>,
): PrototypeRunState => {
  const centeredFlight = constrainVerticalFlightState(
    {
      positionY: (flightBounds.ceilingY + flightBounds.floorY) / 2,
      velocityY: 0,
    },
    flightBounds,
  );

  return {
    phase: 'running',
    motion: { distance: 0, simulationSeconds: 0 },
    flight: centeredFlight,
  };
};

/**
 * Advances one authoritative run step. Lethal core collision, Graze, and M5 collectible pickup
 * inspect the same continuous player trajectory. Positive-step lethal-core contacts resolved by
 * Graze are reused by collectible ordering, avoiding a second full-step collision pass. One
 * conservative horizontal hazard candidate set is shared by Graze and collectible death ordering so
 * retained hazards that cannot reach the player this step never enter exact contact/narrowphase work.
 * Graze retention still observes the full stream for occurrence history. Pickup
 * qualification still resolves prefix ordering before the immutable terminal result is created, so
 * presentation never owns collection and a coarse terminal step cannot award a pickup after death.
 */
export const stepPrototypeRun = (
  state: Readonly<PrototypeRunState>,
  elapsedSeconds: number,
  context: Readonly<PrototypeRunStepContext>,
): PrototypeRunStepResult => {
  if (state.phase === 'dead') {
    return { state, enteredDead: false };
  }

  const motion = stepRunMotion(state.motion, elapsedSeconds, context.runMotionTuning);
  const flightTrajectory = createVerticalFlightTrajectory(
    state.flight,
    elapsedSeconds,
    context.thrustHeld,
    context.flightTuning,
    context.flightBounds,
  );
  const flight = { ...flightTrajectory.finalState };
  const disableSharedHazardBroadphase =
    context.disableSharedHazardBroadphaseForPerformanceEvidence === true;
  const hazardCandidates = disableSharedHazardBroadphase
    ? context.hazards
    : filterPrototypeHazardCandidatesForStep(
        state.motion,
        elapsedSeconds,
        context.runMotionTuning,
        context.hazards,
        context.broadphaseWorkCounters,
      );
  if (disableSharedHazardBroadphase && elapsedSeconds > 0 && context.broadphaseWorkCounters) {
    context.broadphaseWorkCounters.hazardRetainedCount += context.hazards.length;
    context.broadphaseWorkCounters.hazardCandidateCount += context.hazards.length;
  }
  const grazeResult = evaluatePrototypeGrazeStep(
    state.graze ?? EMPTY_PROTOTYPE_GRAZE_RUN_STATE,
    state.motion,
    flightTrajectory,
    elapsedSeconds,
    context.runMotionTuning,
    context.hazards,
    context.zapperCollisionWorkCounters,
    hazardCandidates,
    context.broadphaseWorkCounters,
  );
  const graze =
    state.graze || grazeResult.state.count > 0 || grazeResult.state.pendingOccurrenceIds.length > 0
      ? grazeResult.state
      : undefined;
  const collectibleResult = evaluatePrototypeCollectibleStep(
    state.collectibles ?? EMPTY_PROTOTYPE_COLLECTIBLE_RUN_STATE,
    state.motion,
    flightTrajectory,
    elapsedSeconds,
    context.runMotionTuning,
    context.collectibles ?? [],
    hazardCandidates,
    grazeResult.resolvedLethalHazards,
    context.zapperCollisionWorkCounters,
    context.broadphaseWorkCounters,
  );
  const collectibles =
    state.collectibles ||
    collectibleResult.collectedCount > 0 ||
    collectibleResult.consumedCollectibleIds.length > 0 ||
    collectibleResult.pendingCollectibleIds.length > 0
      ? collectibleResult
      : undefined;

  if (!grazeResult.lethalCollision) {
    return {
      enteredDead: false,
      state: {
        phase: 'running',
        motion,
        flight,
        ...(graze ? { graze } : {}),
        ...(collectibles ? { collectibles } : {}),
      },
    };
  }

  const suppliedTotals = context.resultTotals ?? EMPTY_PROTOTYPE_RUN_RESULT_TOTALS;
  const finalTotals: PrototypeRunResultTotals = {
    collectedCount: collectibles?.collectedCount ?? suppliedTotals.collectedCount,
    collectedValue: collectibles?.collectedValue ?? suppliedTotals.collectedValue,
    earnedReward: collectibles?.earnedReward ?? suppliedTotals.earnedReward,
    grazeCount: graze?.count ?? suppliedTotals.grazeCount,
  };

  return {
    enteredDead: true,
    state: {
      phase: 'dead',
      motion,
      flight,
      ...(graze ? { graze } : {}),
      ...(collectibles ? { collectibles } : {}),
      finalResult: createPrototypeRunResultSnapshot(motion.distance, finalTotals),
    },
  };
};
