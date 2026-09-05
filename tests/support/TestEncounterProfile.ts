import { createEncounterProfile } from '../../src/generation/EncounterProfile';

/** Explicit neutral metadata for tests whose subject is not encounter policy. */
export const TEST_ENCOUNTER_PROFILE = createEncounterProfile({
  behaviorTags: ['static-barrier'],
  difficultyTierRange: { minimumTierIndex: 0, maximumTierIndex: null },
  pacingIntensities: ['breather', 'low', 'medium', 'high', 'peak'],
  pressureCost: 1,
  readabilityCost: 1,
  varietyFamilyId: 'test-static',
});
