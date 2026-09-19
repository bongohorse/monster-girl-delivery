import { describe, expect, it } from 'vitest';
import {
  createPrototypeZapperBehavior,
  createPrototypeZapperHitbox,
  PROTOTYPE_ZAPPER_GRAZE_PADDING,
  PROTOTYPE_ZAPPER_LENGTHS,
  PROTOTYPE_ZAPPER_ROTATION_SPEEDS,
  resolvePrototypeZapperAngleDegrees,
} from '../../src/hazards/PrototypeZapperHazard';
import {
  isPlayerCollidingWithHazard,
  isPlayerCollidingWithPrototypeZapperDuringStep,
} from '../../src/systems/HazardCollision';
import { type RunMotionState, stepRunMotion } from '../../src/systems/RunMotionSimulation';
import { createVerticalFlightTrajectory } from '../../src/systems/VerticalFlightSimulation';
import { STANDARD_FRAME_SCHEDULES } from '../support/FramePartitionHarness';

const createRotatingZapper = (
  direction: 'clockwise' | 'counterclockwise' = 'clockwise',
  speedDegreesPerSecond = PROTOTYPE_ZAPPER_ROTATION_SPEEDS.fast,
) => {
  const behavior = createPrototypeZapperBehavior(0, PROTOTYPE_ZAPPER_LENGTHS.long, {
    direction,
    speedDegreesPerSecond,
  });
  const hitbox = createPrototypeZapperHitbox(600, 195, behavior);
  return Object.freeze({
    behavior,
    entryId: 'rotating-zapper',
    hitbox,
    patternEntryIndex: 0,
    patternId: 'rotating-zapper-test',
    runDistance: hitbox.left,
    type: 'placeholder-barrier' as const,
  });
};

const FLIGHT_TUNING = Object.freeze({
  gravity: 0,
  thrust: 0,
  maxFallVelocity: 1_000,
  maxRiseVelocity: 1_000,
});
const FLIGHT_BOUNDS = Object.freeze({ ceilingY: -1_000, floorY: 1_000 });
const RUN_TUNING = Object.freeze({ baseScrollSpeed: 0 });

const createStationaryTrajectory = (positionY: number, elapsedSeconds: number) =>
  createVerticalFlightTrajectory(
    { positionY, velocityY: 0 },
    elapsedSeconds,
    false,
    FLIGHT_TUNING,
    FLIGHT_BOUNDS,
  );

describe('M5 rotating Zapper', () => {
  it('resolves clockwise/counterclockwise angles from data-driven 30/60/90 degree presets', () => {
    for (const speed of Object.values(PROTOTYPE_ZAPPER_ROTATION_SPEEDS)) {
      const clockwise = createPrototypeZapperBehavior(15, PROTOTYPE_ZAPPER_LENGTHS.short, {
        direction: 'clockwise',
        speedDegreesPerSecond: speed,
      });
      const counterclockwise = createPrototypeZapperBehavior(15, PROTOTYPE_ZAPPER_LENGTHS.short, {
        direction: 'counterclockwise',
        speedDegreesPerSecond: speed,
      });

      expect(resolvePrototypeZapperAngleDegrees(clockwise, 1)).toBe(15 + speed);
      expect(resolvePrototypeZapperAngleDegrees(counterclockwise, 1)).toBe(
        (((15 - speed) % 360) + 360) % 360,
      );
    }
  });

  it('does not advance rotation when authoritative simulation time does not advance', () => {
    const behavior = createPrototypeZapperBehavior(45, PROTOTYPE_ZAPPER_LENGTHS.medium, {
      direction: 'clockwise',
      speedDegreesPerSecond: PROTOTYPE_ZAPPER_ROTATION_SPEEDS.slow,
    });

    expect(resolvePrototypeZapperAngleDegrees(behavior, 2.5)).toBe(120);
    expect(resolvePrototypeZapperAngleDegrees(behavior, 2.5)).toBe(120);
  });

  it('detects a mid-step angular sweep hit that neither endpoint pose contains', () => {
    const hazard = createRotatingZapper();
    const initialRunState = { distance: 660, simulationSeconds: 0 };
    const player = { positionY: 255, velocityY: 0 };

    expect(isPlayerCollidingWithHazard(initialRunState, player, hazard)).toBe(false);
    expect(
      isPlayerCollidingWithHazard({ distance: 660, simulationSeconds: 1 }, player, hazard),
    ).toBe(false);

    expect(
      isPlayerCollidingWithPrototypeZapperDuringStep(
        initialRunState,
        createStationaryTrajectory(255, 1),
        1,
        RUN_TUNING,
        hazard,
      ),
    ).toBe(true);
  });

  it('rejects a far rotating Zapper before resolving rotation or sample geometry', () => {
    const hazard = createRotatingZapper();
    const poisonBehavior = Object.freeze({
      ...hazard.behavior,
      get rotation(): never {
        throw new Error('far Zapper reached dense rotation sampling');
      },
    });
    const farHazard = Object.freeze({
      ...hazard,
      behavior: poisonBehavior,
    });

    expect(
      isPlayerCollidingWithPrototypeZapperDuringStep(
        { distance: 0, simulationSeconds: 0 },
        createStationaryTrajectory(195, 1),
        1,
        RUN_TUNING,
        farHazard,
      ),
    ).toBe(false);
  });

  it('keeps Zapper Graze padding inside the conservative horizontal broadphase', () => {
    const behavior = createPrototypeZapperBehavior(0, PROTOTYPE_ZAPPER_LENGTHS.short);
    const hitbox = createPrototypeZapperHitbox(0, 195, behavior);
    const hazard = Object.freeze({
      behavior,
      entryId: 'graze-broadphase-zapper',
      hitbox,
      patternEntryIndex: 0,
      patternId: 'graze-broadphase-zapper-test',
      runDistance: hitbox.left,
      type: 'placeholder-barrier' as const,
    });

    expect(
      isPlayerCollidingWithPrototypeZapperDuringStep(
        { distance: 80, simulationSeconds: 0 },
        createStationaryTrajectory(195, 0.1),
        0.1,
        RUN_TUNING,
        hazard,
      ),
    ).toBe(false);
    expect(
      isPlayerCollidingWithPrototypeZapperDuringStep(
        { distance: 80, simulationSeconds: 0 },
        createStationaryTrajectory(195, 0.1),
        0.1,
        RUN_TUNING,
        hazard,
        undefined,
        PROTOTYPE_ZAPPER_GRAZE_PADDING,
      ),
    ).toBe(true);
  });

  it('does not let generic horizontalVelocity metadata change current Zapper motion semantics', () => {
    const behavior = createPrototypeZapperBehavior(0, PROTOTYPE_ZAPPER_LENGTHS.short);
    const hitbox = createPrototypeZapperHitbox(100, 195, behavior);
    const hazard = Object.freeze({
      behavior,
      entryId: 'velocity-metadata-zapper',
      hitbox,
      horizontalVelocity: 100,
      patternEntryIndex: 0,
      patternId: 'velocity-metadata-zapper-test',
      runDistance: hitbox.left,
      type: 'placeholder-barrier' as const,
    });

    expect(
      isPlayerCollidingWithPrototypeZapperDuringStep(
        { distance: 0, simulationSeconds: 0 },
        createStationaryTrajectory(195, 1),
        1,
        { baseScrollSpeed: 100 },
        hazard,
      ),
    ).toBe(true);
  });

  it('reports the same angular sweep collision across standard frame partitions', () => {
    const hazard = createRotatingZapper();
    const results: Record<string, boolean> = {};

    for (const [name, schedule] of Object.entries(STANDARD_FRAME_SCHEDULES)) {
      let elapsed = 0;
      let stepIndex = 0;
      let runState: RunMotionState = { distance: 660, simulationSeconds: 0 };
      let collided = false;

      while (elapsed < 1 && !collided) {
        const delta = Math.min(schedule.getNextDelta(elapsed, stepIndex), 1 - elapsed);
        stepIndex += 1;
        collided = isPlayerCollidingWithPrototypeZapperDuringStep(
          runState,
          createStationaryTrajectory(255, delta),
          delta,
          RUN_TUNING,
          hazard,
        );
        runState = stepRunMotion(runState, delta, RUN_TUNING);
        elapsed += delta;
      }

      results[name] = collided;
    }

    expect(new Set(Object.values(results))).toEqual(new Set([true]));
  });
});
