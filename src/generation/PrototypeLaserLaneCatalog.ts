import { createTimedLaserLifecycleConfig } from '../hazards/TimedLaserLifecycle';
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

export type PrototypeLaserGroupId =
  | 'bottom-stack'
  | 'top-stack'
  | 'center-corridor'
  | 'sweep-down'
  | 'sweep-up';

export interface PrototypeLaserGroupMember {
  readonly chargeSeconds?: number;
  readonly laneId: PrototypeLaserLaneId;
}

export interface PrototypeLaserGroupDefinition {
  readonly generatorEligible: boolean;
  readonly id: PrototypeLaserGroupId;
  readonly label: 'G-LOW' | 'G-HIGH' | 'G-MID' | 'SW-DN' | 'SW-UP';
  readonly members: ReadonlyArray<Readonly<PrototypeLaserGroupMember>>;
}

/**
 * M5 Laser formations. Simultaneous groups expose one obvious safe corridor while the directional
 * sweeps keep every beam visible from TELEGRAPH onward and stagger ON by extending CHARGE only.
 */
export const PROTOTYPE_LASER_GROUPS: ReadonlyArray<Readonly<PrototypeLaserGroupDefinition>> =
  Object.freeze([
    Object.freeze({
      generatorEligible: true,
      id: 'bottom-stack',
      label: 'G-LOW',
      members: Object.freeze([
        Object.freeze({ laneId: 'low' }),
        Object.freeze({ laneId: 'mid-low' }),
        Object.freeze({ laneId: 'middle' }),
      ]),
    }),
    Object.freeze({
      generatorEligible: true,
      id: 'top-stack',
      label: 'G-HIGH',
      members: Object.freeze([
        Object.freeze({ laneId: 'middle' }),
        Object.freeze({ laneId: 'mid-high' }),
        Object.freeze({ laneId: 'high' }),
      ]),
    }),
    Object.freeze({
      generatorEligible: true,
      id: 'center-corridor',
      label: 'G-MID',
      members: Object.freeze([Object.freeze({ laneId: 'low' }), Object.freeze({ laneId: 'high' })]),
    }),
    Object.freeze({
      generatorEligible: false,
      id: 'sweep-down',
      label: 'SW-DN',
      members: Object.freeze([
        Object.freeze({ chargeSeconds: 0.55, laneId: 'high' }),
        Object.freeze({ chargeSeconds: 1.25, laneId: 'middle' }),
        Object.freeze({ chargeSeconds: 1.95, laneId: 'low' }),
      ]),
    }),
    Object.freeze({
      generatorEligible: false,
      id: 'sweep-up',
      label: 'SW-UP',
      members: Object.freeze([
        Object.freeze({ chargeSeconds: 0.55, laneId: 'low' }),
        Object.freeze({ chargeSeconds: 1.25, laneId: 'middle' }),
        Object.freeze({ chargeSeconds: 1.95, laneId: 'high' }),
      ]),
    }),
  ]);

const getLaneRatio = (lane: Readonly<PrototypeLaserLaneDefinition>): number => {
  const authored = PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS;
  return (
    (lane.authoredCenterY - authored.playableTop) / (authored.playableBottom - authored.playableTop)
  );
};

export const getPrototypeLaserLaneCenterY = (
  lane: Readonly<PrototypeLaserLaneDefinition>,
  constraints: Readonly<PatternValidationConstraints> = PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS,
): number =>
  constraints.playableTop +
  getLaneRatio(lane) * (constraints.playableBottom - constraints.playableTop);

const getLaneById = (laneId: PrototypeLaserLaneId): Readonly<PrototypeLaserLaneDefinition> => {
  const lane = PROTOTYPE_LASER_LANES.find((candidate) => candidate.id === laneId);
  if (!lane) {
    throw new RangeError(`Unknown Prototype Laser lane: ${laneId}`);
  }
  return lane;
};

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

const createGroupPattern = (
  definition: Readonly<PrototypeLaserGroupDefinition>,
  constraints: Readonly<PatternValidationConstraints>,
  template: Readonly<HazardPattern> = PROTOTYPE_LASER_PATTERN,
): Readonly<HazardPattern> => {
  const templateEntry = template.entries[0];
  if (templateEntry?.behavior.kind !== 'laser') {
    throw new Error('Prototype Laser group template must contain one Laser entry.');
  }
  const halfHeight = (templateEntry.hitbox.bottom - templateEntry.hitbox.top) / 2;

  return createHazardPattern({
    id: template.id,
    runLength: template.runLength,
    profile: template.profile,
    entries: definition.members.map((member, memberIndex) => {
      const lane = getLaneById(member.laneId);
      const centerY = getPrototypeLaserLaneCenterY(lane, constraints);
      const behavior =
        member.chargeSeconds === undefined
          ? templateEntry.behavior
          : {
              ...templateEntry.behavior,
              lifecycle: createTimedLaserLifecycleConfig({
                chargeSeconds: member.chargeSeconds,
                mode: templateEntry.behavior.lifecycle.mode,
                offSeconds: templateEntry.behavior.lifecycle.offSeconds,
                onSeconds: templateEntry.behavior.lifecycle.onSeconds,
                recoverySeconds: templateEntry.behavior.lifecycle.recoverySeconds,
                telegraphSeconds: templateEntry.behavior.lifecycle.telegraphSeconds,
              }),
            };

      return {
        behavior,
        id: `${templateEntry.id}-${definition.id}-${memberIndex + 1}`,
        ...(templateEntry.reactionPolicy === undefined
          ? {}
          : { reactionPolicy: templateEntry.reactionPolicy }),
        type: templateEntry.type,
        hitbox: {
          left: templateEntry.hitbox.left,
          right: templateEntry.hitbox.right,
          top: centerY - halfHeight,
          bottom: centerY + halfHeight,
        },
      };
    }),
  });
};

export const PROTOTYPE_LASER_GROUP_PATTERNS: ReadonlyArray<Readonly<HazardPattern>> = Object.freeze(
  PROTOTYPE_LASER_GROUPS.map((definition) =>
    createGroupPattern(definition, PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS),
  ),
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

const replacePrototypeLaserPattern = (
  catalog: ReadonlyArray<Readonly<HazardPattern>>,
  replacement: (pattern: Readonly<HazardPattern>) => Readonly<HazardPattern>,
): ReadonlyArray<Readonly<HazardPattern>> =>
  Object.freeze(
    catalog.map((pattern) => (isPrototypeLaserPattern(pattern) ? replacement(pattern) : pattern)),
  );

const selectSingleLaneCatalog = (
  catalog: ReadonlyArray<Readonly<HazardPattern>>,
  constraints: Readonly<PatternValidationConstraints>,
  prngState: number,
): ReadonlyArray<Readonly<HazardPattern>> => {
  const lane = PROTOTYPE_LASER_LANES[prngState % PROTOTYPE_LASER_LANES.length];
  if (!lane) {
    throw new RangeError('Laser lane catalog must not be empty.');
  }

  return replacePrototypeLaserPattern(catalog, (pattern) => {
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
  });
};

/**
 * Keeps the live catalog's Laser probability and slot order unchanged. Most scheduling calls resolve
 * the existing slot to one lane; a bounded subset resolves it to one of the three simultaneously
 * safe group formations. Directional sweeps stay Director-only until timing-aware route validation
 * can reason about their non-overlapping ON windows. The PRNG state is observed but not advanced.
 */
export const selectPrototypeLaserLaneCatalog = (
  catalog: ReadonlyArray<Readonly<HazardPattern>>,
  constraints: Readonly<PatternValidationConstraints>,
  prngState: number,
): ReadonlyArray<Readonly<HazardPattern>> => {
  if (!Number.isSafeInteger(prngState) || prngState < 0 || prngState > 0xffff_ffff) {
    throw new RangeError('Laser lane selection requires a uint32 PRNG state.');
  }

  const generatorGroups = PROTOTYPE_LASER_GROUPS.filter((group) => group.generatorEligible);
  const selector = Math.floor(prngState / PROTOTYPE_LASER_LANES.length) % 8;
  if (selector < PROTOTYPE_LASER_LANES.length || generatorGroups.length === 0) {
    return selectSingleLaneCatalog(catalog, constraints, prngState);
  }

  const group = generatorGroups[(selector - PROTOTYPE_LASER_LANES.length) % generatorGroups.length];
  if (!group) {
    throw new RangeError('Generator Laser group catalog must not be empty.');
  }

  return replacePrototypeLaserPattern(catalog, (pattern) =>
    createGroupPattern(group, constraints, pattern),
  );
};
