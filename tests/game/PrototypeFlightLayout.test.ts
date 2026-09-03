import { describe, expect, it } from 'vitest';
import {
  createPrototypeFlightBounds,
  getPrototypePlayerX,
  PROTOTYPE_PLAYER_LOGICAL_VERTICAL_EXTENTS,
} from '../../src/game/PrototypeFlightLayout';

const ZERO_SAFE_AREA = { top: 0, right: 0, bottom: 0, left: 0 };

describe('prototype flight layout', () => {
  it('derives portrait bounds and player position from the safe viewport', () => {
    const viewport = {
      width: 400,
      height: 800,
      safeArea: { top: 24, right: 0, bottom: 34, left: 0 },
    };

    expect(createPrototypeFlightBounds(viewport)).toEqual({
      ceilingY: 24 + PROTOTYPE_PLAYER_LOGICAL_VERTICAL_EXTENTS.top,
      floorY: 800 - 34 - PROTOTYPE_PLAYER_LOGICAL_VERTICAL_EXTENTS.bottom,
    });
    expect(getPrototypePlayerX(viewport)).toBe(100);
  });

  it('keeps landscape placement inside asymmetric horizontal safe areas', () => {
    const viewport = {
      width: 844,
      height: 390,
      safeArea: { top: 0, right: 44, bottom: 21, left: 44 },
    };

    expect(createPrototypeFlightBounds(viewport)).toEqual({
      ceilingY: 28,
      floorY: 341,
    });
    expect(getPrototypePlayerX(viewport)).toBe(233);
  });

  it('retains the same viewport-relative placement with no safe-area insets', () => {
    const viewport = { width: 400, height: 800, safeArea: ZERO_SAFE_AREA };

    expect(createPrototypeFlightBounds(viewport)).toEqual({ ceilingY: 28, floorY: 772 });
    expect(getPrototypePlayerX(viewport)).toBe(100);
  });

  it('pins safely when the safe vertical span is shorter than the logical footprint', () => {
    expect(
      createPrototypeFlightBounds({
        height: 60,
        safeArea: { top: 10, right: 0, bottom: 10, left: 0 },
      }),
    ).toEqual({
      ceilingY: 30,
      floorY: 30,
    });
  });
});
