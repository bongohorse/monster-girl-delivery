import { createHazardPattern, type HazardPattern } from './HazardPattern';
import {
  type PatternValidationConstraints,
  PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS,
} from './PatternValidator';
import { PROTOTYPE_LASER_PATTERN } from './PrototypeHazardPatternFixtures';

export type PrototypeLaserLaneId = 'low' | 'mid-low' | 'middle' | 'mid-high' | 'high';

export interface PrototypeLaserLaneDefinition {
  readonly authoredCenterY: number;
  readonly id: PrototypeLaserLaneId;
  readonly label: 'LOW' | 'ML' | 'MID' | 'MH' | 'HIGH';
}

/**
 * Authored M5 Laser lanes ordered from low to high on screen. Extreme lanes still leave a usable
 * safe side for the current player core, while the middle lanes support deliberate above/below
 * choices during the accepted warning window.
 */
export const PROTOTYPE_LASER_LANES: ReadonlyArray<Readonly<PrototypeLaserLaneDefinition>> =
  Object.freeze([
    Object.freeze({ authoredCenterY: 294, id: 'low', label: 'LOW' }),
    Object.freeze({ authoredCenterY: 244, id: 'mid-low', label: 'ML' }),
    Object.freeze({ authoredCenterY: 195, id: 'middle', label: 'MID' }),
    Object.freeze({ authoredCenterY: 146, id: 'mid-high', label: 'MH' }),
    Object.freeze({ authoredCenterY: 96, id: 'high', label: 'HIGH' }),
  ]);

const getLaneRatio = (lane: Readonly<PrototypeLaserLaneDefinition>): number => {
  const authored = PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS;
  return (
    (lane.authoredCenterY - authored.playableTop) /
    (authored.playableBottom - authored.playableTop)
  );
};

export const getPrototypeLaserLaneCenterY = (
  lane: Readonly<PrototypeLaserLaneDefinition>,
  constraints: Readonly<PatternValidationConstraints> = PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS,
): number =>
  constraints.playableTop +
  getLaneRatio(lane) * (constraints.playableBottom - constraints.playableTop);

const createLanePattern = (
  lane: Readonly<PrototypeLaserLaneDefinition>,
): Readonly<HazardPattern> => {
  const entry = PROTOTYPE_LASER_PATTERN.entries[0];
  if (!entry) {
    throw new Error('Prototype Laser baseline must contain one entry.');
  }
  const halfHeight = (entry.hitbox.bottom - entry.hitbox.top) / 2;

  return createHazardPattern({
    id: lane.id === 'middle' ? PROTOTYPE_LASER_PATTERN.id : `prototype-laser-${lane.id}`,
    runLength: PROTOTYPE_LASER_PATTERN.runLength,
    profile: PROTOTYPE_LASER_PATTERN.profile,
    entries: [
      {
        behavior: entry.behavior,
        id: lane.id === 'middle' ? entry.id : `${entry.id}-${lane.id}`,
        ...(entry.reactionPolicy === undefined ? {} : { reactionPolicy: entry.reactionPolicy }),
        type: entry.type,
        hitbox: {
          left: entry.hitbox.left,
          right: entry.hitbox.right,
          top: lane.authoredCenterY - halfHeight,
          bottom: lane.authoredCenterY + halfHeight,
        },
      },
    ],
  });
};

export const PROTOTYPE_LASER_LANE_PATTERNS: ReadonlyArray<Readonly<HazardPattern>> = Object.freeze(
  PROTOTYPE_LASER_LANES.map(createLanePattern),
);

export const getPrototypeLaserLanePattern = (laneIndex: number): Readonly<HazardPattern> => {
  if (!Number.isSafeInteger(laneIndex)) {
    throw new RangeError('Laser lane index must be a safe integer.');
  }
  const pattern =
    PROTOTYPE_LASER_LANE_PATTERNS[
      ((laneIndex % PROTOTYPE_LASER_LANE_PATTERNS.length) + PROTOTYPE_LASER_LANE_PATTERNS.length) %
        PROTOTYPE_LASER_LANE_PATTERNS.length
    ];
  if (!pattern) {
    throw new RangeError('Laser lane catalog must not be empty.');
  }
  return pattern;
};

const isPrototypeLaserPattern = (pattern: Readonly<HazardPattern>): boolean =>
  pattern.id === PROTOTYPE_LASER_PATTERN.id &&
  pattern.entries.some((entry) => entry.behavior.kind === 'laser');

/**
 * Keeps the live catalog's Laser probability and slot order unchanged: only the existing Laser slot
 * is replaced with one deterministic lane for this scheduling call. The PRNG state is observed but
 * not advanced, so replay identity remains owned by the existing generation authority.
 */
export const selectPrototypeLaserLaneCatalog = (
  catalog: ReadonlyArray<Readonly<HazardPattern>>,
  constraints: Readonly<PatternValidationConstraints>,
  prngState: number,
): ReadonlyArray<Readonly<HazardPattern>> => {
  if (!Number.isSafeInteger(prngState) || prngState < 0 || prngState > 0xffff_ffff) {
    throw new RangeError('Laser lane selection requires a uint32 PRNG state.');
  }

  const lane = PROTOTYPE_LASER_LANES[prngState % PROTOTYPE_LASER_LANES.length];
  if (!lane) {
    throw new RangeError('Laser lane catalog must not be empty.');
  }

  return Object.freeze(
    catalog.map((pattern) => {
      if (!isPrototypeLaserPattern(pattern)) {
        return pattern;
      }

      const entry = pattern.entries[0];
      if (!entry) {
        throw new Error('Live Prototype Laser pattern must contain one entry.');
      }
      const halfHeight = (entry.hitbox.bottom - entry.hitbox.top) / 2;
      const centerY = getPrototypeLaserLaneCenterY(lane, constraints);

      return createHazardPattern({
        id: pattern.id,
        runLength: pattern.runLength,
        profile: pattern.profile,
        entries: [
          {
            behavior: entry.behavior,
            id: entry.id,
            ...(entry.reactionPolicy === undefined ? {} : { reactionPolicy: entry.reactionPolicy }),
            type: entry.type,
            hitbox: {
              left: entry.hitbox.left,
              right: entry.hitbox.right,
              top: centerY - halfHeight,
              bottom: centerY + halfHeight,
            },
          },
        ],
      });
    }),
  );
};
