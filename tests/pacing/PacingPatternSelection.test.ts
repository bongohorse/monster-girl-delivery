import { describe, expect, it } from 'vitest';
import {
  calculateDifficulty,
  filterPatternsForDifficulty,
} from '../../src/difficulty/DifficultySystem';
import { createHazardPattern } from '../../src/generation/HazardPattern';
import { scheduleNextPattern } from '../../src/generation/PatternSpawnScheduler';
import { validatePattern } from '../../src/generation/PatternValidator';
import {
  PROTOTYPE_HAZARD_PATTERN_FIXTURES,
  PROTOTYPE_LINE_PATTERN,
} from '../../src/generation/PrototypeHazardPatternFixtures';
import { createRunGenerationState } from '../../src/generation/RunGenerationState';
import {
  createPacingPatternRequest,
  evaluatePatternPacingEligibility,
  filterPatternsForPacing,
} from '../../src/pacing/PacingPatternSelection';
import { calculatePacing, PROTOTYPE_PACING_CONFIG } from '../../src/pacing/PacingSystem';
import { TEST_ENCOUNTER_PROFILE } from '../support/TestEncounterProfile';

// Authored sparse content for headless pacing evidence; live catalog integration remains #120.
const BREATHER_PATTERN = createHazardPattern({
  id: 'pacing-sparse',
  runLength: 500,
  profile: TEST_ENCOUNTER_PROFILE,
  entries: [
    {
      id: 'sparse-1',
      type: 'placeholder-barrier',
      hitbox: { left: 200, right: 248, top: 160, bottom: 208 },
    },
  ],
});
const SECOND_BREATHER_PATTERN = createHazardPattern({
  ...BREATHER_PATTERN,
  id: 'pacing-sparse-alternative',
  runLength: 700,
});
const CATALOG = Object.freeze([
  ...PROTOTYPE_HAZARD_PATTERN_FIXTURES,
  BREATHER_PATTERN,
  SECOND_BREATHER_PATTERN,
]);

describe('pacing pattern selection', () => {
  it('explicitly requests lower entry counts and density in recovery, including at capped difficulty', () => {
    const difficulty = calculateDifficulty(14_200);
    const request = createPacingPatternRequest(calculatePacing(14_200));
    const allowed = filterPatternsForDifficulty(CATALOG, difficulty);

    expect(difficulty.capped).toBe(true);
    expect(request).toEqual({
      intensity: 'breather',
      maximumPatternEntries: 1,
      maximumHazardsPer1000Distance: 2,
      maximumRunLength: 1_400,
    });
    expect(filterPatternsForPacing(allowed, request)).toEqual([
      BREATHER_PATTERN,
      SECOND_BREATHER_PATTERN,
    ]);
    expect(evaluatePatternPacingEligibility(PROTOTYPE_LINE_PATTERN, request)).toEqual({
      eligible: false,
      hazardDensityPer1000Distance: 5,
      patternEntryCount: 3,
      reasons: ['pacing-entry-limit', 'pacing-density-limit'],
    });
    expect(validatePattern(BREATHER_PATTERN).valid).toBe(true);
  });

  it('accepts exact pressure/window limits and rejects patterns crossing the next phase', () => {
    const exact = createPacingPatternRequest(calculatePacing(900));
    expect(evaluatePatternPacingEligibility(BREATHER_PATTERN, exact).eligible).toBe(true);
    const tooLate = createPacingPatternRequest(calculatePacing(900.001));
    expect(evaluatePatternPacingEligibility(BREATHER_PATTERN, tooLate).reasons).toEqual([
      'pacing-window-limit',
    ]);

    // A high-pressure candidate cannot spill from peak into the guaranteed breather.
    const peak = createPacingPatternRequest(calculatePacing(6_501));
    expect(evaluatePatternPacingEligibility(PROTOTYPE_LINE_PATTERN, peak).reasons).toEqual([
      'pacing-window-limit',
    ]);
    expect(
      filterPatternsForPacing(CATALOG, createPacingPatternRequest(calculatePacing(7_099))),
    ).toEqual([]);
  });

  it('does not silently relax recovery limits when the catalog has no sparse content', () => {
    expect(
      filterPatternsForPacing(
        PROTOTYPE_HAZARD_PATTERN_FIXTURES,
        createPacingPatternRequest(calculatePacing(0)),
      ),
    ).toEqual([]);
  });

  it('preserves difficulty restrictions even during peak pressure', () => {
    const peak = createPacingPatternRequest(calculatePacing(6_400));
    const strictDifficulty = {
      ...calculateDifficulty(0),
      maximumPatternEntries: 1,
      maximumHazardsPer1000Distance: 2,
    };
    expect(
      filterPatternsForPacing(filterPatternsForDifficulty(CATALOG, strictDifficulty), peak),
    ).toEqual([BREATHER_PATTERN, SECOND_BREATHER_PATTERN]);
  });

  it('keeps unsafe geometry subject to scheduler rejection even when pacing eligibility passes', () => {
    const blocked = createHazardPattern({
      ...BREATHER_PATTERN,
      id: 'blocked-sparse',
      entries: [
        {
          id: 'wall',
          type: 'placeholder-barrier',
          hitbox: { left: 200, right: 248, top: 48, bottom: 342 },
        },
      ],
    });
    const catalog = filterPatternsForPacing(
      [blocked],
      createPacingPatternRequest(calculatePacing(0)),
    );
    expect(catalog).toEqual([blocked]);
    const schedule = scheduleNextPattern({
      catalog,
      patternStartDistance: 0,
      state: createRunGenerationState('blocked-pacing'),
    });
    expect(schedule.status).toBe('exhausted');
    expect(
      schedule.rejections.every((rejection) =>
        rejection.issues.some((issue) => issue.code === 'vertical-route-blocked'),
      ),
    ).toBe(true);
  });

  it.each(['pacing-replay', 42, 0])(
    'replays pacing and validated encounters from seed %s',
    (seed) => {
      const replay = () => {
        let state = createRunGenerationState(seed);
        let distance = 0;
        const trace = [];

        for (let cycle = 0; cycle < 20; cycle += 1) {
          for (const phase of PROTOTYPE_PACING_CONFIG.phases) {
            const pacing = calculatePacing(distance);
            const catalog = filterPatternsForPacing(
              filterPatternsForDifficulty(CATALOG, calculateDifficulty(distance)),
              createPacingPatternRequest(pacing),
            );
            const schedule = scheduleNextPattern({
              catalog,
              patternStartDistance: distance,
              state,
            });
            expect(schedule.status).toBe('accepted');
            if (schedule.status !== 'accepted')
              throw new Error('Expected eligible validated content.');
            expect(schedule.nextPatternStartDistance).toBeLessThanOrEqual(pacing.phaseEndDistance);
            if (pacing.intensity === 'breather') {
              expect(schedule.spawns).toHaveLength(1);
              expect([BREATHER_PATTERN.id, SECOND_BREATHER_PATTERN.id]).toContain(
                schedule.patternId,
              );
            }
            trace.push({ pacing, schedule });
            state = schedule.state;
            distance += phase.distanceLength;
          }
        }
        return trace;
      };
      expect(replay()).toEqual(replay());
    },
  );

  it('returns immutable requests, catalog views and rejection details', () => {
    const request = createPacingPatternRequest(calculatePacing(0));
    const candidates = filterPatternsForPacing(CATALOG, request);
    const eligibility = evaluatePatternPacingEligibility(PROTOTYPE_LINE_PATTERN, request);
    expect(Object.isFrozen(request)).toBe(true);
    expect(Object.isFrozen(candidates)).toBe(true);
    expect(Object.isFrozen(eligibility)).toBe(true);
    expect(Object.isFrozen(eligibility.reasons)).toBe(true);
  });

  it('rejects malformed request limits and non-finite density', () => {
    const request = createPacingPatternRequest(calculatePacing(0));
    for (const maximumRunLength of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() =>
        evaluatePatternPacingEligibility(BREATHER_PATTERN, { ...request, maximumRunLength }),
      ).toThrow(RangeError);
    }
    expect(() =>
      evaluatePatternPacingEligibility(BREATHER_PATTERN, { ...request, maximumPatternEntries: 0 }),
    ).toThrow(RangeError);
    expect(() =>
      evaluatePatternPacingEligibility(BREATHER_PATTERN, {
        ...request,
        maximumHazardsPer1000Distance: Number.NaN,
      }),
    ).toThrow(RangeError);
    expect(() =>
      evaluatePatternPacingEligibility(
        { ...BREATHER_PATTERN, runLength: Number.MIN_VALUE },
        request,
      ),
    ).toThrow(RangeError);
  });
});
