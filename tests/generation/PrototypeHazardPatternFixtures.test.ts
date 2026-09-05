import { describe, expect, it } from 'vitest';
import {
  PROTOTYPE_CORRIDOR_PATTERN,
  PROTOTYPE_HAZARD_PATTERN_FIXTURES,
  PROTOTYPE_LINE_PATTERN,
  PROTOTYPE_OFFSET_PAIR_PATTERN,
} from '../../src/generation/PrototypeHazardPatternFixtures';

describe('prototype hazard pattern fixtures', () => {
  it('provides three immutable example patterns in stable catalog order', () => {
    expect(PROTOTYPE_HAZARD_PATTERN_FIXTURES).toEqual([
      PROTOTYPE_LINE_PATTERN,
      PROTOTYPE_CORRIDOR_PATTERN,
      PROTOTYPE_OFFSET_PAIR_PATTERN,
    ]);
    expect(PROTOTYPE_HAZARD_PATTERN_FIXTURES.map((pattern) => pattern.id)).toEqual([
      'prototype-line',
      'prototype-corridor',
      'prototype-offset-pair',
    ]);
    expect(Object.isFrozen(PROTOTYPE_HAZARD_PATTERN_FIXTURES)).toBe(true);
    expect(
      PROTOTYPE_HAZARD_PATTERN_FIXTURES.every((pattern) => Object.isFrozen(pattern.profile)),
    ).toBe(true);
  });

  it('assigns explicit PROTOTYPE policy profiles to every catalog entry', () => {
    expect(PROTOTYPE_HAZARD_PATTERN_FIXTURES.map((pattern) => pattern.profile)).toEqual([
      {
        behaviorTags: ['static-barrier'],
        difficultyTierRange: { minimumTierIndex: 0, maximumTierIndex: null },
        pacingIntensities: ['medium', 'high', 'peak'],
        pressureCost: 3,
        readabilityCost: 2,
        varietyFamilyId: 'static-sequence',
      },
      {
        behaviorTags: ['static-barrier'],
        difficultyTierRange: { minimumTierIndex: 1, maximumTierIndex: null },
        pacingIntensities: ['medium', 'high', 'peak'],
        pressureCost: 2,
        readabilityCost: 2,
        varietyFamilyId: 'static-corridor',
      },
      {
        behaviorTags: ['static-barrier'],
        difficultyTierRange: { minimumTierIndex: 1, maximumTierIndex: null },
        pacingIntensities: ['low', 'medium', 'high', 'peak'],
        pressureCost: 2,
        readabilityCost: 2,
        varietyFamilyId: 'static-sequence',
      },
    ]);
    expect(
      new Set(PROTOTYPE_HAZARD_PATTERN_FIXTURES.map((pattern) => pattern.profile.varietyFamilyId))
        .size,
    ).toBe(2);
  });

  it('represents the line fixture with ordered logical run-distance offsets', () => {
    expect(PROTOTYPE_LINE_PATTERN.runLength).toBe(600);
    expect(PROTOTYPE_LINE_PATTERN.entries.map((entry) => entry.hitbox.left)).toEqual([
      120, 276, 432,
    ]);
    expect(PROTOTYPE_LINE_PATTERN.entries.map((entry) => entry.hitbox.top)).toEqual([
      160, 160, 160,
    ]);
  });

  it('represents the corridor fixture with a logical vertical gap', () => {
    expect(PROTOTYPE_CORRIDOR_PATTERN.entries).toHaveLength(2);
    expect(PROTOTYPE_CORRIDOR_PATTERN.entries.map((entry) => entry.hitbox)).toEqual([
      { left: 160, right: 208, top: 48, bottom: 132 },
      { left: 160, right: 208, top: 258, bottom: 342 },
    ]);
  });

  it('represents the offset-pair fixture without viewport metadata', () => {
    expect(PROTOTYPE_OFFSET_PAIR_PATTERN.entries.map((entry) => entry.hitbox)).toEqual([
      { left: 120, right: 168, top: 95, bottom: 167 },
      { left: 330, right: 378, top: 220, bottom: 292 },
    ]);
    expect(JSON.stringify(PROTOTYPE_OFFSET_PAIR_PATTERN)).not.toMatch(/viewport|screen|phaser/i);
  });
});
