import { describe, expect, it } from 'vitest';
import {
  createEncounterProfile,
  type EncounterProfile,
  MAX_PROTOTYPE_ENCOUNTER_COST,
} from '../../src/generation/EncounterProfile';

const VALID_PROFILE: Readonly<EncounterProfile> = Object.freeze({
  behaviorTags: Object.freeze(['static-barrier'] as const),
  difficultyTierRange: Object.freeze({ minimumTierIndex: 1, maximumTierIndex: 3 }),
  pacingIntensities: Object.freeze(['low', 'medium', 'high'] as const),
  pressureCost: 3,
  readabilityCost: 2,
  varietyFamilyId: 'static-offset-pair',
});

describe('encounter profile', () => {
  it('constructs deterministic, serializable policy metadata with explicit eligibility bounds', () => {
    const first = createEncounterProfile(VALID_PROFILE);
    const repeated = createEncounterProfile(VALID_PROFILE);

    expect(first).toEqual({
      behaviorTags: ['static-barrier'],
      difficultyTierRange: { minimumTierIndex: 1, maximumTierIndex: 3 },
      pacingIntensities: ['low', 'medium', 'high'],
      pressureCost: 3,
      readabilityCost: 2,
      varietyFamilyId: 'static-offset-pair',
    });
    expect(repeated).toEqual(first);
    expect(JSON.stringify(repeated)).toBe(JSON.stringify(first));
    expect(JSON.parse(JSON.stringify(first))).toEqual(first);
  });

  it('deeply snapshots mutable source data and preserves stable variety-family identity', () => {
    const source = {
      behaviorTags: ['static-barrier'] as const,
      difficultyTierRange: { minimumTierIndex: 0, maximumTierIndex: null },
      pacingIntensities: ['breather', 'low'] as const,
      pressureCost: 0,
      readabilityCost: MAX_PROTOTYPE_ENCOUNTER_COST,
      varietyFamilyId: 'stable-family',
    };
    const first = createEncounterProfile(source);
    const repeated = createEncounterProfile({ ...source });
    source.difficultyTierRange.minimumTierIndex = 2;

    expect(first).toEqual(repeated);
    expect(first.varietyFamilyId).toBe('stable-family');
    expect(first.difficultyTierRange.minimumTierIndex).toBe(0);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.behaviorTags)).toBe(true);
    expect(Object.isFrozen(first.difficultyTierRange)).toBe(true);
    expect(Object.isFrozen(first.pacingIntensities)).toBe(true);
  });

  it('supports open-ended and exact inclusive difficulty ranges', () => {
    expect(
      createEncounterProfile({
        ...VALID_PROFILE,
        difficultyTierRange: { minimumTierIndex: 0, maximumTierIndex: null },
      }).difficultyTierRange,
    ).toEqual({ minimumTierIndex: 0, maximumTierIndex: null });
    expect(
      createEncounterProfile({
        ...VALID_PROFILE,
        difficultyTierRange: { minimumTierIndex: 2, maximumTierIndex: 2 },
      }).difficultyTierRange,
    ).toEqual({ minimumTierIndex: 2, maximumTierIndex: 2 });
  });

  it('accepts the timed pulse tag for later difficulty and pacing eligibility', () => {
    expect(
      createEncounterProfile({ ...VALID_PROFILE, behaviorTags: ['timed-pulse'] }).behaviorTags,
    ).toEqual(['timed-pulse']);
  });

  it('accepts the target-lock strike tag for later difficulty and pacing eligibility', () => {
    expect(
      createEncounterProfile({ ...VALID_PROFILE, behaviorTags: ['target-lock-strike'] })
        .behaviorTags,
    ).toEqual(['target-lock-strike']);
  });

  it('contains no viewport, Phaser, presentation, or mutable policy state', () => {
    const profile = createEncounterProfile(VALID_PROFILE);
    expect(JSON.stringify(profile)).not.toMatch(
      /viewport|screen|phaser|presentation|history|random/i,
    );
  });

  it.each([
    {
      name: 'minimum tier',
      profile: {
        ...VALID_PROFILE,
        difficultyTierRange: { minimumTierIndex: -1, maximumTierIndex: 3 },
      },
    },
    {
      name: 'fractional tier',
      profile: {
        ...VALID_PROFILE,
        difficultyTierRange: { minimumTierIndex: 0.5, maximumTierIndex: 3 },
      },
    },
    {
      name: 'non-finite minimum tier',
      profile: {
        ...VALID_PROFILE,
        difficultyTierRange: { minimumTierIndex: Number.NaN, maximumTierIndex: 3 },
      },
    },
    {
      name: 'non-finite maximum tier',
      profile: {
        ...VALID_PROFILE,
        difficultyTierRange: { minimumTierIndex: 1, maximumTierIndex: Number.POSITIVE_INFINITY },
      },
    },
    {
      name: 'maximum below minimum',
      profile: {
        ...VALID_PROFILE,
        difficultyTierRange: { minimumTierIndex: 3, maximumTierIndex: 2 },
      },
    },
    { name: 'negative pressure', profile: { ...VALID_PROFILE, pressureCost: -1 } },
    { name: 'non-finite pressure', profile: { ...VALID_PROFILE, pressureCost: Number.NaN } },
    { name: 'fractional readability', profile: { ...VALID_PROFILE, readabilityCost: 0.5 } },
    {
      name: 'non-finite readability',
      profile: { ...VALID_PROFILE, readabilityCost: Number.POSITIVE_INFINITY },
    },
    {
      name: 'cost above prototype range',
      profile: { ...VALID_PROFILE, pressureCost: MAX_PROTOTYPE_ENCOUNTER_COST + 1 },
    },
  ])('rejects invalid numeric metadata: $name', ({ profile }) => {
    expect(() => createEncounterProfile(profile as EncounterProfile)).toThrow(RangeError);
  });

  it('rejects empty, unknown, or duplicate eligibility metadata', () => {
    expect(() => createEncounterProfile({ ...VALID_PROFILE, varietyFamilyId: ' family ' })).toThrow(
      TypeError,
    );
    expect(() => createEncounterProfile({ ...VALID_PROFILE, pacingIntensities: [] })).toThrow(
      RangeError,
    );
    expect(() =>
      createEncounterProfile({ ...VALID_PROFILE, pacingIntensities: ['low', 'low'] }),
    ).toThrow(TypeError);
    expect(() =>
      createEncounterProfile({ ...VALID_PROFILE, pacingIntensities: ['unknown' as 'low'] }),
    ).toThrow(TypeError);
    expect(() => createEncounterProfile({ ...VALID_PROFILE, behaviorTags: [] })).toThrow(
      RangeError,
    );
    expect(() =>
      createEncounterProfile({
        ...VALID_PROFILE,
        behaviorTags: ['static-barrier', 'static-barrier'],
      }),
    ).toThrow(TypeError);
    expect(() =>
      createEncounterProfile({ ...VALID_PROFILE, behaviorTags: ['unknown' as 'static-barrier'] }),
    ).toThrow(TypeError);
  });
});
