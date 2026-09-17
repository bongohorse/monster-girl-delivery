import { createHazardPattern, type HazardPattern } from './HazardPattern';
import { PROTOTYPE_LINE_PATTERN, PROTOTYPE_ZAPPER_PATTERN } from './PrototypeHazardPatternFixtures';

const copyEntries = (pattern: Readonly<HazardPattern>) =>
  pattern.entries.map((entry) => ({
    behavior: entry.behavior,
    id: entry.id,
    type: entry.type,
    hitbox: entry.hitbox,
    ...(entry.reactionPolicy === undefined ? {} : { reactionPolicy: entry.reactionPolicy }),
  }));

/**
 * Teaching vocabulary layered onto the existing three-barrier live slot. The route climbs from the
 * neutral band before the first barrier, stays clearly above the repeated center pressure, then
 * returns toward neutral after the final barrier. Hazard geometry/profile/id remain unchanged so
 * collectible teaching does not perturb deterministic hazard selection.
 */
export const M5_TEACHING_FLIGHT_ARC_PATTERN: Readonly<HazardPattern> = createHazardPattern({
  id: PROTOTYPE_LINE_PATTERN.id,
  runLength: PROTOTYPE_LINE_PATTERN.runLength,
  profile: PROTOTYPE_LINE_PATTERN.profile,
  entries: copyEntries(PROTOTYPE_LINE_PATTERN),
  collectiblePaths: [
    {
      id: 'teaching-flight-arc',
      intent: 'safe-guide',
      points: [
        { runDistance: 0, y: 195 },
        { runDistance: 70, y: 150 },
        { runDistance: 140, y: 100 },
        { runDistance: 240, y: 105 },
        { runDistance: 360, y: 100 },
        { runDistance: 500, y: 105 },
        { runDistance: 600, y: 195 },
      ],
    },
  ],
});

/**
 * Recovery vocabulary layered onto the existing live rotating-Zapper slot. Its lower gentle wave
 * remains outside the Zapper's conservative full rotation sweep while keeping low-pressure flight
 * active. The original hazard identity, profile and geometry are preserved exactly.
 */
export const M5_RECOVERY_ROUTE_PATTERN: Readonly<HazardPattern> = createHazardPattern({
  id: PROTOTYPE_ZAPPER_PATTERN.id,
  runLength: PROTOTYPE_ZAPPER_PATTERN.runLength,
  profile: PROTOTYPE_ZAPPER_PATTERN.profile,
  entries: copyEntries(PROTOTYPE_ZAPPER_PATTERN),
  collectiblePaths: [
    {
      id: 'recovery-gentle-wave',
      intent: 'safe-guide',
      points: [
        { runDistance: 64, y: 220 },
        { runDistance: 160, y: 245 },
        { runDistance: 260, y: 270 },
        { runDistance: 360, y: 260 },
        { runDistance: 480, y: 235 },
        { runDistance: 600, y: 210 },
      ],
    },
  ],
});

export const M5_COLLECTIBLE_MOVEMENT_PATTERNS: ReadonlyArray<Readonly<HazardPattern>> =
  Object.freeze([M5_TEACHING_FLIGHT_ARC_PATTERN, M5_RECOVERY_ROUTE_PATTERN]);

/**
 * Replaces only the matching existing M5 slots. Catalog length/order and all hazard data remain
 * stable, so adding collectible movement language cannot change seeded hazard selection.
 */
export const applyM5CollectibleMovementPatterns = (
  catalog: ReadonlyArray<Readonly<HazardPattern>>,
): ReadonlyArray<Readonly<HazardPattern>> =>
  Object.freeze(
    catalog.map((pattern) => {
      if (pattern.id === PROTOTYPE_LINE_PATTERN.id) {
        return M5_TEACHING_FLIGHT_ARC_PATTERN;
      }
      if (pattern.id === PROTOTYPE_ZAPPER_PATTERN.id) {
        return M5_RECOVERY_ROUTE_PATTERN;
      }
      return pattern;
    }),
  );
