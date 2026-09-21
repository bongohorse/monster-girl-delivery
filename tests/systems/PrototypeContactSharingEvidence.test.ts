import { describe, expect, it } from 'vitest';
import { PROTOTYPE_FLIGHT_TUNING_DEFAULTS } from '../../src/config/FlightTuningConfig';
import type { LogicalCollectibleSpawnInstance } from '../../src/generation/GeneratedCollectibles';
import {
  createPrototypeZapperBehavior,
  createPrototypeZapperHitbox,
  PROTOTYPE_ZAPPER_GRAZE_PADDING,
} from '../../src/hazards/PrototypeZapperHazard';
import {
  createPrototypeZapperCollisionWorkCounters,
  evaluatePlayerPrototypeZapperCoreAndGrazeDuringStep,
  isPlayerCollidingWithPrototypeZapperDuringStep,
} from '../../src/systems/HazardCollision';
import { createPrototypeBroadphaseWorkCounters } from '../../src/systems/PrototypeBroadphaseWork';
import {
  EMPTY_PROTOTYPE_COLLECTIBLE_RUN_STATE,
  evaluatePrototypeCollectibleStep,
} from '../../src/systems/PrototypeCollectibles';
import {
  createPrototypeRunState,
  stepPrototypeRun,
} from '../../src/systems/PrototypeRunSimulation';
import { createVerticalFlightTrajectory } from '../../src/systems/VerticalFlightSimulation';

const BOUNDS = Object.freeze({ ceilingY: 28, floorY: 362 });
const MOTION = Object.freeze({ baseScrollSpeed: 350 });
const DELTA = 0.05;

// Bounded Director-style stress input, not a claim that AUTO generation admits this density.
// Real Zapper factories, normal flight tuning and the public run authority own all motion/contact.
const hazards = Array.from({ length: 8 }, (_, index) => {
  const behavior = createPrototypeZapperBehavior(0, 200, {
    direction: 'clockwise',
    speedDegreesPerSecond: 90,
  });
  const hitbox = createPrototypeZapperHitbox(17.5 + index * 5, index % 2 ? 235 : 155, behavior);
  return Object.freeze({
    behavior,
    entryId: `zapper-${index}`,
    hitbox,
    patternEntryIndex: index,
    patternId: 'contact-sharing-stress',
    runDistance: hitbox.left,
    type: 'placeholder-barrier' as const,
  });
});

const collectibles: ReadonlyArray<Readonly<LogicalCollectibleSpawnInstance>> = [34, 38, 42, 46].map(
  (runDistance, pathPointIndex) =>
    Object.freeze({
      intent: 'safe-guide',
      pathId: 'contact-sharing-coins',
      pathPointIndex,
      patternId: 'contact-sharing-stress',
      patternStartDistance: 0,
      runDistance,
      value: 1,
      y: 195,
    }),
);

const initial = createPrototypeRunState(BOUNDS);
const trajectory = createVerticalFlightTrajectory(
  initial.flight,
  DELTA,
  false,
  PROTOTYPE_FLIGHT_TUNING_DEFAULTS,
  BOUNDS,
);

describe('#331 contact-sharing work evidence', () => {
  it('reduces geometry work against separate core/outer queries on identical rotating inputs', () => {
    const shared = createPrototypeZapperCollisionWorkCounters();
    const separate = createPrototypeZapperCollisionWorkCounters();

    for (const hazard of hazards) {
      const paired = evaluatePlayerPrototypeZapperCoreAndGrazeDuringStep(
        initial.motion,
        trajectory,
        DELTA,
        MOTION,
        hazard,
        PROTOTYPE_ZAPPER_GRAZE_PADDING,
        undefined,
        shared,
      );
      const coreHit = isPlayerCollidingWithPrototypeZapperDuringStep(
        initial.motion,
        trajectory,
        DELTA,
        MOTION,
        hazard,
        undefined,
        undefined,
        separate,
      );
      const grazeHit = isPlayerCollidingWithPrototypeZapperDuringStep(
        initial.motion,
        trajectory,
        DELTA,
        MOTION,
        hazard,
        undefined,
        PROTOTYPE_ZAPPER_GRAZE_PADDING,
        separate,
      );

      expect(coreHit).toBe(false);
      expect(paired).toEqual({ coreHit, grazeHit });
    }

    expect(shared.collisionCallCount).toBe(hazards.length);
    expect(separate.collisionCallCount).toBe(hazards.length * 2);
    expect(shared.geometryResolutionCount).toBeGreaterThan(0);
    expect(shared.geometryResolutionCount).toBeLessThan(separate.geometryResolutionCount);
  });

  it('reuses the live lethal set for all pickups without repeating safe-hazard prefix checks', () => {
    const shared = createPrototypeBroadphaseWorkCounters();
    const separatePickup = createPrototypeBroadphaseWorkCounters();
    const liveZapperWork = createPrototypeZapperCollisionWorkCounters();
    const result = stepPrototypeRun(initial, DELTA, {
      broadphaseWorkCounters: shared,
      zapperCollisionWorkCounters: liveZapperWork,
      collectibles,
      flightBounds: BOUNDS,
      flightTuning: PROTOTYPE_FLIGHT_TUNING_DEFAULTS,
      hazards,
      runMotionTuning: MOTION,
      thrustHeld: false,
    });
    // Supported standalone fallback has no upstream lethal set. It must query each safe hazard
    // at each pickup prefix. Compare the same inputs/authority, not a copied collision algorithm.
    const standalone = evaluatePrototypeCollectibleStep(
      EMPTY_PROTOTYPE_COLLECTIBLE_RUN_STATE,
      initial.motion,
      trajectory,
      DELTA,
      MOTION,
      collectibles,
      hazards,
      null,
      undefined,
      separatePickup,
    );

    // x(t)=350t, y(t)=195+800t². Coin contact begins at (coinX-18-14)/350,
    // all four in (0, 0.05); y remains inside their pickup band. All must award once.
    expect(result.enteredDead).toBe(false);
    expect(result.state.collectibles?.collectedCount).toBe(4);
    expect(result.state.collectibles).toEqual(standalone);
    expect(liveZapperWork.collisionCallCount).toBe(hazards.length);
    expect(shared.hazardCandidateCount).toBe(hazards.length);
    expect(shared.hazardCollisionEvaluationCount).toBe(hazards.length);
    expect(separatePickup.hazardCollisionEvaluationCount).toBe(
      hazards.length * collectibles.length,
    );
    expect(shared.collectibleContactResolutionCount).toBe(collectibles.length);
  });
});
