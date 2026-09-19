import type { LogicalHazard, LogicalHitbox } from '../systems/HazardCollision';
import {
  isBehavioralLogicalHazard,
  isZapperHazardBehavior,
  type ZapperHazardBehavior,
  type ZapperRotationMotion,
} from './HazardArchetype';

export const PROTOTYPE_ZAPPER_BEAM_THICKNESS = 14;
export const PROTOTYPE_ZAPPER_ENDPOINT_DIAMETER = 32;
export const PROTOTYPE_ZAPPER_GRAZE_BEAM_PADDING = 8;
export const PROTOTYPE_ZAPPER_GRAZE_ENDPOINT_PADDING = 8;

export const PROTOTYPE_ZAPPER_LENGTHS = Object.freeze({
  short: 80,
  medium: 140,
  long: 200,
});

export const PROTOTYPE_ZAPPER_ROTATION_SPEEDS = Object.freeze({
  slow: 30,
  medium: 60,
  fast: 90,
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
  readonly angleDegrees: number;
  readonly beam: Readonly<LogicalCapsule>;
  readonly bounds: Readonly<LogicalHitbox>;
  readonly endpointA: Readonly<LogicalCircle>;
  readonly endpointB: Readonly<LogicalCircle>;
}

interface MutableLogicalPoint {
  x: number;
  y: number;
}

interface MutableLogicalCircle {
  center: MutableLogicalPoint;
  radius: number;
}

interface MutableLogicalCapsule {
  end: MutableLogicalPoint;
  radius: number;
  start: MutableLogicalPoint;
}

/**
 * Caller-owned mutable geometry used only on allocation-sensitive collision paths. Public immutable
 * geometry consumers should continue using resolvePrototypeZapperGeometry().
 */
export interface PrototypeZapperGeometryScratch {
  angleDegrees: number;
  beam: MutableLogicalCapsule;
  bounds: LogicalHitbox;
  endpointA: MutableLogicalCircle;
  endpointB: MutableLogicalCircle;
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
const positiveModulo = (value: number, modulus: number): number =>
  ((value % modulus) + modulus) % modulus;

const assertFiniteCoordinates = (x: number, y: number, name: string): void => {
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
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
  rotation?: Readonly<ZapperRotationMotion>,
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
    ...(rotation ? { rotation: Object.freeze({ ...rotation }) } : {}),
  });

export const resolvePrototypeZapperAngleDegrees = (
  behavior: Readonly<ZapperHazardBehavior>,
  simulationSeconds = 0,
): number => {
  if (!Number.isFinite(simulationSeconds) || simulationSeconds < 0) {
    throw new RangeError('Zapper simulationSeconds must be non-negative and finite.');
  }
  const rotation = behavior.rotation;
  if (!rotation) {
    return behavior.angleDegrees;
  }

  const direction = rotation.direction === 'clockwise' ? 1 : -1;
  return positiveModulo(
    behavior.angleDegrees + direction * rotation.speedDegreesPerSecond * simulationSeconds,
    360,
  );
};

export const createPrototypeZapperGeometryScratch = (): PrototypeZapperGeometryScratch => {
  const endpointA: MutableLogicalPoint = { x: 0, y: 0 };
  const endpointB: MutableLogicalPoint = { x: 0, y: 0 };
  return {
    angleDegrees: 0,
    beam: { end: endpointB, radius: 0, start: endpointA },
    bounds: { bottom: 0, left: 0, right: 0, top: 0 },
    endpointA: { center: endpointA, radius: 0 },
    endpointB: { center: endpointB, radius: 0 },
  };
};

const writeGeometryFromCenter = (
  scratch: PrototypeZapperGeometryScratch,
  centerX: number,
  centerY: number,
  behavior: Readonly<ZapperHazardBehavior>,
  simulationSeconds = 0,
): PrototypeZapperGeometryScratch => {
  assertFiniteCoordinates(centerX, centerY, 'Zapper center');
  const angleDegrees = resolvePrototypeZapperAngleDegrees(behavior, simulationSeconds);
  const radians = degreesToRadians(angleDegrees);
  const halfLength = behavior.length / 2;
  const dx = Math.cos(radians) * halfLength;
  const dy = Math.sin(radians) * halfLength;
  const endpointAX = centerX - dx;
  const endpointAY = centerY - dy;
  const endpointBX = centerX + dx;
  const endpointBY = centerY + dy;
  const beamRadius = behavior.beamThickness / 2;
  const endpointRadius = behavior.endpointDiameter / 2;
  const maximumRadius = Math.max(beamRadius, endpointRadius);

  scratch.angleDegrees = angleDegrees;
  scratch.beam.start.x = endpointAX;
  scratch.beam.start.y = endpointAY;
  scratch.beam.end.x = endpointBX;
  scratch.beam.end.y = endpointBY;
  scratch.beam.radius = beamRadius;
  scratch.endpointA.radius = endpointRadius;
  scratch.endpointB.radius = endpointRadius;
  scratch.bounds.left = Math.min(endpointAX, endpointBX) - maximumRadius;
  scratch.bounds.right = Math.max(endpointAX, endpointBX) + maximumRadius;
  scratch.bounds.top = Math.min(endpointAY, endpointBY) - maximumRadius;
  scratch.bounds.bottom = Math.max(endpointAY, endpointBY) + maximumRadius;
  return scratch;
};

const freezePrototypeZapperGeometryScratch = (
  scratch: PrototypeZapperGeometryScratch,
): Readonly<PrototypeZapperGeometry> => {
  Object.freeze(scratch.beam.start);
  Object.freeze(scratch.beam.end);
  Object.freeze(scratch.beam);
  Object.freeze(scratch.bounds);
  Object.freeze(scratch.endpointA);
  Object.freeze(scratch.endpointB);
  return Object.freeze(scratch);
};

const resolveGeometryFromCenter = (
  center: Readonly<LogicalPoint>,
  behavior: Readonly<ZapperHazardBehavior>,
  simulationSeconds = 0,
): Readonly<PrototypeZapperGeometry> =>
  freezePrototypeZapperGeometryScratch(
    writeGeometryFromCenter(
      createPrototypeZapperGeometryScratch(),
      center.x,
      center.y,
      behavior,
      simulationSeconds,
    ),
  );

/** Creates the authored scheduling box around one Zapper. Rotating Zappers reserve their full sweep. */
export const createPrototypeZapperHitbox = (
  centerX: number,
  centerY: number,
  behavior: Readonly<ZapperHazardBehavior>,
): Readonly<LogicalHitbox> => {
  if (!behavior.rotation) {
    return resolveGeometryFromCenter({ x: centerX, y: centerY }, behavior).bounds;
  }

  const radius =
    behavior.length / 2 + Math.max(behavior.beamThickness / 2, behavior.endpointDiameter / 2);
  return Object.freeze({
    left: centerX - radius,
    right: centerX + radius,
    top: centerY - radius,
    bottom: centerY + radius,
  });
};

export const isPrototypeZapperHazard = (
  hazard: Readonly<LogicalHazard>,
): hazard is Readonly<
  LogicalHazard & {
    readonly behavior: Readonly<ZapperHazardBehavior>;
    readonly runDistance: number;
  }
> => isBehavioralLogicalHazard(hazard) && isZapperHazardBehavior(hazard.behavior);

/**
 * Resolves beam and node primitives from the immutable authored hitbox center. Collision, Graze,
 * Director HB, and presentation pass the same authoritative simulation time so rotating geometry
 * cannot drift between systems.
 */
export const resolvePrototypeZapperGeometry = (
  hazard: Readonly<LogicalHazard>,
  simulationSeconds = 0,
): Readonly<PrototypeZapperGeometry> | null => {
  if (!isPrototypeZapperHazard(hazard)) {
    return null;
  }

  const center = {
    x: (hazard.hitbox.left + hazard.hitbox.right) / 2,
    y: (hazard.hitbox.top + hazard.hitbox.bottom) / 2,
  };
  return resolveGeometryFromCenter(center, hazard.behavior, simulationSeconds);
};

/**
 * Rewrites caller-owned geometry without allocating or freezing a new geometry tree. Intended for
 * dense collision sampling only; presentation and diagnostics should use the immutable resolver.
 */
export const resolvePrototypeZapperGeometryInto = (
  hazard: Readonly<LogicalHazard>,
  simulationSeconds: number,
  scratch: PrototypeZapperGeometryScratch,
): PrototypeZapperGeometryScratch | null => {
  if (!isPrototypeZapperHazard(hazard)) {
    return null;
  }

  const centerX = (hazard.hitbox.left + hazard.hitbox.right) / 2;
  const centerY = (hazard.hitbox.top + hazard.hitbox.bottom) / 2;
  return writeGeometryFromCenter(scratch, centerX, centerY, hazard.behavior, simulationSeconds);
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

const pointCoordinatesToSegmentDistanceSquared = (
  pointX: number,
  pointY: number,
  start: Readonly<LogicalPoint>,
  end: Readonly<LogicalPoint>,
): number => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) {
    const px = pointX - start.x;
    const py = pointY - start.y;
    return px * px + py * py;
  }

  const projection = Math.max(
    0,
    Math.min(1, ((pointX - start.x) * dx + (pointY - start.y) * dy) / lengthSquared),
  );
  const nearestX = start.x + projection * dx;
  const nearestY = start.y + projection * dy;
  const px = pointX - nearestX;
  const py = pointY - nearestY;
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

  {
    const p = -dx;
    const q = start.x - hitbox.left;
    if (p === 0) {
      if (q < 0) {
        return false;
      }
    } else {
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
  }

  {
    const p = dx;
    const q = hitbox.right - start.x;
    if (p === 0) {
      if (q < 0) {
        return false;
      }
    } else {
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
  }

  {
    const p = -dy;
    const q = start.y - hitbox.top;
    if (p === 0) {
      if (q < 0) {
        return false;
      }
    } else {
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
  }

  {
    const p = dy;
    const q = hitbox.bottom - start.y;
    if (p === 0) {
      return q >= 0;
    }
    const ratio = q / p;
    if (p < 0) {
      lower = Math.max(lower, ratio);
    } else {
      upper = Math.min(upper, ratio);
    }
    return lower <= upper;
  }
};

const segmentToHitboxDistanceSquared = (
  start: Readonly<LogicalPoint>,
  end: Readonly<LogicalPoint>,
  hitbox: Readonly<LogicalHitbox>,
): number => {
  if (segmentIntersectsHitbox(start, end, hitbox)) {
    return 0;
  }

  return Math.min(
    pointToHitboxDistanceSquared(start, hitbox),
    pointToHitboxDistanceSquared(end, hitbox),
    pointCoordinatesToSegmentDistanceSquared(hitbox.left, hitbox.top, start, end),
    pointCoordinatesToSegmentDistanceSquared(hitbox.right, hitbox.top, start, end),
    pointCoordinatesToSegmentDistanceSquared(hitbox.right, hitbox.bottom, start, end),
    pointCoordinatesToSegmentDistanceSquared(hitbox.left, hitbox.bottom, start, end),
  );
};

const doesHitboxOverlapPrototypeZapperUnchecked = (
  hitbox: Readonly<LogicalHitbox>,
  geometry: Readonly<PrototypeZapperGeometry>,
  padding: Readonly<PrototypeZapperGeometryPadding>,
): boolean => {
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

/** Exact instantaneous AABB-vs-capsule/circle union test for one Zapper pose. */
export const doesHitboxOverlapPrototypeZapper = (
  hitbox: Readonly<LogicalHitbox>,
  geometry: Readonly<PrototypeZapperGeometry>,
  padding: Readonly<PrototypeZapperGeometryPadding> = PROTOTYPE_ZAPPER_LETHAL_PADDING,
): boolean => {
  assertPadding(padding);
  return doesHitboxOverlapPrototypeZapperUnchecked(hitbox, geometry, padding);
};

/**
 * Hot-path overlap for the two trusted frozen prototype paddings. Runtime identity is checked so a
 * custom/frozen accessor object can never bypass the public per-call validation contract.
 */
export const doesHitboxOverlapPrototypeZapperWithCanonicalPadding = (
  hitbox: Readonly<LogicalHitbox>,
  geometry: Readonly<PrototypeZapperGeometry>,
  padding: Readonly<PrototypeZapperGeometryPadding>,
): boolean => {
  if (padding !== PROTOTYPE_ZAPPER_LETHAL_PADDING && padding !== PROTOTYPE_ZAPPER_GRAZE_PADDING) {
    throw new TypeError('Canonical Zapper overlap requires a prototype padding constant.');
  }
  return doesHitboxOverlapPrototypeZapperUnchecked(hitbox, geometry, padding);
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
