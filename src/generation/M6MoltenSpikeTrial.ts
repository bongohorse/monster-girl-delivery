import { PROTOTYPE_PLAYER_COLLISION_EXTENTS } from '../systems/HazardCollision';
import { createUniformPolylineCollectiblePath } from './CollectibleFormationGenerator';
import { createHazardPattern, type HazardPattern } from './HazardPattern';
import { PROTOTYPE_M5_LIVE_HAZARD_PATTERN_CATALOG } from './M5LiveEncounterCatalog';
import type { PatternValidationConstraints } from './PatternValidator';
import { stepSeededPrng } from './SeededPrng';

/** One static encounter to judge the trial asset in the actual Endless run. */
export const M6_MOLTEN_SPIKE_TRIAL = createHazardPattern({
  id: 'm6-trial-molten-spike-upper',
  runLength: 640,
  profile: {
    behaviorTags: ['static-barrier'],
    difficultyTierRange: { minimumTierIndex: 0, maximumTierIndex: null },
    pacingIntensities: ['low', 'medium', 'high', 'peak'],
    pressureCost: 1,
    readabilityCost: 2,
    varietyFamilyId: 'm6-trial-molten-spike',
  },
  entries: [
    {
      behavior: { archetype: 'geometric', kind: 'static' },
      id: 'molten-spike-upper',
      type: 'molten-spike',
      hitbox: { left: 256, right: 304, top: 86, bottom: 134 },
    },
  ],
  collectiblePaths: [
    createUniformPolylineCollectiblePath({
      id: 'spike-lower-safe-guide',
      intent: 'safe-guide',
      spacing: 48,
      controlPoints: [
        { runDistance: 64, y: 235 },
        { runDistance: 576, y: 235 },
      ],
    }),
  ],
});

/** The accepted M5 patterns remain intact; this one visual trial is added to the live catalog. */
export const PROTOTYPE_M6_TRIAL_HAZARD_PATTERN_CATALOG = Object.freeze([
  ...PROTOTYPE_M5_LIVE_HAZARD_PATTERN_CATALOG,
  M6_MOLTEN_SPIKE_TRIAL,
]);

/** Realizes only the automatic trial slot; authored/editor patterns remain untouched.
 * Observes the existing seeded state, like Laser lane selection, without adding generator draws.
 * Height is chosen before pacing, readability, geometry and transition validation. The existing
 * safe-guide route stays fixed, so exclude its player-sized clearance from the spawn band.
 */
export const selectMoltenSpikeHeightCatalog = (
  catalog: ReadonlyArray<Readonly<HazardPattern>>,
  constraints: Readonly<PatternValidationConstraints>,
  prngState: number,
): ReadonlyArray<Readonly<HazardPattern>> => {
  // The first output also selects the catalog index. Use the next output for height so
  // selecting the last catalog slot does not restrict spikes to high random fractions.
  const fraction = stepSeededPrng(stepSeededPrng(prngState).state).value / 0x1_0000_0000;
  return Object.freeze(
    catalog.map((pattern) => {
      if (pattern.id !== M6_MOLTEN_SPIKE_TRIAL.id) return pattern;
      const entry = pattern.entries[0];
      if (!entry) throw new Error('Molten spike trial must have one entry.');
      const halfHeight = (entry.hitbox.bottom - entry.hitbox.top) / 2;
      // Match the visible spike margin (1.5 times its logical box).
      const minimum = constraints.playableTop + halfHeight * 1.5;
      const maximum = constraints.playableBottom - halfHeight * 1.5;
      const guideY = pattern.collectiblePaths?.[0]?.points[0]?.y;
      const clearance =
        halfHeight +
        Math.max(
          PROTOTYPE_PLAYER_COLLISION_EXTENTS.top,
          PROTOTYPE_PLAYER_COLLISION_EXTENTS.bottom,
        ) +
        8;
      const upperEnd = guideY === undefined ? maximum : Math.min(maximum, guideY - clearance);
      const lowerStart = guideY === undefined ? maximum : Math.max(minimum, guideY + clearance);
      const upperSpan = Math.max(0, upperEnd - minimum);
      const lowerSpan = Math.max(0, maximum - lowerStart);
      if (upperSpan + lowerSpan <= 0) return pattern; // Existing validator decides narrow domains.
      const offset = fraction * (upperSpan + lowerSpan);
      const centerY = offset < upperSpan ? minimum + offset : lowerStart + offset - upperSpan;
      return createHazardPattern({
        ...pattern,
        entries: [
          {
            ...entry,
            hitbox: { ...entry.hitbox, top: centerY - halfHeight, bottom: centerY + halfHeight },
          },
        ],
      });
    }),
  );
};
