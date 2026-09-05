import { describe, expect, it } from 'vitest';
import { PROTOTYPE_PATTERN_REACHABILITY_CONTEXT } from '../../src/generation/FlightReachability';
import { createHazardPattern, type HazardPatternEntry } from '../../src/generation/HazardPattern';
import {
  PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS,
  validatePattern,
} from '../../src/generation/PatternValidator';
import {
  PROTOTYPE_CORRIDOR_PATTERN,
  PROTOTYPE_HAZARD_PATTERN_FIXTURES,
} from '../../src/generation/PrototypeHazardPatternFixtures';
import { TEST_ENCOUNTER_PROFILE } from '../support/TestEncounterProfile';

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
      profile: TEST_ENCOUNTER_PROFILE,
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
      profile: TEST_ENCOUNTER_PROFILE,
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
      profile: TEST_ENCOUNTER_PROFILE,
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
      profile: TEST_ENCOUNTER_PROFILE,
      entries: [
        createEntry('top', 100, 148, 48, 171),
        createEntry('bottom', 100, 148, 267, 342),
        createEntry('next', 244, 292, 160, 208),
      ],
    });

    expect(validatePattern(pattern)).toEqual({ valid: true, issues: [] });
  });

  it('uses initial vertical velocity to accept or reject an otherwise open upward corridor', () => {
    const upwardCorridor = createHazardPattern({
      id: 'upward-corridor',
      runLength: 300,
      profile: TEST_ENCOUNTER_PROFILE,
      entries: [createEntry('lower-wall', 100, 148, 180, 342)],
    });
    const baseReachability = {
      ...PROTOTYPE_PATTERN_REACHABILITY_CONTEXT,
      availableReactionTimeSeconds: 0.1,
    };
    const reachable = validatePattern(upwardCorridor, PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS, {
      ...baseReachability,
      flightState: { positionY: 200, velocityY: -550 },
    });
    const unreachable = validatePattern(upwardCorridor, PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS, {
      ...baseReachability,
      flightState: { positionY: 200, velocityY: 650 },
    });

    expect(reachable).toEqual({ valid: true, issues: [] });
    expect(unreachable.valid).toBe(false);
    expect(unreachable.issues).toHaveLength(1);
    expect(unreachable.issues[0]).toMatchObject({
      code: 'vertical-corridor-unreachable',
      entryIds: ['lower-wall'],
      reachability: {
        availableReactionTimeSeconds: 0.1,
        failureReason: 'safe-corridor-above-reachable-envelope',
        reachable: false,
        reachableCenterRange: { top: 261, bottom: 265 },
        targetCenterRanges: [{ top: 72, bottom: 156 }],
      },
      runStart: 100,
      runEnd: 148,
    });
  });

  it('accepts a reachable downward corridor under the same physics-aware rule', () => {
    const downwardCorridor = createHazardPattern({
      id: 'downward-corridor',
      runLength: 300,
      profile: TEST_ENCOUNTER_PROFILE,
      entries: [createEntry('upper-wall', 100, 148, 48, 200)],
    });

    expect(
      validatePattern(downwardCorridor, PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS, {
        ...PROTOTYPE_PATTERN_REACHABILITY_CONTEXT,
        availableReactionTimeSeconds: 0.1,
        flightState: { positionY: 200, velocityY: 650 },
      }),
    ).toEqual({ valid: true, issues: [] });
  });

  it('does not let a reachable undersized gap rescue an unreachable eligible corridor', () => {
    const pattern = createHazardPattern({
      id: 'narrow-alternative',
      runLength: 300,
      profile: TEST_ENCOUNTER_PROFILE,
      entries: [createEntry('middle-wall', 100, 148, 180, 300)],
    });
    const result = validatePattern(pattern, PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS, {
      ...PROTOTYPE_PATTERN_REACHABILITY_CONTEXT,
      availableReactionTimeSeconds: 0.1,
      flightState: { positionY: 300, velocityY: 650 },
      playerExtents: { left: 0, right: 0, top: 0, bottom: 0 },
    });

    expect(result.valid).toBe(false);
    expect(result.issues[0]).toMatchObject({
      code: 'vertical-corridor-unreachable',
      reachability: {
        failureReason: 'safe-corridor-above-reachable-envelope',
        targetCenterRanges: [{ top: 48, bottom: 180 }],
      },
    });
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
