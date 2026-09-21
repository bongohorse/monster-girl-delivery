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
  readonly elapsedPhaseSeconds: number;
  readonly phase: TimedZapperPhase;
}

/** Half-open lethal interval relative to the beginning of the current authoritative step. */
export interface TimedZapperLethalInterval {
  readonly endSeconds: number;
  /** True when this interval reaches an ON -> OFF lifecycle boundary inside this step. */
  readonly endsPhase: boolean;
  readonly startSeconds: number;
}

export interface TimedZapperLifecycleStep {
  readonly lethalIntervals: ReadonlyArray<Readonly<TimedZapperLethalInterval>>;
  readonly state: Readonly<TimedZapperLifecycleState>;
}

const TIMED_ZAPPER_PHASES: ReadonlyArray<TimedZapperPhase> = Object.freeze(['off', 'charge', 'on']);
const TIMED_ZAPPER_BOUNDARY_EPSILON_SECONDS = 1e-12;

const assertPositiveFinite = (value: number, name: string): void => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive finite number.`);
  }
};

export const createTimedZapperLifecycleConfig = (
  definition: Readonly<TimedZapperLifecycleConfig>,
): Readonly<TimedZapperLifecycleConfig> => {
  assertPositiveFinite(definition.offSeconds, 'Timed Zapper offSeconds');
  assertPositiveFinite(definition.chargeSeconds, 'Timed Zapper chargeSeconds');
  assertPositiveFinite(definition.onSeconds, 'Timed Zapper onSeconds');
  if (definition.mode !== 'cyclic' && definition.mode !== 'one-shot') {
    throw new TypeError('Timed Zapper mode must be cyclic or one-shot.');
  }

  return Object.freeze({ ...definition });
};

export const PROTOTYPE_TIMED_ZAPPER_CONFIG = createTimedZapperLifecycleConfig({
  chargeSeconds: 1.2,
  mode: 'cyclic',
  offSeconds: 0.8,
  onSeconds: 1.2,
});

export const createTimedZapperLifecycleState = (): Readonly<TimedZapperLifecycleState> =>
  Object.freeze({ complete: false, elapsedPhaseSeconds: 0, phase: 'off' });

const getPhaseDuration = (
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

const getNextPhase = (phase: TimedZapperPhase): TimedZapperPhase => {
  switch (phase) {
    case 'off':
      return 'charge';
    case 'charge':
      return 'on';
    case 'on':
      return 'off';
  }
};

const assertValidState = (
  state: Readonly<TimedZapperLifecycleState>,
  config: Readonly<TimedZapperLifecycleConfig>,
): void => {
  if (!TIMED_ZAPPER_PHASES.includes(state.phase)) {
    throw new TypeError(`Unsupported Timed Zapper phase: ${String(state.phase)}`);
  }
  if (!Number.isFinite(state.elapsedPhaseSeconds) || state.elapsedPhaseSeconds < 0) {
    throw new RangeError('Timed Zapper elapsedPhaseSeconds must be non-negative and finite.');
  }
  if (state.complete) {
    if (state.phase !== 'off' || state.elapsedPhaseSeconds !== 0) {
      throw new RangeError(
        'Completed one-shot Timed Zapper state must be OFF at zero elapsed time.',
      );
    }
    return;
  }
  if (state.elapsedPhaseSeconds >= getPhaseDuration(state.phase, config)) {
    throw new RangeError('Timed Zapper elapsedPhaseSeconds must remain within the current phase.');
  }
};

/**
 * Advances only from caller-supplied simulation delta already normalized by TimeService. Overflow is
 * carried across every crossed phase boundary, and each ON slice is returned as an exact sub-interval
 * relative to this step. Presentation may read the resulting state but cannot advance it.
 */
export const stepTimedZapperLifecycle = (
  state: Readonly<TimedZapperLifecycleState>,
  elapsedSeconds: number,
  config: Readonly<TimedZapperLifecycleConfig> = PROTOTYPE_TIMED_ZAPPER_CONFIG,
): Readonly<TimedZapperLifecycleStep> => {
  const snapshotConfig = createTimedZapperLifecycleConfig(config);
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) {
    throw new RangeError('Timed Zapper elapsedSeconds must be non-negative and finite.');
  }
  assertValidState(state, snapshotConfig);

  if (state.complete || elapsedSeconds === 0) {
    return Object.freeze({ lethalIntervals: Object.freeze([]), state });
  }

  let phase = state.phase;
  let elapsedPhaseSeconds = state.elapsedPhaseSeconds;
  let remainingSeconds = elapsedSeconds;
  let cursorSeconds = 0;
  let complete = false;
  const lethalIntervals: TimedZapperLethalInterval[] = [];

  while (remainingSeconds > 0 && !complete) {
    const duration = getPhaseDuration(phase, snapshotConfig);
    const availableSeconds = duration - elapsedPhaseSeconds;
    const reachesBoundary =
      remainingSeconds + TIMED_ZAPPER_BOUNDARY_EPSILON_SECONDS >= availableSeconds;
    const consumedSeconds = reachesBoundary
      ? Math.min(availableSeconds, remainingSeconds)
      : remainingSeconds;

    if (phase === 'on' && consumedSeconds > 0) {
      lethalIntervals.push(
        Object.freeze({
          startSeconds: cursorSeconds,
          endSeconds: cursorSeconds + consumedSeconds,
          endsPhase: reachesBoundary,
        }),
      );
    }

    cursorSeconds += consumedSeconds;
    remainingSeconds = Math.max(0, remainingSeconds - consumedSeconds);
    if (remainingSeconds <= TIMED_ZAPPER_BOUNDARY_EPSILON_SECONDS) {
      remainingSeconds = 0;
    }
    elapsedPhaseSeconds += consumedSeconds;

    if (!reachesBoundary) {
      continue;
    }

    if (phase === 'on' && snapshotConfig.mode === 'one-shot') {
      phase = 'off';
      elapsedPhaseSeconds = 0;
      complete = true;
      continue;
    }

    phase = getNextPhase(phase);
    elapsedPhaseSeconds = 0;
  }

  return Object.freeze({
    lethalIntervals: Object.freeze(lethalIntervals),
    state: Object.freeze({ complete, elapsedPhaseSeconds, phase }),
  });
};

/** Presentation/debug consumers may read lethality, but collision still owns the actual overlap test. */
export const isTimedZapperLethal = (state: Readonly<TimedZapperLifecycleState>): boolean =>
  !state.complete && state.phase === 'on';
