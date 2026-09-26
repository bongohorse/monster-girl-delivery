import type { EncounterBehaviorTag } from './EncounterProfile';
import {
  createSineCollectiblePath,
  createUniformPolylineCollectiblePath,
} from './CollectibleFormationGenerator';
import { createHazardPattern, type HazardPattern } from './HazardPattern';
import {
  PROTOTYPE_LASER_PATTERN,
  PROTOTYPE_MISSILE_PATTERN,
} from './PrototypeHazardPatternFixtures';
import {
  createPrototypeZapperBehavior,
  createPrototypeZapperHitbox,
  PROTOTYPE_ZAPPER_LENGTHS,
  PROTOTYPE_ZAPPER_ROTATION_SPEEDS,
} from '../hazards/PrototypeZapperHazard';
import { PROTOTYPE_TIMED_ZAPPER_CONFIG } from '../hazards/TimedZapperLifecycle';

const SINGLE_SEGMENT_ROUTE_SPACING = 48;

const createSingleSegmentProfile = (
  behaviorTag: EncounterBehaviorTag,
  minimumTierIndex: number,
  varietyFamilyId: string,
  pressureCost = 1,
  readabilityCost = 2,
) => ({
  behaviorTags: [behaviorTag],
  difficultyTierRange: { minimumTierIndex, maximumTierIndex: null },
  pacingIntensities: ['low', 'medium', 'high', 'peak'] as const,
  pressureCost,
  readabilityCost,
  varietyFamilyId,
});

const createZapperEntry = (
  id: string,
  centerX: number,
  centerY: number,
  angleDegrees: number,
  length: number,
  options: Readonly<{
    rotation?: boolean;
    timed?: boolean;
  }> = {},
) => {
  const baseBehavior = createPrototypeZapperBehavior(
    angleDegrees,
    length,
    options.rotation
      ? {
          direction: 'clockwise',
          speedDegreesPerSecond: PROTOTYPE_ZAPPER_ROTATION_SPEEDS.slow,
        }
      : undefined,
  );
  const behavior = Object.freeze({
    ...baseBehavior,
    ...(options.timed ? { timing: PROTOTYPE_TIMED_ZAPPER_CONFIG } : {}),
  });

  return {
    behavior,
    id,
    type: 'placeholder-barrier' as const,
    hitbox: createPrototypeZapperHitbox(centerX, centerY, behavior),
  };
};

const getOnlyEntry = (pattern: Readonly<HazardPattern>, name: string) => {
  const entry = pattern.entries[0];
  if (!entry || pattern.entries.length !== 1) {
    throw new Error(`${name} template must contain exactly one hazard entry.`);
  }
  return entry;
};

const LASER_TEMPLATE_ENTRY = getOnlyEntry(PROTOTYPE_LASER_PATTERN, 'Laser');
const MISSILE_TEMPLATE_ENTRY = getOnlyEntry(PROTOTYPE_MISSILE_PATTERN, 'Missile');

export const M5_SEGMENT_ZAPPER_HORIZONTAL_UPPER: Readonly<HazardPattern> = createHazardPattern({
  id: 'm5-segment-zapper-horizontal-upper',
  runLength: 640,
  profile: createSingleSegmentProfile('static-barrier', 0, 'm5-zapper-horizontal'),
  entries: [
    createZapperEntry('upper-horizontal-zapper', 280, 100, 0, PROTOTYPE_ZAPPER_LENGTHS.short),
  ],
  collectiblePaths: [
    createUniformPolylineCollectiblePath({
      id: 'horizontal-lower-route',
      intent: 'safe-guide',
      spacing: SINGLE_SEGMENT_ROUTE_SPACING,
      controlPoints: [
        { runDistance: 64, y: 235 },
        { runDistance: 576, y: 235 },
      ],
    }),
  ],
});

export const M5_SEGMENT_ZAPPER_DIAGONAL_LOWER: Readonly<HazardPattern> = createHazardPattern({
  id: 'm5-segment-zapper-diagonal-lower',
  runLength: 640,
  profile: createSingleSegmentProfile('static-barrier', 0, 'm5-zapper-diagonal'),
  entries: [
    createZapperEntry('lower-diagonal-zapper', 280, 280, 45, PROTOTYPE_ZAPPER_LENGTHS.short),
  ],
  collectiblePaths: [
    createUniformPolylineCollectiblePath({
      id: 'diagonal-upper-route',
      intent: 'safe-guide',
      spacing: SINGLE_SEGMENT_ROUTE_SPACING,
      controlPoints: [
        { runDistance: 64, y: 120 },
        { runDistance: 576, y: 120 },
      ],
    }),
  ],
});

export const M5_SEGMENT_ZAPPER_ROTATING_UPPER: Readonly<HazardPattern> = createHazardPattern({
  id: 'm5-segment-zapper-rotating-upper',
  runLength: 640,
  profile: createSingleSegmentProfile('moving-barrier', 0, 'm5-zapper-rotating'),
  entries: [
    createZapperEntry('upper-rotating-zapper', 280, 110, 0, PROTOTYPE_ZAPPER_LENGTHS.short, {
      rotation: true,
    }),
  ],
  collectiblePaths: [
    createSineCollectiblePath({
      id: 'rotating-lower-wave',
      intent: 'safe-guide',
      startRunDistance: 160,
      endRunDistance: 600,
      centerY: 235,
      amplitudeY: 18,
      cycles: 1,
      spacing: SINGLE_SEGMENT_ROUTE_SPACING,
    }),
  ],
});

export const M5_SEGMENT_ZAPPER_VERTICAL_UPPER: Readonly<HazardPattern> = createHazardPattern({
  id: 'm5-segment-zapper-vertical-upper',
  runLength: 640,
  profile: createSingleSegmentProfile('static-barrier', 1, 'm5-zapper-vertical'),
  entries: [
    createZapperEntry('upper-vertical-zapper', 280, 110, 90, PROTOTYPE_ZAPPER_LENGTHS.short),
  ],
  collectiblePaths: [
    createUniformPolylineCollectiblePath({
      id: 'vertical-lower-route',
      intent: 'safe-guide',
      spacing: SINGLE_SEGMENT_ROUTE_SPACING,
      controlPoints: [
        { runDistance: 64, y: 240 },
        { runDistance: 576, y: 240 },
      ],
    }),
  ],
});

export const M5_SEGMENT_ZAPPER_TIMED_CENTER: Readonly<HazardPattern> = createHazardPattern({
  id: 'm5-segment-zapper-timed-center',
  runLength: 640,
  profile: createSingleSegmentProfile('timed-pulse', 1, 'm5-zapper-timed', 1, 3),
  entries: [
    createZapperEntry('timed-center-zapper', 280, 195, 0, PROTOTYPE_ZAPPER_LENGTHS.medium, {
      timed: true,
    }),
  ],
  collectiblePaths: [
    createUniformPolylineCollectiblePath({
      id: 'timed-lower-route',
      intent: 'safe-guide',
      spacing: SINGLE_SEGMENT_ROUTE_SPACING,
      controlPoints: [
        { runDistance: 64, y: 280 },
        { runDistance: 576, y: 280 },
      ],
    }),
  ],
});

export const M5_SEGMENT_LASER_HIGH: Readonly<HazardPattern> = createHazardPattern({
  id: 'm5-segment-laser-high',
  runLength: 640,
  profile: createSingleSegmentProfile('timed-pulse', 1, 'm5-laser-lane', 1, 3),
  entries: [
    {
      behavior: LASER_TEMPLATE_ENTRY.behavior,
      id: 'high-laser',
      type: LASER_TEMPLATE_ENTRY.type,
      hitbox: { left: 120, right: 184, top: 84, bottom: 108 },
      ...(LASER_TEMPLATE_ENTRY.reactionPolicy === undefined
        ? {}
        : { reactionPolicy: LASER_TEMPLATE_ENTRY.reactionPolicy }),
    },
  ],
  collectiblePaths: [
    createUniformPolylineCollectiblePath({
      id: 'laser-lower-route',
      intent: 'safe-guide',
      spacing: SINGLE_SEGMENT_ROUTE_SPACING,
      controlPoints: [
        { runDistance: 64, y: 250 },
        { runDistance: 576, y: 250 },
      ],
    }),
  ],
});

export const M5_SEGMENT_MISSILE_BAIT_DODGE: Readonly<HazardPattern> = createHazardPattern({
  id: 'm5-segment-missile-bait-dodge',
  runLength: 700,
  profile: createSingleSegmentProfile('target-lock-strike', 1, 'm5-missile', 2, 3),
  entries: [
    {
      behavior: MISSILE_TEMPLATE_ENTRY.behavior,
      id: 'bait-dodge-missile',
      type: MISSILE_TEMPLATE_ENTRY.type,
      hitbox: { ...MISSILE_TEMPLATE_ENTRY.hitbox },
      ...(MISSILE_TEMPLATE_ENTRY.reactionPolicy === undefined
        ? {}
        : { reactionPolicy: MISSILE_TEMPLATE_ENTRY.reactionPolicy }),
    },
  ],
});

export const M5_AUTHORED_SINGLE_ENCOUNTER_SEGMENTS: ReadonlyArray<Readonly<HazardPattern>> =
  Object.freeze([
    M5_SEGMENT_ZAPPER_HORIZONTAL_UPPER,
    M5_SEGMENT_ZAPPER_DIAGONAL_LOWER,
    M5_SEGMENT_ZAPPER_ROTATING_UPPER,
    M5_SEGMENT_ZAPPER_VERTICAL_UPPER,
    M5_SEGMENT_ZAPPER_TIMED_CENTER,
    M5_SEGMENT_LASER_HIGH,
    M5_SEGMENT_MISSILE_BAIT_DODGE,
  ]);

export const M5_OPENING_SINGLE_ENCOUNTER_SEGMENTS: ReadonlyArray<Readonly<HazardPattern>> =
  Object.freeze(M5_AUTHORED_SINGLE_ENCOUNTER_SEGMENTS.slice(0, 3));

export const M5_LATER_SINGLE_ENCOUNTER_SEGMENTS: ReadonlyArray<Readonly<HazardPattern>> =
  Object.freeze(M5_AUTHORED_SINGLE_ENCOUNTER_SEGMENTS.slice(3));
