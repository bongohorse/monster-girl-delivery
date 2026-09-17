import {
  createPrototypeZapperBehavior,
  createPrototypeZapperHitbox,
  PROTOTYPE_ZAPPER_LENGTHS,
} from '../hazards/PrototypeZapperHazard';
import { createHazardPattern, type HazardPattern } from './HazardPattern';
import { applyM5CollectibleMovementPatterns } from './M5CollectibleMovementPatterns';
import {
  PROTOTYPE_LASER_PATTERN,
  PROTOTYPE_M5_HAZARD_PATTERN_FIXTURES,
  PROTOTYPE_MISSILE_PATTERN,
} from './PrototypeHazardPatternFixtures';

const getBaselineEntry = (pattern: Readonly<HazardPattern>, name: string) => {
  const entry = pattern.entries[0];
  if (!entry) {
    throw new Error(`${name} baseline must contain one hazard entry.`);
  }
  return entry;
};

const PROTOTYPE_MISSILE_ENTRY = getBaselineEntry(PROTOTYPE_MISSILE_PATTERN, 'Missile');
const PROTOTYPE_LASER_ENTRY = getBaselineEntry(PROTOTYPE_LASER_PATTERN, 'Laser');

const HIGH_LASER_HITBOX = Object.freeze({ left: 120, right: 184, top: 84, bottom: 108 });

const UPPER_DIAGONAL_ZAPPER_BEHAVIOR = createPrototypeZapperBehavior(
  -45,
  PROTOTYPE_ZAPPER_LENGTHS.medium,
);
const LOWER_DIAGONAL_ZAPPER_BEHAVIOR = createPrototypeZapperBehavior(
  45,
  PROTOTYPE_ZAPPER_LENGTHS.short,
);

const createComboProfile = (
  behaviorTags: ReadonlyArray<'static-barrier' | 'target-lock-strike' | 'timed-pulse'>,
  pressureCost: number,
  readabilityCost: number,
) => ({
  behaviorTags,
  difficultyTierRange: { minimumTierIndex: 1, maximumTierIndex: null },
  pacingIntensities: ['high', 'peak'] as const,
  pressureCost,
  readabilityCost,
  varietyFamilyId: 'm5-multi-hazard',
});

/**
 * Spatial restriction first, then the existing bait/lock/dodge interaction. The upper diagonal
 * Zapper leaves the lower half immediately readable from the baseline flight state, so the Missile
 * can ask for a deliberate bait without turning the opening geometry into a cage.
 */
export const M5_MISSILE_ZAPPER_PATTERN: Readonly<HazardPattern> = createHazardPattern({
  id: 'm5-combo-missile-zapper',
  runLength: 820,
  profile: createComboProfile(['static-barrier', 'target-lock-strike'], 4, 5),
  entries: [
    {
      behavior: UPPER_DIAGONAL_ZAPPER_BEHAVIOR,
      id: 'upper-diagonal-zapper',
      type: 'placeholder-barrier',
      hitbox: createPrototypeZapperHitbox(180, 105, UPPER_DIAGONAL_ZAPPER_BEHAVIOR),
    },
    {
      behavior: PROTOTYPE_MISSILE_ENTRY.behavior,
      id: 'bait-missile',
      type: PROTOTYPE_MISSILE_ENTRY.type,
      hitbox: { left: 420, right: 484, top: 171, bottom: 219 },
      ...(PROTOTYPE_MISSILE_ENTRY.reactionPolicy === undefined
        ? {}
        : { reactionPolicy: PROTOTYPE_MISSILE_ENTRY.reactionPolicy }),
    },
  ],
  collectiblePaths: [
    {
      id: 'missile-zapper-graze-invite',
      intent: 'risk-reward',
      points: [
        { runDistance: 64, y: 220 },
        { runDistance: 140, y: 210 },
        { runDistance: 230, y: 210 },
        { runDistance: 300, y: 240 },
        { runDistance: 360, y: 265 },
      ],
    },
  ],
});

/**
 * High Laser + Missile uses one coherent answer: bait the Missile toward the threatened upper band,
 * recognize its lock, then move into the broad lower space before the committed shot and Laser ON
 * window overlap. The two warnings remain existing production warning languages, not a combo-only UI.
 */
export const M5_MISSILE_LASER_PATTERN: Readonly<HazardPattern> = createHazardPattern({
  id: 'm5-combo-missile-laser',
  runLength: 760,
  profile: createComboProfile(['target-lock-strike', 'timed-pulse'], 4, 5),
  entries: [
    {
      behavior: PROTOTYPE_LASER_ENTRY.behavior,
      id: 'high-laser',
      type: PROTOTYPE_LASER_ENTRY.type,
      hitbox: HIGH_LASER_HITBOX,
      ...(PROTOTYPE_LASER_ENTRY.reactionPolicy === undefined
        ? {}
        : { reactionPolicy: PROTOTYPE_LASER_ENTRY.reactionPolicy }),
    },
    {
      behavior: PROTOTYPE_MISSILE_ENTRY.behavior,
      id: 'bait-missile',
      type: PROTOTYPE_MISSILE_ENTRY.type,
      hitbox: { left: 360, right: 424, top: 171, bottom: 219 },
      ...(PROTOTYPE_MISSILE_ENTRY.reactionPolicy === undefined
        ? {}
        : { reactionPolicy: PROTOTYPE_MISSILE_ENTRY.reactionPolicy }),
    },
  ],
});

/**
 * High Laser + lower short diagonal Zapper leaves a deliberately generous center corridor. This is
 * the simplest timing+space composition and is intentionally static before any rotating/timed Zapper
 * is combined with Laser pressure in normal generation.
 */
export const M5_LASER_ZAPPER_PATTERN: Readonly<HazardPattern> = createHazardPattern({
  id: 'm5-combo-laser-zapper',
  runLength: 760,
  profile: createComboProfile(['static-barrier', 'timed-pulse'], 3, 5),
  entries: [
    {
      behavior: PROTOTYPE_LASER_ENTRY.behavior,
      id: 'high-laser',
      type: PROTOTYPE_LASER_ENTRY.type,
      hitbox: HIGH_LASER_HITBOX,
      ...(PROTOTYPE_LASER_ENTRY.reactionPolicy === undefined
        ? {}
        : { reactionPolicy: PROTOTYPE_LASER_ENTRY.reactionPolicy }),
    },
    {
      behavior: LOWER_DIAGONAL_ZAPPER_BEHAVIOR,
      id: 'lower-diagonal-zapper',
      type: 'placeholder-barrier',
      hitbox: createPrototypeZapperHitbox(360, 260, LOWER_DIAGONAL_ZAPPER_BEHAVIOR),
    },
  ],
  collectiblePaths: [
    {
      id: 'laser-zapper-center-route',
      intent: 'safe-guide',
      points: [
        { runDistance: 64, y: 180 },
        { runDistance: 160, y: 180 },
        { runDistance: 260, y: 175 },
        { runDistance: 360, y: 170 },
        { runDistance: 480, y: 175 },
        { runDistance: 620, y: 185 },
        { runDistance: 700, y: 195 },
      ],
    },
  ],
});

export const M5_AUTHORED_MULTI_HAZARD_PATTERNS: ReadonlyArray<Readonly<HazardPattern>> =
  Object.freeze([M5_MISSILE_ZAPPER_PATTERN, M5_MISSILE_LASER_PATTERN, M5_LASER_ZAPPER_PATTERN]);

const M5_ROUTE_ENHANCED_BASELINE_CATALOG = applyM5CollectibleMovementPatterns(
  PROTOTYPE_M5_HAZARD_PATTERN_FIXTURES,
);

/**
 * Live M5 catalog keeps the Phase-2 slot count/order stable. Collectible teaching/recovery data are
 * layered onto matching baseline slots, then the already accepted Phase-2 combinations follow.
 */
export const PROTOTYPE_M5_LIVE_HAZARD_PATTERN_CATALOG: ReadonlyArray<Readonly<HazardPattern>> =
  Object.freeze([...M5_ROUTE_ENHANCED_BASELINE_CATALOG, ...M5_AUTHORED_MULTI_HAZARD_PATTERNS]);
