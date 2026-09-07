import { describe, expect, it } from 'vitest';
import {
  createPrototypeFlightBounds,
  getPrototypePlayerX,
  getPrototypeVerticalOffset,
  PROTOTYPE_LOGICAL_FLIGHT_BOUNDS,
  PROTOTYPE_LOGICAL_PLAYABLE_HEIGHT,
} from '../../src/game/PrototypeFlightLayout';

const ZERO_SAFE_AREA = { top: 0, right: 0, bottom: 0, left: 0 };

describe('prototype flight layout', () => {
  it('returns fixed logical flight bounds invariant to viewport height and orientation', () => {
    const portraitViewport = {
      width: 400,
      height: 800,
      safeArea: { top: 24, right: 0, bottom: 34, left: 0 },
    };
    const landscapeViewport = {
      width: 844,
      height: 390,
      safeArea: { top: 0, right: 44, bottom: 21, left: 44 },
    };
    const desktopViewport = {
      width: 1_280,
      height: 720,
      safeArea: ZERO_SAFE_AREA,
    };
    const tabletViewport = {
      width: 1_024,
      height: 768,
      safeArea: ZERO_SAFE_AREA,
    };

    expect(createPrototypeFlightBounds(portraitViewport)).toEqual(PROTOTYPE_LOGICAL_FLIGHT_BOUNDS);
    expect(createPrototypeFlightBounds(landscapeViewport)).toEqual(PROTOTYPE_LOGICAL_FLIGHT_BOUNDS);
    expect(createPrototypeFlightBounds(desktopViewport)).toEqual(PROTOTYPE_LOGICAL_FLIGHT_BOUNDS);
    expect(createPrototypeFlightBounds(tabletViewport)).toEqual(PROTOTYPE_LOGICAL_FLIGHT_BOUNDS);
    expect(createPrototypeFlightBounds()).toEqual({ ceilingY: 28, floorY: 362 });
  });

  it('keeps horizontal player placement inside asymmetric horizontal safe areas', () => {
    const viewport = {
      width: 844,
      height: 390,
      safeArea: { top: 0, right: 44, bottom: 21, left: 44 },
    };

    expect(getPrototypePlayerX(viewport)).toBe(233);
  });

  it('calculates vertical presentation offset to center the logical arena in the safe area', () => {
    expect(
      getPrototypeVerticalOffset({
        height: PROTOTYPE_LOGICAL_PLAYABLE_HEIGHT,
        safeArea: ZERO_SAFE_AREA,
      }),
    ).toBe(0);

    expect(
      getPrototypeVerticalOffset({
        height: 720,
        safeArea: ZERO_SAFE_AREA,
      }),
    ).toBe(165);

    expect(
      getPrototypeVerticalOffset({
        height: 768,
        safeArea: ZERO_SAFE_AREA,
      }),
    ).toBe(189);

    expect(
      getPrototypeVerticalOffset({
        height: 800,
        safeArea: { top: 24, right: 0, bottom: 34, left: 0 },
      }),
    ).toBe(200);

    expect(
      getPrototypeVerticalOffset({
        height: 390,
        safeArea: { top: 0, right: 44, bottom: 21, left: 44 },
      }),
    ).toBe(-10);
  });

  it('pins safely when logical extents exceed the logical playable height', () => {
    expect(
      createPrototypeFlightBounds(undefined, {
        top: 250,
        bottom: 250,
      }),
    ).toEqual({
      ceilingY: 195,
      floorY: 195,
    });
  });
});
