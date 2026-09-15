import { describe, expect, it } from 'vitest';
import { createHazardPattern } from '../../src/generation/HazardPattern';
import { scheduleNextPattern } from '../../src/generation/PatternSpawnScheduler';
import { createRunGenerationState } from '../../src/generation/RunGenerationState';
import { getHazardReactionPolicy } from '../../src/hazards/HazardReactionState';
import { TEST_ENCOUNTER_PROFILE } from '../support/TestEncounterProfile';

describe('hazard reaction policy propagation', () => {
  it('snapshots an authored policy and carries it into the logical spawn', () => {
    const sourcePolicy = { disable: 'destroy' as const, destroy: 'immune' as const };
    const pattern = createHazardPattern({
      id: 'reaction-policy-pattern',
      runLength: 600,
      profile: TEST_ENCOUNTER_PROFILE,
      entries: [
        {
          id: 'reaction-policy-entry',
          type: 'placeholder-barrier',
          hitbox: { left: 120, right: 168, top: 160, bottom: 208 },
          reactionPolicy: sourcePolicy,
        },
      ],
    });

    sourcePolicy.disable = 'destroy';
    expect(pattern.entries[0]?.reactionPolicy).toEqual({ disable: 'destroy', destroy: 'immune' });
    expect(Object.isFrozen(pattern.entries[0]?.reactionPolicy)).toBe(true);

    const schedule = scheduleNextPattern({
      catalog: [pattern],
      patternStartDistance: 1_000,
      state: createRunGenerationState('hazard-reaction-policy'),
    });

    if (schedule.status !== 'accepted' || !schedule.spawns[0]) {
      throw new Error('Expected reaction policy fixture to schedule one hazard.');
    }

    expect(schedule.spawns[0].reactionPolicy).toBe(pattern.entries[0]?.reactionPolicy);
    expect(getHazardReactionPolicy(schedule.spawns[0])).toEqual({
      disable: 'destroy',
      destroy: 'immune',
    });
  });

  it('uses shared default semantics when content omits an override', () => {
    const pattern = createHazardPattern({
      id: 'default-reaction-policy-pattern',
      runLength: 600,
      profile: TEST_ENCOUNTER_PROFILE,
      entries: [
        {
          id: 'default-reaction-policy-entry',
          type: 'placeholder-barrier',
          hitbox: { left: 120, right: 168, top: 160, bottom: 208 },
        },
      ],
    });

    expect(pattern.entries[0]?.reactionPolicy).toBeUndefined();
    expect(getHazardReactionPolicy(pattern.entries[0] ?? {})).toEqual({
      disable: 'disable',
      destroy: 'destroy',
    });
  });
});
