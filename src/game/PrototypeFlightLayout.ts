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

/** Fixed logical height of the gameplay world and simulation domain. */
export const PROTOTYPE_LOGICAL_PLAYABLE_HEIGHT = 390;

/** Authoritative flight bounds in fixed logical space; invariant to physical viewport height. */
export const PROTOTYPE_LOGICAL_FLIGHT_BOUNDS: Readonly<VerticalFlightBounds> = Object.freeze({
  ceilingY: PROTOTYPE_PLAYER_LOGICAL_VERTICAL_EXTENTS.top,
  floorY: PROTOTYPE_LOGICAL_PLAYABLE_HEIGHT - PROTOTYPE_PLAYER_LOGICAL_VERTICAL_EXTENTS.bottom,
});

const PLAYER_X_FRACTION = 0.25;

const sanitizeExtent = (value: number): number => (Number.isFinite(value) ? Math.max(0, value) : 0);

/**
 * Returns non-lethal flight limits in the authoritative logical gameplay domain.
 * Viewport height does not alter logical flight limits, preserving hazard fairness across devices.
 */
export const createPrototypeFlightBounds = (
  _viewport?: Pick<ViewportSnapshot, 'height' | 'safeArea'>,
  extents: Readonly<PrototypePlayerLogicalVerticalExtents> = PROTOTYPE_PLAYER_LOGICAL_VERTICAL_EXTENTS,
): VerticalFlightBounds => {
  const top = sanitizeExtent(extents.top);
  const bottom = sanitizeExtent(extents.bottom);
  const ceilingY = top;
  const floorY = PROTOTYPE_LOGICAL_PLAYABLE_HEIGHT - bottom;

  if (ceilingY <= floorY) {
    return { ceilingY, floorY };
  }

  const pinnedY = PROTOTYPE_LOGICAL_PLAYABLE_HEIGHT / 2;
  return { ceilingY: pinnedY, floorY: pinnedY };
};

export interface PrototypeVerticalProjection {
  readonly offsetY: number;
  readonly scaleY: number;
}

export type PrototypeVerticalOffsetOrProjection = number | Readonly<PrototypeVerticalProjection>;

export const resolveVerticalProjection = (
  projectionOrOffset: PrototypeVerticalOffsetOrProjection = 0,
): PrototypeVerticalProjection => {
  if (typeof projectionOrOffset === 'number') {
    if (!Number.isFinite(projectionOrOffset)) {
      throw new RangeError('Vertical offset must be a finite number.');
    }
    return { offsetY: projectionOrOffset, scaleY: 1 };
  }
  if (
    !Number.isFinite(projectionOrOffset.offsetY) ||
    !Number.isFinite(projectionOrOffset.scaleY) ||
    projectionOrOffset.scaleY <= 0
  ) {
    throw new RangeError('Vertical projection must have finite values and positive scaleY.');
  }
  return projectionOrOffset;
};

/**
 * Projects the fixed 390px logical gameplay arena into the presentation safe viewport.
 * When safeHeight >= 390, centers the arena at 1:1 scale (scaleY = 1).
 * When safeHeight < 390, scales the arena down so the entire flight corridor fits on-screen.
 */
export const getPrototypeVerticalProjection = (
  viewport: Pick<ViewportSnapshot, 'height' | 'safeArea'>,
): PrototypeVerticalProjection => {
  const height = sanitizeExtent(viewport.height);
  const safeTop = Math.min(height, sanitizeExtent(viewport.safeArea.top));
  const safeBottomInset = Math.min(height - safeTop, sanitizeExtent(viewport.safeArea.bottom));
  const safeBottom = height - safeBottomInset;
  const safeHeight = Math.max(0, safeBottom - safeTop);

  if (safeHeight <= 0) {
    return { offsetY: 0, scaleY: 1 };
  }

  if (safeHeight < PROTOTYPE_LOGICAL_PLAYABLE_HEIGHT) {
    return {
      offsetY: safeTop,
      scaleY: safeHeight / PROTOTYPE_LOGICAL_PLAYABLE_HEIGHT,
    };
  }

  return {
    offsetY: Math.round(safeTop + (safeHeight - PROTOTYPE_LOGICAL_PLAYABLE_HEIGHT) / 2),
    scaleY: 1,
  };
};

/**
 * Projects a logical vertical coordinate to presentation screen space.
 */
export const projectLogicalYToScreen = (
  logicalY: number,
  projectionOrOffset: PrototypeVerticalOffsetOrProjection = 0,
): number => {
  if (!Number.isFinite(logicalY)) {
    throw new RangeError('logicalY must be a finite number.');
  }
  const projection = resolveVerticalProjection(projectionOrOffset);
  return projection.offsetY + logicalY * projection.scaleY;
};

/**
 * Returns the vertical presentation offset (screen top anchor) for the logical arena.
 */
export const getPrototypeVerticalOffset = (
  viewport: Pick<ViewportSnapshot, 'height' | 'safeArea'>,
): number => getPrototypeVerticalProjection(viewport).offsetY;

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
