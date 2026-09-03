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

  it('keeps ground geometry inside the safe vertical viewport', () => {
    const viewport = new ViewportService(844, 390, {
      top: 10,
      right: 44,
      bottom: 21,
      left: 44,
    }).getSnapshot();
    const layout = createPrototypeScrollingWorldLayout(viewport, 0);

    expect(layout.groundTopY).toBe(357);
    expect(layout.buildings.every((building) => building.y >= 10)).toBe(true);
  });

  it('rejects invalid wrapping inputs', () => {
    expect(() => getWrappedScrollOffset(Number.NaN, 100)).toThrow(RangeError);
    expect(() => getWrappedScrollOffset(Number.POSITIVE_INFINITY, 100)).toThrow(RangeError);
    expect(() => getWrappedScrollOffset(100, 0)).toThrow(RangeError);
    expect(() => getWrappedScrollOffset(100, Number.NEGATIVE_INFINITY)).toThrow(RangeError);
  });
});
