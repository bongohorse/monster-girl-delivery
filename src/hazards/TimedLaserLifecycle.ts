export type TimedLaserPhase = 'off' | 'telegraph' | 'charge' | 'on' | 'recovery';
export type TimedLaserMode = 'cyclic' | 'one-shot';

export interface TimedLaserCompatibilityDurations {
  readonly activeSeconds: number;
  readonly lockSeconds: number;
  readonly warningSeconds: number;
}

export interface TimedLaserLifecycleConfig {
  readonly chargeSeconds: number;
  /**
   * Compatibility projection for the existing encounter readability authority. OFF + TELEGRAPH are
   * represented as warning, CHARGE as lock, and ON as active. Laser simulation still owns the real
   * five-phase lifecycle including RECOVERY.
   */
  readonly durations: Readonly<TimedLaserCompatibilityDurations>;
  readonly mode: TimedLaserMode;
  readonly offSeconds: number;
  readonly onSeconds: number;
  readonly recoverySeconds: number;
  readonly telegraphSeconds: number;
}

export type TimedLaserLifecycleConfigDefinition = Omit<TimedLaserLifecycleConfig, 'durations'>;

export interface TimedLaserLifecycleState {
  readonly complete: boolean;
  readonly elapsedPhaseSeconds: number;
  readonly phase: TimedLaserPhase;
}

/** Half-open lethal interval relative to the beginning of the current authoritative step. */
export interface TimedLaserLethalInterval {
  readonly endSeconds: number;
  /** True when this interval reaches the ON -> RECOVERY boundary in the current step. */
  readonly endsPhase: boolean;
  readonly startSeconds: number;
}

export interface TimedLaserLifecycleStep {
  readonly lethalIntervals: ReadonlyArray<Readonly<TimedLaserLethalInterval>>;
  readonly state: Readonly<TimedLaserLifecycleState>;
}

const TIMED_LASER_PHASES: ReadonlyArray<TimedLaserPhase> = Object.freeze([
  'off',
  'telegraph',
  'charge',
  'on',
  'recovery',
]);
const TIMED_LASER_BOUNDARY_EPSILON_SECONDS = 1e-12;

const assertPositiveFinite = (value: number, name: string): void => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive finite number.`);
  }
};

export const createTimedLaserLifecycleConfig = (
  definition: Readonly<TimedLaserLifecycleConfigDefinition | TimedLaserLifecycleConfig>,
): Readonly<TimedLaserLifecycleConfig> => {
  assertPositiveFinite(definition.offSeconds, 'Timed Laser offSeconds');
  assertPositiveFinite(definition.telegraphSeconds, 'Timed Laser telegraphSeconds');
  assertPositiveFinite(definition.chargeSeconds, 'Timed Laser chargeSeconds');
  assertPositiveFinite(definition.onSeconds, 'Timed Laser onSeconds');
  assertPositiveFinite(definition.recoverySeconds, 'Timed Laser recoverySeconds');
  if (definition.mode !== 'cyclic' && definition.mode !== 'one-shot') {
    throw new TypeError('Timed Laser mode must be cyclic or one-shot.');
  }

  return Object.freeze({
    chargeSeconds: definition.chargeSeconds,
    durations: Object.freeze({
      activeSeconds: definition.onSeconds,
      lockSeconds: definition.chargeSeconds,
      warningSeconds: definition.offSeconds + definition.telegraphSeconds,
    }),
    mode: definition.mode,
    offSeconds: definition.offSeconds,
    onSeconds: definition.onSeconds,
    recoverySeconds: definition.recoverySeconds,
    telegraphSeconds: definition.telegraphSeconds,
  });
};

export const PROTOTYPE_TIMED_LASER_CONFIG = createTimedLaserLifecycleConfig({
  chargeSeconds: 0.8,
  mode: 'one-shot',
  offSeconds: 0.5,
  onSeconds: 0.7,
  recoverySeconds: 0.4,
  telegraphSeconds: 1.2,
});

export const createTimedLaserLifecycleState = (): Readonly<TimedLaserLifecycleState> =>
  Object.freeze({ complete: false, elapsedPhaseSeconds: 0, phase: 'off' });

const getPhaseDuration = (
  phase: TimedLaserPhase,
  config: Readonly<TimedLaserLifecycleConfig>,
): number => {
  switch (phase) {
    case 'off':
      return config.offSeconds;
    case 'telegraph':
      return config.telegraphSeconds;
    case 'charge':
      return config.chargeSeconds;
    case 'on':
      return config.onSeconds;
    case 'recovery':
      return config.recoverySeconds;
  }
};

const getNextPhase = (phase: TimedLaserPhase): TimedLaserPhase => {
  switch (phase) {
    case 'off':
      return 'telegraph';
    case 'telegraph':
      return 'charge';
    case 'charge':
      return 'on';
    case 'on':
      return 'recovery';
    case 'recovery':
      return 'off';
  }
};

const assertValidState = (
  state: Readonly<TimedLaserLifecycleState>,
  config: Readonly<TimedLaserLifecycleConfig>,
): void => {
  if (!TIMED_LASER_PHASES.includes(state.phase)) {
    throw new TypeError(`Unsupported Timed Laser phase: ${String(state.phase)}`);
  }
  if (!Number.isFinite(state.elapsedPhaseSeconds) || state.elapsedPhaseSeconds < 0) {
    throw new RangeError('Timed Laser elapsedPhaseSeconds must be non-negative and finite.');
  }
  if (state.complete) {
    if (state.phase !== 'off' || state.elapsedPhaseSeconds !== 0) {
      throw new RangeError('Completed one-shot Timed Laser must be OFF at zero elapsed time.');
    }
    return;
  }
  if (state.elapsedPhaseSeconds >= getPhaseDuration(state.phase, config)) {
    throw new RangeError('Timed Laser elapsedPhaseSeconds must remain within the current phase.');
  }
};

/**
 * Advances only from normalized gameplay delta. Overflow crosses any number of phase boundaries in a
 * deterministic way and emits exact ON slices for collision; presentation merely reads the result.
 */
export const stepTimedLaserLifecycle = (
  state: Readonly<TimedLaserLifecycleState>,
  elapsedSeconds: number,
  config: Readonly<TimedLaserLifecycleConfig> = PROTOTYPE_TIMED_LASER_CONFIG,
): Readonly<TimedLaserLifecycleStep> => {
  const snapshotConfig = createTimedLaserLifecycleConfig(config);
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) {
    throw new RangeError('Timed Laser elapsedSeconds must be non-negative and finite.');
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
  const lethalIntervals: TimedLaserLethalInterval[] = [];

  while (remainingSeconds > 0 && !complete) {
    const duration = getPhaseDuration(phase, snapshotConfig);
    const availableSeconds = duration - elapsedPhaseSeconds;
    const reachesBoundary =
      remainingSeconds + TIMED_LASER_BOUNDARY_EPSILON_SECONDS >= availableSeconds;
    const consumedSeconds = reachesBoundary ? availableSeconds : remainingSeconds;

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
    if (remainingSeconds <= TIMED_LASER_BOUNDARY_EPSILON_SECONDS) {
      remainingSeconds = 0;
    }
    elapsedPhaseSeconds += consumedSeconds;

    if (!reachesBoundary) {
      continue;
    }

    if (phase === 'recovery' && snapshotConfig.mode === 'one-shot') {
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

export const isTimedLaserLethal = (state: Readonly<TimedLaserLifecycleState>): boolean =>
  !state.complete && state.phase === 'on';
