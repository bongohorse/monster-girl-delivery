import { describe, expect, it } from 'vitest';
import {
  createPrototypeZapperBehavior,
  createPrototypeZapperHitbox,
  PROTOTYPE_ZAPPER_GRAZE_PADDING,
  PROTOTYPE_ZAPPER_LENGTHS,
  PROTOTYPE_ZAPPER_ROTATION_SPEEDS,
} from '../../src/hazards/PrototypeZapperHazard';
import {
  createPrototypeZapperCollisionWorkCounters,
  evaluatePlayerPrototypeZapperCoreAndGrazeDuringStep,
  isPlayerCollidingWithPrototypeZapperDuringStep,
  type PrototypeZapperCollisionWorkCounters,
} from '../../src/systems/HazardCollision';
import { createVerticalFlightTrajectory } from '../../src/systems/VerticalFlightSimulation';
import { type FrameSchedule, STANDARD_FRAME_SCHEDULES } from '../support/FramePartitionHarness';

const FLIGHT_TUNING = Object.freeze({
  gravity: 0,
  thrust: 0,
  maxFallVelocity: 1_000,
  maxRiseVelocity: 1_000,
});
const FLIGHT_BOUNDS = Object.freeze({ ceilingY: -2_000, floorY: 2_000 });
const NO_SCROLL = Object.freeze({ baseScrollSpeed: 0 });
const NORMAL_SCROLL = Object.freeze({ baseScrollSpeed: 350 });

const createStationaryTrajectory = (positionY: number, elapsedSeconds: number) =>
  createVerticalFlightTrajectory(
    { positionY, velocityY: 0 },
    elapsedSeconds,
    false,
    FLIGHT_TUNING,
    FLIGHT_BOUNDS,
  );

const createZapper = (
  rotating: boolean,
  centerX = 0,
  rotationSpeedDegreesPerSecond: number = PROTOTYPE_ZAPPER_ROTATION_SPEEDS.fast,
) => {
  const behavior = createPrototypeZapperBehavior(
    0,
    PROTOTYPE_ZAPPER_LENGTHS.long,
    rotating
      ? {
          direction: 'clockwise',
          speedDegreesPerSecond: rotationSpeedDegreesPerSecond,
        }
      : undefined,
  );
  const hitbox = createPrototypeZapperHitbox(centerX, 0, behavior);
  return Object.freeze({
    behavior,
    entryId: rotating ? 'work-evidence-rotating' : 'work-evidence-static',
    hitbox,
    patternEntryIndex: 0,
    patternId: 'zapper-work-evidence',
    runDistance: hitbox.left,
    type: 'placeholder-barrier' as const,
  });
};

const collectOneSecondPartitionedWork = (
  schedule: Readonly<FrameSchedule>,
  rotating: boolean,
): PrototypeZapperCollisionWorkCounters => {
  const hazard = createZapper(
    rotating,
    0,
    rotating ? PROTOTYPE_ZAPPER_ROTATION_SPEEDS.slow : PROTOTYPE_ZAPPER_ROTATION_SPEEDS.fast,
  );
  const counters = createPrototypeZapperCollisionWorkCounters();
  const playerPositionY = rotating ? 120 : 39;
  let elapsedSeconds = 0;
  let stepIndex = 0;

  while (elapsedSeconds < 1 - 1e-12) {
    const deltaSeconds = Math.min(
      schedule.getNextDelta(elapsedSeconds, stepIndex),
      1 - elapsedSeconds,
    );
    stepIndex += 1;

    expect(
      isPlayerCollidingWithPrototypeZapperDuringStep(
        { distance: 0, simulationSeconds: elapsedSeconds },
        createStationaryTrajectory(playerPositionY, deltaSeconds),
        deltaSeconds,
        NO_SCROLL,
        hazard,
        undefined,
        undefined,
        counters,
      ),
    ).toBe(false);

    elapsedSeconds += deltaSeconds;
  }

  return counters;
};

describe('M5 Zapper collision work evidence', () => {
  it('pins the current 1/720-second lattice cost for one 100 ms no-scroll pass', () => {
    const staticCounters = createPrototypeZapperCollisionWorkCounters();
    const rotatingCounters = createPrototypeZapperCollisionWorkCounters();

    expect(
      isPlayerCollidingWithPrototypeZapperDuringStep(
        { distance: 0, simulationSeconds: 0 },
        createStationaryTrajectory(39, 0.1),
        0.1,
        NO_SCROLL,
        createZapper(false),
        undefined,
        undefined,
        staticCounters,
      ),
    ).toBe(false);
    expect(
      isPlayerCollidingWithPrototypeZapperDuringStep(
        { distance: 0, simulationSeconds: 0 },
        createStationaryTrajectory(39, 0.1),
        0.1,
        NO_SCROLL,
        createZapper(true),
        undefined,
        undefined,
        rotatingCounters,
      ),
    ).toBe(false);

    expect(staticCounters).toMatchObject({
      candidateSampleCount: 1,
      evaluatedSampleCount: 1,
      geometryResolutionCount: 1,
      primaryNarrowphaseCheckCount: 1,
    });
    expect(rotatingCounters).toMatchObject({
      candidateSampleCount: 73,
      evaluatedSampleCount: 73,
      geometryResolutionCount: 73,
      primaryNarrowphaseCheckCount: 73,
    });
  });

  it('uses one exact swept-AABB check for static horizontal-only motion at normal scroll', () => {
    const counters = createPrototypeZapperCollisionWorkCounters();

    expect(
      isPlayerCollidingWithPrototypeZapperDuringStep(
        { distance: -120, simulationSeconds: 0 },
        createStationaryTrajectory(0, 1),
        1,
        NORMAL_SCROLL,
        createZapper(false),
        undefined,
        undefined,
        counters,
      ),
    ).toBe(true);

    expect(counters).toMatchObject({
      broadphaseRejectedCallCount: 0,
      candidateSampleCount: 1,
      collisionCallCount: 1,
      evaluatedSampleCount: 1,
      geometryResolutionCount: 1,
      primaryNarrowphaseCheckCount: 1,
    });
  });

  it('pins the current dual time + 0.5px distance lattice cost at normal scroll speed', () => {
    const counters = createPrototypeZapperCollisionWorkCounters();

    expect(
      isPlayerCollidingWithPrototypeZapperDuringStep(
        { distance: 0, simulationSeconds: 0 },
        createStationaryTrajectory(47, 0.1),
        0.1,
        NORMAL_SCROLL,
        createZapper(true, 17.5),
        undefined,
        undefined,
        counters,
      ),
    ).toBe(false);

    expect(counters).toMatchObject({
      broadphaseRejectedCallCount: 0,
      candidateSampleCount: 141,
      collisionCallCount: 1,
      evaluatedSampleCount: 141,
      geometryResolutionCount: 141,
      primaryNarrowphaseCheckCount: 141,
    });
  });

  it('pins the current shared core + Graze miss cost without a second geometry pass', () => {
    const counters = createPrototypeZapperCollisionWorkCounters();

    expect(
      evaluatePlayerPrototypeZapperCoreAndGrazeDuringStep(
        { distance: 0, simulationSeconds: 0 },
        createStationaryTrajectory(47, 0.1),
        0.1,
        NO_SCROLL,
        createZapper(true),
        PROTOTYPE_ZAPPER_GRAZE_PADDING,
        undefined,
        counters,
      ),
    ).toEqual({ coreHit: false, grazeHit: false });

    expect(counters).toMatchObject({
      candidateSampleCount: 73,
      evaluatedSampleCount: 73,
      geometryResolutionCount: 73,
      primaryNarrowphaseCheckCount: 73,
      secondaryNarrowphaseCheckCount: 73,
    });
  });

  it('records the current one-second rotating workload across the #143 frame schedules', () => {
    const expectedCandidateSamples = {
      '30hz': 771,
      '60hz': 829,
      '90hz': 887,
      '120hz': 948,
      '144hz': 1_005,
      jittered: 835,
    } as const;

    for (const [name, schedule] of Object.entries(STANDARD_FRAME_SCHEDULES)) {
      const counters = collectOneSecondPartitionedWork(schedule, true);
      expect(counters.candidateSampleCount).toBe(
        expectedCandidateSamples[name as keyof typeof expectedCandidateSamples],
      );
      expect(counters.evaluatedSampleCount).toBe(counters.candidateSampleCount);
      expect(counters.geometryResolutionCount).toBe(counters.evaluatedSampleCount);
      expect(counters.primaryNarrowphaseCheckCount).toBe(counters.evaluatedSampleCount);
      expect(counters.secondaryNarrowphaseCheckCount).toBe(0);
    }
  });

  it('shows static geometry reuse removes geometry churn but not the dense time lattice', () => {
    const staticCounters = collectOneSecondPartitionedWork(STANDARD_FRAME_SCHEDULES['60hz'], false);
    const rotatingCounters = collectOneSecondPartitionedWork(
      STANDARD_FRAME_SCHEDULES['60hz'],
      true,
    );

    expect(staticCounters.candidateSampleCount).toBe(60);
    expect(staticCounters.evaluatedSampleCount).toBe(60);
    expect(staticCounters.geometryResolutionCount).toBe(60);
    expect(staticCounters.primaryNarrowphaseCheckCount).toBe(60);
    expect(rotatingCounters.candidateSampleCount).toBe(829);
    expect(rotatingCounters.geometryResolutionCount).toBe(829);
  });
});
