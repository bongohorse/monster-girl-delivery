import {
  isBehavioralLogicalHazard,
  isZapperHazardBehavior,
  type ZapperHazardBehavior,
} from './HazardArchetype';
import type { LogicalHazard, LogicalHitbox } from '../systems/HazardCollision';

export const PROTOTYPE_ZAPPER_BEAM_THICKNESS = 14;
export const PROTOTYPE_ZAPPER_ENDPOINT_DIAMETER = 32;
export const PROTOTYPE_ZAPPER_GRAZE_BEAM_PADDING = 8;
export const PROTOTYPE_ZAPPER_GRAZE_ENDPOINT_PADDING = 8;

export const PROTOTYPE_ZAPPER_LENGTHS = Object.freeze({
  short: 80,
  medium: 140,
  long: 200,
});

export const PROTOTYPE_ZAPPER_DIAGONAL_ANGLES = Object.freeze([-60, -45, -30, 30, 45, 60]);

export interface LogicalPoint {
  readonly x: number;
  readonly y: number;
}

export interface LogicalCircle {
  readonly center: Readonly<LogicalPoint>;
  readonly radius: number;
}

export interface LogicalCapsule {
  readonly end: Readonly<LogicalPoint>;
  readonly radius: number;
  readonly start: Readonly<LogicalPoint>;
}

export interface PrototypeZapperGeometry {
  readonly beam: Readonly<LogicalCapsule>;
  readonly bounds: Readonly<LogicalHitbox>;
  readonly endpointA: Readonly<LogicalCircle>;
  readonly endpointB: Readonly<LogicalCircle>;
}

export interface PrototypeZapperGeometryPadding {
  readonly beam: number;
  readonly endpoints: number;
}

export const PROTOTYPE_ZAPPER_LETHAL_PADDING: Readonly<PrototypeZapperGeometryPadding> =
  Object.freeze({ beam: 0, endpoints: 0 });

export const PROTOTYPE_ZAPPER_GRAZE_PADDING: Readonly<PrototypeZapperGeometryPadding> =
  Object.freeze({
    beam: PROTOTYPE_ZAPPER_GRAZE_BEAM_PADDING,
    endpoints: PROTOTYPE_ZAPPER_GRAZE_ENDPOINT_PADDING,
  });

const degreesToRadians = (degrees: number): number => (degrees * Math.PI) / 180;

const assertFinitePoint = (point: Readonly<LogicalPoint>, name: string): void => {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new RangeError(`${name} must contain finite coordinates.`);
  }
};

const assertPadding = (padding: Readonly<PrototypeZapperGeometryPadding>): void => {
  if (
    !Number.isFinite(padding.beam) ||
    padding.beam < 0 ||
    !Number.isFinite(padding.endpoints) ||
    padding.endpoints < 0
  ) {
    throw new RangeError('Zapper geometry padding must be finite and non-negative.');
  }
};

export const createPrototypeZapperBehavior = (
  angleDegrees: number,
  length: number,
): Readonly<ZapperHazardBehavior> =>
  Object.freeze({
    angleDegrees,
    archetype: 'geometric',
    beamThickness: PROTOTYPE_ZAPPER_BEAM_THICKNESS,
    endpointDiameter: PROTOTYPE_ZAPPER_ENDPOINT_DIAMETER,
    grazeBeamPadding: PROTOTYPE_ZAPPER_GRAZE_BEAM_PADDING,
    grazeEndpointPadding: PROTOTYPE_ZAPPER_GRAZE_ENDPOINT_PADDING,
    kind: 'zapper',
    length,
  });

const resolveGeometryFromCenter = (
  center: Readonly<LogicalPoint>,
  behavior: Readonly<ZapperHazardBehavior>,
): Readonly<PrototypeZapperGeometry> => {
  assertFinitePoint(center, 'Zapper center');
  const radians = degreesToRadians(behavior.angleDegrees);
  const halfLength = behavior.length / 2;
  const dx = Math.cos(radians) * halfLength;
  const dy = Math.sin(radians) * halfLength;
  const endpointA = Object.freeze({ x: center.x - dx, y: center.y - dy });
  const endpointB = Object.freeze({ x: center.x + dx, y: center.y + dy });
  const beamRadius = behavior.beamThickness / 2;
  const endpointRadius = behavior.endpointDiameter / 2;
  const maximumRadius = Math.max(beamRadius, endpointRadius);
  const bounds = Object.freeze({
    left: Math.min(endpointA.x, endpointB.x) - maximumRadius,
    right: Math.max(endpointA.x, endpointB.x) + maximumRadius,
    top: Math.min(endpointA.y, endpointB.y) - maximumRadius,
    bottom: Math.max(endpointA.y, endpointB.y) + maximumRadius,
  });

  return Object.freeze({
    beam: Object.freeze({ end: endpointB, radius: beamRadius, start: endpointA }),
    bounds,
    endpointA: Object.freeze({ center: endpointA, radius: endpointRadius }),
    endpointB: Object.freeze({ center: endpointB, radius: endpointRadius }),
  });
};

/** Creates the exact authored bounding box used by scheduling/fairness around one static Zapper. */
export const createPrototypeZapperHitbox = (
  centerX: number,
  centerY: number,
  behavior: Readonly<ZapperHazardBehavior>,
): Readonly<LogicalHitbox> => resolveGeometryFromCenter({ x: centerX, y: centerY }, behavior).bounds;

export const isPrototypeZapperHazard = (
  hazard: Readonly<LogicalHazard>,
): hazard is Readonly<
  LogicalHazard & {
    readonly behavior: Readonly<ZapperHazardBehavior>;
    readonly runDistance: number;
  }
> => isBehavioralLogicalHazard(hazard) && isZapperHazardBehavior(hazard.behavior);

/**
 * Resolves beam and node primitives from the immutable authored hitbox center. The same function is
 * consumed by collision, Graze, Director HB, and presentation so those systems cannot drift apart.
 */
export const resolvePrototypeZapperGeometry = (
  hazard: Readonly<LogicalHazard>,
): Readonly<PrototypeZapperGeometry> | null => {
  if (!isPrototypeZapperHazard(hazard)) {
    return null;
  }

  const center = {
    x: (hazard.hitbox.left + hazard.hitbox.right) / 2,
    y: (hazard.hitbox.top + hazard.hitbox.bottom) / 2,
  };
  return resolveGeometryFromCenter(center, hazard.behavior);
};

const pointToHitboxDistanceSquared = (
  point: Readonly<LogicalPoint>,
  hitbox: Readonly<LogicalHitbox>,
): number => {
  const nearestX = Math.max(hitbox.left, Math.min(hitbox.right, point.x));
  const nearestY = Math.max(hitbox.top, Math.min(hitbox.bottom, point.y));
  const dx = point.x - nearestX;
  const dy = point.y - nearestY;
  return dx * dx + dy * dy;
};

const pointToSegmentDistanceSquared = (
  point: Readonly<LogicalPoint>,
  start: Readonly<LogicalPoint>,
  end: Readonly<LogicalPoint>,
): number => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) {
    const px = point.x - start.x;
    const py = point.y - start.y;
    return px * px + py * py;
  }

  const projection = Math.max(
    0,
    Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared),
  );
  const nearestX = start.x + projection * dx;
  const nearestY = start.y + projection * dy;
  const px = point.x - nearestX;
  const py = point.y - nearestY;
  return px * px + py * py;
};

const segmentIntersectsHitbox = (
  start: Readonly<LogicalPoint>,
  end: Readonly<LogicalPoint>,
  hitbox: Readonly<LogicalHitbox>,
): boolean => {
  let lower = 0;
  let upper = 1;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const constraints = [
    [-dx, start.x - hitbox.left],
    [dx, hitbox.right - start.x],
    [-dy, start.y - hitbox.top],
    [dy, hitbox.bottom - start.y],
  ] as const;

  for (const [p, q] of constraints) {
    if (p === 0) {
      if (q < 0) {
        return false;
      }
      continue;
    }
    const ratio = q / p;
    if (p < 0) {
      lower = Math.max(lower, ratio);
    } else {
      upper = Math.min(upper, ratio);
    }
    if (lower > upper) {
      return false;
    }
  }
  return true;
};

const segmentToHitboxDistanceSquared = (
  start: Readonly<LogicalPoint>,
  end: Readonly<LogicalPoint>,
  hitbox: Readonly<LogicalHitbox>,
): number => {
  if (segmentIntersectsHitbox(start, end, hitbox)) {
    return 0;
  }

  const corners = [
    { x: hitbox.left, y: hitbox.top },
    { x: hitbox.right, y: hitbox.top },
    { x: hitbox.right, y: hitbox.bottom },
    { x: hitbox.left, y: hitbox.bottom },
  ];

  return Math.min(
    pointToHitboxDistanceSquared(start, hitbox),
    pointToHitboxDistanceSquared(end, hitbox),
    ...corners.map((corner) => pointToSegmentDistanceSquared(corner, start, end)),
  );
};

/** Exact instantaneous AABB-vs-capsule/circle union test for the static Zapper. */
export const doesHitboxOverlapPrototypeZapper = (
  hitbox: Readonly<LogicalHitbox>,
  geometry: Readonly<PrototypeZapperGeometry>,
  padding: Readonly<PrototypeZapperGeometryPadding> = PROTOTYPE_ZAPPER_LETHAL_PADDING,
): boolean => {
  assertPadding(padding);
  const beamRadius = geometry.beam.radius + padding.beam;
  const endpointARadius = geometry.endpointA.radius + padding.endpoints;
  const endpointBRadius = geometry.endpointB.radius + padding.endpoints;

  return (
    segmentToHitboxDistanceSquared(geometry.beam.start, geometry.beam.end, hitbox) <
      beamRadius * beamRadius ||
    pointToHitboxDistanceSquared(geometry.endpointA.center, hitbox) <
      endpointARadius * endpointARadius ||
    pointToHitboxDistanceSquared(geometry.endpointB.center, hitbox) <
      endpointBRadius * endpointBRadius
  );
};

export const getPrototypeZapperGrazePadding = (
  hazard: Readonly<LogicalHazard>,
): Readonly<PrototypeZapperGeometryPadding> => {
  if (!isPrototypeZapperHazard(hazard)) {
    return PROTOTYPE_ZAPPER_LETHAL_PADDING;
  }
  return Object.freeze({
    beam: hazard.behavior.grazeBeamPadding,
    endpoints: hazard.behavior.grazeEndpointPadding,
  });
};
