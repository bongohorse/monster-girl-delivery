import type { RunMotionValues } from '../config/RunMotionConfig';

/** Cumulative forward distance through the horizontal run, measured in logical pixels. */
export interface RunMotionState {
  distance: number;
}

/**
 * Advances horizontal run distance using elapsed seconds already normalized by TimeService.
 * The calculation is independent of viewport size and Phaser presentation.
 */
export const stepRunMotion = (
  state: Readonly<RunMotionState>,
  elapsedSeconds: number,
  tuning: Readonly<RunMotionValues>,
): RunMotionState => {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) {
    throw new RangeError('elapsedSeconds must be a non-negative finite number.');
  }

  return {
    distance: state.distance + tuning.baseScrollSpeed * elapsedSeconds,
  };
};
