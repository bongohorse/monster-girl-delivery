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
} from '../../src/systems/HazardCollision';

const CENTERED_FLIGHT_STATE = Object.freeze({ positionY: 195, velocityY: 0 });

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
});
