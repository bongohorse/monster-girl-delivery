import { describe, expect, it } from 'vitest';
import {
  createRunGenerationState,
  type RunGenerationState,
  stepRunGeneration,
} from '../../src/generation/RunGenerationState';

const collectRunSequence = (
  initialState: Readonly<RunGenerationState>,
  length: number,
): { state: Readonly<RunGenerationState>; values: number[] } => {
  const values: number[] = [];
  let state = initialState;

  for (let index = 0; index < length; index += 1) {
    const step = stepRunGeneration(state);
    values.push(step.value);
    state = step.state;
  }

  return { state, values };
};

describe('run generation state', () => {
  it('starts from an explicit normalized seed and PRNG state', () => {
    const state = createRunGenerationState(-1);

    expect(state).toEqual({ seed: 0xffff_ffff, prngState: 0xffff_ffff });
    expect(Object.isFrozen(state)).toBe(true);
  });

  it('reproduces the same run sequence from the same seed', () => {
    const first = collectRunSequence(createRunGenerationState('m3-test-run'), 10);
    const replay = collectRunSequence(createRunGenerationState('m3-test-run'), 10);

    expect(replay).toEqual(first);
  });

  it('keeps representative different run seeds divergent', () => {
    const first = collectRunSequence(createRunGenerationState('run-a'), 10);
    const second = collectRunSequence(createRunGenerationState('run-b'), 10);

    expect(second.values).not.toEqual(first.values);
  });

  it('continues deterministically from a saved explicit state', () => {
    const initialState = createRunGenerationState(20260904);
    const prefix = collectRunSequence(initialState, 4);
    const savedState = { ...prefix.state };
    const firstContinuation = collectRunSequence(savedState, 6);
    const secondContinuation = collectRunSequence(savedState, 6);

    expect(firstContinuation).toEqual(secondContinuation);
  });

  it('returns new frozen snapshots without mutating earlier state', () => {
    const initialState = createRunGenerationState(75);
    const initialSnapshot = { ...initialState };
    const step = stepRunGeneration(initialState);

    expect(initialState).toEqual(initialSnapshot);
    expect(step.state).not.toBe(initialState);
    expect(step.state.seed).toBe(initialState.seed);
    expect(Object.isFrozen(step)).toBe(true);
    expect(Object.isFrozen(step.state)).toBe(true);
  });

  it('keeps independent sequences isolated when their steps are interleaved', () => {
    const firstInitial = createRunGenerationState('shared-seed');
    const secondInitial = createRunGenerationState('shared-seed');

    const firstStep = stepRunGeneration(firstInitial);
    const secondStep = stepRunGeneration(secondInitial);
    const firstNext = stepRunGeneration(firstStep.state);
    const secondNext = stepRunGeneration(secondStep.state);

    expect(secondStep).toEqual(firstStep);
    expect(secondNext).toEqual(firstNext);
  });
});
