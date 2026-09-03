import type { ViewportSnapshot } from '../core/ViewportService';
import type { VerticalFlightBounds } from '../systems/VerticalFlightSimulation';

export interface PrototypePlayerLogicalVerticalExtents {
  bottom: number;
  top: number;
}

/**
 * Temporary M1 gameplay footprint around the player's position anchor.
 * Decorative placeholder details may extend beyond this body-sized footprint.
 */
export const PROTOTYPE_PLAYER_LOGICAL_VERTICAL_EXTENTS: Readonly<PrototypePlayerLogicalVerticalExtents> =
  Object.freeze({
    top: 28,
    bottom: 28,
  });

const PLAYER_X_FRACTION = 0.25;

/** Derives non-lethal flight limits from the current playable viewport, never a device preset. */
export const createPrototypeFlightBounds = (
  viewport: Pick<ViewportSnapshot, 'height'>,
  extents: Readonly<PrototypePlayerLogicalVerticalExtents> =
    PROTOTYPE_PLAYER_LOGICAL_VERTICAL_EXTENTS,
): VerticalFlightBounds => {
  const height = Number.isFinite(viewport.height) ? Math.max(0, viewport.height) : 0;
  const top = Number.isFinite(extents.top) ? Math.max(0, extents.top) : 0;
  const bottom = Number.isFinite(extents.bottom) ? Math.max(0, extents.bottom) : 0;
  const ceilingY = top;
  const floorY = height - bottom;

  if (ceilingY <= floorY) {
    return { ceilingY, floorY };
  }

  const pinnedY = height / 2;
  return { ceilingY: pinnedY, floorY: pinnedY };
};

export const getPrototypePlayerX = (viewport: Pick<ViewportSnapshot, 'width'>): number =>
  viewport.width * PLAYER_X_FRACTION;
