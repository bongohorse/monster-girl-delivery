import { describe, expect, it } from 'vitest';
import { createHazardPattern, type HazardPatternEntry } from '../../src/generation/HazardPattern';
import {
  PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS,
  validatePattern,
} from '../../src/generation/PatternValidator';
import {
  PROTOTYPE_CORRIDOR_PATTERN,
  PROTOTYPE_HAZARD_PATTERN_FIXTURES,
} from '../../src/generation/PrototypeHazardPatternFixtures';

const createEntry = (
  id: string,
  left: number,
  right: number,
  top: number,
  bottom: number,
): Readonly<HazardPatternEntry> => ({
  id,
  type: 'placeholder-barrier',
  hitbox: { left, right, top, bottom },
});

describe('validatePattern', () => {
  it('accepts the representative prototype fixtures under default constraints', () => {
    for (const pattern of PROTOTYPE_HAZARD_PATTERN_FIXTURES) {
      expect(validatePattern(pattern)).toEqual({ valid: true, issues: [] });
    }
  });

  it('rejects a vertical corridor below the prototype minimum with a structured reason', () => {
    const pattern = createHazardPattern({
      id: 'too-narrow',
      runLength: 300,
      entries: [createEntry('top', 100, 148, 48, 180), createEntry('bottom', 100, 148, 270, 342)],
    });

    expect(validatePattern(pattern)).toEqual({
      valid: false,
      issues: [
        {
          actual: 90,
          code: 'vertical-corridor-too-narrow',
          entryIds: ['top', 'bottom'],
          required: 96,
          runStart: 100,
          runEnd: 148,
        },
      ],
    });
  });

  it('rejects overlapping barriers that completely block the logical vertical route', () => {
    const pattern = createHazardPattern({
      id: 'blocked-route',
      runLength: 300,
      entries: [createEntry('top', 100, 148, 48, 220), createEntry('bottom', 100, 148, 200, 342)],
    });

    expect(validatePattern(pattern)).toEqual({
      valid: false,
      issues: [
        {
          actual: 0,
          code: 'vertical-route-blocked',
          entryIds: ['top', 'bottom'],
          required: 96,
          runStart: 100,
          runEnd: 148,
        },
      ],
    });
  });

  it('rejects insufficient logical reaction spacing between encounter groups', () => {
    const pattern = createHazardPattern({
      id: 'too-close',
      runLength: 400,
      entries: [createEntry('first', 60, 108, 160, 208), createEntry('second', 200, 248, 160, 208)],
    });

    expect(validatePattern(pattern)).toEqual({
      valid: false,
      issues: [
        {
          actual: 92,
          code: 'insufficient-reaction-spacing',
          entryIds: ['first', 'second'],
          required: 96,
          runStart: 108,
          runEnd: 200,
        },
      ],
    });
  });

  it('accepts exact minimum corridor and reaction-spacing boundaries', () => {
    const pattern = createHazardPattern({
      id: 'exact-minimums',
      runLength: 400,
      entries: [
        createEntry('top', 100, 148, 48, 171),
        createEntry('bottom', 100, 148, 267, 342),
        createEntry('next', 244, 292, 160, 208),
      ],
    });

    expect(validatePattern(pattern)).toEqual({ valid: true, issues: [] });
  });

  it('uses explicit configurable prototype values without changing the pattern', () => {
    const originalPattern = JSON.stringify(PROTOTYPE_CORRIDOR_PATTERN);
    const exactMinimum = validatePattern(PROTOTYPE_CORRIDOR_PATTERN, {
      ...PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS,
      minimumVerticalCorridor: 126,
    });
    const stricterMinimum = validatePattern(PROTOTYPE_CORRIDOR_PATTERN, {
      ...PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS,
      minimumVerticalCorridor: 127,
    });

    expect(exactMinimum).toEqual({ valid: true, issues: [] });
    expect(stricterMinimum.valid).toBe(false);
    expect(stricterMinimum.issues[0]?.code).toBe('vertical-corridor-too-narrow');
    expect(JSON.stringify(PROTOTYPE_CORRIDOR_PATTERN)).toBe(originalPattern);
  });

  it('returns deterministic deeply immutable validation results', () => {
    const first = validatePattern(PROTOTYPE_CORRIDOR_PATTERN);
    const repeated = validatePattern(PROTOTYPE_CORRIDOR_PATTERN);

    expect(repeated).toEqual(first);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.issues)).toBe(true);
  });

  it('rejects invalid constraint values explicitly', () => {
    const invalidConstraints = [
      { ...PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS, playableBottom: 48 },
      { ...PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS, playableTop: Number.NaN },
      { ...PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS, minimumVerticalCorridor: 0 },
      { ...PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS, minimumVerticalCorridor: 295 },
      { ...PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS, minimumReactionSpacing: -1 },
      {
        ...PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS,
        minimumReactionSpacing: Number.POSITIVE_INFINITY,
      },
    ];

    for (const constraints of invalidConstraints) {
      expect(() => validatePattern(PROTOTYPE_CORRIDOR_PATTERN, constraints)).toThrow(RangeError);
    }
  });
});
