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
      behavior: { archetype: 'geometric', kind: 'static' },
      id: 'line-1',
      type: 'placeholder-barrier',
      hitbox: { left: 120, right: 168, top: 160, bottom: 208 },
    },
    {
      behavior: { archetype: 'geometric', kind: 'static' },
      id: 'line-2',
      type: 'placeholder-barrier',
      hitbox: { left: 276, right: 324, top: 160, bottom: 208 },
    },
    {
      behavior: { archetype: 'geometric', kind: 'static' },
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
      behavior: { archetype: 'geometric', kind: 'static' },
      id: 'corridor-top',
      type: 'placeholder-barrier',
      hitbox: { left: 160, right: 208, top: 48, bottom: 132 },
    },
    {
      behavior: { archetype: 'geometric', kind: 'static' },
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
      behavior: { archetype: 'geometric', kind: 'static' },
      id: 'offset-high',
      type: 'placeholder-barrier',
      hitbox: { left: 120, right: 168, top: 95, bottom: 167 },
    },
    {
      behavior: { archetype: 'geometric', kind: 'static' },
      id: 'offset-low',
      type: 'placeholder-barrier',
      hitbox: { left: 330, right: 378, top: 220, bottom: 292 },
    },
  ],
});

/** PROTOTYPE geometric/persistent moving hazard; tuning and presentation are not production art. */
export const PROTOTYPE_VERTICAL_PATROL_PATTERN = createHazardPattern({
  id: 'prototype-vertical-patrol',
  runLength: 640,
  profile: {
    behaviorTags: ['moving-barrier'],
    difficultyTierRange: { minimumTierIndex: 1, maximumTierIndex: null },
    pacingIntensities: ['low', 'medium', 'high', 'peak'],
    pressureCost: 1,
    readabilityCost: 2,
    varietyFamilyId: 'moving-patrol',
  },
  entries: [
    {
      behavior: {
        amplitudeY: 48,
        archetype: 'geometric',
        cycleDistance: 700,
        kind: 'vertical-patrol',
        phaseOffset: 0,
      },
      id: 'vertical-patrol-1',
      type: 'placeholder-barrier',
      hitbox: { left: 280, right: 328, top: 147, bottom: 195 },
    },
  ],
});

export const PROTOTYPE_HAZARD_PATTERN_FIXTURES = Object.freeze([
  PROTOTYPE_LINE_PATTERN,
  PROTOTYPE_CORRIDOR_PATTERN,
  PROTOTYPE_OFFSET_PAIR_PATTERN,
]);

/** M4 live prototype catalog. The M3 fixture catalog remains stable for replay evidence. */
export const PROTOTYPE_M4_HAZARD_PATTERN_FIXTURES = Object.freeze([
  ...PROTOTYPE_HAZARD_PATTERN_FIXTURES,
  PROTOTYPE_VERTICAL_PATROL_PATTERN,
]);
