import {
  createBitmapCollectiblePaths,
  createGridCollectiblePaths,
  createUniformPolylineCollectiblePath,
  M5_DENSE_COIN_SPACING,
} from './CollectibleFormationGenerator';
import { type CollectiblePath, createHazardPattern, type HazardPattern } from './HazardPattern';
import {
  PROTOTYPE_CORRIDOR_PATTERN,
  PROTOTYPE_LINE_PATTERN,
  PROTOTYPE_OFFSET_PAIR_PATTERN,
  PROTOTYPE_ZAPPER_PATTERN,
} from './PrototypeHazardPatternFixtures';

const HEART_BITMAP = Object.freeze([
  '.##...##.',
  '####.####',
  '#########',
  '.#######.',
  '..#####..',
  '...###...',
  '....##...',
]);

const STAR_BITMAP = Object.freeze([
  '...###...',
  '#########',
  '.#######.',
  '..#####..',
  '.#######.',
  '###...###',
  '.##...##.',
]);

const COINS_BITMAP = Object.freeze([
  '###.###.###.#..#.###.##',
  '#...#.#..#..##.#.#...##',
  '#...#.#..#..#.##.###.##',
  '#...#.#..#..#..#...#...',
  '###.###.###.#..#.###.##',
]);

const copyEntries = (pattern: Readonly<HazardPattern>) =>
  pattern.entries.map((entry) => ({
    behavior: entry.behavior,
    id: entry.id,
    type: entry.type,
    hitbox: entry.hitbox,
    ...(entry.reactionPolicy === undefined ? {} : { reactionPolicy: entry.reactionPolicy }),
  }));

const enrichPattern = (
  pattern: Readonly<HazardPattern>,
  collectiblePaths: ReadonlyArray<Readonly<CollectiblePath>>,
): Readonly<HazardPattern> =>
  createHazardPattern({
    id: pattern.id,
    runLength: pattern.runLength,
    profile: pattern.profile,
    entries: copyEntries(pattern),
    collectiblePaths,
  });

/**
 * Teaching vocabulary layered onto the existing three-barrier live slot. The guide is resampled by
 * actual path length, so the climb/crest/descent no longer produces visibly irregular coin gaps.
 * A compact heart begins only after the last barrier's conservative player-expanded clearance.
 */
export const M5_TEACHING_FLIGHT_ARC_PATTERN: Readonly<HazardPattern> = enrichPattern(
  PROTOTYPE_LINE_PATTERN,
  [
    createUniformPolylineCollectiblePath({
      id: 'teaching-flight-arc',
      intent: 'safe-guide',
      spacing: M5_DENSE_COIN_SPACING,
      controlPoints: [
        { runDistance: 0, y: 195 },
        { runDistance: 70, y: 150 },
        { runDistance: 140, y: 100 },
        { runDistance: 240, y: 105 },
        { runDistance: 360, y: 100 },
        { runDistance: 500, y: 105 },
        { runDistance: 600, y: 195 },
      ],
    }),
    ...createBitmapCollectiblePaths({
      id: 'teaching-heart-reward',
      intent: 'safe-guide',
      bitmap: HEART_BITMAP,
      cellSpacingX: 12,
      cellSpacingY: 10,
      originRunDistance: 500,
      originY: 160,
    }),
  ],
);

/**
 * The corridor becomes an explicit 3x10 reward lane: three aligned rows with exactly equal X gaps.
 * All thirty coins sit inside the already validated center corridor, so following the dense block is
 * rewarding rather than a trap.
 */
export const M5_CORRIDOR_REWARD_PATTERN: Readonly<HazardPattern> = enrichPattern(
  PROTOTYPE_CORRIDOR_PATTERN,
  createGridCollectiblePaths({
    id: 'corridor-triple-row',
    intent: 'safe-guide',
    columns: 10,
    rows: 3,
    columnSpacing: M5_DENSE_COIN_SPACING,
    rowSpacing: 23,
    startRunDistance: 48,
    centerY: 195,
  }),
);

/**
 * The established optional Graze line is made denser and evenly spaced. The star starts after the
 * second barrier's conservative clearance; tighter 15px cells let the full shape fit in runLength.
 */
export const M5_OFFSET_RISK_REWARD_PATTERN: Readonly<HazardPattern> = enrichPattern(
  PROTOTYPE_OFFSET_PAIR_PATTERN,
  [
    createUniformPolylineCollectiblePath({
      id: 'offset-graze-route',
      intent: 'risk-reward',
      spacing: M5_DENSE_COIN_SPACING,
      controlPoints: [
        { runDistance: 32, y: 195 },
        { runDistance: 488, y: 195 },
      ],
    }),
    ...createBitmapCollectiblePaths({
      id: 'offset-star-reward',
      intent: 'safe-guide',
      bitmap: STAR_BITMAP,
      cellSpacingX: 15,
      cellSpacingY: 10,
      originRunDistance: 400,
      originY: 165,
    }),
  ],
);

/**
 * Recovery vocabulary layered onto the existing rotating-Zapper slot. A compact COINS! formation
 * lives entirely in the generous lower safe field: downtime pays out visibly without pointing the
 * player back toward the Zapper.
 */
export const M5_RECOVERY_ROUTE_PATTERN: Readonly<HazardPattern> = enrichPattern(
  PROTOTYPE_ZAPPER_PATTERN,
  createBitmapCollectiblePaths({
    id: 'recovery-coins-text',
    intent: 'safe-guide',
    bitmap: COINS_BITMAP,
    cellSpacingX: 12,
    cellSpacingY: 16,
    originRunDistance: 340,
    originY: 228,
  }),
);

export const M5_COLLECTIBLE_MOVEMENT_PATTERNS: ReadonlyArray<Readonly<HazardPattern>> =
  Object.freeze([
    M5_TEACHING_FLIGHT_ARC_PATTERN,
    M5_CORRIDOR_REWARD_PATTERN,
    M5_OFFSET_RISK_REWARD_PATTERN,
    M5_RECOVERY_ROUTE_PATTERN,
  ]);

/**
 * Replaces only matching existing M5 slots. Catalog length/order and all hazard data remain stable,
 * so richer collectible formations cannot change seeded hazard selection.
 */
export const applyM5CollectibleMovementPatterns = (
  catalog: ReadonlyArray<Readonly<HazardPattern>>,
): ReadonlyArray<Readonly<HazardPattern>> =>
  Object.freeze(
    catalog.map((pattern) => {
      if (pattern.id === PROTOTYPE_LINE_PATTERN.id) {
        return M5_TEACHING_FLIGHT_ARC_PATTERN;
      }
      if (pattern.id === PROTOTYPE_CORRIDOR_PATTERN.id) {
        return M5_CORRIDOR_REWARD_PATTERN;
      }
      if (pattern.id === PROTOTYPE_OFFSET_PAIR_PATTERN.id) {
        return M5_OFFSET_RISK_REWARD_PATTERN;
      }
      if (
        pattern.id === PROTOTYPE_ZAPPER_PATTERN.id &&
        pattern.entries.some((entry) => entry.behavior.kind === 'zapper')
      ) {
        return M5_RECOVERY_ROUTE_PATTERN;
      }
      return pattern;
    }),
  );
