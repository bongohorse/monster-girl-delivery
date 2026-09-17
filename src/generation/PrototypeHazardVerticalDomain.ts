import { PROTOTYPE_LOGICAL_FLIGHT_BOUNDS } from '../game/PrototypeFlightLayout';
import type { VerticalFlightBounds } from '../systems/VerticalFlightSimulation';
import { createHazardPattern, type HazardPattern } from './HazardPattern';
import { PROTOTYPE_M5_LIVE_HAZARD_PATTERN_CATALOG } from './M5AuthoredMultiHazardPatterns';
import {
  type PatternValidationConstraints,
  PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS,
} from './PatternValidator';

export interface PrototypeHazardVerticalDomain {
  readonly catalog: ReadonlyArray<Readonly<HazardPattern>>;
  readonly constraints: Readonly<PatternValidationConstraints>;
  /** Maps an authored baseline center position into the effective logical encounter band. */
  readonly mapAuthoredCenterY: (authoredY: number) => number;
}

const assertValidFlightBounds = (bounds: Readonly<VerticalFlightBounds>): void => {
  if (
    !Number.isFinite(bounds.ceilingY) ||
    !Number.isFinite(bounds.floorY) ||
    bounds.floorY < bounds.ceilingY
  ) {
    throw new RangeError('Hazard vertical-domain flight bounds must be finite and non-inverted.');
  }
};

const createDomainConstraints = (
  bounds: Readonly<VerticalFlightBounds>,
): Readonly<PatternValidationConstraints> => {
  const ceilingDelta = bounds.ceilingY - PROTOTYPE_LOGICAL_FLIGHT_BOUNDS.ceilingY;
  const floorDelta = bounds.floorY - PROTOTYPE_LOGICAL_FLIGHT_BOUNDS.floorY;

  return Object.freeze({
    ...PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS,
    playableTop: PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS.playableTop + ceilingDelta,
    playableBottom: PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS.playableBottom + floorDelta,
  });
};

const createCenterMapper = (
  constraints: Readonly<PatternValidationConstraints>,
): ((authoredY: number) => number) => {
  const authoredTop = PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS.playableTop;
  const authoredBottom = PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS.playableBottom;
  const authoredSpan = authoredBottom - authoredTop;
  const effectiveSpan = constraints.playableBottom - constraints.playableTop;

  return (authoredY: number): number => {
    if (!Number.isFinite(authoredY)) {
      throw new RangeError('Authored hazard center must be finite.');
    }

    return constraints.playableTop + ((authoredY - authoredTop) / authoredSpan) * effectiveSpan;
  };
};

const adaptPattern = (
  pattern: Readonly<HazardPattern>,
  bounds: Readonly<VerticalFlightBounds>,
  mapAuthoredCenterY: (authoredY: number) => number,
): Readonly<HazardPattern> => {
  const ceilingDelta = bounds.ceilingY - PROTOTYPE_LOGICAL_FLIGHT_BOUNDS.ceilingY;
  const floorDelta = bounds.floorY - PROTOTYPE_LOGICAL_FLIGHT_BOUNDS.floorY;

  return createHazardPattern({
    id: pattern.id,
    runLength: pattern.runLength,
    profile: pattern.profile,
    collectiblePaths: pattern.collectiblePaths?.map((path) => ({
      id: path.id,
      intent: path.intent,
      points: path.points.map((point) => ({
        runDistance: point.runDistance,
        y: mapAuthoredCenterY(point.y),
      })),
    })),
    entries: pattern.entries.map((entry) => {
      const centerY = (entry.hitbox.top + entry.hitbox.bottom) / 2;
      const halfHeight = (entry.hitbox.bottom - entry.hitbox.top) / 2;
      const mappedCenterY = mapAuthoredCenterY(centerY);
      const behavior =
        entry.behavior.kind === 'target-lock-strike'
          ? {
              ...entry.behavior,
              // Preserve the authored edge relationship to the flight bounds. This expands the
              // reactive target band upward without changing strike size or post-lock semantics.
              minimumTargetY: entry.behavior.minimumTargetY + ceilingDelta,
              maximumTargetY: entry.behavior.maximumTargetY + floorDelta,
            }
          : entry.behavior;

      return {
        behavior,
        id: entry.id,
        ...(entry.reactionPolicy === undefined ? {} : { reactionPolicy: entry.reactionPolicy }),
        type: entry.type,
        hitbox: {
          left: entry.hitbox.left,
          right: entry.hitbox.right,
          top: mappedCenterY - halfHeight,
          bottom: mappedCenterY + halfHeight,
        },
      };
    }),
  });
};

/**
 * Derives the live prototype encounter catalog from the effective logical flight domain.
 *
 * The authored baseline is returned unchanged. When the ceiling/floor changes, hazard centers and
 * collectible guidance are distributed across the corresponding validation band while preserving
 * horizontal timing. Reactive target-lock limits expand with the flight-bound edges so the full
 * supported player domain remains targetable. The resulting catalog is passed to validation and
 * scheduling before spawn acceptance; already accepted spawn data is never mutated by this adapter,
 * which makes live resize affect only future scheduling at its normal deterministic gate.
 */
export const createPrototypeHazardVerticalDomain = (
  bounds: Readonly<VerticalFlightBounds>,
  catalog: ReadonlyArray<Readonly<HazardPattern>> = PROTOTYPE_M5_LIVE_HAZARD_PATTERN_CATALOG,
): Readonly<PrototypeHazardVerticalDomain> => {
  assertValidFlightBounds(bounds);
  const constraints = createDomainConstraints(bounds);
  const mapAuthoredCenterY = createCenterMapper(constraints);
  const baselineDomain =
    bounds.ceilingY === PROTOTYPE_LOGICAL_FLIGHT_BOUNDS.ceilingY &&
    bounds.floorY === PROTOTYPE_LOGICAL_FLIGHT_BOUNDS.floorY;

  return Object.freeze({
    catalog: baselineDomain
      ? catalog
      : Object.freeze(catalog.map((pattern) => adaptPattern(pattern, bounds, mapAuthoredCenterY))),
    constraints: baselineDomain ? PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS : constraints,
    mapAuthoredCenterY,
  });
};
