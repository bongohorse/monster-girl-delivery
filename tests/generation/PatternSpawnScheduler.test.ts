import { describe, expect, it } from 'vitest';
import { createHazardPattern, type HazardPattern } from '../../src/generation/HazardPattern';
import { scheduleNextPattern } from '../../src/generation/PatternSpawnScheduler';
import {
  PROTOTYPE_CORRIDOR_PATTERN,
  PROTOTYPE_HAZARD_PATTERN_FIXTURES,
} from '../../src/generation/PrototypeHazardPatternFixtures';
import {
  createRunGenerationState,
  type RunGenerationState,
  stepRunGeneration,
} from '../../src/generation/RunGenerationState';

const INVALID_PATTERN = createHazardPattern({
  id: 'blocked-pattern',
  runLength: 300,
  entries: [
    {
      id: 'blocked-top',
      type: 'placeholder-barrier',
      hitbox: { left: 100, right: 148, top: 48, bottom: 220 },
    },
    {
      id: 'blocked-bottom',
      type: 'placeholder-barrier',
      hitbox: { left: 100, right: 148, top: 200, bottom: 342 },
    },
  ],
});

const UNSORTED_VALID_PATTERN = createHazardPattern({
  id: 'unsorted-valid',
  runLength: 500,
  entries: [
    {
      id: 'later',
      type: 'placeholder-barrier',
      hitbox: { left: 300, right: 348, top: 160, bottom: 208 },
    },
    {
      id: 'earlier',
      type: 'placeholder-barrier',
      hitbox: { left: 100, right: 148, top: 160, bottom: 208 },
    },
  ],
});

interface SpawnSequence {
  readonly patternIds: ReadonlyArray<string>;
  readonly runDistances: ReadonlyArray<number>;
  readonly state: Readonly<RunGenerationState>;
}

const advanceGenerationState = (
  initialState: Readonly<RunGenerationState>,
  steps: number,
): Readonly<RunGenerationState> => {
  let state = initialState;

  for (let index = 0; index < steps; index += 1) {
    state = stepRunGeneration(state).state;
  }

  return state;
};

const collectAcceptedSequence = (
  initialState: Readonly<RunGenerationState>,
  catalog: ReadonlyArray<Readonly<HazardPattern>>,
  patternCount: number,
): SpawnSequence => {
  const patternIds: string[] = [];
  const runDistances: number[] = [];
  let patternStartDistance = 1_000;
  let state = initialState;

  for (let index = 0; index < patternCount; index += 1) {
    const schedule = scheduleNextPattern({ catalog, patternStartDistance, state });

    if (schedule.status !== 'accepted') {
      throw new Error('Expected the prototype catalog to produce an accepted schedule.');
    }

    patternIds.push(schedule.patternId);
    runDistances.push(...schedule.spawns.map((spawn) => spawn.runDistance));
    patternStartDistance = schedule.nextPatternStartDistance;
    state = schedule.state;
  }

  return { patternIds, runDistances, state };
};

describe('scheduleNextPattern', () => {
  it('produces the same accepted spawn sequence from the same explicit inputs', () => {
    const first = collectAcceptedSequence(
      createRunGenerationState('spawn-replay'),
      PROTOTYPE_HAZARD_PATTERN_FIXTURES,
      6,
    );
    const replay = collectAcceptedSequence(
      createRunGenerationState('spawn-replay'),
      PROTOTYPE_HAZARD_PATTERN_FIXTURES,
      6,
    );

    expect(replay).toEqual(first);
    expect(first.runDistances).toEqual(
      [...first.runDistances].sort((first, second) => first - second),
    );
  });

  it('rejects candidates deterministically before mapping the first accepted pattern', () => {
    const initialState = createRunGenerationState(60);
    const schedule = scheduleNextPattern({
      catalog: [INVALID_PATTERN, PROTOTYPE_CORRIDOR_PATTERN],
      maxCandidateAttempts: 4,
      patternStartDistance: 2_000,
      state: initialState,
    });

    if (schedule.status !== 'accepted') {
      throw new Error('Expected the fourth candidate to be accepted.');
    }

    expect(schedule.attempts).toBe(4);
    expect(schedule.rejections.map(({ attempt, patternId }) => ({ attempt, patternId }))).toEqual([
      { attempt: 1, patternId: 'blocked-pattern' },
      { attempt: 2, patternId: 'blocked-pattern' },
      { attempt: 3, patternId: 'blocked-pattern' },
    ]);

    expect(schedule.patternId).toBe('prototype-corridor');
    expect(schedule.spawns.map((spawn) => spawn.patternId)).toEqual([
      'prototype-corridor',
      'prototype-corridor',
    ]);
    expect(schedule.spawns.map((spawn) => spawn.entryId)).not.toContain('blocked-top');
    expect(schedule.state).toEqual(advanceGenerationState(initialState, 4));
  });

  it('returns explicit bounded exhaustion when no candidate can pass', () => {
    const initialState = createRunGenerationState('never-valid');
    const schedule = scheduleNextPattern({
      catalog: [INVALID_PATTERN],
      maxCandidateAttempts: 3,
      patternStartDistance: 0,
      state: initialState,
    });

    expect(schedule).toMatchObject({
      status: 'exhausted',
      attempts: 3,
      patternStartDistance: 0,
    });
    expect(schedule.rejections).toHaveLength(3);
    expect(schedule.rejections.every((rejection) => rejection.issues.length > 0)).toBe(true);
    expect(schedule.state).toEqual(advanceGenerationState(initialState, 3));
    expect('spawns' in schedule).toBe(false);
  });

  it('maps local hitboxes to monotonically ordered absolute run distances', () => {
    const schedule = scheduleNextPattern({
      catalog: [UNSORTED_VALID_PATTERN],
      patternStartDistance: 5_000,
      state: createRunGenerationState('absolute-mapping'),
    });

    if (schedule.status !== 'accepted') {
      throw new Error('Expected the valid pattern to be accepted.');
    }

    expect(schedule.nextPatternStartDistance).toBe(5_500);
    expect(schedule.spawns).toEqual([
      {
        entryId: 'earlier',
        hitbox: { left: 5_100, right: 5_148, top: 160, bottom: 208 },
        patternEntryIndex: 1,
        patternId: 'unsorted-valid',
        runDistance: 5_100,
        type: 'placeholder-barrier',
      },
      {
        entryId: 'later',
        hitbox: { left: 5_300, right: 5_348, top: 160, bottom: 208 },
        patternEntryIndex: 0,
        patternId: 'unsorted-valid',
        runDistance: 5_300,
        type: 'placeholder-barrier',
      },
    ]);
  });

  it('continues exactly from the returned generation state and distance cursor', () => {
    const initialState = createRunGenerationState(62);
    const first = scheduleNextPattern({
      catalog: PROTOTYPE_HAZARD_PATTERN_FIXTURES,
      patternStartDistance: 800,
      state: initialState,
    });
    if (first.status !== 'accepted') {
      throw new Error('Expected the first prototype schedule to be accepted.');
    }

    const continued = scheduleNextPattern({
      catalog: PROTOTYPE_HAZARD_PATTERN_FIXTURES,
      patternStartDistance: first.nextPatternStartDistance,
      state: first.state,
    });
    const repeated = scheduleNextPattern({
      catalog: PROTOTYPE_HAZARD_PATTERN_FIXTURES,
      patternStartDistance: first.nextPatternStartDistance,
      state: first.state,
    });

    expect(continued).toEqual(repeated);
    expect(continued.patternStartDistance).toBe(first.nextPatternStartDistance);
    expect(continued.state).not.toEqual(first.state);
  });

  it('rejects invalid catalogs, retry policies, constraints, and distance cursors safely', () => {
    const state = createRunGenerationState('invalid-scheduler-input');
    const stateSnapshot = { ...state };

    expect(() => scheduleNextPattern({ catalog: [], patternStartDistance: 0, state })).toThrow(
      RangeError,
    );
    expect(() =>
      scheduleNextPattern({
        catalog: [PROTOTYPE_CORRIDOR_PATTERN],
        maxCandidateAttempts: 0,
        patternStartDistance: 0,
        state,
      }),
    ).toThrow(RangeError);
    expect(() =>
      scheduleNextPattern({
        catalog: [PROTOTYPE_CORRIDOR_PATTERN],
        maxCandidateAttempts: 1_025,
        patternStartDistance: 0,
        state,
      }),
    ).toThrow(RangeError);
    expect(() =>
      scheduleNextPattern({
        catalog: [PROTOTYPE_CORRIDOR_PATTERN],
        constraints: {
          playableTop: 48,
          playableBottom: 342,
          minimumVerticalCorridor: 400,
          minimumReactionSpacing: 96,
        },
        patternStartDistance: 0,
        state,
      }),
    ).toThrow(RangeError);
    expect(() =>
      scheduleNextPattern({
        catalog: [PROTOTYPE_CORRIDOR_PATTERN],
        patternStartDistance: Number.POSITIVE_INFINITY,
        state,
      }),
    ).toThrow(RangeError);

    expect(state).toEqual(stateSnapshot);
  });

  it('returns immutable schedules without mutating state, catalog, or patterns', () => {
    const state = createRunGenerationState('immutable-schedule');
    const stateSnapshot = { ...state };
    const catalogSnapshot = JSON.stringify(PROTOTYPE_HAZARD_PATTERN_FIXTURES);
    const schedule = scheduleNextPattern({
      catalog: PROTOTYPE_HAZARD_PATTERN_FIXTURES,
      patternStartDistance: 1_200,
      state,
    });

    expect(state).toEqual(stateSnapshot);
    expect(JSON.stringify(PROTOTYPE_HAZARD_PATTERN_FIXTURES)).toBe(catalogSnapshot);
    expect(Object.isFrozen(schedule)).toBe(true);
    expect(Object.isFrozen(schedule.rejections)).toBe(true);

    if (schedule.status === 'accepted') {
      expect(Object.isFrozen(schedule.spawns)).toBe(true);
      expect(Object.isFrozen(schedule.spawns[0])).toBe(true);
      expect(Object.isFrozen(schedule.spawns[0]?.hitbox)).toBe(true);
    }
  });

  it('keeps scheduling output independent of viewport or presentation state', () => {
    const schedule = scheduleNextPattern({
      catalog: [PROTOTYPE_CORRIDOR_PATTERN],
      patternStartDistance: 3_000,
      state: createRunGenerationState('logical-only'),
    });

    expect(JSON.stringify(schedule)).not.toMatch(/viewport|screen|phaser/i);
  });
});
