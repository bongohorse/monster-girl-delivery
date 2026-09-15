import type { RunMotionValues } from '../config/RunMotionConfig';

/** Cumulative forward distance through the horizontal run, measured in logical pixels. */
export interface RunMotionState {
  distance: number;
  /**
   * Optional cumulative authoritative simulation time. Canonical live run state initializes this
   * field; focused legacy callers that only need distance may omit it without changing behavior.
   */
  simulationSeconds?: number;
}

/**
 * Advances horizontal run distance using elapsed seconds already normalized by TimeService.
 * The calculation is independent of viewport size and Phaser presentation. Canonical live state
 * also carries cumulative simulation seconds so time-driven hazards can remain independent of run
 * scroll speed while still freezing exactly on zero-delta frames.
 */
export const stepRunMotion = (
  state: Readonly<RunMotionState>,
  elapsedSeconds: number,
  tuning: Readonly<RunMotionValues>,
): RunMotionState => {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) {
    throw new RangeError('elapsedSeconds must be a non-negative finite number.');
  }
  if (
    state.simulationSeconds !== undefined &&
    (!Number.isFinite(state.simulationSeconds) || state.simulationSeconds < 0)
  ) {
    throw new RangeError('simulationSeconds must be non-negative and finite when provided.');
  }

  return {
    distance: state.distance + tuning.baseScrollSpeed * elapsedSeconds,
    ...(state.simulationSeconds === undefined
      ? {}
      : { simulationSeconds: state.simulationSeconds + elapsedSeconds }),
  };
};
