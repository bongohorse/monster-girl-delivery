import { describe, expect, it } from 'vitest';
import {
  createPrototypeZapperBehavior,
  createPrototypeZapperGeometryScratch,
  createPrototypeZapperHitbox,
  PROTOTYPE_ZAPPER_GRAZE_PADDING,
  PROTOTYPE_ZAPPER_LENGTHS,
  PROTOTYPE_ZAPPER_ROTATION_SPEEDS,
  resolvePrototypeZapperAngleDegrees,
  resolvePrototypeZapperGeometry,
  resolvePrototypeZapperGeometryInto,
} from '../../src/hazards/PrototypeZapperHazard';
import {
  createPrototypeZapperCollisionWorkCounters,
  evaluatePlayerPrototypeZapperCoreAndGrazeDuringStep,
  isPlayerCollidingWithHazard,
  isPlayerCollidingWithPrototypeZapperDuringStep,
  resetPrototypeZapperCollisionWorkCounters,
} from '../../src/systems/HazardCollision';
import { type RunMotionState, stepRunMotion } from '../../src/systems/RunMotionSimulation';
import { createVerticalFlightTrajectory } from '../../src/systems/VerticalFlightSimulation';
import { STANDARD_FRAME_SCHEDULES } from '../support/FramePartitionHarness';

const createRotatingZapper = (
  direction: 'clockwise' | 'counterclockwise' = 'clockwise',
  speedDegreesPerSecond: number = PROTOTYPE_ZAPPER_ROTATION_SPEEDS.fast,
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

  it('rewrites one rotating geometry scratch with immutable-resolver-equivalent values', () => {
    const hazard = createRotatingZapper(
      'counterclockwise',
      PROTOTYPE_ZAPPER_ROTATION_SPEEDS.medium,
    );
    const scratch = createPrototypeZapperGeometryScratch();
    const identities = {
      beam: scratch.beam,
      beamEnd: scratch.beam.end,
      beamStart: scratch.beam.start,
      bounds: scratch.bounds,
      endpointA: scratch.endpointA,
      endpointACenter: scratch.endpointA.center,
      endpointB: scratch.endpointB,
      endpointBCenter: scratch.endpointB.center,
    };

    for (const simulationSeconds of [0, 0.125, 0.5, 1, 2.75]) {
      const expected = resolvePrototypeZapperGeometry(hazard, simulationSeconds);
      const actual = resolvePrototypeZapperGeometryInto(hazard, simulationSeconds, scratch);

      expect(expected).not.toBeNull();
      expect(actual).toBe(scratch);
      expect(actual).toEqual(expected);
      expect(Object.isFrozen(expected)).toBe(true);
      expect(Object.isFrozen(expected?.beam)).toBe(true);
      expect(Object.isFrozen(expected?.beam.start)).toBe(true);
      expect(Object.isFrozen(expected?.bounds)).toBe(true);
      expect(Object.isFrozen(scratch)).toBe(false);
      expect(scratch.beam).toBe(identities.beam);
      expect(scratch.beam.end).toBe(identities.beamEnd);
      expect(scratch.beam.start).toBe(identities.beamStart);
      expect(scratch.bounds).toBe(identities.bounds);
      expect(scratch.endpointA).toBe(identities.endpointA);
      expect(scratch.endpointA.center).toBe(identities.endpointACenter);
      expect(scratch.endpointB).toBe(identities.endpointB);
      expect(scratch.endpointB.center).toBe(identities.endpointBCenter);
    }
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

  it('resolves static Zapper geometry once even when the step scans many samples', () => {
    const baseBehavior = createPrototypeZapperBehavior(0, PROTOTYPE_ZAPPER_LENGTHS.short);
    const hitbox = createPrototypeZapperHitbox(0, 195, baseBehavior);
    let angleReads = 0;
    const behavior = Object.freeze({
      ...baseBehavior,
      get angleDegrees(): number {
        angleReads += 1;
        if (angleReads > 1) {
          throw new Error('static Zapper geometry was recomputed for another collision sample');
        }
        return baseBehavior.angleDegrees;
      },
    });
    const hazard = Object.freeze({
      behavior,
      entryId: 'static-geometry-reuse',
      hitbox,
      patternEntryIndex: 0,
      patternId: 'static-geometry-reuse-test',
      runDistance: hitbox.left,
      type: 'placeholder-barrier' as const,
    });

    expect(
      isPlayerCollidingWithPrototypeZapperDuringStep(
        { distance: 0, simulationSeconds: 0 },
        createStationaryTrajectory(230, 0.1),
        0.1,
        RUN_TUNING,
        hazard,
      ),
    ).toBe(false);
    expect(angleReads).toBe(1);
  });

  it('rejects a vertically unreachable Zapper before creating dense samples or geometry', () => {
    const behavior = createPrototypeZapperBehavior(0, PROTOTYPE_ZAPPER_LENGTHS.short);
    const hitbox = createPrototypeZapperHitbox(0, 0, behavior);
    const hazard = Object.freeze({
      behavior,
      entryId: 'vertical-broadphase-zapper',
      hitbox,
      patternEntryIndex: 0,
      patternId: 'vertical-broadphase-zapper-test',
      runDistance: hitbox.left,
      type: 'placeholder-barrier' as const,
    });
    const counters = createPrototypeZapperCollisionWorkCounters();

    expect(
      isPlayerCollidingWithPrototypeZapperDuringStep(
        { distance: 0, simulationSeconds: 0 },
        createStationaryTrajectory(500, 0.1),
        0.1,
        RUN_TUNING,
        hazard,
        undefined,
        undefined,
        counters,
      ),
    ).toBe(false);
    expect(counters).toEqual({
      broadphaseRejectedCallCount: 1,
      candidateSampleCount: 0,
      collisionCallCount: 1,
      evaluatedSampleCount: 0,
      geometryResolutionCount: 0,
      primaryNarrowphaseCheckCount: 0,
      secondaryNarrowphaseCheckCount: 0,
    });
  });

  it('keeps an internal quadratic flight extremum inside the vertical broadphase', () => {
    const behavior = createPrototypeZapperBehavior(0, PROTOTYPE_ZAPPER_LENGTHS.short);
    const hitbox = createPrototypeZapperHitbox(0, 0, behavior);
    const hazard = Object.freeze({
      behavior,
      entryId: 'vertical-broadphase-extremum',
      hitbox,
      patternEntryIndex: 0,
      patternId: 'vertical-broadphase-extremum-test',
      runDistance: hitbox.left,
      type: 'placeholder-barrier' as const,
    });
    const trajectory = Object.freeze({
      finalState: Object.freeze({ positionY: 100, velocityY: 320 }),
      segments: Object.freeze([
        Object.freeze({
          accelerationY: 640,
          endSeconds: 1,
          positionY: 100,
          startSeconds: 0,
          velocityY: -320,
        }),
      ]),
    });

    expect(
      isPlayerCollidingWithPrototypeZapperDuringStep(
        { distance: 0, simulationSeconds: 0 },
        trajectory,
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

  it('counts broadphase rejection without inventing sample or geometry work', () => {
    const counters = createPrototypeZapperCollisionWorkCounters();
    const hazard = createRotatingZapper();

    expect(
      isPlayerCollidingWithPrototypeZapperDuringStep(
        { distance: 0, simulationSeconds: 0 },
        createStationaryTrajectory(195, 1),
        1,
        RUN_TUNING,
        hazard,
        undefined,
        undefined,
        counters,
      ),
    ).toBe(false);
    expect(counters).toEqual({
      broadphaseRejectedCallCount: 1,
      candidateSampleCount: 0,
      collisionCallCount: 1,
      evaluatedSampleCount: 0,
      geometryResolutionCount: 0,
      primaryNarrowphaseCheckCount: 0,
      secondaryNarrowphaseCheckCount: 0,
    });

    resetPrototypeZapperCollisionWorkCounters(counters);
    expect(counters).toEqual({
      broadphaseRejectedCallCount: 0,
      candidateSampleCount: 0,
      collisionCallCount: 0,
      evaluatedSampleCount: 0,
      geometryResolutionCount: 0,
      primaryNarrowphaseCheckCount: 0,
      secondaryNarrowphaseCheckCount: 0,
    });
  });

  it('reports actual static core + Graze sample work from one shared pass', () => {
    const behavior = createPrototypeZapperBehavior(0, PROTOTYPE_ZAPPER_LENGTHS.short);
    const hitbox = createPrototypeZapperHitbox(0, 0, behavior);
    const hazard = Object.freeze({
      behavior,
      entryId: 'work-counter-static',
      hitbox,
      patternEntryIndex: 0,
      patternId: 'work-counter-static-pattern',
      runDistance: hitbox.left,
      type: 'placeholder-barrier' as const,
    });
    const counters = createPrototypeZapperCollisionWorkCounters();

    expect(
      evaluatePlayerPrototypeZapperCoreAndGrazeDuringStep(
        { distance: 0, simulationSeconds: 0 },
        createStationaryTrajectory(47, 0.1),
        0.1,
        RUN_TUNING,
        hazard,
        PROTOTYPE_ZAPPER_GRAZE_PADDING,
        undefined,
        counters,
      ),
    ).toEqual({ coreHit: false, grazeHit: false });

    expect(counters).toEqual({
      broadphaseRejectedCallCount: 0,
      candidateSampleCount: 0,
      collisionCallCount: 1,
      evaluatedSampleCount: 0,
      geometryResolutionCount: 1,
      primaryNarrowphaseCheckCount: 1,
      secondaryNarrowphaseCheckCount: 1,
    });
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

  it('matches the previous separate core and Graze passes across representative Zapper states', () => {
    const staticBehavior = createPrototypeZapperBehavior(0, PROTOTYPE_ZAPPER_LENGTHS.short);
    const staticHitbox = createPrototypeZapperHitbox(0, 0, staticBehavior);
    const staticHazard = Object.freeze({
      behavior: staticBehavior,
      entryId: 'shared-equivalence-static',
      hitbox: staticHitbox,
      patternEntryIndex: 0,
      patternId: 'shared-equivalence-static-pattern',
      runDistance: staticHitbox.left,
      type: 'placeholder-barrier' as const,
    });
    const rotatingBehavior = createPrototypeZapperBehavior(0, PROTOTYPE_ZAPPER_LENGTHS.long, {
      direction: 'clockwise',
      speedDegreesPerSecond: PROTOTYPE_ZAPPER_ROTATION_SPEEDS.slow,
    });
    const rotatingHitbox = createPrototypeZapperHitbox(0, 0, rotatingBehavior);
    const rotatingHazard = Object.freeze({
      behavior: rotatingBehavior,
      entryId: 'shared-equivalence-rotating',
      hitbox: rotatingHitbox,
      patternEntryIndex: 0,
      patternId: 'shared-equivalence-rotating-pattern',
      runDistance: rotatingHitbox.left,
      type: 'placeholder-barrier' as const,
    });
    const cases = [
      {
        elapsedSeconds: 0.1,
        hazard: staticHazard,
        initialRunState: { distance: 0, simulationSeconds: 0 },
        positionY: 0,
      },
      {
        elapsedSeconds: 0.1,
        hazard: staticHazard,
        initialRunState: { distance: 0, simulationSeconds: 0 },
        positionY: 35,
      },
      {
        elapsedSeconds: 0.1,
        hazard: staticHazard,
        initialRunState: { distance: 0, simulationSeconds: 0 },
        positionY: 100,
      },
      {
        elapsedSeconds: 1,
        hazard: rotatingHazard,
        initialRunState: { distance: 40, simulationSeconds: 0 },
        positionY: 35,
      },
    ] as const;

    for (const testCase of cases) {
      const trajectory = createStationaryTrajectory(testCase.positionY, testCase.elapsedSeconds);
      const coreHit = isPlayerCollidingWithPrototypeZapperDuringStep(
        testCase.initialRunState,
        trajectory,
        testCase.elapsedSeconds,
        RUN_TUNING,
        testCase.hazard,
      );
      const outerHit = isPlayerCollidingWithPrototypeZapperDuringStep(
        testCase.initialRunState,
        trajectory,
        testCase.elapsedSeconds,
        RUN_TUNING,
        testCase.hazard,
        undefined,
        PROTOTYPE_ZAPPER_GRAZE_PADDING,
      );
      const combined = evaluatePlayerPrototypeZapperCoreAndGrazeDuringStep(
        testCase.initialRunState,
        trajectory,
        testCase.elapsedSeconds,
        RUN_TUNING,
        testCase.hazard,
        PROTOTYPE_ZAPPER_GRAZE_PADDING,
      );

      expect(combined.coreHit).toBe(coreHit);
      expect(combined.grazeHit).toBe(!coreHit && outerHit);
    }
  });

  it('lets a later rotating core hit override an earlier Graze-only sample', () => {
    const behavior = createPrototypeZapperBehavior(0, PROTOTYPE_ZAPPER_LENGTHS.long, {
      direction: 'clockwise',
      speedDegreesPerSecond: PROTOTYPE_ZAPPER_ROTATION_SPEEDS.slow,
    });
    const hitbox = createPrototypeZapperHitbox(0, 0, behavior);
    const hazard = Object.freeze({
      behavior,
      entryId: 'graze-then-core',
      hitbox,
      patternEntryIndex: 0,
      patternId: 'graze-then-core-pattern',
      runDistance: hitbox.left,
      type: 'placeholder-barrier' as const,
    });
    const initial = { distance: 40, simulationSeconds: 0 };
    const trajectory = createStationaryTrajectory(35, 1);

    expect(
      isPlayerCollidingWithPrototypeZapperDuringStep(
        initial,
        createStationaryTrajectory(35, 0),
        0,
        RUN_TUNING,
        hazard,
      ),
    ).toBe(false);
    expect(
      isPlayerCollidingWithPrototypeZapperDuringStep(
        initial,
        createStationaryTrajectory(35, 0),
        0,
        RUN_TUNING,
        hazard,
        undefined,
        PROTOTYPE_ZAPPER_GRAZE_PADDING,
      ),
    ).toBe(true);

    expect(
      evaluatePlayerPrototypeZapperCoreAndGrazeDuringStep(
        initial,
        trajectory,
        1,
        RUN_TUNING,
        hazard,
        PROTOTYPE_ZAPPER_GRAZE_PADDING,
      ),
    ).toEqual({ coreHit: true, grazeHit: false });
  });

  it('walks sorted Zapper samples across flight segments without repeated linear find', () => {
    const hazard = createRotatingZapper();
    const segments = Object.freeze([
      Object.freeze({
        accelerationY: 0,
        endSeconds: 0.25,
        positionY: 255,
        startSeconds: 0,
        velocityY: 0,
      }),
      Object.freeze({
        accelerationY: 0,
        endSeconds: 1,
        positionY: 255,
        startSeconds: 0.25,
        velocityY: 0,
      }),
    ]);
    const trajectory = Object.freeze({
      finalState: Object.freeze({ positionY: 255, velocityY: 0 }),
      segments: new Proxy(segments, {
        get(target, property, receiver) {
          if (property === 'find') {
            throw new Error('Zapper samples fell back to a repeated linear trajectory search');
          }
          return Reflect.get(target, property, receiver);
        },
      }),
    });

    expect(
      isPlayerCollidingWithPrototypeZapperDuringStep(
        { distance: 660, simulationSeconds: 0 },
        trajectory,
        1,
        RUN_TUNING,
        hazard,
      ),
    ).toBe(true);
  });

  it('keeps per-sample finite player-state validation with the reusable hitbox scratch', () => {
    const behavior = createPrototypeZapperBehavior(0, PROTOTYPE_ZAPPER_LENGTHS.short);
    const hitbox = createPrototypeZapperHitbox(0, 0, behavior);
    const hazard = Object.freeze({
      behavior,
      entryId: 'scratch-finite-validation',
      hitbox,
      patternEntryIndex: 0,
      patternId: 'scratch-finite-validation-pattern',
      runDistance: hitbox.left,
      type: 'placeholder-barrier' as const,
    });
    const trajectory = Object.freeze({
      finalState: Object.freeze({ positionY: Number.NaN, velocityY: 0 }),
      segments: Object.freeze([
        Object.freeze({
          accelerationY: 0,
          endSeconds: 0.25,
          positionY: 100,
          startSeconds: 0,
          velocityY: 0,
        }),
        Object.freeze({
          accelerationY: 0,
          endSeconds: 1,
          positionY: Number.NaN,
          startSeconds: 0.25,
          velocityY: 0,
        }),
      ]),
    });

    expect(() =>
      isPlayerCollidingWithPrototypeZapperDuringStep(
        { distance: 0, simulationSeconds: 0 },
        trajectory,
        1,
        RUN_TUNING,
        hazard,
      ),
    ).toThrow('Player run distance and vertical position must be finite.');
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
