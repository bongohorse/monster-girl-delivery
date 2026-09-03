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

const sanitizeExtent = (value: number): number => (Number.isFinite(value) ? Math.max(0, value) : 0);

/** Derives non-lethal flight limits from the current safe viewport, never a device preset. */
export const createPrototypeFlightBounds = (
  viewport: Pick<ViewportSnapshot, 'height' | 'safeArea'>,
  extents: Readonly<PrototypePlayerLogicalVerticalExtents> = PROTOTYPE_PLAYER_LOGICAL_VERTICAL_EXTENTS,
): VerticalFlightBounds => {
  const height = sanitizeExtent(viewport.height);
  const safeTop = Math.min(height, sanitizeExtent(viewport.safeArea.top));
  const safeBottomInset = Math.min(height - safeTop, sanitizeExtent(viewport.safeArea.bottom));
  const safeBottom = height - safeBottomInset;
  const top = sanitizeExtent(extents.top);
  const bottom = sanitizeExtent(extents.bottom);
  const ceilingY = safeTop + top;
  const floorY = safeBottom - bottom;

  if (ceilingY <= floorY) {
    return { ceilingY, floorY };
  }

  const pinnedY = (safeTop + safeBottom) / 2;
  return { ceilingY: pinnedY, floorY: pinnedY };
};

/** Keeps the prototype anchor inside the horizontal safe area in either orientation. */
export const getPrototypePlayerX = (
  viewport: Pick<ViewportSnapshot, 'width' | 'safeArea'>,
): number => {
  const width = sanitizeExtent(viewport.width);
  const safeLeft = Math.min(width, sanitizeExtent(viewport.safeArea.left));
  const safeRight = Math.min(width - safeLeft, sanitizeExtent(viewport.safeArea.right));
  const safeWidth = Math.max(0, width - safeLeft - safeRight);

  return safeLeft + safeWidth * PLAYER_X_FRACTION;
};
