import { describe, expect, it } from 'vitest';
import { TimeService } from '../../src/core/TimeService';
import {
  createEncounterReadabilityBudgetConfig,
  createEncounterReadabilityBudgetState,
  createEncounterReadabilityCandidate,
  type EncounterReadabilityLimits,
  type EncounterReadabilityTiming,
  PROTOTYPE_ENCOUNTER_READABILITY_BUDGET_CONFIG,
  reserveEncounterReadabilityBudget,
  resolveEncounterReadabilityLimits,
  stepEncounterReadabilityBudget,
} from '../../src/generation/EncounterReadabilityBudget';
import { createHazardPattern, type HazardPattern } from '../../src/generation/HazardPattern';
import { scheduleNextPattern } from '../../src/generation/PatternSpawnScheduler';
import {
  PROTOTYPE_TARGET_LOCK_STRIKE_PATTERN,
  PROTOTYPE_TIMED_PULSE_PATTERN,
} from '../../src/generation/PrototypeHazardPatternFixtures';
import { createRunGenerationState } from '../../src/generation/RunGenerationState';
import { TEST_ENCOUNTER_PROFILE } from '../support/TestEncounterProfile';

const createStaticPattern = (
  id: string,
  pressureCost = 1,
  readabilityCost = 1,
): Readonly<HazardPattern> =>
  createHazardPattern({
    id,
    runLength: 400,
    profile: {
      ...TEST_ENCOUNTER_PROFILE,
      pressureCost,
      readabilityCost,
      varietyFamilyId: id,
    },
    entries: [
      {
        id: `${id}-entry`,
        type: 'placeholder-barrier',
        hitbox: { left: 100, right: 148, top: 160, bottom: 208 },
      },
    ],
  });

const createTiming = (
  activeEndSeconds: number,
  lethalWindows: ReadonlyArray<Readonly<{ startSeconds: number; endSeconds: number }>> = [],
  warningWindows: ReadonlyArray<Readonly<{ startSeconds: number; endSeconds: number }>> = [],
): Readonly<EncounterReadabilityTiming> => ({
  activeWindow: { startSeconds: 0, endSeconds: activeEndSeconds },
  lethalWindows,
  warningWindows,
});

const createTimedPulseCandidate = (
  pattern = PROTOTYPE_TIMED_PULSE_PATTERN,
  encounterId = pattern.id,
) =>
  createEncounterReadabilityCandidate(
    pattern,
    encounterId,
    createTiming(
      2.75,
      [{ startSeconds: 1.85, endSeconds: 2.75 }],
      [{ startSeconds: 0, endSeconds: 1.85 }],
    ),
  );

const createTargetLockCandidate = () =>
  createEncounterReadabilityCandidate(
    PROTOTYPE_TARGET_LOCK_STRIKE_PATTERN,
    PROTOTYPE_TARGET_LOCK_STRIKE_PATTERN.id,
    createTiming(
      2.8,
      [{ startSeconds: 1.8, endSeconds: 2.8 }],
      [{ startSeconds: 0, endSeconds: 1.8 }],
    ),
  );

const UNBOUNDED_REQUEST: Readonly<EncounterReadabilityLimits> = Object.freeze({
  maximumActivePressureCost: 999,
  maximumActiveReadabilityCost: 999,
  maximumConcurrentWarnings: 999,
  maximumConcurrentLethalWindows: 999,
});

describe('encounter readability budget', () => {
  it('reserves a single active telegraphed hazard under the prototype budget', () => {
    const candidate = createTimedPulseCandidate();
    const decision = reserveEncounterReadabilityBudget(createEncounterReadabilityBudgetState(), {
      candidate,
    });

    expect(decision).toMatchObject({
      issues: [],
      status: 'reserved',
      usage: {
        activePressureCost: { actual: 1, atSeconds: 0, limit: 6 },
        activeReadabilityCost: { actual: 3, atSeconds: 0, limit: 6 },
        concurrentWarnings: { actual: 1, atSeconds: 0, limit: 2 },
        concurrentLethalWindows: { actual: 1, atSeconds: 1.85, limit: 2 },
      },
    });
    expect(decision.state.reservations).toEqual([candidate]);
  });

  it('allows compatible timed and reactive warnings and lethal windows at exact limits', () => {
    const timed = reserveEncounterReadabilityBudget(createEncounterReadabilityBudgetState(), {
      candidate: createTimedPulseCandidate(),
    });
    const combined = reserveEncounterReadabilityBudget(timed.state, {
      candidate: createTargetLockCandidate(),
    });

    expect(combined).toMatchObject({
      issues: [],
      status: 'reserved',
      usage: {
        activePressureCost: { actual: 3, limit: 6 },
        activeReadabilityCost: { actual: 6, limit: 6 },
        concurrentWarnings: { actual: 2, limit: 2 },
        concurrentLethalWindows: { actual: 2, limit: 2 },
      },
    });
  });

  it('defers an overlapping warning burst with structured evidence despite a higher request', () => {
    const secondPulsePattern = createHazardPattern({
      ...PROTOTYPE_TIMED_PULSE_PATTERN,
      id: 'prototype-timed-pulse-second',
      profile: {
        ...PROTOTYPE_TIMED_PULSE_PATTERN.profile,
        varietyFamilyId: 'timed-pulse-second',
      },
    });
    const first = reserveEncounterReadabilityBudget(createEncounterReadabilityBudgetState(), {
      candidate: createTimedPulseCandidate(),
    });
    const second = reserveEncounterReadabilityBudget(first.state, {
      candidate: createTargetLockCandidate(),
    });
    const burst = reserveEncounterReadabilityBudget(second.state, {
      candidate: createTimedPulseCandidate(secondPulsePattern),
      requestedLimits: UNBOUNDED_REQUEST,
    });

    expect(burst.status).toBe('deferred');
    expect(burst.state).toBe(second.state);
    expect(burst.effectiveLimits).toEqual(PROTOTYPE_ENCOUNTER_READABILITY_BUDGET_CONFIG.hardLimits);
    expect(burst.issues).toEqual([
      {
        actual: 9,
        atSeconds: 0,
        code: 'active-readability-budget-exceeded',
        limit: 6,
      },
      { actual: 3, atSeconds: 0, code: 'warning-concurrency-exceeded', limit: 2 },
      { actual: 3, atSeconds: 1.85, code: 'lethal-concurrency-exceeded', limit: 2 },
    ]);
    expect(burst.state.reservations).toHaveLength(2);
  });

  it('uses half-open lethal windows so exact edge contact passes and true triple overlap defers', () => {
    const patterns = ['lethal-a', 'lethal-b', 'lethal-edge', 'lethal-overlap'].map((id) =>
      createStaticPattern(id),
    );
    const candidate = (index: number, startSeconds: number, endSeconds: number) => {
      const pattern = patterns[index];
      if (pattern === undefined) throw new Error('Expected lethal-window test pattern.');
      return createEncounterReadabilityCandidate(
        pattern,
        pattern.id,
        createTiming(4, [{ startSeconds, endSeconds }]),
      );
    };
    const first = reserveEncounterReadabilityBudget(createEncounterReadabilityBudgetState(), {
      candidate: candidate(0, 2, 3),
    });
    const second = reserveEncounterReadabilityBudget(first.state, {
      candidate: candidate(1, 2, 3),
    });
    const edge = reserveEncounterReadabilityBudget(second.state, {
      candidate: candidate(2, 3, 4),
    });
    const overlap = reserveEncounterReadabilityBudget(edge.state, {
      candidate: candidate(3, 2.5, 3.5),
    });

    expect(second).toMatchObject({ status: 'reserved' });
    expect(second.usage.concurrentLethalWindows).toEqual({ actual: 2, atSeconds: 2, limit: 2 });
    expect(edge).toMatchObject({ status: 'reserved' });
    expect(overlap).toMatchObject({
      status: 'deferred',
      issues: [{ actual: 3, atSeconds: 2.5, code: 'lethal-concurrency-exceeded', limit: 2 }],
    });
  });

  it('releases expired reservations exactly and permits their stable ids to be reused', () => {
    const pattern = createStaticPattern('expiring-encounter', 3, 3);
    const candidate = createEncounterReadabilityCandidate(pattern, pattern.id, createTiming(1));
    const reserved = reserveEncounterReadabilityBudget(createEncounterReadabilityBudgetState(), {
      candidate,
    });
    const active = stepEncounterReadabilityBudget(reserved.state, 0.5);
    const expired = stepEncounterReadabilityBudget(active, 0.5);
    const reused = reserveEncounterReadabilityBudget(expired, { candidate });

    expect(active.reservations[0]?.activeWindow).toEqual({ startSeconds: 0, endSeconds: 0.5 });
    expect(expired).toBe(createEncounterReadabilityBudgetState());
    expect(reused.status).toBe('reserved');
  });

  it('holds occupancy on zero normalized delta while paused', () => {
    const candidate = createTimedPulseCandidate();
    const reserved = reserveEncounterReadabilityBudget(createEncounterReadabilityBudgetState(), {
      candidate,
    });
    const time = new TimeService({ maxDeltaSeconds: 1 });
    time.update(100);
    time.pause();

    const paused = stepEncounterReadabilityBudget(reserved.state, time.update(60_000));

    expect(paused).toBe(reserved.state);
    expect(stepEncounterReadabilityBudget(paused, 0)).toBe(paused);
  });

  it('supports a zero-pressure breather request without weakening the hard budget', () => {
    const zeroLimits: Readonly<EncounterReadabilityLimits> = {
      maximumActivePressureCost: 0,
      maximumActiveReadabilityCost: 0,
      maximumConcurrentWarnings: 0,
      maximumConcurrentLethalWindows: 0,
    };
    const pressured = reserveEncounterReadabilityBudget(createEncounterReadabilityBudgetState(), {
      candidate: createTimedPulseCandidate(),
      requestedLimits: zeroLimits,
    });
    const quietPattern = createStaticPattern('quiet-breather', 0, 0);
    const quiet = reserveEncounterReadabilityBudget(createEncounterReadabilityBudgetState(), {
      candidate: createEncounterReadabilityCandidate(
        quietPattern,
        quietPattern.id,
        createTiming(1),
      ),
      requestedLimits: zeroLimits,
    });

    expect(pressured.status).toBe('deferred');
    expect(pressured.effectiveLimits).toEqual(zeroLimits);
    expect(pressured.issues.map((issue) => issue.code)).toContain(
      'active-pressure-budget-exceeded',
    );
    expect(quiet).toMatchObject({ status: 'reserved', issues: [] });
  });

  it('bounds pending state and returns capacity diagnostics instead of growing indefinitely', () => {
    const config = createEncounterReadabilityBudgetConfig({
      hardLimits: UNBOUNDED_REQUEST,
      maximumTrackedEncounters: 2,
    });
    const patterns = ['bounded-a', 'bounded-b', 'bounded-c'].map((id) =>
      createStaticPattern(id, 0, 0),
    );
    const reservePattern = (
      state: ReturnType<typeof createEncounterReadabilityBudgetState>,
      index: number,
    ) => {
      const pattern = patterns[index];
      if (pattern === undefined) throw new Error('Expected bounded-state test pattern.');
      return reserveEncounterReadabilityBudget(
        state,
        {
          candidate: createEncounterReadabilityCandidate(pattern, pattern.id, createTiming(10)),
        },
        config,
      );
    };
    const first = reservePattern(createEncounterReadabilityBudgetState([], config), 0);
    const second = reservePattern(first.state, 1);
    const third = reservePattern(second.state, 2);

    expect(third).toMatchObject({
      status: 'deferred',
      issues: [{ actual: 3, atSeconds: 0, code: 'tracked-encounter-capacity-exceeded', limit: 2 }],
    });
    expect(third.state.reservations).toHaveLength(2);
  });

  it('replays the same seeded candidate decision and ignores physical viewport dimensions', () => {
    const replay = (_viewportWidth: number) => {
      const existingPattern = createStaticPattern('readability-existing');
      const existing = reserveEncounterReadabilityBudget(createEncounterReadabilityBudgetState(), {
        candidate: createEncounterReadabilityCandidate(
          existingPattern,
          'readability-existing:0',
          createTiming(4, [{ startSeconds: 1, endSeconds: 2 }]),
        ),
      });
      const schedule = scheduleNextPattern({
        catalog: [PROTOTYPE_TIMED_PULSE_PATTERN, PROTOTYPE_TARGET_LOCK_STRIKE_PATTERN],
        patternStartDistance: 1_000,
        state: createRunGenerationState('readability-replay'),
      });
      if (schedule.status !== 'accepted') throw new Error('Expected a seeded candidate.');
      const pattern =
        schedule.patternId === PROTOTYPE_TIMED_PULSE_PATTERN.id
          ? PROTOTYPE_TIMED_PULSE_PATTERN
          : PROTOTYPE_TARGET_LOCK_STRIKE_PATTERN;
      const candidate = createEncounterReadabilityCandidate(
        pattern,
        `${pattern.id}:1000`,
        createTiming(3, [{ startSeconds: 2, endSeconds: 3 }], [{ startSeconds: 0, endSeconds: 2 }]),
      );
      return {
        schedule,
        decision: reserveEncounterReadabilityBudget(existing.state, { candidate }),
      };
    };
    const first = replay(640);
    const wide = replay(2_560);

    expect(wide).toEqual(first);
    expect(JSON.parse(JSON.stringify(first))).toEqual(first);
    expect(Object.isFrozen(first.decision)).toBe(true);
    expect(Object.isFrozen(first.decision.state)).toBe(true);
    expect(Object.isFrozen(first.decision.state.reservations)).toBe(true);
    expect(first.decision.state.reservations.every(Object.isFrozen)).toBe(true);
    expect(Object.isFrozen(first.decision.issues)).toBe(true);
    expect(first.decision).not.toHaveProperty('viewport');
  });

  it('rejects malformed configs, limits, reservations, duplicate ids, and elapsed time', () => {
    expect(() =>
      createEncounterReadabilityBudgetConfig({
        hardLimits: PROTOTYPE_ENCOUNTER_READABILITY_BUDGET_CONFIG.hardLimits,
        maximumTrackedEncounters: 0,
      }),
    ).toThrow(RangeError);
    expect(() =>
      resolveEncounterReadabilityLimits({
        ...PROTOTYPE_ENCOUNTER_READABILITY_BUDGET_CONFIG.hardLimits,
        maximumConcurrentWarnings: -1,
      }),
    ).toThrow(RangeError);
    expect(() =>
      createEncounterReadabilityCandidate(
        PROTOTYPE_TIMED_PULSE_PATTERN,
        PROTOTYPE_TIMED_PULSE_PATTERN.id,
        {
          activeWindow: { startSeconds: 1, endSeconds: 2 },
          lethalWindows: [],
          warningWindows: [{ startSeconds: 0, endSeconds: 1.5 }],
        },
      ),
    ).toThrow(RangeError);

    const candidate = createTimedPulseCandidate();
    const state = createEncounterReadabilityBudgetState([candidate]);
    expect(() => createEncounterReadabilityBudgetState([candidate, candidate])).toThrow(TypeError);
    expect(() => reserveEncounterReadabilityBudget(state, { candidate })).toThrow(TypeError);
    expect(() => stepEncounterReadabilityBudget(state, -1)).toThrow(RangeError);
    expect(() => stepEncounterReadabilityBudget(state, Number.POSITIVE_INFINITY)).toThrow(
      RangeError,
    );
  });
});
