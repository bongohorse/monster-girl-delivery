import { createHazardPattern } from './HazardPattern';

/** PROTOTYPE example/test data only; this is not a live or production content catalog. */
export const PROTOTYPE_LINE_PATTERN = createHazardPattern({
  id: 'prototype-line',
  runLength: 600,
  profile: {
    behaviorTags: ['static-barrier'],
    difficultyTierRange: { minimumTierIndex: 0, maximumTierIndex: null },
    pacingIntensities: ['medium', 'high', 'peak'],
    pressureCost: 3,
    readabilityCost: 2,
    varietyFamilyId: 'static-sequence',
  },
  entries: [
    {
      id: 'line-1',
      type: 'placeholder-barrier',
      hitbox: { left: 120, right: 168, top: 160, bottom: 208 },
    },
    {
      id: 'line-2',
      type: 'placeholder-barrier',
      hitbox: { left: 276, right: 324, top: 160, bottom: 208 },
    },
    {
      id: 'line-3',
      type: 'placeholder-barrier',
      hitbox: { left: 432, right: 480, top: 160, bottom: 208 },
    },
  ],
});

/** PROTOTYPE example/test data only; fairness has not yet been evaluated. */
export const PROTOTYPE_CORRIDOR_PATTERN = createHazardPattern({
  id: 'prototype-corridor',
  runLength: 400,
  profile: {
    behaviorTags: ['static-barrier'],
    difficultyTierRange: { minimumTierIndex: 1, maximumTierIndex: null },
    pacingIntensities: ['medium', 'high', 'peak'],
    pressureCost: 2,
    readabilityCost: 2,
    varietyFamilyId: 'static-corridor',
  },
  entries: [
    {
      id: 'corridor-top',
      type: 'placeholder-barrier',
      hitbox: { left: 160, right: 208, top: 48, bottom: 132 },
    },
    {
      id: 'corridor-bottom',
      type: 'placeholder-barrier',
      hitbox: { left: 160, right: 208, top: 258, bottom: 342 },
    },
  ],
});

/** PROTOTYPE example/test data only; fairness has not yet been evaluated. */
export const PROTOTYPE_OFFSET_PAIR_PATTERN = createHazardPattern({
  id: 'prototype-offset-pair',
  runLength: 520,
  profile: {
    behaviorTags: ['static-barrier'],
    difficultyTierRange: { minimumTierIndex: 1, maximumTierIndex: null },
    pacingIntensities: ['low', 'medium', 'high', 'peak'],
    pressureCost: 2,
    readabilityCost: 2,
    varietyFamilyId: 'static-sequence',
  },
  entries: [
    {
      id: 'offset-high',
      type: 'placeholder-barrier',
      hitbox: { left: 120, right: 168, top: 95, bottom: 167 },
    },
    {
      id: 'offset-low',
      type: 'placeholder-barrier',
      hitbox: { left: 330, right: 378, top: 220, bottom: 292 },
    },
  ],
});

export const PROTOTYPE_HAZARD_PATTERN_FIXTURES = Object.freeze([
  PROTOTYPE_LINE_PATTERN,
  PROTOTYPE_CORRIDOR_PATTERN,
  PROTOTYPE_OFFSET_PAIR_PATTERN,
]);
