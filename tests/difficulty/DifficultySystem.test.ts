import { describe, expect, it } from 'vitest';
import { PROTOTYPE_FLIGHT_TUNING_DEFAULTS } from '../../src/config/FlightTuningConfig';
import {
  calculateDifficulty,
  createDifficultyPatternValidationConstraints,
  createDifficultyReactionTimeConstraint,
  evaluatePatternDifficultyEligibility,
  filterPatternsForDifficulty,
  PROTOTYPE_DIFFICULTY_CONFIG,
  scaleFlightTuningForDifficulty,
  scaleRunMotionForDifficulty,
} from '../../src/difficulty/DifficultySystem';
import { PROTOTYPE_PATTERN_REACHABILITY_CONTEXT } from '../../src/generation/FlightReachability';
import { createHazardPattern } from '../../src/generation/HazardPattern';
import { scheduleNextPattern } from '../../src/generation/PatternSpawnScheduler';
import { PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS } from '../../src/generation/PatternValidator';
import {
  PROTOTYPE_HAZARD_PATTERN_FIXTURES,
  PROTOTYPE_LINE_PATTERN,
} from '../../src/generation/PrototypeHazardPatternFixtures';
import { createRunGenerationState } from '../../src/generation/RunGenerationState';
import { TEST_ENCOUNTER_PROFILE } from '../support/TestEncounterProfile';

const COMPLEX_PATTERN = createHazardPattern({
  id: 'difficulty-complex',
  runLength: 1_000,
  profile: TEST_ENCOUNTER_PROFILE,
  entries: [
    {
      id: 'entry-1',
      type: 'placeholder-barrier',
      hitbox: { left: 40, right: 80, top: 160, bottom: 208 },
    },
    {
      id: 'entry-2',
      type: 'placeholder-barrier',
      hitbox: { left: 200, right: 240, top: 160, bottom: 208 },
    },
    {
      id: 'entry-3',
      type: 'placeholder-barrier',
      hitbox: { left: 360, right: 400, top: 160, bottom: 208 },
    },
    {
      id: 'entry-4',
      type: 'placeholder-barrier',
      hitbox: { left: 520, right: 560, top: 160, bottom: 208 },
    },
    {
      id: 'entry-5',
      type: 'placeholder-barrier',
      hitbox: { left: 680, right: 720, top: 160, bottom: 208 },
    },
    {
      id: 'entry-6',
      type: 'placeholder-barrier',
      hitbox: { left: 840, right: 880, top: 160, bottom: 208 },
    },
  ],
});

const DENSE_PATTERN = createHazardPattern({
  id: 'difficulty-dense',
  runLength: 100,
  profile: TEST_ENCOUNTER_PROFILE,
  entries: [
    {
      id: 'dense-1',
      type: 'placeholder-barrier',
      hitbox: { left: 0, right: 10, top: 160, bottom: 208 },
    },
    {
      id: 'dense-2',
      type: 'placeholder-barrier',
      hitbox: { left: 20, right: 30, top: 160, bottom: 208 },
    },
    {
      id: 'dense-3',
      type: 'placeholder-barrier',
      hitbox: { left: 40, right: 50, top: 160, bottom: 208 },
    },
    {
      id: 'dense-4',
      type: 'placeholder-barrier',
      hitbox: { left: 60, right: 70, top: 160, bottom: 208 },
    },
  ],
});

const copyPrototypeTiers = () => PROTOTYPE_DIFFICULTY_CONFIG.tiers.map((tier) => ({ ...tier }));

describe('difficulty system', () => {
  it.each([
    { runDistance: 0, tierIndex: 0, nextTierStartDistance: 3_000 },
    { runDistance: 2_999.999, tierIndex: 0, nextTierStartDistance: 3_000 },
    { runDistance: 3_000, tierIndex: 1, nextTierStartDistance: 7_000 },
    { runDistance: 6_999.999, tierIndex: 1, nextTierStartDistance: 7_000 },
    { runDistance: 7_000, tierIndex: 2, nextTierStartDistance: 12_000 },
    { runDistance: 11_999.999, tierIndex: 2, nextTierStartDistance: 12_000 },
    { runDistance: 12_000, tierIndex: 3, nextTierStartDistance: 18_000 },
    { runDistance: 17_999.999, tierIndex: 3, nextTierStartDistance: 18_000 },
    { runDistance: 18_000, tierIndex: 4, nextTierStartDistance: 26_000 },
    { runDistance: 25_999.999, tierIndex: 4, nextTierStartDistance: 26_000 },
    { runDistance: 26_000, tierIndex: 5, nextTierStartDistance: null },
  ])(
    'selects tier $tierIndex at representative distance $runDistance',
    ({ runDistance, tierIndex, nextTierStartDistance }) => {
      const snapshot = calculateDifficulty(runDistance);

      expect(snapshot).toMatchObject({
        runDistance,
        tierId: `tier-${tierIndex}`,
        tierIndex,
        nextTierStartDistance,
      });
    },
  );

  it('progresses every prototype challenge parameter in its intended monotonic direction', () => {
    const snapshots = PROTOTYPE_DIFFICULTY_CONFIG.tiers.map((tier) =>
      calculateDifficulty(tier.startDistance),
    );

    for (let index = 1; index < snapshots.length; index += 1) {
      const previous = snapshots[index - 1];
      const current = snapshots[index];

      expect(previous).toBeDefined();
      expect(current).toBeDefined();
      if (!previous || !current) {
        throw new Error('Expected adjacent prototype difficulty snapshots.');
      }

      expect(current.scrollSpeedMultiplier).toBeGreaterThanOrEqual(previous.scrollSpeedMultiplier);
      expect(current.maximumPatternEntries).toBeGreaterThanOrEqual(previous.maximumPatternEntries);
      expect(current.maximumHazardsPer1000Distance).toBeGreaterThanOrEqual(
        previous.maximumHazardsPer1000Distance,
      );
      expect(current.minimumReactionTimeSeconds).toBeLessThanOrEqual(
        previous.minimumReactionTimeSeconds,
      );
      expect(current.minimumReactionSpacing).toBeLessThanOrEqual(previous.minimumReactionSpacing);
      expect(current.minimumVerticalCorridor).toBeLessThanOrEqual(previous.minimumVerticalCorridor);
      expect(
        current.scrollSpeedMultiplier > previous.scrollSpeedMultiplier ||
          current.maximumPatternEntries > previous.maximumPatternEntries ||
          current.maximumHazardsPer1000Distance > previous.maximumHazardsPer1000Distance ||
          current.minimumReactionTimeSeconds < previous.minimumReactionTimeSeconds ||
          current.minimumReactionSpacing < previous.minimumReactionSpacing ||
          current.minimumVerticalCorridor < previous.minimumVerticalCorridor,
      ).toBe(true);
    }
  });

  it('caps progression explicitly at the final prototype tier', () => {
    const atCap = calculateDifficulty(26_000);
    const farBeyondCap = calculateDifficulty(Number.MAX_SAFE_INTEGER);

    expect(atCap).toMatchObject({ capped: true, nextTierStartDistance: null, tierIndex: 5 });
    expect(farBeyondCap).toMatchObject({ capped: true, nextTierStartDistance: null, tierIndex: 5 });
    expect({ ...farBeyondCap, runDistance: atCap.runDistance }).toEqual(atCap);
  });

  it('adapts one snapshot for speed, flight authority, reaction timing, and validator constraints', () => {
    const difficulty = calculateDifficulty(7_000);

    expect(scaleRunMotionForDifficulty({ baseScrollSpeed: 350 }, difficulty)).toEqual({
      baseScrollSpeed: 437.5,
    });
    const effectiveFlight = scaleFlightTuningForDifficulty(
      PROTOTYPE_FLIGHT_TUNING_DEFAULTS,
      difficulty,
    );
    expect(effectiveFlight.gravity).toBeCloseTo(1_760, 10);
    expect(effectiveFlight.thrust).toBeCloseTo(2_860, 10);
    expect(effectiveFlight.maxFallVelocity).toBeCloseTo(787.5, 10);
    expect(effectiveFlight.maxRiseVelocity).toBeCloseTo(618.75, 10);
    expect(createDifficultyReactionTimeConstraint(difficulty)).toEqual({
      minimumReactionTimeSeconds: 1.9,
    });
    expect(
      createDifficultyPatternValidationConstraints(difficulty, {
        ...PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS,
        playableTop: 40,
        playableBottom: 350,
      }),
    ).toEqual({
      minimumReactionSpacing: 94,
      minimumVerticalCorridor: 94,
      playableTop: 40,
      playableBottom: 350,
    });
  });

  it('keeps late-run flight response deliberately below world-speed growth', () => {
    const tierFour = calculateDifficulty(18_000);
    const capped = calculateDifficulty(26_000);

    expect(tierFour.scrollSpeedMultiplier).toBe(1.5);
    expect(scaleFlightTuningForDifficulty(PROTOTYPE_FLIGHT_TUNING_DEFAULTS, tierFour)).toEqual({
      gravity: 1_920,
      thrust: 3_120,
      maxFallVelocity: 875,
      maxRiseVelocity: 687.5,
    });

    expect(capped.scrollSpeedMultiplier).toBe(1.6);
    expect(scaleFlightTuningForDifficulty(PROTOTYPE_FLIGHT_TUNING_DEFAULTS, capped)).toEqual({
      gravity: 1_984,
      thrust: 3_224,
      maxFallVelocity: 910,
      maxRiseVelocity: 715,
    });
  });

  it('returns structured pattern eligibility from entry and density limits', () => {
    const introductory = calculateDifficulty(0);
    const capped = calculateDifficulty(26_000);

    expect(evaluatePatternDifficultyEligibility(COMPLEX_PATTERN, introductory)).toEqual({
      eligible: false,
      hazardDensityPer1000Distance: 6,
      patternEntryCount: 6,
      reasons: ['pattern-entry-limit', 'pattern-density-limit'],
    });
    expect(evaluatePatternDifficultyEligibility(COMPLEX_PATTERN, capped)).toEqual({
      eligible: false,
      hazardDensityPer1000Distance: 6,
      patternEntryCount: 6,
      reasons: ['pattern-entry-limit'],
    });
    expect(evaluatePatternDifficultyEligibility(DENSE_PATTERN, capped)).toMatchObject({
      eligible: false,
      hazardDensityPer1000Distance: 40,
      reasons: ['pattern-density-limit'],
    });
    expect(
      filterPatternsForDifficulty([PROTOTYPE_LINE_PATTERN, COMPLEX_PATTERN], introductory),
    ).toEqual([PROTOTYPE_LINE_PATTERN]);
    expect(filterPatternsForDifficulty([PROTOTYPE_LINE_PATTERN, COMPLEX_PATTERN], capped)).toEqual([
      PROTOTYPE_LINE_PATTERN,
    ]);
  });

  it('preserves seeded generation for the same explicit difficulty inputs', () => {
    const difficulty = calculateDifficulty(7_000);
    const catalog = filterPatternsForDifficulty(PROTOTYPE_HAZARD_PATTERN_FIXTURES, difficulty);
    const constraints = createDifficultyPatternValidationConstraints(difficulty);
    const reachability = {
      ...PROTOTYPE_PATTERN_REACHABILITY_CONTEXT,
      availableReactionTimeSeconds: difficulty.minimumReactionTimeSeconds,
    };
    const first = scheduleNextPattern({
      catalog,
      constraints,
      patternStartDistance: 8_000,
      reachability,
      state: createRunGenerationState('difficulty-replay'),
    });
    const repeated = scheduleNextPattern({
      catalog,
      constraints,
      patternStartDistance: 8_000,
      reachability,
      state: createRunGenerationState('difficulty-replay'),
    });

    expect(repeated).toEqual(first);
  });

  it('is deterministic, deeply immutable, viewport-independent, and separate from pacing', () => {
    const narrowLandscape = { width: 640, height: 360 };
    const wideLandscape = { width: 1_280, height: 540 };
    const first = calculateDifficulty(4_000);
    const repeated = calculateDifficulty(4_000);

    expect(narrowLandscape.width).not.toBe(wideLandscape.width);
    expect(repeated).toEqual(first);
    expect(Object.isFrozen(PROTOTYPE_DIFFICULTY_CONFIG)).toBe(true);
    expect(Object.isFrozen(PROTOTYPE_DIFFICULTY_CONFIG.tiers)).toBe(true);
    expect(PROTOTYPE_DIFFICULTY_CONFIG.tiers.every(Object.isFrozen)).toBe(true);
    expect(Object.isFrozen(first)).toBe(true);
    expect(first).not.toHaveProperty('intensity');
    expect(first).not.toHaveProperty('pacing');
    expect(first).not.toHaveProperty('viewport');
    expect(first).not.toHaveProperty('wallClockTime');
    expect(JSON.stringify(first)).not.toMatch(/viewport|screen|fps|wallClock/i);
  });

  it('rejects malformed configuration and invalid run distance', () => {
    expect(() => calculateDifficulty(-1)).toThrow(RangeError);
    expect(() => calculateDifficulty(Number.NaN)).toThrow(RangeError);
    expect(() => calculateDifficulty(0, { tiers: [] })).toThrow(RangeError);

    const invalidConfigs = [
      (() => {
        const tiers = copyPrototypeTiers();
        if (tiers[0]) tiers[0].startDistance = 1;
        return { tiers };
      })(),
      (() => {
        const tiers = copyPrototypeTiers();
        if (tiers[1]) tiers[1].startDistance = 0;
        return { tiers };
      })(),
      (() => {
        const tiers = copyPrototypeTiers();
        if (tiers[1] && tiers[0]) tiers[1].id = tiers[0].id;
        return { tiers };
      })(),
      (() => {
        const tiers = copyPrototypeTiers();
        if (tiers[1]) tiers[1].scrollSpeedMultiplier = 0.5;
        return { tiers };
      })(),
      (() => {
        const tiers = copyPrototypeTiers();
        if (tiers[1]) tiers[1].minimumReactionTimeSeconds = 2.1;
        return { tiers };
      })(),
      (() => {
        const tiers = copyPrototypeTiers();
        if (tiers[1]) tiers[1].minimumReactionSpacing = 97;
        return { tiers };
      })(),
      (() => {
        const tiers = copyPrototypeTiers();
        if (tiers[1]) tiers[1].minimumVerticalCorridor = 97;
        return { tiers };
      })(),
      (() => {
        const tiers = copyPrototypeTiers();
        if (tiers[1]) tiers[1].maximumPatternEntries = 0;
        return { tiers };
      })(),
      (() => {
        const tiers = copyPrototypeTiers();
        if (tiers[1]) tiers[1].maximumPatternEntries = 2;
        return { tiers };
      })(),
      (() => {
        const tiers = copyPrototypeTiers();
        if (tiers[1]) tiers[1].maximumHazardsPer1000Distance = 4;
        return { tiers };
      })(),
      (() => {
        const tiers = copyPrototypeTiers();
        if (tiers[1]) tiers[1].maximumHazardsPer1000Distance = Number.POSITIVE_INFINITY;
        return { tiers };
      })(),
    ];

    for (const config of invalidConfigs) {
      expect(() => calculateDifficulty(0, config)).toThrow();
    }
  });
});
