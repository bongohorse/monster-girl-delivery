import { describe, expect, it } from 'vitest';
import {
  createPrototypeFlightBounds,
  getPrototypePlayerX,
  PROTOTYPE_PLAYER_LOGICAL_VERTICAL_EXTENTS,
} from '../../src/game/PrototypeFlightLayout';

describe('prototype flight layout', () => {
  it('derives flight bounds from the current viewport and logical player footprint', () => {
    const bounds = createPrototypeFlightBounds({ height: 800 });

    expect(bounds).toEqual({
      ceilingY: PROTOTYPE_PLAYER_LOGICAL_VERTICAL_EXTENTS.top,
      floorY: 800 - PROTOTYPE_PLAYER_LOGICAL_VERTICAL_EXTENTS.bottom,
    });
    expect(getPrototypePlayerX({ width: 400 })).toBe(100);
  });

  it('pins safely when the viewport is shorter than the logical footprint', () => {
    expect(createPrototypeFlightBounds({ height: 40 })).toEqual({
      ceilingY: 20,
      floorY: 20,
    });
  });
});
