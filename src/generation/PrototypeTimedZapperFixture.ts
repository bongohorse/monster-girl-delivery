import {
  createPrototypeZapperBehavior,
  createPrototypeZapperHitbox,
  PROTOTYPE_ZAPPER_LENGTHS,
} from '../hazards/PrototypeZapperHazard';
import { PROTOTYPE_TIMED_ZAPPER_CONFIG } from '../hazards/TimedZapperLifecycle';
import { createHazardPattern } from './HazardPattern';

const PROTOTYPE_TIMED_ZAPPER_BEHAVIOR = Object.freeze({
  ...createPrototypeZapperBehavior(0, PROTOTYPE_ZAPPER_LENGTHS.medium),
  timing: PROTOTYPE_TIMED_ZAPPER_CONFIG,
});

/**
 * Distinct cyclic Timed Zapper fixture for #250/#252. It intentionally lives outside the normal M5
 * generator catalog so adding timed lifecycle correctness cannot silently change spawn weighting/order.
 */
export const PROTOTYPE_TIMED_ZAPPER_PATTERN = createHazardPattern({
  id: 'prototype-zapper-timed',
  runLength: 640,
  profile: {
    behaviorTags: ['timed-pulse'],
    difficultyTierRange: { minimumTierIndex: 1, maximumTierIndex: null },
    pacingIntensities: ['low', 'medium', 'high', 'peak'],
    pressureCost: 1,
    readabilityCost: 3,
    varietyFamilyId: 'zapper',
  },
  entries: [
    {
      behavior: PROTOTYPE_TIMED_ZAPPER_BEHAVIOR,
      id: 'zapper-timed-1',
      type: 'placeholder-barrier',
      hitbox: createPrototypeZapperHitbox(280, 195, PROTOTYPE_TIMED_ZAPPER_BEHAVIOR),
    },
  ],
});
