import { describe, expect, it } from 'vitest';
import {
  getLogicalCollectibleSpawnIdentity,
  type LogicalCollectibleSpawnInstance,
} from '../../src/generation/GeneratedCollectibles';
import type { LogicalHazard } from '../../src/systems/HazardCollision';
import {
  createPrototypeRunState,
  stepPrototypeRun,
} from '../../src/systems/PrototypeRunSimulation';

const FLIGHT_TUNING = Object.freeze({
  gravity: 0,
  thrust: 0,
  maxFallVelocity: 0,
  maxRiseVelocity: 0,
});
const FLIGHT_BOUNDS = Object.freeze({ ceilingY: 0, floorY: 390 });
const RUN_MOTION = Object.freeze({ baseScrollSpeed: 100 });
const STATIONARY_RUN_MOTION = Object.freeze({ baseScrollSpeed: 0 });

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
    const verticalTouch = collectible('vertical-touch', 0, 195 + 38);
    const verticalInside = collectible('vertical-inside', 0, 195 + 38 - 1e-6);
    const verticalOutside = collectible('vertical-outside', 0, 195 + 38 + 1e-6);

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

    expect(run(verticalTouch).collectibles).toBeUndefined();
    expect(run(verticalInside).collectibles?.collectedCount).toBe(1);
    expect(run(verticalOutside).collectibles).toBeUndefined();
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
