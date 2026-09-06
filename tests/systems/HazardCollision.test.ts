import { describe, expect, it } from 'vitest';
import { ViewportService } from '../../src/core/ViewportService';
import {
  createPrototypeFlightBounds,
  getPrototypePlayerX,
} from '../../src/game/PrototypeFlightLayout';
import {
  PROTOTYPE_PLACEHOLDER_HAZARD,
  projectHazardHitboxToScreen,
} from '../../src/hazards/PrototypeHazard';
import {
  createPrototypePlayerHitbox,
  doLogicalHitboxesOverlap,
  isPlayerCollidingWithHazard,
  isPlayerCollidingWithHazardDuringStep,
} from '../../src/systems/HazardCollision';
import { createVerticalFlightTrajectory } from '../../src/systems/VerticalFlightSimulation';

const CENTERED_FLIGHT_STATE = Object.freeze({ positionY: 195, velocityY: 0 });
const LINEAR_FLIGHT_TUNING = Object.freeze({
  gravity: 0,
  thrust: 0,
  maxFallVelocity: 1_000,
  maxRiseVelocity: 1_000,
});
const UNRESTRICTED_BOUNDS = Object.freeze({ ceilingY: -10_000, floorY: 10_000 });
const SMALL_PLAYER_EXTENTS = Object.freeze({ left: 1, right: 1, top: 1, bottom: 1 });

const testContinuousCollision = (
  initialFlight: Readonly<{ positionY: number; velocityY: number }>,
  elapsedSeconds: number,
  hazard: Readonly<Parameters<typeof isPlayerCollidingWithHazardDuringStep>[4]>,
  scrollSpeed = 350,
) =>
  isPlayerCollidingWithHazardDuringStep(
    { distance: 0 },
    createVerticalFlightTrajectory(
      initialFlight,
      elapsedSeconds,
      false,
      LINEAR_FLIGHT_TUNING,
      UNRESTRICTED_BOUNDS,
    ),
    elapsedSeconds,
    { baseScrollSpeed: scrollSpeed },
    hazard,
    SMALL_PLAYER_EXTENTS,
  );

describe('hazard collision', () => {
  it('reports a clear miss when logical bounds do not overlap', () => {
    expect(
      isPlayerCollidingWithHazard(
        { distance: 1_000 },
        CENTERED_FLIGHT_STATE,
        PROTOTYPE_PLACEHOLDER_HAZARD,
      ),
    ).toBe(false);
  });

  it('treats exact edge contact as non-overlap', () => {
    expect(
      doLogicalHitboxesOverlap(
        { left: 0, right: 10, top: 0, bottom: 10 },
        { left: 10, right: 20, top: 0, bottom: 10 },
      ),
    ).toBe(false);
    expect(
      doLogicalHitboxesOverlap(
        { left: 0, right: 10, top: 0, bottom: 10 },
        { left: 0, right: 10, top: 10, bottom: 20 },
      ),
    ).toBe(false);
  });

  it('detects a clear player-hazard overlap deterministically', () => {
    const runState = Object.freeze({ distance: 1_200 });

    const first = isPlayerCollidingWithHazard(
      runState,
      CENTERED_FLIGHT_STATE,
      PROTOTYPE_PLACEHOLDER_HAZARD,
    );
    const repeated = isPlayerCollidingWithHazard(
      runState,
      CENTERED_FLIGHT_STATE,
      PROTOTYPE_PLACEHOLDER_HAZARD,
    );

    expect(first).toBe(true);
    expect(repeated).toBe(first);
  });

  it('does not make the safe flight ceiling or floor lethal', () => {
    const viewport = new ViewportService(844, 390).getSnapshot();
    const bounds = createPrototypeFlightBounds(viewport);
    const runState = { distance: 1_200 };

    expect(
      isPlayerCollidingWithHazard(
        runState,
        { positionY: bounds.ceilingY, velocityY: 0 },
        PROTOTYPE_PLACEHOLDER_HAZARD,
      ),
    ).toBe(false);
    expect(
      isPlayerCollidingWithHazard(
        runState,
        { positionY: bounds.floorY, velocityY: 0 },
        PROTOTYPE_PLACEHOLDER_HAZARD,
      ),
    ).toBe(false);
  });

  it('keeps collision independent of representative viewport sizes', () => {
    const landscapePhone = new ViewportService(844, 390).getSnapshot();
    const largeLandscape = new ViewportService(1_280, 720).getSnapshot();
    const runState = { distance: 1_200 };
    const phoneProjection = projectHazardHitboxToScreen(
      PROTOTYPE_PLACEHOLDER_HAZARD,
      runState,
      getPrototypePlayerX(landscapePhone),
    );
    const largeProjection = projectHazardHitboxToScreen(
      PROTOTYPE_PLACEHOLDER_HAZARD,
      runState,
      getPrototypePlayerX(largeLandscape),
    );

    expect(phoneProjection.left).not.toBe(largeProjection.left);
    expect(
      isPlayerCollidingWithHazard(runState, CENTERED_FLIGHT_STATE, PROTOTYPE_PLACEHOLDER_HAZARD),
    ).toBe(true);
    expect(
      isPlayerCollidingWithHazard(runState, CENTERED_FLIGHT_STATE, PROTOTYPE_PLACEHOLDER_HAZARD),
    ).toBe(true);
  });

  it('creates a player hitbox from logical state and configurable extents', () => {
    expect(
      createPrototypePlayerHitbox(
        { distance: 600 },
        { positionY: 140, velocityY: -20 },
        { left: 10, right: 20, top: 30, bottom: 40 },
      ),
    ).toEqual({ left: 590, right: 620, top: 110, bottom: 180 });
  });

  it('rejects non-finite state and invalid player extents', () => {
    expect(() =>
      createPrototypePlayerHitbox({ distance: Number.NaN }, CENTERED_FLIGHT_STATE),
    ).toThrow(RangeError);
    expect(() =>
      createPrototypePlayerHitbox({ distance: 0 }, CENTERED_FLIGHT_STATE, {
        left: -1,
        right: 1,
        top: 1,
        bottom: 1,
      }),
    ).toThrow(RangeError);
  });

  it('detects a coarse start-clear/end-clear crossing without inflating either hitbox', () => {
    const hazard = { hitbox: { left: 40, right: 50, top: -5, bottom: 5 } };

    expect(
      isPlayerCollidingWithHazard({ distance: 0 }, { positionY: 0, velocityY: 0 }, hazard),
    ).toBe(false);
    expect(
      isPlayerCollidingWithHazard({ distance: 70 }, { positionY: 0, velocityY: 0 }, hazard),
    ).toBe(false);
    expect(testContinuousCollision({ positionY: 0, velocityY: 0 }, 0.2, hazard)).toBe(true);
  });

  it('keeps a diagonal near-corner pass and edge-only contact non-lethal', () => {
    const nearCorner = { hitbox: { left: 40, right: 50, top: 40, bottom: 50 } };
    const verticalEdgeOnly = { hitbox: { left: 40, right: 50, top: 1, bottom: 10 } };
    const horizontalEdgeOnly = { hitbox: { left: 22, right: 30, top: -5, bottom: 5 } };

    expect(testContinuousCollision({ positionY: 12, velocityY: 350 }, 0.2, nearCorner)).toBe(false);
    expect(testContinuousCollision({ positionY: 0, velocityY: 0 }, 0.2, verticalEdgeOnly)).toBe(
      false,
    );
    expect(
      testContinuousCollision({ positionY: 0, velocityY: 0 }, 0.1, horizontalEdgeOnly, 210),
    ).toBe(false);
  });

  it('accounts for vertical-patrol relative motion between clear endpoints', () => {
    const movingHazard = {
      behavior: {
        amplitudeY: 20,
        archetype: 'geometric' as const,
        cycleDistance: 140,
        kind: 'vertical-patrol' as const,
        phaseOffset: 0.25,
      },
      hitbox: { left: -100, right: 1_000, top: 19, bottom: 21 },
      runDistance: 0,
    };

    expect(testContinuousCollision({ positionY: 0, velocityY: 0 }, 0.4, movingHazard)).toBe(true);
  });

  it('uses the authoritative velocity-cap and bounds-constrained flight path', () => {
    const cappedTrajectory = createVerticalFlightTrajectory(
      { positionY: 0, velocityY: 0 },
      0.2,
      false,
      { gravity: 100, thrust: 0, maxFallVelocity: 10, maxRiseVelocity: 100 },
      UNRESTRICTED_BOUNDS,
    );
    expect(
      isPlayerCollidingWithHazardDuringStep(
        { distance: 0 },
        cappedTrajectory,
        0.2,
        { baseScrollSpeed: 100 },
        { hitbox: { left: 14.9, right: 15.1, top: 0.95, bottom: 1.05 } },
        { left: 0.1, right: 0.1, top: 0.05, bottom: 0.05 },
      ),
    ).toBe(true);

    const boundedTrajectory = createVerticalFlightTrajectory(
      { positionY: 0, velocityY: 100 },
      0.1,
      false,
      LINEAR_FLIGHT_TUNING,
      { ceilingY: -10, floorY: 2 },
    );
    expect(
      isPlayerCollidingWithHazardDuringStep(
        { distance: 0 },
        boundedTrajectory,
        0.1,
        { baseScrollSpeed: 100 },
        { hitbox: { left: 7.9, right: 8.1, top: 1.95, bottom: 2.05 } },
        { left: 0.1, right: 0.1, top: 0.01, bottom: 0.01 },
      ),
    ).toBe(true);
  });

  it('uses the authoritative post-boundary remaining-time flight path', () => {
    const trajectory = createVerticalFlightTrajectory(
      { positionY: 100.01, velocityY: -20 },
      0.05,
      false,
      { gravity: 1_400, thrust: 2_200, maxFallVelocity: 650, maxRiseVelocity: 550 },
      { ceilingY: 100, floorY: 500 },
    );

    expect(trajectory.finalState.positionY).toBeCloseTo(101.714_546_482_928, 10);
    expect(
      isPlayerCollidingWithHazardDuringStep(
        { distance: 0 },
        trajectory,
        0.05,
        { baseScrollSpeed: 0 },
        { hitbox: { left: -1, right: 1, top: 101.49, bottom: 101.51 } },
        { left: 0.01, right: 0.01, top: 0.01, bottom: 0.01 },
      ),
    ).toBe(true);
  });

  it('does not create a swept collision at zero delta', () => {
    const hazard = { hitbox: { left: 40, right: 50, top: -5, bottom: 5 } };
    expect(testContinuousCollision({ positionY: 0, velocityY: 0 }, 0, hazard)).toBe(false);
  });

  it('restricts collision to the hazard active sub-interval', () => {
    const activeAfterPass = {
      collisionInterval: { startSeconds: 0.15, endSeconds: 0.2 },
      hitbox: { left: 40, right: 50, top: -5, bottom: 5 },
    };
    const activeDuringPass = {
      ...activeAfterPass,
      collisionInterval: { startSeconds: 0, endSeconds: 0.15 },
    };

    expect(testContinuousCollision({ positionY: 0, velocityY: 0 }, 0.2, activeAfterPass)).toBe(
      false,
    );
    expect(testContinuousCollision({ positionY: 0, velocityY: 0 }, 0.2, activeDuringPass)).toBe(
      true,
    );
  });
});
