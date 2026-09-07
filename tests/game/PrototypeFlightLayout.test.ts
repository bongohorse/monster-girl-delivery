import { describe, expect, it } from 'vitest';
import {
  createPrototypeFlightBounds,
  getPrototypePlayerX,
  getPrototypeVerticalOffset,
  getPrototypeVerticalProjection,
  PROTOTYPE_LOGICAL_FLIGHT_BOUNDS,
  PROTOTYPE_LOGICAL_PLAYABLE_HEIGHT,
  projectLogicalYToScreen,
  resolveVerticalProjection,
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
    ).toBe(0);
  });

  it('calculates unified vertical presentation projection for tall and short viewports', () => {
    // Tall viewport: scale 1, centered
    const tall = getPrototypeVerticalProjection({
      height: 720,
      safeArea: ZERO_SAFE_AREA,
    });
    expect(tall).toEqual({ offsetY: 165, scaleY: 1 });

    // Baseline viewport (844x390, no insets): scale 1, offset 0
    const baseline = getPrototypeVerticalProjection({
      height: 390,
      safeArea: ZERO_SAFE_AREA,
    });
    expect(baseline).toEqual({ offsetY: 0, scaleY: 1 });

    // Short viewport (800x300, no insets): scale down to fit
    const short300 = getPrototypeVerticalProjection({
      height: 300,
      safeArea: ZERO_SAFE_AREA,
    });
    expect(short300.offsetY).toBe(0);
    expect(short300.scaleY).toBeCloseTo(300 / 390, 6);

    // Short viewport with safe-area insets (640x360, safeTop: 10, safeBottom: 10 -> safeHeight: 340)
    const shortWithInsets = getPrototypeVerticalProjection({
      height: 360,
      safeArea: { top: 10, right: 0, bottom: 10, left: 0 },
    });
    expect(shortWithInsets.offsetY).toBe(10);
    expect(shortWithInsets.scaleY).toBeCloseTo(340 / 390, 6);

    // Degenerate viewport
    const degenerate = getPrototypeVerticalProjection({
      height: 0,
      safeArea: ZERO_SAFE_AREA,
    });
    expect(degenerate).toEqual({ offsetY: 0, scaleY: 1 });
  });

  it('projects logical Y coordinates to screen space and validates projection inputs', () => {
    const projection = { offsetY: 20, scaleY: 0.5 };
    expect(projectLogicalYToScreen(100, projection)).toBe(70);
    expect(projectLogicalYToScreen(0, projection)).toBe(20);
    expect(projectLogicalYToScreen(100, 15)).toBe(115);

    expect(() => projectLogicalYToScreen(Number.NaN, projection)).toThrow(RangeError);
    expect(() => projectLogicalYToScreen(100, Number.NaN)).toThrow(RangeError);
    expect(() => resolveVerticalProjection({ offsetY: 0, scaleY: 0 })).toThrow(RangeError);
    expect(() => resolveVerticalProjection({ offsetY: 0, scaleY: -1 })).toThrow(RangeError);
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
