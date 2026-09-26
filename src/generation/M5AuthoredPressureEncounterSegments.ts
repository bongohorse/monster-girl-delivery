import {
  createPrototypeZapperBehavior,
  createPrototypeZapperHitbox,
  PROTOTYPE_ZAPPER_LENGTHS,
  PROTOTYPE_ZAPPER_ROTATION_SPEEDS,
} from '../hazards/PrototypeZapperHazard';
import { createUniformPolylineCollectiblePath } from './CollectibleFormationGenerator';
import type { EncounterBehaviorTag } from './EncounterProfile';
import { createHazardPattern, type HazardPattern } from './HazardPattern';
import { PROTOTYPE_LASER_PATTERN } from './PrototypeHazardPatternFixtures';

const PRESSURE_ROUTE_SPACING = 48;

const createPressureProfile = (
  behaviorTags: ReadonlyArray<EncounterBehaviorTag>,
  varietyFamilyId: string,
  pressureCost: number,
  readabilityCost: number,
) => ({
  behaviorTags,
  difficultyTierRange: { minimumTierIndex: 2, maximumTierIndex: null },
  pacingIntensities: ['high', 'peak'] as const,
  pressureCost,
  readabilityCost,
  varietyFamilyId,
});

const createStaticZapperEntry = (
  id: string,
  centerX: number,
  centerY: number,
  angleDegrees: number,
  length: number,
) => {
  const behavior = createPrototypeZapperBehavior(angleDegrees, length);
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
const createLaserEntry = (id: string, top: number, bottom: number) => ({
  behavior: LASER_TEMPLATE_ENTRY.behavior,
  id,
  type: LASER_TEMPLATE_ENTRY.type,
  hitbox: { left: 120, right: 184, top, bottom },
  ...(LASER_TEMPLATE_ENTRY.reactionPolicy === undefined
    ? {}
    : { reactionPolicy: LASER_TEMPLATE_ENTRY.reactionPolicy }),
});

export const M5_PRESSURE_ZAPPER_SWITCH_LOW_TO_HIGH: Readonly<HazardPattern> = createHazardPattern({
  id: 'm5-pressure-zapper-switch-low-to-high',
  runLength: 780,
  profile: createPressureProfile(['static-barrier'], 'm5-pressure-zapper-low-high', 3, 3),
  entries: [
    createStaticZapperEntry('upper-horizontal-zapper', 180, 100, 0, PROTOTYPE_ZAPPER_LENGTHS.short),
    createStaticZapperEntry('lower-diagonal-zapper', 500, 280, 45, PROTOTYPE_ZAPPER_LENGTHS.short),
  ],
  collectiblePaths: [
    createUniformPolylineCollectiblePath({
      id: 'low-to-high-route',
      intent: 'safe-guide',
      spacing: PRESSURE_ROUTE_SPACING,
      controlPoints: [
        { runDistance: 64, y: 235 },
        { runDistance: 300, y: 235 },
        { runDistance: 400, y: 120 },
        { runDistance: 720, y: 120 },
      ],
    }),
  ],
});

export const M5_PRESSURE_ZAPPER_SWITCH_HIGH_TO_LOW: Readonly<HazardPattern> = createHazardPattern({
  id: 'm5-pressure-zapper-switch-high-to-low',
  runLength: 780,
  profile: createPressureProfile(['static-barrier'], 'm5-pressure-zapper-high-low', 3, 3),
  entries: [
    createStaticZapperEntry('lower-diagonal-zapper', 180, 280, 45, PROTOTYPE_ZAPPER_LENGTHS.short),
    createStaticZapperEntry('upper-vertical-zapper', 500, 110, 90, PROTOTYPE_ZAPPER_LENGTHS.short),
  ],
  collectiblePaths: [
    createUniformPolylineCollectiblePath({
      id: 'high-to-low-route',
      intent: 'safe-guide',
      spacing: PRESSURE_ROUTE_SPACING,
      controlPoints: [
        { runDistance: 64, y: 120 },
        { runDistance: 300, y: 120 },
        { runDistance: 400, y: 245 },
        { runDistance: 720, y: 245 },
      ],
    }),
  ],
});

export const M5_PRESSURE_LASER_HIGH_ZAPPER_LOW: Readonly<HazardPattern> = createHazardPattern({
  id: 'm5-pressure-laser-high-zapper-low',
  runLength: 760,
  profile: createPressureProfile(
    ['timed-pulse', 'static-barrier'],
    'm5-pressure-laser-high-zapper-low',
    3,
    5,
  ),
  entries: [
    createLaserEntry('high-laser', 84, 108),
    createStaticZapperEntry('lower-diagonal-zapper', 360, 280, 45, PROTOTYPE_ZAPPER_LENGTHS.short),
  ],
  collectiblePaths: [
    createUniformPolylineCollectiblePath({
      id: 'high-laser-center-route',
      intent: 'safe-guide',
      spacing: PRESSURE_ROUTE_SPACING,
      controlPoints: [
        { runDistance: 64, y: 180 },
        { runDistance: 700, y: 180 },
      ],
    }),
  ],
});

export const M5_PRESSURE_LASER_LOW_ZAPPER_HIGH: Readonly<HazardPattern> = createHazardPattern({
  id: 'm5-pressure-laser-low-zapper-high',
  runLength: 760,
  profile: createPressureProfile(
    ['timed-pulse', 'static-barrier'],
    'm5-pressure-laser-low-zapper-high',
    3,
    5,
  ),
  entries: [
    createLaserEntry('low-laser', 282, 306),
    createStaticZapperEntry('upper-diagonal-zapper', 360, 110, -45, PROTOTYPE_ZAPPER_LENGTHS.short),
  ],
  collectiblePaths: [
    createUniformPolylineCollectiblePath({
      id: 'low-laser-center-route',
      intent: 'safe-guide',
      spacing: PRESSURE_ROUTE_SPACING,
      controlPoints: [
        { runDistance: 64, y: 220 },
        { runDistance: 700, y: 220 },
      ],
    }),
  ],
});

const ROTATING_UPPER_BEHAVIOR = createPrototypeZapperBehavior(
  0,
  PROTOTYPE_ZAPPER_LENGTHS.short,
  {
    direction: 'clockwise',
    speedDegreesPerSecond: PROTOTYPE_ZAPPER_ROTATION_SPEEDS.slow,
  },
);

export const M5_PRESSURE_ZAPPER_ROTATING_SWITCH: Readonly<HazardPattern> = createHazardPattern({
  id: 'm5-pressure-zapper-rotating-switch',
  runLength: 780,
  profile: createPressureProfile(
    ['moving-barrier', 'static-barrier'],
    'm5-pressure-zapper-rotating-switch',
    3,
    4,
  ),
  entries: [
    {
      behavior: ROTATING_UPPER_BEHAVIOR,
      id: 'upper-rotating-zapper',
      type: 'placeholder-barrier',
      hitbox: createPrototypeZapperHitbox(180, 100, ROTATING_UPPER_BEHAVIOR),
    },
    createStaticZapperEntry(
      'lower-horizontal-zapper',
      500,
      280,
      0,
      PROTOTYPE_ZAPPER_LENGTHS.short,
    ),
  ],
  collectiblePaths: [
    createUniformPolylineCollectiblePath({
      id: 'rotating-switch-route',
      intent: 'safe-guide',
      spacing: PRESSURE_ROUTE_SPACING,
      controlPoints: [
        { runDistance: 64, y: 235 },
        { runDistance: 300, y: 235 },
        { runDistance: 400, y: 120 },
        { runDistance: 720, y: 120 },
      ],
    }),
  ],
});

export const M5_AUTHORED_PRESSURE_ENCOUNTER_SEGMENTS: ReadonlyArray<Readonly<HazardPattern>> =
  Object.freeze([
    M5_PRESSURE_ZAPPER_SWITCH_LOW_TO_HIGH,
    M5_PRESSURE_ZAPPER_SWITCH_HIGH_TO_LOW,
    M5_PRESSURE_LASER_HIGH_ZAPPER_LOW,
    M5_PRESSURE_LASER_LOW_ZAPPER_HIGH,
    M5_PRESSURE_ZAPPER_ROTATING_SWITCH,
  ]);
