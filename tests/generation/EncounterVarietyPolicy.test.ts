import { describe, expect, it } from 'vitest';
import {
  createEncounterVarietyHistoryState,
  createEncounterVarietyPolicy,
  type EncounterVarietyHistoryState,
  PROTOTYPE_ENCOUNTER_VARIETY_POLICY,
  recordAcceptedEncounterForVariety,
  selectPatternsForVariety,
} from '../../src/generation/EncounterVarietyPolicy';
import { createHazardPattern, type HazardPattern } from '../../src/generation/HazardPattern';
import { scheduleNextPattern } from '../../src/generation/PatternSpawnScheduler';
import {
  createRunGenerationState,
  type RunGenerationState,
} from '../../src/generation/RunGenerationState';
import { filterPatternsForPacing } from '../../src/pacing/PacingPatternSelection';
import { TEST_ENCOUNTER_PROFILE } from '../support/TestEncounterProfile';

const createPattern = (
  id: string,
  varietyFamilyId: string,
  entryCount = 1,
): Readonly<HazardPattern> =>
  createHazardPattern({
    id,
    runLength: 600,
    profile: { ...TEST_ENCOUNTER_PROFILE, varietyFamilyId },
    entries: Array.from({ length: entryCount }, (_, index) => ({
      id: `${id}-entry-${index}`,
      type: 'placeholder-barrier' as const,
      hitbox: {
        left: 100 + index * 160,
        right: 148 + index * 160,
        top: 160,
        bottom: 208,
      },
    })),
  });

const FAMILY_A_PATTERN = createPattern('family-a-pattern', 'family-a');
const FAMILY_A_ALTERNATIVE = createPattern('family-a-alternative', 'family-a');
const FAMILY_B_PATTERN = createPattern('family-b-pattern', 'family-b');
const FAMILY_C_PATTERN = createPattern('family-c-pattern', 'family-c');
const FAMILY_D_PATTERN = createPattern('family-d-pattern', 'family-d');
const FAMILY_E_PATTERN = createPattern('family-e-pattern', 'family-e');
const CATALOG = Object.freeze([FAMILY_A_PATTERN, FAMILY_B_PATTERN, FAMILY_C_PATTERN]);

const BLOCKED_PATTERN = createHazardPattern({
  id: 'blocked-new-family',
  runLength: 600,
  profile: { ...TEST_ENCOUNTER_PROFILE, varietyFamilyId: 'blocked-family' },
  entries: [
    {
      id: 'blocking-wall',
      type: 'placeholder-barrier',
      hitbox: { left: 100, right: 148, top: 48, bottom: 342 },
    },
  ],
});

interface ReplayState {
  readonly generation: Readonly<RunGenerationState>;
  readonly patternIds: ReadonlyArray<string>;
  readonly variety: Readonly<EncounterVarietyHistoryState>;
}

const createReplay = (): ReplayState => {
  let generation = createRunGenerationState('variety-replay');
  let variety = createEncounterVarietyHistoryState(['family-a']);
  let patternStartDistance = 1_000;
  const patternIds: string[] = [];

  for (let index = 0; index < 12; index += 1) {
    const selection = selectPatternsForVariety(CATALOG, variety);
    const schedule = scheduleNextPattern({
      catalog: selection.candidateCatalog,
      patternStartDistance,
      state: generation,
    });

    if (schedule.status !== 'accepted') {
      throw new Error('Expected the replay catalog to remain schedulable.');
    }

    const acceptedPattern = CATALOG.find((pattern) => pattern.id === schedule.patternId);
    if (acceptedPattern === undefined) {
      throw new Error('Expected the accepted pattern in the replay catalog.');
    }

    patternIds.push(schedule.patternId);
    generation = schedule.state;
    variety = recordAcceptedEncounterForVariety(variety, acceptedPattern);
    patternStartDistance = schedule.nextPatternStartDistance;
  }

  return { generation, patternIds, variety };
};

describe('encounter variety policy', () => {
  it('suppresses immediate and near-immediate family repetition when alternatives exist', () => {
    const immediate = selectPatternsForVariety(
      [FAMILY_A_PATTERN, FAMILY_A_ALTERNATIVE, FAMILY_B_PATTERN],
      createEncounterVarietyHistoryState(['family-a']),
    );
    const nearImmediate = selectPatternsForVariety(
      CATALOG,
      createEncounterVarietyHistoryState(['family-a', 'family-b']),
    );

    expect(immediate.candidateCatalog).toEqual([FAMILY_B_PATTERN]);
    expect(immediate.deferredCatalog).toEqual([FAMILY_A_PATTERN, FAMILY_A_ALTERNATIVE]);
    expect(immediate.evaluations).toEqual([
      {
        patternId: 'family-a-pattern',
        preferred: false,
        recentlyUsed: true,
        repeatable: false,
        selectionsSinceLastUse: 1,
        varietyFamilyId: 'family-a',
      },
      {
        patternId: 'family-a-alternative',
        preferred: false,
        recentlyUsed: true,
        repeatable: false,
        selectionsSinceLastUse: 1,
        varietyFamilyId: 'family-a',
      },
      {
        patternId: 'family-b-pattern',
        preferred: true,
        recentlyUsed: false,
        repeatable: false,
        selectionsSinceLastUse: null,
        varietyFamilyId: 'family-b',
      },
    ]);
    expect(nearImmediate.candidateCatalog).toEqual([FAMILY_C_PATTERN]);
    expect(nearImmediate.deferredCatalog).toEqual([FAMILY_A_PATTERN, FAMILY_B_PATTERN]);
  });

  it('records accepted families in bounded immutable history', () => {
    const initial = createEncounterVarietyHistoryState();
    const afterA = recordAcceptedEncounterForVariety(initial, FAMILY_A_PATTERN);
    const afterB = recordAcceptedEncounterForVariety(afterA, FAMILY_B_PATTERN);
    const afterC = recordAcceptedEncounterForVariety(afterB, FAMILY_C_PATTERN);

    expect(initial.recentFamilyIds).toEqual([]);
    expect(afterA.recentFamilyIds).toEqual(['family-a']);
    expect(afterB.recentFamilyIds).toEqual(['family-a', 'family-b']);
    expect(afterC.recentFamilyIds).toEqual(['family-a', 'family-b', 'family-c']);
    expect(Object.isFrozen(afterC)).toBe(true);
    expect(Object.isFrozen(afterC.recentFamilyIds)).toBe(true);

    let repeated = initial;
    for (let index = 0; index < 100; index += 1) {
      repeated = recordAcceptedEncounterForVariety(repeated, FAMILY_A_PATTERN);
    }
    expect(repeated.recentFamilyIds).toEqual(['family-a', 'family-a', 'family-a', 'family-a']);
  });

  it('prefers a fresh fifth family over the four most recent accepted families', () => {
    const state = createEncounterVarietyHistoryState([
      'family-a',
      'family-b',
      'family-c',
      'family-d',
    ]);
    const selection = selectPatternsForVariety(
      [FAMILY_A_PATTERN, FAMILY_B_PATTERN, FAMILY_C_PATTERN, FAMILY_D_PATTERN, FAMILY_E_PATTERN],
      state,
    );

    expect(PROTOTYPE_ENCOUNTER_VARIETY_POLICY.recentFamilyWindowSize).toBe(4);
    expect(selection.candidateCatalog).toEqual([FAMILY_E_PATTERN]);
    expect(selection.deferredCatalog).toEqual([
      FAMILY_A_PATTERN,
      FAMILY_B_PATTERN,
      FAMILY_C_PATTERN,
      FAMILY_D_PATTERN,
    ]);
    expect(selection.fallbackUsed).toBe(false);
  });

  it('falls back deterministically for one-entry and fully recent small catalogs', () => {
    const single = selectPatternsForVariety(
      [FAMILY_A_PATTERN],
      createEncounterVarietyHistoryState(['family-a']),
    );
    const state = createEncounterVarietyHistoryState(['family-a', 'family-b']);
    const small = selectPatternsForVariety([FAMILY_A_PATTERN, FAMILY_B_PATTERN], state);
    const replay = selectPatternsForVariety([FAMILY_A_PATTERN, FAMILY_B_PATTERN], state);

    expect(single).toMatchObject({
      candidateCatalog: [FAMILY_A_PATTERN],
      deferredCatalog: [],
      fallbackUsed: true,
    });
    expect(small).toEqual(replay);
    expect(small).toMatchObject({
      candidateCatalog: [FAMILY_A_PATTERN],
      deferredCatalog: [FAMILY_B_PATTERN],
      fallbackUsed: true,
    });

    const firstSchedule = scheduleNextPattern({
      catalog: small.candidateCatalog,
      patternStartDistance: 0,
      state: createRunGenerationState('small-variety-fallback'),
    });
    const replaySchedule = scheduleNextPattern({
      catalog: replay.candidateCatalog,
      patternStartDistance: 0,
      state: createRunGenerationState('small-variety-fallback'),
    });
    expect(replaySchedule).toEqual(firstSchedule);
    expect(firstSchedule).toMatchObject({ status: 'accepted', patternId: 'family-a-pattern' });
  });

  it('replays the same sequence from the same seed and explicit history state', () => {
    const first = createReplay();
    const replay = createReplay();

    expect(replay).toEqual(first);
    for (let index = 2; index < first.patternIds.length; index += 1) {
      expect(first.patternIds[index]).not.toBe(first.patternIds[index - 1]);
      expect(first.patternIds[index]).not.toBe(first.patternIds[index - 2]);
    }
    expect(first.variety.recentFamilyIds).toHaveLength(4);
  });

  it('never reintroduces pacing-ineligible content and defers repetition behind hard fairness', () => {
    const highPressurePattern = createPattern('high-pressure-pattern', 'high-pressure', 3);
    const pacingEligible = filterPatternsForPacing([FAMILY_A_PATTERN, highPressurePattern], {
      intensity: 'breather',
      maximumHazardsPer1000Distance: 2,
      maximumPatternEntries: 1,
      maximumRunLength: 1_000,
    });
    const breatherSelection = selectPatternsForVariety(
      pacingEligible,
      createEncounterVarietyHistoryState(['family-a']),
    );

    expect(pacingEligible).toEqual([FAMILY_A_PATTERN]);
    expect(breatherSelection.candidateCatalog).toEqual([FAMILY_A_PATTERN]);
    expect(breatherSelection.fallbackUsed).toBe(true);

    const varietyState = createEncounterVarietyHistoryState(['family-a']);
    const fairnessSelection = selectPatternsForVariety(
      [BLOCKED_PATTERN, FAMILY_A_PATTERN],
      varietyState,
    );
    expect(fairnessSelection.candidateCatalog).toEqual([BLOCKED_PATTERN]);
    expect(fairnessSelection.deferredCatalog).toEqual([FAMILY_A_PATTERN]);

    const rejected = scheduleNextPattern({
      catalog: fairnessSelection.candidateCatalog,
      maxCandidateAttempts: 1,
      patternStartDistance: 0,
      state: createRunGenerationState('fairness-before-variety'),
    });
    expect(rejected.status).toBe('exhausted');
    expect(varietyState.recentFamilyIds).toEqual(['family-a']);

    const fallback = scheduleNextPattern({
      catalog: fairnessSelection.deferredCatalog,
      maxCandidateAttempts: 1,
      patternStartDistance: 0,
      state: rejected.state,
    });
    expect(fallback).toMatchObject({ status: 'accepted', patternId: 'family-a-pattern' });
    expect(
      recordAcceptedEncounterForVariety(varietyState, FAMILY_A_PATTERN).recentFamilyIds,
    ).toEqual(['family-a', 'family-a']);
  });

  it('preserves explicitly allowed family recurrence as a primary choice', () => {
    const policy = createEncounterVarietyPolicy({
      recentFamilyWindowSize: 2,
      repeatableFamilyIds: ['family-a'],
    });
    const selection = selectPatternsForVariety(
      [FAMILY_A_PATTERN, FAMILY_B_PATTERN],
      createEncounterVarietyHistoryState(['family-a'], policy),
      policy,
    );

    expect(selection.candidateCatalog).toEqual([FAMILY_A_PATTERN, FAMILY_B_PATTERN]);
    expect(selection.deferredCatalog).toEqual([]);
    expect(selection.fallbackUsed).toBe(false);
    expect(selection.evaluations[0]).toMatchObject({
      preferred: true,
      recentlyUsed: true,
      repeatable: true,
    });
  });

  it('handles an empty upstream catalog without relaxing requirements', () => {
    expect(selectPatternsForVariety([], createEncounterVarietyHistoryState())).toEqual({
      candidateCatalog: [],
      deferredCatalog: [],
      evaluations: [],
      fallbackUsed: false,
    });
  });

  it('is serializable, deeply immutable, and independent of viewport dimensions', () => {
    const state = createEncounterVarietyHistoryState(['family-a']);
    const evaluateForViewport = (_width: number, _height: number) =>
      selectPatternsForVariety(CATALOG, state);
    const first = evaluateForViewport(640, 360);
    const wide = evaluateForViewport(2_560, 1_080);

    expect(wide).toEqual(first);
    expect(JSON.parse(JSON.stringify(first))).toEqual(first);
    expect(Object.isFrozen(PROTOTYPE_ENCOUNTER_VARIETY_POLICY)).toBe(true);
    expect(Object.isFrozen(PROTOTYPE_ENCOUNTER_VARIETY_POLICY.repeatableFamilyIds)).toBe(true);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.candidateCatalog)).toBe(true);
    expect(Object.isFrozen(first.deferredCatalog)).toBe(true);
    expect(Object.isFrozen(first.evaluations)).toBe(true);
    expect(first.evaluations.every(Object.isFrozen)).toBe(true);
    expect(first).not.toHaveProperty('viewport');
  });

  it('rejects malformed policy, history, and catalog inputs', () => {
    for (const recentFamilyWindowSize of [-1, 1.5, 65]) {
      expect(() =>
        createEncounterVarietyPolicy({ recentFamilyWindowSize, repeatableFamilyIds: [] }),
      ).toThrow(RangeError);
    }
    expect(() =>
      createEncounterVarietyPolicy({
        recentFamilyWindowSize: 2,
        repeatableFamilyIds: ['family-a', 'family-a'],
      }),
    ).toThrow(TypeError);
    expect(() =>
      createEncounterVarietyHistoryState([
        'family-a',
        'family-b',
        'family-c',
        'family-d',
        'family-e',
      ]),
    ).toThrow(RangeError);
    expect(() => createEncounterVarietyHistoryState([' family-a'])).toThrow(TypeError);
    expect(() =>
      selectPatternsForVariety(
        [FAMILY_A_PATTERN, { ...FAMILY_B_PATTERN, id: FAMILY_A_PATTERN.id }],
        createEncounterVarietyHistoryState(),
      ),
    ).toThrow(TypeError);
  });
});
