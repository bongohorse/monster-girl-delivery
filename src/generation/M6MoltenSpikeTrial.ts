import { createUniformPolylineCollectiblePath } from './CollectibleFormationGenerator';
import { createHazardPattern } from './HazardPattern';
import { PROTOTYPE_M5_LIVE_HAZARD_PATTERN_CATALOG } from './M5LiveEncounterCatalog';

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
