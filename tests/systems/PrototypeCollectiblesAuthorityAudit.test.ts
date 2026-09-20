import { describe, expect, it } from 'vitest';
import {
  getLogicalCollectibleSpawnIdentity,
  type LogicalCollectibleSpawnInstance,
} from '../../src/generation/GeneratedCollectibles';
import type { LogicalHazard } from '../../src/systems/HazardCollision';
import {
  EMPTY_PROTOTYPE_COLLECTIBLE_RUN_STATE,
  evaluatePrototypeCollectibleStep,
} from '../../src/systems/PrototypeCollectibles';
import {
  createPrototypeRunState,
  stepPrototypeRun,
} from '../../src/systems/PrototypeRunSimulation';
import { createVerticalFlightTrajectory } from '../../src/systems/VerticalFlightSimulation';

const FLIGHT_TUNING = Object.freeze({
  gravity: 0,
  thrust: 0,
  maxFallVelocity: 0,
  maxRiseVelocity: 0,
});
const FLIGHT_BOUNDS = Object.freeze({ ceilingY: 0, floorY: 390 });
const RUN_MOTION = Object.freeze({ baseScrollSpeed: 100 });
const STATIONARY_RUN_MOTION = Object.freeze({ baseScrollSpeed: 0 });
const LINEAR_VERTICAL_TUNING = Object.freeze({
  gravity: 0,
  thrust: 0,
  maxFallVelocity: 1_000,
  maxRiseVelocity: 1_000,
});
const QUADRATIC_VERTICAL_TUNING = Object.freeze({
  gravity: 40,
  thrust: 0,
  maxFallVelocity: 1_000,
  maxRiseVelocity: 1_000,
});

const collectible = (
  pathId: string,
  runDistance: number,
  y = 195,
): Readonly<LogicalCollectibleSpawnInstance> =>
  Object.freeze({
    intent: 'safe-guide',
    pathId,
    pathPointIndex: 0,
    patternId: 'gate-2-authority',
    patternStartDistance: 0,
    runDistance,
    value: 1,
    y,
  });

const lethalHazard: Readonly<LogicalHazard> = Object.freeze({
  hitbox: Object.freeze({
    left: 150,
    right: 170,
    top: 180,
    bottom: 210,
  }),
});

describe('PrototypeCollectibles Gate 5 analytical contact references', () => {
  const createLifecycleHazard = (
    startSeconds: number,
    endSeconds: number,
  ): Readonly<LogicalHazard> =>
    Object.freeze({
      collisionInterval: Object.freeze({ startSeconds, endSeconds }),
      hitbox: Object.freeze({ left: -10_000, right: 10_000, top: -10_000, bottom: 10_000 }),
    });

  const evaluate = (
    spawn: Readonly<LogicalCollectibleSpawnInstance>,
    elapsedSeconds: number,
    runMotionTuning: Readonly<{ baseScrollSpeed: number }>,
    trajectory: ReturnType<typeof createVerticalFlightTrajectory>,
    hazardStartSeconds?: number,
  ) =>
    evaluatePrototypeCollectibleStep(
      EMPTY_PROTOTYPE_COLLECTIBLE_RUN_STATE,
      Object.freeze({ distance: 0 }),
      trajectory,
      elapsedSeconds,
      runMotionTuning,
      [spawn],
      hazardStartSeconds === undefined
        ? []
        : [createLifecycleHazard(hazardStartSeconds, elapsedSeconds)],
    );

  it('matches the analytical horizontal-only contact boundary at 0.68 s', () => {
    /*
     * Combined horizontal pickup half-width is 18 + 14 = 32.
     * Coin center X=100, player starts X=0 and moves at 100 units/s.
     * Edge touch occurs at player center X=68 => t = 68 / 100 = 0.68 s.
     *
     * A lifecycle hazard already overlapping the player therefore:
     * - blocks pickup if it becomes lethal just before 0.68 s;
     * - ties and loses to pickup at exactly 0.68 s;
     * - does not block if it starts just after 0.68 s.
     */
    const elapsedSeconds = 1;
    const trajectory = createVerticalFlightTrajectory(
      { positionY: 195, velocityY: 0 },
      elapsedSeconds,
      false,
      LINEAR_VERTICAL_TUNING,
      FLIGHT_BOUNDS,
    );
    const spawn = collectible('gate5-horizontal-reference', 100);

    expect(
      evaluate(spawn, elapsedSeconds, RUN_MOTION, trajectory, 0.68 - 1e-6).collectedCount,
    ).toBe(0);
    expect(evaluate(spawn, elapsedSeconds, RUN_MOTION, trajectory, 0.68).collectedCount).toBe(1);
    expect(
      evaluate(spawn, elapsedSeconds, RUN_MOTION, trajectory, 0.68 + 1e-6).collectedCount,
    ).toBe(1);
  });

  it('matches the analytical vertical-only linear contact boundary at 0.85 s', () => {
    /*
     * Combined vertical pickup half-height is 24 + 14 = 38.
     * Coin center Y=250, so downward-moving player center first reaches edge touch at Y=212.
     * Starting at Y=195 with v=20 and zero acceleration:
     *   t = (212 - 195) / 20 = 17 / 20 = 0.85 s.
     */
    const elapsedSeconds = 1.2;
    const trajectory = createVerticalFlightTrajectory(
      { positionY: 195, velocityY: 20 },
      elapsedSeconds,
      false,
      LINEAR_VERTICAL_TUNING,
      FLIGHT_BOUNDS,
    );
    const spawn = collectible('gate5-vertical-linear-reference', 0, 250);

    expect(
      evaluate(spawn, elapsedSeconds, STATIONARY_RUN_MOTION, trajectory, 0.85 - 1e-6)
        .collectedCount,
    ).toBe(0);
    expect(
      evaluate(spawn, elapsedSeconds, STATIONARY_RUN_MOTION, trajectory, 0.85).collectedCount,
    ).toBe(1);
    expect(
      evaluate(spawn, elapsedSeconds, STATIONARY_RUN_MOTION, trajectory, 0.85 + 1e-6)
        .collectedCount,
    ).toBe(1);
  });

  it('matches an independently solved quadratic vertical contact boundary', () => {
    /*
     * Same Y=212 edge boundary, but start at Y=195 with v0=0 and a=40.
     * 17 = 0.5 * 40 * t^2 => t = sqrt(17 / 20).
     */
    const elapsedSeconds = 1.2;
    const expectedContactSeconds = Math.sqrt(17 / 20);
    const trajectory = createVerticalFlightTrajectory(
      { positionY: 195, velocityY: 0 },
      elapsedSeconds,
      false,
      QUADRATIC_VERTICAL_TUNING,
      FLIGHT_BOUNDS,
    );
    const spawn = collectible('gate5-vertical-quadratic-reference', 0, 250);

    expect(
      evaluate(
        spawn,
        elapsedSeconds,
        STATIONARY_RUN_MOTION,
        trajectory,
        expectedContactSeconds - 1e-6,
      ).collectedCount,
    ).toBe(0);
    expect(
      evaluate(spawn, elapsedSeconds, STATIONARY_RUN_MOTION, trajectory, expectedContactSeconds)
        .collectedCount,
    ).toBe(1);
    expect(
      evaluate(
        spawn,
        elapsedSeconds,
        STATIONARY_RUN_MOTION,
        trajectory,
        expectedContactSeconds + 1e-6,
      ).collectedCount,
    ).toBe(1);
  });

  it('requires the analytical horizontal and vertical overlap windows to intersect', () => {
    /*
     * Coin X=100 gives horizontal open overlap (0.68, 1.32).
     * Coin Y=250 needs player center Y>212. At v=10, that begins only after 1.7 s.
     * The windows never intersect, so there is no pickup despite each axis overlapping
     * at some point during the 2 s step.
     */
    const elapsedSeconds = 2;
    const trajectory = createVerticalFlightTrajectory(
      { positionY: 195, velocityY: 10 },
      elapsedSeconds,
      false,
      LINEAR_VERTICAL_TUNING,
      FLIGHT_BOUNDS,
    );

    const result = evaluate(
      collectible('gate5-disjoint-axis-windows', 100, 250),
      elapsedSeconds,
      RUN_MOTION,
      trajectory,
    );

    expect(result).toBe(EMPTY_PROTOTYPE_COLLECTIBLE_RUN_STATE);
  });
});

describe('PrototypeCollectibles Gate 2 authority rules', () => {
  it('requires positive-area pickup overlap: exact horizontal or vertical edge touch is not enough', () => {
    /*
     * Independent oracle for the current prototype contract:
     * - player horizontal extents are 18 + 18;
     * - player vertical extents are 24 + 24;
     * - collectible pickup half-size is 14;
     * - pickup requires positive-area AABB overlap.
     *
     * With the player centered at distance=0, y=195:
     *   horizontal pickup iff |coinX| < 18 + 14 = 32;
     *   vertical pickup iff |coinY - 195| < 24 + 14 = 38.
     *
     * Equality is zero-area edge contact and must not count. The values are written
     * explicitly here instead of derived through production helpers so this test
     * remains an independent statement of the gameplay rule.
     */
    const horizontalTouch = collectible('horizontal-touch', 32);
    const horizontalInside = collectible('horizontal-inside', 32 - 1e-6);
    const horizontalOutside = collectible('horizontal-outside', 32 + 1e-6);
    const horizontalTouchBehind = collectible('horizontal-touch-behind', -32);
    const horizontalInsideBehind = collectible('horizontal-inside-behind', -32 + 1e-6);
    const horizontalOutsideBehind = collectible('horizontal-outside-behind', -32 - 1e-6);
    const verticalTouch = collectible('vertical-touch', 0, 195 + 38);
    const verticalInside = collectible('vertical-inside', 0, 195 + 38 - 1e-6);
    const verticalOutside = collectible('vertical-outside', 0, 195 + 38 + 1e-6);
    const verticalTouchAbove = collectible('vertical-touch-above', 0, 195 - 38);
    const verticalInsideAbove = collectible('vertical-inside-above', 0, 195 - 38 + 1e-6);
    const verticalOutsideAbove = collectible('vertical-outside-above', 0, 195 - 38 - 1e-6);

    const run = (spawn: Readonly<LogicalCollectibleSpawnInstance>) =>
      stepPrototypeRun(createPrototypeRunState(FLIGHT_BOUNDS), 0.1, {
        collectibles: [spawn],
        flightBounds: FLIGHT_BOUNDS,
        flightTuning: FLIGHT_TUNING,
        hazards: [],
        runMotionTuning: STATIONARY_RUN_MOTION,
        thrustHeld: false,
      }).state;

    expect(run(horizontalTouch).collectibles).toBeUndefined();
    expect(run(horizontalInside).collectibles?.collectedCount).toBe(1);
    expect(run(horizontalOutside).collectibles).toBeUndefined();
    expect(run(horizontalTouchBehind).collectibles).toBeUndefined();
    expect(run(horizontalInsideBehind).collectibles?.collectedCount).toBe(1);
    expect(run(horizontalOutsideBehind).collectibles).toBeUndefined();

    expect(run(verticalTouch).collectibles).toBeUndefined();
    expect(run(verticalInside).collectibles?.collectedCount).toBe(1);
    expect(run(verticalOutside).collectibles).toBeUndefined();
    expect(run(verticalTouchAbove).collectibles).toBeUndefined();
    expect(run(verticalInsideAbove).collectibles?.collectedCount).toBe(1);
    expect(run(verticalOutsideAbove).collectibles).toBeUndefined();
  });

  it('preserves the same pickup boundary after translating the run origin', () => {
    /*
     * Contact geometry depends on relative distance, not on world-origin zero.
     * Warm up to distance 100, then approach a coin at absolute distance 200.
     * The first horizontal positive-overlap boundary is 200 - 32 = 168,
     * so the translated step must still collect before ending at distance 200.
     */
    const warmed = stepPrototypeRun(createPrototypeRunState(FLIGHT_BOUNDS), 1, {
      collectibles: [],
      flightBounds: FLIGHT_BOUNDS,
      flightTuning: FLIGHT_TUNING,
      hazards: [],
      runMotionTuning: RUN_MOTION,
      thrustHeld: false,
    }).state;

    expect(warmed.motion.distance).toBe(100);

    const result = stepPrototypeRun(warmed, 1, {
      collectibles: [collectible('translated-origin', 200)],
      flightBounds: FLIGHT_BOUNDS,
      flightTuning: FLIGHT_TUNING,
      hazards: [],
      runMotionTuning: RUN_MOTION,
      thrustHeld: false,
    }).state;

    expect(result.motion.distance).toBe(200);
    expect(result.collectibles?.collectedCount).toBe(1);
  });

  it('keeps the horizontal overlap window correct for valid sub-unit run speeds', () => {
    /*
     * RunMotionConfig accepts every non-negative finite speed, including 0.5.
     * Start at distance 10 with a coin centered at the same X. Horizontal positive
     * overlap remains valid until player-center distance 42:
     *   (42 - 10) / 0.5 = 64 s.
     *
     * The vertical path starts at Y=0 and moves downward at 9 units/s, entering the
     * coin's positive-overlap band (player center > 157) after 157 / 9 ~= 17.44 s.
     * During a 20 s step, the two overlap windows therefore intersect and pickup
     * must occur. Replacing division by multiplication would incorrectly end the
     * horizontal window at 16 s and miss the pickup.
     */
    const slowRunMotion = Object.freeze({ baseScrollSpeed: 0.5 });
    const delayedVerticalTrajectory = Object.freeze({
      finalState: Object.freeze({ positionY: 180, velocityY: 9 }),
      segments: Object.freeze([
        Object.freeze({
          accelerationY: 0,
          endSeconds: 20,
          positionY: 0,
          startSeconds: 0,
          velocityY: 9,
        }),
      ]),
    });

    const result = evaluatePrototypeCollectibleStep(
      EMPTY_PROTOTYPE_COLLECTIBLE_RUN_STATE,
      Object.freeze({ distance: 10 }),
      delayedVerticalTrajectory,
      20,
      slowRunMotion,
      [collectible('slow-overlap-window', 10)],
      [],
    );

    expect(result.collectedCount).toBe(1);
    expect(result.earnedReward).toBe(1);
  });

  it('awards one logical collectible identity only once across multiple simulation updates', () => {
    /*
     * The authoritative pickup occurrence is the first successful transition of a
     * logical collectible identity into consumedCollectibleIds together with its
     * count/value/reward increment. No separate presentation/event bus owns pickup.
     */
    const spawn = collectible('exactly-once', 10);
    const identity = getLogicalCollectibleSpawnIdentity(spawn);

    const first = stepPrototypeRun(createPrototypeRunState(FLIGHT_BOUNDS), 0.1, {
      collectibles: [spawn],
      flightBounds: FLIGHT_BOUNDS,
      flightTuning: FLIGHT_TUNING,
      hazards: [],
      runMotionTuning: RUN_MOTION,
      thrustHeld: false,
    }).state;

    const second = stepPrototypeRun(first, 0.1, {
      collectibles: [spawn],
      flightBounds: FLIGHT_BOUNDS,
      flightTuning: FLIGHT_TUNING,
      hazards: [],
      runMotionTuning: RUN_MOTION,
      thrustHeld: false,
    }).state;

    expect(first.collectibles).toMatchObject({
      collectedCount: 1,
      collectedValue: 1,
      earnedReward: 1,
    });
    expect(first.collectibles?.consumedCollectibleIds).toEqual([identity]);

    expect(second.collectibles).toMatchObject({
      collectedCount: 1,
      collectedValue: 1,
      earnedReward: 1,
    });
    expect(second.collectibles?.consumedCollectibleIds).toEqual([identity]);
    expect(
      (second.collectibles?.collectedCount ?? 0) - (first.collectibles?.collectedCount ?? 0),
    ).toBe(0);
    expect((second.collectibles?.earnedReward ?? 0) - (first.collectibles?.earnedReward ?? 0)).toBe(
      0,
    );
  });

  it('awards a pickup whose first positive-overlap boundary is strictly before lethal contact', () => {
    /*
     * At 100 run-distance units/s the static lethal hazard [150,170] first gains
     * positive horizontal overlap after player-center distance 150 - 18 = 132,
     * i.e. boundary t=1.32 s.
     *
     * A coin at X=100 first gains positive overlap after 100 - (18 + 14) = 68,
     * i.e. boundary t=0.68 s, so its pickup is earlier than death.
     */
    const result = stepPrototypeRun(createPrototypeRunState(FLIGHT_BOUNDS), 2, {
      collectibles: [collectible('before-death', 100)],
      flightBounds: FLIGHT_BOUNDS,
      flightTuning: FLIGHT_TUNING,
      hazards: [lethalHazard],
      runMotionTuning: RUN_MOTION,
      thrustHeld: false,
    });

    expect(result.enteredDead).toBe(true);
    expect(result.state.finalResult).toMatchObject({
      collectedCount: 1,
      collectedValue: 1,
      earnedReward: 1,
    });
  });

  it('rejects a pickup whose first positive-overlap boundary is strictly after lethal contact', () => {
    /*
     * The lethal boundary is t=1.32 s as above. A coin at X=180 begins positive
     * overlap after 180 - 32 = 148 distance, i.e. t=1.48 s, so death is earlier.
     */
    const result = stepPrototypeRun(createPrototypeRunState(FLIGHT_BOUNDS), 2, {
      collectibles: [collectible('after-death', 180)],
      flightBounds: FLIGHT_BOUNDS,
      flightTuning: FLIGHT_TUNING,
      hazards: [lethalHazard],
      runMotionTuning: RUN_MOTION,
      thrustHeld: false,
    });

    expect(result.enteredDead).toBe(true);
    expect(result.state.finalResult).toMatchObject({
      collectedCount: 0,
      collectedValue: 0,
      earnedReward: 0,
    });
  });

  it('preserves lethal-before-pickup ordering in the standalone lazy hazard fallback', () => {
    /*
     * The exported evaluator supports callers that do not provide pre-resolved lethal hazards.
     * That fallback must implement the same ordering contract as the orchestrated run:
     * hazard onset at distance 132 precedes the coin onset at distance 148.
     */
    const initial = createPrototypeRunState(FLIGHT_BOUNDS);
    const trajectory = createVerticalFlightTrajectory(
      initial.flight,
      2,
      false,
      FLIGHT_TUNING,
      FLIGHT_BOUNDS,
    );

    const result = evaluatePrototypeCollectibleStep(
      EMPTY_PROTOTYPE_COLLECTIBLE_RUN_STATE,
      initial.motion,
      trajectory,
      2,
      RUN_MOTION,
      [collectible('fallback-after-death', 180)],
      [lethalHazard],
    );

    expect(result).toBe(EMPTY_PROTOTYPE_COLLECTIBLE_RUN_STATE);
    expect(result.collectedCount).toBe(0);
    expect(result.earnedReward).toBe(0);
  });

  it('treats the shared onset boundary itself as edge-only, then resolves the tie after positive overlap begins', () => {
    /*
     * Both the hazard and coin below have the same open-overlap onset boundary at t=1.32 s.
     * At exactly that boundary the AABBs only touch, so positive-area collision/pickup has not
     * happened yet. Immediately after the boundary, both have positive overlap; the ordering
     * policy then awards the pickup while the enclosing step also becomes lethal.
     */
    const tiedCollectible = collectible('tie-onset-boundary', 164);

    const boundaryOnly = stepPrototypeRun(createPrototypeRunState(FLIGHT_BOUNDS), 1.32, {
      collectibles: [tiedCollectible],
      flightBounds: FLIGHT_BOUNDS,
      flightTuning: FLIGHT_TUNING,
      hazards: [lethalHazard],
      runMotionTuning: RUN_MOTION,
      thrustHeld: false,
    });

    expect(boundaryOnly.enteredDead).toBe(false);
    expect(boundaryOnly.state.collectibles).toBeUndefined();

    const positiveOverlap = stepPrototypeRun(createPrototypeRunState(FLIGHT_BOUNDS), 1.320001, {
      collectibles: [tiedCollectible],
      flightBounds: FLIGHT_BOUNDS,
      flightTuning: FLIGHT_TUNING,
      hazards: [lethalHazard],
      runMotionTuning: RUN_MOTION,
      thrustHeld: false,
    });

    expect(positiveOverlap.enteredDead).toBe(true);
    expect(positiveOverlap.state.finalResult).toMatchObject({
      collectedCount: 1,
      collectedValue: 1,
      earnedReward: 1,
    });
  });

  it('awards pickup on an exact first-contact tie, while the same step still ends in death', () => {
    /*
     * Explicit tie policy: only a strictly earlier lethal positive-area contact
     * blocks pickup. Equal first-contact boundaries favor the pickup.
     *
     * Hazard boundary: 150 - 18 = 132 => t=1.32 s.
     * Coin X=164 boundary: 164 - (18 + 14) = 132 => t=1.32 s.
     */
    const result = stepPrototypeRun(createPrototypeRunState(FLIGHT_BOUNDS), 2, {
      collectibles: [collectible('tie-pickup-wins', 164)],
      flightBounds: FLIGHT_BOUNDS,
      flightTuning: FLIGHT_TUNING,
      hazards: [lethalHazard],
      runMotionTuning: RUN_MOTION,
      thrustHeld: false,
    });

    expect(result.enteredDead).toBe(true);
    expect(result.state.finalResult).toMatchObject({
      collectedCount: 1,
      collectedValue: 1,
      earnedReward: 1,
    });
  });
});
