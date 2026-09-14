import { describe, expect, it } from 'vitest';
import {
  createPrototypeDeathRetryState,
  enterPrototypeFailState,
  getPrototypeFailStateProgress,
  PROTOTYPE_FAIL_STATE_DURATION_SECONDS,
  stepPrototypeDeathRetryState,
} from '../../src/systems/PrototypeDeathRetryFlow';
import { createPrototypeRunResultSnapshot } from '../../src/systems/PrototypeRunResult';

const RESULT = createPrototypeRunResultSnapshot(1_234.5, {
  collectedCount: 0,
  collectedValue: 0,
  earnedReward: 0,
  grazeCount: 7,
});

describe('PrototypeDeathRetryFlow', () => {
  it('enters a bounded fail state from the authoritative immutable result without copying truth', () => {
    const state = enterPrototypeFailState(RESULT);

    expect(state).toEqual({
      elapsedSeconds: 0,
      phase: 'fail-state',
      result: RESULT,
    });
    expect(state.result).toBe(RESULT);
    expect(Object.isFrozen(state)).toBe(true);
    expect(getPrototypeFailStateProgress(state)).toBe(0);
  });

  it('becomes retry-ready only after the configured normalized-time boundary', () => {
    const initial = enterPrototypeFailState(RESULT);
    const beforeBoundary = stepPrototypeDeathRetryState(
      initial,
      PROTOTYPE_FAIL_STATE_DURATION_SECONDS - 0.01,
    );
    const ready = stepPrototypeDeathRetryState(beforeBoundary, 0.01);

    expect(beforeBoundary.phase).toBe('fail-state');
    expect(getPrototypeFailStateProgress(beforeBoundary)).toBeLessThan(1);
    expect(ready).toEqual({
      elapsedSeconds: PROTOTYPE_FAIL_STATE_DURATION_SECONDS,
      phase: 'retry-ready',
      result: RESULT,
    });
    expect(getPrototypeFailStateProgress(ready)).toBe(1);
  });

  it('does not advance on zero delta and keeps retry-ready stable', () => {
    const initial = enterPrototypeFailState(RESULT);
    expect(stepPrototypeDeathRetryState(initial, 0)).toBe(initial);

    const ready = stepPrototypeDeathRetryState(initial, PROTOTYPE_FAIL_STATE_DURATION_SECONDS);
    expect(stepPrototypeDeathRetryState(ready, 10)).toBe(ready);
    expect(createPrototypeDeathRetryState()).toEqual({
      elapsedSeconds: 0,
      phase: 'running',
      result: null,
    });
  });

  it('rejects invalid elapsed time explicitly', () => {
    const initial = enterPrototypeFailState(RESULT);

    for (const elapsedSeconds of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => stepPrototypeDeathRetryState(initial, elapsedSeconds)).toThrow(RangeError);
    }
  });
});
