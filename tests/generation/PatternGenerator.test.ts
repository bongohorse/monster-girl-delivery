import { describe, expect, it } from 'vitest';
import type { HazardPattern } from '../../src/generation/HazardPattern';
import {
  generateNextPattern,
  type PatternGenerationStep,
} from '../../src/generation/PatternGenerator';
import {
  PROTOTYPE_CORRIDOR_PATTERN,
  PROTOTYPE_HAZARD_PATTERN_FIXTURES,
  PROTOTYPE_LINE_PATTERN,
  PROTOTYPE_OFFSET_PAIR_PATTERN,
} from '../../src/generation/PrototypeHazardPatternFixtures';
import {
  createRunGenerationState,
  type RunGenerationState,
} from '../../src/generation/RunGenerationState';

interface PatternSequence {
  readonly choices: ReadonlyArray<
    Pick<PatternGenerationStep, 'catalogIndex'> & { readonly patternId: string }
  >;
  readonly state: Readonly<RunGenerationState>;
}

const collectPatternSequence = (
  initialState: Readonly<RunGenerationState>,
  catalog: ReadonlyArray<Readonly<HazardPattern>>,
  length: number,
): PatternSequence => {
  const choices: Array<{ catalogIndex: number; patternId: string }> = [];
  let state = initialState;

  for (let index = 0; index < length; index += 1) {
    const step = generateNextPattern(state, catalog);
    choices.push({ catalogIndex: step.catalogIndex, patternId: step.pattern.id });
    state = step.state;
  }

  return { choices, state };
};

describe('generateNextPattern', () => {
  it('reproduces the same pattern sequence from the same seed and catalog', () => {
    const first = collectPatternSequence(
      createRunGenerationState('pattern-replay'),
      PROTOTYPE_HAZARD_PATTERN_FIXTURES,
      12,
    );
    const replay = collectPatternSequence(
      createRunGenerationState('pattern-replay'),
      PROTOTYPE_HAZARD_PATTERN_FIXTURES,
      12,
    );

    expect(replay).toEqual(first);
  });

  it('keeps a representative seeded catalog sequence stable for replay compatibility', () => {
    const sequence = collectPatternSequence(
      createRunGenerationState(60),
      PROTOTYPE_HAZARD_PATTERN_FIXTURES,
      8,
    );

    expect(sequence.choices).toEqual([
      { catalogIndex: 0, patternId: 'prototype-line' },
      { catalogIndex: 0, patternId: 'prototype-line' },
      { catalogIndex: 0, patternId: 'prototype-line' },
      { catalogIndex: 1, patternId: 'prototype-corridor' },
      { catalogIndex: 1, patternId: 'prototype-corridor' },
      { catalogIndex: 2, patternId: 'prototype-offset-pair' },
      { catalogIndex: 2, patternId: 'prototype-offset-pair' },
      { catalogIndex: 2, patternId: 'prototype-offset-pair' },
    ]);
  });

  it('allows representative different seeds to produce different sequences', () => {
    const first = collectPatternSequence(
      createRunGenerationState('pattern-seed-a'),
      PROTOTYPE_HAZARD_PATTERN_FIXTURES,
      12,
    );
    const second = collectPatternSequence(
      createRunGenerationState('pattern-seed-b'),
      PROTOTYPE_HAZARD_PATTERN_FIXTURES,
      12,
    );

    expect(second.choices).not.toEqual(first.choices);
  });

  it('continues deterministically from saved explicit generation state', () => {
    const initialState = createRunGenerationState(60);
    const prefix = collectPatternSequence(initialState, PROTOTYPE_HAZARD_PATTERN_FIXTURES, 5);
    const savedState = { ...prefix.state };
    const firstContinuation = collectPatternSequence(
      savedState,
      PROTOTYPE_HAZARD_PATTERN_FIXTURES,
      8,
    );
    const repeatedContinuation = collectPatternSequence(
      savedState,
      PROTOTYPE_HAZARD_PATTERN_FIXTURES,
      8,
    );

    expect(repeatedContinuation).toEqual(firstContinuation);
  });

  it('selects the only pattern while consuming exactly one PRNG step per call', () => {
    const initialState = createRunGenerationState('single-pattern');
    const first = generateNextPattern(initialState, [PROTOTYPE_LINE_PATTERN]);
    const second = generateNextPattern(first.state, [PROTOTYPE_LINE_PATTERN]);

    expect(first.pattern).toBe(PROTOTYPE_LINE_PATTERN);
    expect(first.catalogIndex).toBe(0);
    expect(second.pattern).toBe(PROTOTYPE_LINE_PATTERN);
    expect(first.state.prngState).not.toBe(initialState.prngState);
    expect(second.state.prngState).not.toBe(first.state.prngState);
  });

  it('treats catalog order as deterministic and sequence-significant', () => {
    const state = createRunGenerationState('catalog-order');
    const original = generateNextPattern(state, PROTOTYPE_HAZARD_PATTERN_FIXTURES);
    const reordered = generateNextPattern(state, [
      PROTOTYPE_CORRIDOR_PATTERN,
      PROTOTYPE_OFFSET_PAIR_PATTERN,
      PROTOTYPE_LINE_PATTERN,
    ]);

    expect(reordered.catalogIndex).toBe(original.catalogIndex);
    expect(reordered.pattern.id).not.toBe(original.pattern.id);
    expect(reordered.state).toEqual(original.state);
  });

  it('does not mutate the supplied state, catalog, or pattern data', () => {
    const state = createRunGenerationState('immutable-selection');
    const stateSnapshot = { ...state };
    const catalogSnapshot = JSON.stringify(PROTOTYPE_HAZARD_PATTERN_FIXTURES);
    const step = generateNextPattern(state, PROTOTYPE_HAZARD_PATTERN_FIXTURES);

    expect(state).toEqual(stateSnapshot);
    expect(JSON.stringify(PROTOTYPE_HAZARD_PATTERN_FIXTURES)).toBe(catalogSnapshot);
    expect(Object.isFrozen(step)).toBe(true);
  });

  it('rejects an empty catalog without advancing the supplied state', () => {
    const state = createRunGenerationState('empty-catalog');
    const stateSnapshot = { ...state };

    expect(() => generateNextPattern(state, [])).toThrow(RangeError);
    expect(state).toEqual(stateSnapshot);
  });

  it('rejects duplicate or empty catalog ids explicitly', () => {
    const state = createRunGenerationState('invalid-catalog');
    const duplicateId = { ...PROTOTYPE_CORRIDOR_PATTERN, id: PROTOTYPE_LINE_PATTERN.id };
    const emptyId = { ...PROTOTYPE_CORRIDOR_PATTERN, id: '   ' };

    expect(() => generateNextPattern(state, [PROTOTYPE_LINE_PATTERN, duplicateId])).toThrow(
      TypeError,
    );
    expect(() => generateNextPattern(state, [emptyId])).toThrow(TypeError);
  });
});
