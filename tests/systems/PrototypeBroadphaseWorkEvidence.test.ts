import { describe, expect, it } from 'vitest';
import type { LogicalCollectibleSpawnInstance } from '../../src/generation/GeneratedCollectibles';
import type { LogicalHazard } from '../../src/systems/HazardCollision';
import {
  createPrototypeBroadphaseWorkCounters,
  resetPrototypeBroadphaseWorkCounters,
} from '../../src/systems/PrototypeBroadphaseWork';
import {
  EMPTY_PROTOTYPE_COLLECTIBLE_RUN_STATE,
  evaluatePrototypeCollectibleStep,
} from '../../src/systems/PrototypeCollectibles';
import {
  createPrototypeRunState,
  stepPrototypeRun,
} from '../../src/systems/PrototypeRunSimulation';
import { createVerticalFlightTrajectory } from '../../src/systems/VerticalFlightSimulation';

const FLIGHT_BOUNDS = Object.freeze({ ceilingY: 0, floorY: 390 });
const FLIGHT_TUNING = Object.freeze({
  gravity: 0,
  thrust: 0,
  maxFallVelocity: 0,
  maxRiseVelocity: 0,
});
const RUN_MOTION = Object.freeze({ baseScrollSpeed: 100 });

const collectible = (
  pathId: string,
  runDistance: number,
): Readonly<LogicalCollectibleSpawnInstance> =>
  Object.freeze({
    intent: 'safe-guide',
    pathId,
    pathPointIndex: 0,
    patternId: 'broadphase-evidence',
    patternStartDistance: 0,
    runDistance,
    value: 1,
    y: 195,
  });

const hazard = (left: number): Readonly<LogicalHazard> =>
  Object.freeze({
    hitbox: Object.freeze({
      left,
      right: left + 10,
      top: 1_000,
      bottom: 1_010,
    }),
  });

describe('PrototypeBroadphaseWork evidence', () => {
  it('keeps exact hazard and collectible work bounded by nearby candidates', () => {
    const counters = createPrototypeBroadphaseWorkCounters();
    const farBehindCollectibles = Array.from({ length: 50 }, (_, index) =>
      collectible(`behind-${index}`, -10_000 + index),
    );
    const nearbyCollectible = collectible('nearby', 20);
    const farAheadCollectibles = Array.from({ length: 50 }, (_, index) =>
      collectible(`ahead-${index}`, 10_000 + index),
    );
    const farHazards = Array.from({ length: 100 }, (_, index) => hazard(10_000 + index * 20));
    const nearbyHazard = hazard(20);

    const result = stepPrototypeRun(createPrototypeRunState(FLIGHT_BOUNDS), 0.1, {
      broadphaseWorkCounters: counters,
      collectibles: [...farBehindCollectibles, nearbyCollectible, ...farAheadCollectibles],
      flightBounds: FLIGHT_BOUNDS,
      flightTuning: FLIGHT_TUNING,
      hazards: [...farHazards, nearbyHazard],
      runMotionTuning: RUN_MOTION,
      thrustHeld: false,
    });

    expect(result.enteredDead).toBe(false);
    expect(result.state.collectibles?.collectedCount).toBe(1);
    expect(counters).toEqual({
      collectibleCandidateCount: 1,
      collectibleCollisionEvaluationCount: 1,
      collectibleContactResolutionCount: 1,
      collectibleRetainedCount: 101,
      hazardCandidateCount: 1,
      hazardCollisionEvaluationCount: 1,
      hazardRetainedCount: 101,
    });
  });

  it('does not resolve first-contact timing for a candidate that fails exact pickup collision', () => {
    const counters = createPrototypeBroadphaseWorkCounters();
    const verticalMiss = Object.freeze({
      ...collectible('vertical-miss', 20),
      y: 1_000,
    });

    const result = stepPrototypeRun(createPrototypeRunState(FLIGHT_BOUNDS), 0.1, {
      broadphaseWorkCounters: counters,
      collectibles: [verticalMiss],
      flightBounds: FLIGHT_BOUNDS,
      flightTuning: FLIGHT_TUNING,
      hazards: [],
      runMotionTuning: RUN_MOTION,
      thrustHeld: false,
    });

    expect(result.enteredDead).toBe(false);
    expect(result.state.collectibles).toBeUndefined();
    expect(counters.collectibleCandidateCount).toBe(1);
    expect(counters.collectibleCollisionEvaluationCount).toBe(1);
    expect(counters.collectibleContactResolutionCount).toBe(0);
    expect(counters.hazardCollisionEvaluationCount).toBe(0);
  });

  it('uses the pickup prefix to reject future hazards without a redundant full-step fallback check', () => {
    const counters = createPrototypeBroadphaseWorkCounters();
    const initial = createPrototypeRunState(FLIGHT_BOUNDS);
    const trajectory = createVerticalFlightTrajectory(
      initial.flight,
      2,
      false,
      FLIGHT_TUNING,
      FLIGHT_BOUNDS,
    );
    const futureHazard: Readonly<LogicalHazard> = Object.freeze({
      collisionInterval: Object.freeze({ startSeconds: 1, endSeconds: 2 }),
      hitbox: Object.freeze({ left: 150, right: 170, top: 180, bottom: 210 }),
    });

    const result = evaluatePrototypeCollectibleStep(
      EMPTY_PROTOTYPE_COLLECTIBLE_RUN_STATE,
      initial.motion,
      trajectory,
      2,
      RUN_MOTION,
      [collectible('pickup-before-future-hazard', 100)],
      [futureHazard],
      null,
      undefined,
      counters,
    );

    expect(result.collectedCount).toBe(1);
    expect(result.earnedReward).toBe(1);
    expect(counters.collectibleCollisionEvaluationCount).toBe(1);
    expect(counters.collectibleContactResolutionCount).toBe(1);
    expect(counters.hazardCollisionEvaluationCount).toBe(0);
  });

  it('resets the additive evidence counters without replacing their owner', () => {
    const counters = createPrototypeBroadphaseWorkCounters();
    counters.collectibleCandidateCount = 7;
    counters.collectibleCollisionEvaluationCount = 5;
    counters.collectibleContactResolutionCount = 3;
    counters.collectibleRetainedCount = 100;
    counters.hazardCandidateCount = 9;
    counters.hazardCollisionEvaluationCount = 8;
    counters.hazardRetainedCount = 120;

    resetPrototypeBroadphaseWorkCounters(counters);

    expect(counters).toEqual(createPrototypeBroadphaseWorkCounters());
  });
});
