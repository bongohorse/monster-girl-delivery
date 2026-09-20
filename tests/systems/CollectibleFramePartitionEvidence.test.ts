import { describe, expect, it } from 'vitest';
import type { FlightTuningValues } from '../../src/config/FlightTuningConfig';
import { PROTOTYPE_RUN_MOTION_DEFAULTS } from '../../src/config/RunMotionConfig';
import {
  getLogicalCollectibleSpawnIdentity,
  type LogicalCollectibleSpawnInstance,
} from '../../src/generation/GeneratedCollectibles';
import type { LogicalHazard } from '../../src/systems/HazardCollision';
import { createPrototypeRunState } from '../../src/systems/PrototypeRunSimulation';
import type { VerticalFlightBounds } from '../../src/systems/VerticalFlightSimulation';
import {
  runPartitionedSimulation,
  STANDARD_FRAME_SCHEDULES,
} from '../support/FramePartitionHarness';

const SCHEDULE_ENTRIES = Object.entries(STANDARD_FRAME_SCHEDULES);
const FLOATING_POINT_TOLERANCE = 1e-9;

const PINNED_BOUNDS: Readonly<VerticalFlightBounds> = Object.freeze({
  ceilingY: 195,
  floorY: 195,
});
const NORMAL_BOUNDS: Readonly<VerticalFlightBounds> = Object.freeze({
  ceilingY: 28,
  floorY: 362,
});
const PINNED_FLIGHT_TUNING: Readonly<FlightTuningValues> = Object.freeze({
  gravity: 0,
  thrust: 0,
  maxFallVelocity: 0,
  maxRiseVelocity: 0,
});

const collectible = (
  pathId: string,
  runDistance: number,
  value: number,
  y = 195,
): Readonly<LogicalCollectibleSpawnInstance> =>
  Object.freeze({
    intent: 'safe-guide',
    pathId,
    pathPointIndex: 0,
    patternId: 'gate-5d-determinism',
    patternStartDistance: 0,
    runDistance,
    value,
    y,
  });

const sortedIdentities = (
  spawns: ReadonlyArray<Readonly<LogicalCollectibleSpawnInstance>>,
): ReadonlyArray<string> => [...spawns.map(getLogicalCollectibleSpawnIdentity)].sort();

describe('Gate 5D Collectibles frame-partition contract', () => {
  it('keeps discrete pickup identities and rewards exact across all standard schedules', () => {
    const spawns = Object.freeze([
      collectible('first', 100, 1),
      collectible('second', 180, 2),
      collectible('third', 260, 3),
    ]);
    const expectedIds = sortedIdentities(spawns);

    const results = Object.fromEntries(
      SCHEDULE_ENTRIES.map(([name, schedule]) => [
        name,
        runPartitionedSimulation({
          collectibles: spawns,
          flightBounds: PINNED_BOUNDS,
          flightTuning: PINNED_FLIGHT_TUNING,
          hazards: [],
          initialState: createPrototypeRunState(PINNED_BOUNDS),
          schedule,
          totalDuration: 1,
        }),
      ]),
    );

    for (const result of Object.values(results)) {
      expect(result.finalState.phase).toBe('running');
      expect(result.deathRecordedAtTime).toBeNull();
      expect(result.finalState.collectibles).toMatchObject({
        collectedCount: 3,
        collectedValue: 6,
        earnedReward: 6,
      });
      expect(result.finalState.collectibles?.consumedCollectibleIds).toEqual(expectedIds);
      expect(Math.abs(result.finalState.motion.distance - 350)).toBeLessThanOrEqual(
        FLOATING_POINT_TOLERANCE,
      );
    }
  });

  it('keeps a pickup exact when input transitions occur at simulation times rather than frame numbers', () => {
    /*
     * The input script intentionally contains the existing non-frame-aligned 0.425 s transition.
     * The coin is reached after that transition. This test does not use frame number as input
     * authority; every schedule receives the same transition times through the shared harness.
     */
    const spawn = collectible('scripted-input', 200, 4, 242);
    const expectedId = getLogicalCollectibleSpawnIdentity(spawn);
    const inputScript = [
      { time: 0.15, thrustHeld: true },
      { time: 0.425, thrustHeld: false },
      { time: 0.55, thrustHeld: true },
    ];

    const results = SCHEDULE_ENTRIES.map(([_name, schedule]) =>
      runPartitionedSimulation({
        collectibles: [spawn],
        flightBounds: NORMAL_BOUNDS,
        hazards: [],
        initialState: createPrototypeRunState(NORMAL_BOUNDS),
        inputScript,
        schedule,
        totalDuration: 0.7,
      }),
    );

    const [baseline, ...others] = results;
    expect(baseline.finalState.collectibles).toMatchObject({
      collectedCount: 1,
      collectedValue: 4,
      earnedReward: 4,
    });
    expect(baseline.finalState.collectibles?.consumedCollectibleIds).toEqual([expectedId]);

    for (const result of others) {
      expect(result.finalState.collectibles).toMatchObject({
        collectedCount: 1,
        collectedValue: 4,
        earnedReward: 4,
      });
      expect(result.finalState.collectibles?.consumedCollectibleIds).toEqual([expectedId]);
      expect(
        Math.abs(result.finalState.motion.distance - baseline.finalState.motion.distance),
      ).toBeLessThanOrEqual(FLOATING_POINT_TOLERANCE);
      expect(
        Math.abs(result.finalState.flight.positionY - baseline.finalState.flight.positionY),
      ).toBeLessThanOrEqual(FLOATING_POINT_TOLERANCE);
      expect(
        Math.abs(result.finalState.flight.velocityY - baseline.finalState.flight.velocityY),
      ).toBeLessThanOrEqual(FLOATING_POINT_TOLERANCE);
    }
  });

  it('keeps terminal pickup totals and IDs exact without claiming partition-invariant death endpoints', () => {
    /*
     * Player horizontal extent toward the hazard is 18. Hazard left=240 at 350 units/s,
     * so positive-area lethal overlap begins immediately after:
     *   (240 - 18) / 350 = 222 / 350 ~= 0.634285714 s.
     *
     * Coins at X=100 and X=200 begin pickup overlap before that time. X=280 begins after it.
     * The discrete result must therefore contain exactly the first two occurrences for every
     * partition. The run-end API records the enclosing simulation-step endpoint rather than TOI,
     * so finalDistance, score and deathRecordedAtTime are intentionally NOT cross-schedule equal.
     */
    const beforeFirst = collectible('before-first', 100, 2);
    const beforeSecond = collectible('before-second', 200, 3);
    const afterDeath = collectible('after-death', 280, 5);
    const spawns = Object.freeze([beforeFirst, beforeSecond, afterDeath]);
    const expectedIds = sortedIdentities([beforeFirst, beforeSecond]);
    const lethalHazard: Readonly<LogicalHazard> = Object.freeze({
      hitbox: Object.freeze({
        left: 240,
        right: 260,
        top: 180,
        bottom: 210,
      }),
    });
    const analyticalLethalOnset =
      (lethalHazard.hitbox.left - 18) / PROTOTYPE_RUN_MOTION_DEFAULTS.baseScrollSpeed;

    const results = Object.fromEntries(
      SCHEDULE_ENTRIES.map(([name, schedule]) => [
        name,
        runPartitionedSimulation({
          collectibles: spawns,
          flightBounds: PINNED_BOUNDS,
          flightTuning: PINNED_FLIGHT_TUNING,
          hazards: [lethalHazard],
          initialState: createPrototypeRunState(PINNED_BOUNDS),
          schedule,
          totalDuration: 1,
        }),
      ]),
    );

    for (const result of Object.values(results)) {
      expect(result.finalState.phase).toBe('dead');
      expect(result.finalState.collectibles).toMatchObject({
        collectedCount: 2,
        collectedValue: 5,
        earnedReward: 5,
      });
      expect(result.finalState.collectibles?.consumedCollectibleIds).toEqual(expectedIds);
      expect(result.finalState.finalResult).toMatchObject({
        collectedCount: 2,
        collectedValue: 5,
        earnedReward: 5,
        grazeCount: 0,
      });

      expect(result.deathRecordedAtTime).not.toBeNull();
      expect(result.deathRecordedAtTime ?? 0).toBeGreaterThanOrEqual(analyticalLethalOnset);
      expect(result.deathRecordedAtTime ?? 0).toBeLessThanOrEqual(
        analyticalLethalOnset + 1 / 30 + FLOATING_POINT_TOLERANCE,
      );

      expect(result.finalState.finalResult?.finalDistance).toBe(result.finalState.motion.distance);
      expect(result.finalState.finalResult?.score).toBe(
        Math.floor(result.finalState.motion.distance),
      );
    }
  });
});
