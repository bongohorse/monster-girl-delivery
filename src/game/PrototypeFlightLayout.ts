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

/** Authored hazard baseline and minimum logical height fitted into short viewports. */
export const PROTOTYPE_LOGICAL_PLAYABLE_HEIGHT = 390;

/** Baseline bounds for authored content; live viewports may extend the ceiling upward. */
export const PROTOTYPE_LOGICAL_FLIGHT_BOUNDS: Readonly<VerticalFlightBounds> = Object.freeze({
  ceilingY: PROTOTYPE_PLAYER_LOGICAL_VERTICAL_EXTENTS.top,
  floorY: PROTOTYPE_LOGICAL_PLAYABLE_HEIGHT - PROTOTYPE_PLAYER_LOGICAL_VERTICAL_EXTENTS.bottom,
});

const PLAYER_X_FRACTION = 0.25;

const sanitizeExtent = (value: number): number => (Number.isFinite(value) ? Math.max(0, value) : 0);

/**
 * Adds actual flight room above the authored baseline on taller viewports.
 * The floor and existing hazard coordinates stay fixed together, preserving floor collisions.
 * Negative logical Y is valid in the extra space; physics still uses ordinary logical units.
 */
export const createPrototypeFlightBounds = (
  viewport?: Pick<ViewportSnapshot, 'height' | 'safeArea'>,
  extents: Readonly<PrototypePlayerLogicalVerticalExtents> = PROTOTYPE_PLAYER_LOGICAL_VERTICAL_EXTENTS,
): VerticalFlightBounds => {
  const top = sanitizeExtent(extents.top);
  const bottom = sanitizeExtent(extents.bottom);
  const extraHeight = viewport
    ? Math.max(0, getSafeVerticalArea(viewport).height - PROTOTYPE_LOGICAL_PLAYABLE_HEIGHT)
    : 0;
  const ceilingY = top - extraHeight;
  const floorY = PROTOTYPE_LOGICAL_PLAYABLE_HEIGHT - bottom;

  if (ceilingY <= floorY) {
    return { ceilingY, floorY };
  }

  const pinnedY = (PROTOTYPE_LOGICAL_PLAYABLE_HEIGHT - extraHeight) / 2;
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

const getSafeVerticalArea = (
  viewport: Pick<ViewportSnapshot, 'height' | 'safeArea'>,
) => {
  const height = sanitizeExtent(viewport.height);
  const safeTop = Math.min(height, sanitizeExtent(viewport.safeArea.top));
  const safeBottomInset = Math.min(height - safeTop, sanitizeExtent(viewport.safeArea.bottom));
  const safeBottom = height - safeBottomInset;
  return { top: safeTop, height: Math.max(0, safeBottom - safeTop) };
};

/**
 * Anchors the authored floor at the safe bottom edge. Taller viewports expose more world above
 * it at 1:1 scale; short viewports retain the existing fit-down of the minimum authored corridor.
 * Player, hazards and ground share this projection, including during live resize.
 */
export const getPrototypeVerticalProjection = (
  viewport: Pick<ViewportSnapshot, 'height' | 'safeArea'>,
): PrototypeVerticalProjection => {
  const { top: safeTop, height: safeHeight } = getSafeVerticalArea(viewport);

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
    offsetY: safeTop + safeHeight - PROTOTYPE_LOGICAL_PLAYABLE_HEIGHT,
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
