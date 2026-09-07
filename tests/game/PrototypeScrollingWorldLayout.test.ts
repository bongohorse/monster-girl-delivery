import { describe, expect, it } from 'vitest';
import { ViewportService } from '../../src/core/ViewportService';
import {
  createPrototypeScrollingWorldLayout,
  getWrappedScrollOffset,
} from '../../src/game/PrototypeScrollingWorldLayout';

describe('Prototype scrolling-world layout', () => {
  it('moves repeated world geometry left as run distance increases', () => {
    const viewport = new ViewportService(844, 390).getSnapshot();
    const initial = createPrototypeScrollingWorldLayout(viewport, 0);
    const advanced = createPrototypeScrollingWorldLayout(viewport, 32);

    expect(initial.buildings[0]?.x).toBe(0);
    expect(advanced.buildings[0]?.x).toBe(-32);
    expect(initial.groundMarkers[0]?.x).toBe(0);
    expect(advanced.groundMarkers[0]?.x).toBe(-32);
  });

  it('wraps to the same deterministic geometry after a complete repeat', () => {
    const viewport = new ViewportService(844, 390).getSnapshot();
    const initial = createPrototypeScrollingWorldLayout(viewport, 0);
    const repeated = createPrototypeScrollingWorldLayout(viewport, 1_536);

    expect(repeated).toEqual(initial);
  });

  it('preserves the distance-derived offset while adapting coverage on resize', () => {
    const narrow = createPrototypeScrollingWorldLayout(
      new ViewportService(480, 320).getSnapshot(),
      145,
    );
    const wide = createPrototypeScrollingWorldLayout(
      new ViewportService(960, 540).getSnapshot(),
      145,
    );

    expect(wide.buildings[0]?.x).toBe(narrow.buildings[0]?.x);
    expect(wide.groundMarkers[0]?.x).toBe(narrow.groundMarkers[0]?.x);
    expect(wide.buildings.length).toBeGreaterThan(narrow.buildings.length);
  });

  it('positions ground geometry relative to logical playable height and vertical projection', () => {
    const baselineViewport = new ViewportService(844, 390).getSnapshot();
    const baselineLayout = createPrototypeScrollingWorldLayout(baselineViewport, 0);
    expect(baselineLayout.groundTopY).toBe(378);

    const safeAreaViewport = new ViewportService(844, 390, {
      top: 10,
      right: 44,
      bottom: 21,
      left: 44,
    }).getSnapshot();
    const safeAreaLayout = createPrototypeScrollingWorldLayout(safeAreaViewport, 0);

    expect(safeAreaLayout.groundTopY).toBeCloseTo(357.92, 1);
    expect(safeAreaLayout.buildings.every((building) => building.y >= 10)).toBe(true);

    const tallViewport = new ViewportService(1_280, 720).getSnapshot();
    const tallLayout = createPrototypeScrollingWorldLayout(tallViewport, 0);
    expect(tallLayout.groundTopY).toBe(708);

    const shortViewport = new ViewportService(800, 300).getSnapshot();
    const shortLayout = createPrototypeScrollingWorldLayout(shortViewport, 0);
    expect(shortLayout.groundTopY).toBeCloseTo(378 * (300 / 390), 2);
    expect(shortLayout.buildings.every((building) => building.y >= 0)).toBe(true);
  });

  it('rejects invalid wrapping inputs', () => {
    expect(() => getWrappedScrollOffset(Number.NaN, 100)).toThrow(RangeError);
    expect(() => getWrappedScrollOffset(Number.POSITIVE_INFINITY, 100)).toThrow(RangeError);
    expect(() => getWrappedScrollOffset(100, 0)).toThrow(RangeError);
    expect(() => getWrappedScrollOffset(100, Number.NEGATIVE_INFINITY)).toThrow(RangeError);
  });
});
