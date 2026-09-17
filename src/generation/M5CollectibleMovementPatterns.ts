import {
  createPrototypeZapperBehavior,
  createPrototypeZapperHitbox,
  PROTOTYPE_ZAPPER_LENGTHS,
} from '../hazards/PrototypeZapperHazard';
import { createHazardPattern, type HazardPattern } from './HazardPattern';

const TEACHING_ZAPPER_BEHAVIOR = createPrototypeZapperBehavior(
  0,
  PROTOTYPE_ZAPPER_LENGTHS.medium,
);
const RECOVERY_ZAPPER_BEHAVIOR = createPrototypeZapperBehavior(
  0,
  PROTOTYPE_ZAPPER_LENGTHS.short,
);

/**
 * Early-run movement language: release into the opening descent, thrust up and over one obvious
 * horizontal Zapper, then relax back down. The collectibles describe the useful one-button arc
 * before the player has to reason about denser encounter grammar.
 */
export const M5_TEACHING_FLIGHT_ARC_PATTERN: Readonly<HazardPattern> = createHazardPattern({
  id: 'm5-route-teaching-arc',
  runLength: 780,
  profile: {
    behaviorTags: ['static-barrier'],
    difficultyTierRange: { minimumTierIndex: 0, maximumTierIndex: null },
    pacingIntensities: ['low', 'medium'],
    pressureCost: 1,
    readabilityCost: 1,
    varietyFamilyId: 'm5-route-teaching',
  },
  entries: [
    {
      behavior: TEACHING_ZAPPER_BEHAVIOR,
      id: 'teaching-horizontal-zapper',
      type: 'placeholder-barrier',
      hitbox: createPrototypeZapperHitbox(360, 195, TEACHING_ZAPPER_BEHAVIOR),
    },
  ],
  collectiblePaths: [
    {
      id: 'teaching-flight-arc',
      intent: 'safe-guide',
      points: [
        { runDistance: 80, y: 245 },
        { runDistance: 160, y: 220 },
        { runDistance: 240, y: 145 },
        { runDistance: 340, y: 120 },
        { runDistance: 440, y: 130 },
        { runDistance: 540, y: 175 },
        { runDistance: 660, y: 235 },
        { runDistance: 730, y: 250 },
      ],
    },
  ],
});

/**
 * Low-pressure route content: one small high Zapper leaves the lower field open while a gentle
 * collectible wave keeps the player making satisfying movement decisions during recovery pacing.
 */
export const M5_RECOVERY_ROUTE_PATTERN: Readonly<HazardPattern> = createHazardPattern({
  id: 'm5-route-recovery-wave',
  runLength: 760,
  profile: {
    behaviorTags: ['static-barrier'],
    difficultyTierRange: { minimumTierIndex: 0, maximumTierIndex: null },
    pacingIntensities: ['low'],
    pressureCost: 1,
    readabilityCost: 1,
    varietyFamilyId: 'm5-route-recovery',
  },
  entries: [
    {
      behavior: RECOVERY_ZAPPER_BEHAVIOR,
      id: 'recovery-high-zapper',
      type: 'placeholder-barrier',
      hitbox: createPrototypeZapperHitbox(360, 105, RECOVERY_ZAPPER_BEHAVIOR),
    },
  ],
  collectiblePaths: [
    {
      id: 'recovery-gentle-wave',
      intent: 'safe-guide',
      points: [
        { runDistance: 80, y: 205 },
        { runDistance: 180, y: 235 },
        { runDistance: 300, y: 265 },
        { runDistance: 420, y: 255 },
        { runDistance: 540, y: 225 },
        { runDistance: 660, y: 195 },
        { runDistance: 720, y: 195 },
      ],
    },
  ],
});

export const M5_COLLECTIBLE_MOVEMENT_PATTERNS: ReadonlyArray<Readonly<HazardPattern>> = Object.freeze([
  M5_TEACHING_FLIGHT_ARC_PATTERN,
  M5_RECOVERY_ROUTE_PATTERN,
]);
