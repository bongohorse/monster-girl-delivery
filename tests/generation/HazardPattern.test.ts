import { describe, expect, it } from 'vitest';
import {
  createHazardPattern,
  type HazardPattern,
  type HazardPatternEntry,
} from '../../src/generation/HazardPattern';
import { STATIC_GEOMETRIC_HAZARD_BEHAVIOR } from '../../src/hazards/HazardArchetype';
import { TEST_ENCOUNTER_PROFILE } from '../support/TestEncounterProfile';

const VALID_FIRST_ENTRY: Readonly<HazardPatternEntry> = Object.freeze({
  behavior: STATIC_GEOMETRIC_HAZARD_BEHAVIOR,
  id: 'first',
  type: 'placeholder-barrier',
  hitbox: Object.freeze({ left: 40, right: 88, top: 100, bottom: 180 }),
});

const VALID_SECOND_ENTRY: Readonly<HazardPatternEntry> = Object.freeze({
  behavior: STATIC_GEOMETRIC_HAZARD_BEHAVIOR,
  id: 'second',
  type: 'placeholder-barrier',
  hitbox: Object.freeze({ left: 240, right: 288, top: 210, bottom: 290 }),
});

const VALID_PATTERN: Readonly<HazardPattern> = Object.freeze({
  id: 'test-pattern',
  runLength: 500,
  entries: Object.freeze([VALID_FIRST_ENTRY, VALID_SECOND_ENTRY]),
  profile: TEST_ENCOUNTER_PROFILE,
});

describe('createHazardPattern', () => {
  it('constructs a deeply immutable Phaser-independent logical pattern', () => {
    const pattern = createHazardPattern(VALID_PATTERN);

    expect(pattern).toEqual(VALID_PATTERN);
    expect(Object.isFrozen(pattern)).toBe(true);
    expect(Object.isFrozen(pattern.entries)).toBe(true);
    expect(Object.isFrozen(pattern.entries[0])).toBe(true);
    expect(Object.isFrozen(pattern.entries[0]?.behavior)).toBe(true);
    expect(Object.isFrozen(pattern.entries[0]?.hitbox)).toBe(true);
  });

  it('preserves explicit moving behavior identity in the immutable pattern model', () => {
    const pattern = createHazardPattern({
      ...VALID_PATTERN,
      entries: [
        {
          ...VALID_FIRST_ENTRY,
          behavior: {
            amplitudeY: 48,
            archetype: 'geometric',
            cycleDistance: 400,
            kind: 'vertical-patrol',
            phaseOffset: 0.25,
          },
        },
      ],
    });

    expect(pattern.entries[0]?.behavior).toEqual({
      amplitudeY: 48,
      archetype: 'geometric',
      cycleDistance: 400,
      kind: 'vertical-patrol',
      phaseOffset: 0.25,
    });
    expect(JSON.stringify(pattern)).toContain('vertical-patrol');
  });

  it('preserves authored entry order and deterministic serialization', () => {
    const reversedDefinition = {
      ...VALID_PATTERN,
      entries: [VALID_SECOND_ENTRY, VALID_FIRST_ENTRY],
    };
    const first = createHazardPattern(reversedDefinition);
    const repeated = createHazardPattern(reversedDefinition);

    expect(first.entries.map((entry) => entry.id)).toEqual(['second', 'first']);
    expect(JSON.stringify(first)).toBe(JSON.stringify(repeated));
  });

  it('snapshots input data without mutation or retained mutable geometry', () => {
    const mutableHitbox = { left: 50, right: 100, top: 80, bottom: 140 };
    const mutableDefinition = {
      id: 'mutable-source',
      runLength: 300,
      profile: {
        ...TEST_ENCOUNTER_PROFILE,
        behaviorTags: [...TEST_ENCOUNTER_PROFILE.behaviorTags],
        difficultyTierRange: { ...TEST_ENCOUNTER_PROFILE.difficultyTierRange },
        pacingIntensities: [...TEST_ENCOUNTER_PROFILE.pacingIntensities],
      },
      entries: [
        {
          id: 'entry',
          type: 'placeholder-barrier' as const,
          hitbox: mutableHitbox,
        },
      ],
    };
    const original = structuredClone(mutableDefinition);
    const pattern = createHazardPattern(mutableDefinition);

    expect(mutableDefinition).toEqual(original);
    mutableHitbox.left = 75;
    mutableDefinition.profile.pacingIntensities.length = 0;

    expect(pattern.entries[0]?.hitbox.left).toBe(50);
    expect(pattern.profile.pacingIntensities).toEqual([
      'breather',
      'low',
      'medium',
      'high',
      'peak',
    ]);
  });

  it('rejects non-positive or non-finite pattern run lengths', () => {
    for (const runLength of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => createHazardPattern({ ...VALID_PATTERN, runLength })).toThrow(RangeError);
    }
  });

  it('rejects non-finite hitbox coordinates', () => {
    for (const coordinate of ['left', 'right', 'top', 'bottom'] as const) {
      expect(() =>
        createHazardPattern({
          ...VALID_PATTERN,
          entries: [
            {
              ...VALID_FIRST_ENTRY,
              hitbox: { ...VALID_FIRST_ENTRY.hitbox, [coordinate]: Number.NaN },
            },
          ],
        }),
      ).toThrow(RangeError);
    }
  });

  it('rejects zero-area, negative-offset, and out-of-span hitboxes', () => {
    const invalidHitboxes = [
      { left: 40, right: 40, top: 100, bottom: 180 },
      { left: 40, right: 88, top: 100, bottom: 100 },
      { left: -1, right: 40, top: 100, bottom: 180 },
      { left: 480, right: 501, top: 100, bottom: 180 },
    ];

    for (const hitbox of invalidHitboxes) {
      expect(() =>
        createHazardPattern({
          ...VALID_PATTERN,
          entries: [{ ...VALID_FIRST_ENTRY, hitbox }],
        }),
      ).toThrow(RangeError);
    }
  });

  it('rejects empty patterns and invalid or duplicate identities', () => {
    expect(() => createHazardPattern({ ...VALID_PATTERN, entries: [] })).toThrow(RangeError);
    expect(() => createHazardPattern({ ...VALID_PATTERN, id: '   ' })).toThrow(TypeError);
    expect(() =>
      createHazardPattern({
        ...VALID_PATTERN,
        entries: [{ ...VALID_FIRST_ENTRY, id: '   ' }],
      }),
    ).toThrow(TypeError);
    expect(() =>
      createHazardPattern({
        ...VALID_PATTERN,
        entries: [VALID_FIRST_ENTRY, VALID_FIRST_ENTRY],
      }),
    ).toThrow(TypeError);
  });
});
