import type { PrototypeRunResultSnapshot } from './PrototypeRunResult';

/** Short M5 prototype aftermath before retry is accepted. Tune through focused playtest work. */
export const PROTOTYPE_FAIL_STATE_DURATION_SECONDS = 0.65;

export type PrototypeDeathRetryPhase = 'running' | 'fail-state' | 'retry-ready';

export interface PrototypeDeathRetryState {
  readonly elapsedSeconds: number;
  readonly phase: PrototypeDeathRetryPhase;
  readonly result: Readonly<PrototypeRunResultSnapshot> | null;
}

export const createPrototypeDeathRetryState = (): Readonly<PrototypeDeathRetryState> =>
  Object.freeze({ elapsedSeconds: 0, phase: 'running', result: null });

/**
 * Starts presentation-only aftermath from the already authoritative immutable run result.
 * No gameplay state is copied or recomputed here.
 */
export const enterPrototypeFailState = (
  result: Readonly<PrototypeRunResultSnapshot>,
): Readonly<PrototypeDeathRetryState> =>
  Object.freeze({
    elapsedSeconds: 0,
    phase: 'fail-state',
    result,
  });

/**
 * Advances only the bounded fail-state timer from normalized simulation time.
 * Running and retry-ready are stable until scene orchestration explicitly starts a new run.
 */
export const stepPrototypeDeathRetryState = (
  state: Readonly<PrototypeDeathRetryState>,
  elapsedSeconds: number,
): Readonly<PrototypeDeathRetryState> => {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) {
    throw new RangeError('Death/retry elapsedSeconds must be non-negative and finite.');
  }

  if (state.phase !== 'fail-state' || elapsedSeconds === 0) {
    return state;
  }

  const nextElapsedSeconds = Math.min(
    PROTOTYPE_FAIL_STATE_DURATION_SECONDS,
    state.elapsedSeconds + elapsedSeconds,
  );
  const phase: PrototypeDeathRetryPhase =
    nextElapsedSeconds >= PROTOTYPE_FAIL_STATE_DURATION_SECONDS ? 'retry-ready' : 'fail-state';

  return Object.freeze({
    elapsedSeconds: nextElapsedSeconds,
    phase,
    result: state.result,
  });
};

/** Presentation-only progress for the placeholder tumble; never feeds gameplay authority. */
export const getPrototypeFailStateProgress = (
  state: Readonly<PrototypeDeathRetryState>,
): number => {
  if (state.phase === 'running') {
    return 0;
  }

  if (state.phase === 'retry-ready') {
    return 1;
  }

  return state.elapsedSeconds / PROTOTYPE_FAIL_STATE_DURATION_SECONDS;
};
