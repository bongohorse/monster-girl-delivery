import type { LogicalHazardCollisionInterval } from '../systems/HazardCollision';
import type { HazardGameplayState } from './HazardReactionState';

export type TimedZapperPhase = 'off' | 'charge' | 'on';
export type TimedZapperMode = 'cyclic' | 'one-shot';

export interface TimedZapperLifecycleConfig {
  readonly chargeSeconds: number;
  readonly mode: TimedZapperMode;
  readonly offSeconds: number;
  readonly onSeconds: number;
}

export interface TimedZapperLifecycleState {
  readonly complete: boolean;
  readonly elapsedSeconds: number;
  readonly phase: TimedZapperPhase;
}

export interface TimedZapperStepResult {
  readonly lethalIntervals: readonly Readonly<LogicalHazardCollisionInterval>[];
  readonly state: Readonly<TimedZapperLifecycleState>;
}

export const PROTOTYPE_TIMED_ZAPPER_CONFIG: Readonly<TimedZapperLifecycleConfig> = Object.freeze({
  chargeSeconds: 0.6,
  mode: 'cyclic',
  offSeconds: 0.8,
  onSeconds: 1.2,
});

const assertDuration = (value: number, name: string): void => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive finite number.`);
  }
};

export const createTimedZapperLifecycleConfig = (
  config: Readonly<TimedZapperLifecycleConfig>,
): Readonly<TimedZapperLifecycleConfig> => {
  assertDuration(config.offSeconds, 'Timed Zapper offSeconds');
  assertDuration(config.chargeSeconds, 'Timed Zapper chargeSeconds');
  assertDuration(config.onSeconds, 'Timed Zapper onSeconds');
  if (config.mode !== 'cyclic' && config.mode !== 'one-shot') {
    throw new TypeError('Timed Zapper mode must be cyclic or one-shot.');
  }
  return Object.freeze({ ...config });
};

export const createTimedZapperLifecycleState = (): Readonly<TimedZapperLifecycleState> =>
  Object.freeze({ complete: false, elapsedSeconds: 0, phase: 'off' });

const phaseDuration = (
  phase: TimedZapperPhase,
  config: Readonly<TimedZapperLifecycleConfig>,
): number => {
  switch (phase) {
    case 'off':
      return config.offSeconds;
    case 'charge':
      return config.chargeSeconds;
    case 'on':
      return config.onSeconds;
  }
};

const nextPhase = (phase: TimedZapperPhase): TimedZapperPhase => {
  switch (phase) {
    case 'off':
      return 'charge';
    case 'charge':
      return 'on';
    case 'on':
      return 'off';
  }
};

/**
 * Advances only from caller-supplied simulation delta. Presentation may read the returned phase but
 * cannot advance it. Lethal sub-intervals are relative to this step and reuse shared collision input.
 */
export const stepTimedZapperLifecycle = (
  state: Readonly<TimedZapperLifecycleState>,
  deltaSeconds: number,
  config: Readonly<TimedZapperLifecycleConfig>,
  gameplayState: HazardGameplayState = 'active',
  paused = false,
): Readonly<TimedZapperStepResult> => {
  createTimedZapperLifecycleConfig(config);
  if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
    throw new RangeError('Timed Zapper deltaSeconds must be non-negative and finite.');
  }
  if (state.complete || paused || deltaSeconds === 0) {
    return Object.freeze({ lethalIntervals: Object.freeze([]), state });
  }

  let phase = state.phase;
  let elapsed = state.elapsedSeconds;
  let remaining = deltaSeconds;
  let cursor = 0;
  let complete = false;
  const lethalIntervals: LogicalHazardCollisionInterval[] = [];

  while (remaining > 0 && !complete) {
    const duration = phaseDuration(phase, config);
    const available = duration - elapsed;
    const consumed = Math.min(remaining, available);
    if (phase === 'on' && gameplayState === 'active' && consumed > 0) {
      lethalIntervals.push(Object.freeze({ startSeconds: cursor, endSeconds: cursor + consumed }));
    }
    cursor += consumed;
    remaining -= consumed;
    elapsed += consumed;

    if (elapsed >= duration) {
      if (phase === 'on' && config.mode === 'one-shot') {
        phase = 'off';
        elapsed = 0;
        complete = true;
      } else {
        phase = nextPhase(phase);
        elapsed = 0;
      }
    }
  }

  return Object.freeze({
    lethalIntervals: Object.freeze(lethalIntervals),
    state: Object.freeze({ complete, elapsedSeconds: elapsed, phase }),
  });
};
