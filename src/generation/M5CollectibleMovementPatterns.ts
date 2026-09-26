import {
  createSineCollectiblePath,
  createUniformPolylineCollectiblePath,
} from './CollectibleFormationGenerator';
import { type CollectiblePath, createHazardPattern, type HazardPattern } from './HazardPattern';
import {
  PROTOTYPE_CORRIDOR_PATTERN,
  PROTOTYPE_LINE_PATTERN,
  PROTOTYPE_OFFSET_PAIR_PATTERN,
  PROTOTYPE_ZAPPER_PATTERN,
} from './PrototypeHazardPatternFixtures';

const M5_LIVE_ROUTE_SPACING = 48;
const M5_LIVE_RISK_ROUTE_SPACING = 44;

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
 * Teaching vocabulary layered onto the existing three-barrier live slot. One sparse route carries
 * the entire movement message; decorative bitmap rewards are intentionally kept out of normal play.
 */
export const M5_TEACHING_FLIGHT_ARC_PATTERN: Readonly<HazardPattern> = enrichPattern(
  PROTOTYPE_LINE_PATTERN,
  [
    createUniformPolylineCollectiblePath({
      id: 'teaching-flight-arc',
      intent: 'safe-guide',
      spacing: M5_LIVE_ROUTE_SPACING,
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
  ],
);

/**
 * The corridor uses one centered guide instead of a dense reward block. The route remains obvious
 * while leaving the hazard geometry and surrounding screen visually quiet.
 */
export const M5_CORRIDOR_REWARD_PATTERN: Readonly<HazardPattern> = enrichPattern(
  PROTOTYPE_CORRIDOR_PATTERN,
  [
    createUniformPolylineCollectiblePath({
      id: 'corridor-center-route',
      intent: 'safe-guide',
      spacing: M5_LIVE_ROUTE_SPACING,
      controlPoints: [
        { runDistance: 48, y: 195 },
        { runDistance: 352, y: 195 },
      ],
    }),
  ],
);

/**
 * The optional Graze line stays explicit but no longer terminates in a dense star formation. The
 * player sees one coherent risk invitation instead of route guidance plus a second visual reward.
 */
export const M5_OFFSET_RISK_REWARD_PATTERN: Readonly<HazardPattern> = enrichPattern(
  PROTOTYPE_OFFSET_PAIR_PATTERN,
  [
    createUniformPolylineCollectiblePath({
      id: 'offset-graze-route',
      intent: 'risk-reward',
      spacing: M5_LIVE_RISK_ROUTE_SPACING,
      controlPoints: [
        { runDistance: 32, y: 195 },
        { runDistance: 488, y: 195 },
      ],
    }),
  ],
);

/**
 * Recovery vocabulary layered onto the rotating-Zapper slot. A gentle lower-field wave gives the
 * player something satisfying to follow without turning the recovery beat into another screen-filling event.
 */
export const M5_RECOVERY_ROUTE_PATTERN: Readonly<HazardPattern> = enrichPattern(
  PROTOTYPE_ZAPPER_PATTERN,
  [
    createSineCollectiblePath({
      id: 'recovery-wave',
      intent: 'safe-guide',
      startRunDistance: 180,
      endRunDistance: 600,
      centerY: 235,
      amplitudeY: 18,
      cycles: 1,
      spacing: M5_LIVE_ROUTE_SPACING,
    }),
  ],
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
