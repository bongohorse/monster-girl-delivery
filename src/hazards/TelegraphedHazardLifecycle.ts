export type TelegraphedHazardPhase = 'warning' | 'lock' | 'active' | 'expired';

export interface TelegraphedHazardPhaseDurations {
  readonly activeSeconds: number;
  readonly lockSeconds: number;
  readonly warningSeconds: number;
}

/** Logical target-relative warning bounds; presentation decides how to draw them. */
export interface TelegraphedHazardWarningGeometry {
  readonly bottomOffset: number;
  readonly leftOffset: number;
  readonly rightOffset: number;
  readonly topOffset: number;
}

export interface TelegraphedHazardLifecycleConfig {
  readonly durations: Readonly<TelegraphedHazardPhaseDurations>;
  readonly warningGeometry: Readonly<TelegraphedHazardWarningGeometry>;
}

/** Minimal logical player/target information sampled during warning and frozen at lock. */
export interface TelegraphedHazardTarget {
  readonly positionY: number;
  readonly runDistance: number;
}

/** Resolves the logical target at an exact delta offset from the start of the current step. */
export type TelegraphedHazardTargetResolver = (
  deltaTimeSeconds: number,
) => Readonly<TelegraphedHazardTarget>;

export interface TelegraphedHazardLifecycleState {
  readonly elapsedPhaseSeconds: number;
  /** Latest observation while warning; remains unchanged after lock. */
  readonly latestObservedTarget: Readonly<TelegraphedHazardTarget>;
  /** Explicit frozen target from the warning → lock boundary. */
  readonly lockedTarget: Readonly<TelegraphedHazardTarget> | null;
  readonly phase: TelegraphedHazardPhase;
}

export interface TelegraphedHazardPhaseTransition {
  readonly from: Exclude<TelegraphedHazardPhase, 'expired'>;
  readonly to: Exclude<TelegraphedHazardPhase, 'warning'>;
}

/** Half-open lethal interval relative to the start of the most recent lifecycle step. */
export interface TelegraphedHazardActiveInterval {
  readonly endSeconds: number;
  readonly startSeconds: number;
}

export interface TelegraphedHazardLifecycleStep {
  readonly activeInterval: Readonly<TelegraphedHazardActiveInterval> | null;
  readonly state: Readonly<TelegraphedHazardLifecycleState>;
  /** At most one transition can occur in one update, even for an unexpectedly large delta. */
  readonly transition: Readonly<TelegraphedHazardPhaseTransition> | null;
}

const PHASE_AFTER: Readonly<
  Record<Exclude<TelegraphedHazardPhase, 'expired'>, Exclude<TelegraphedHazardPhase, 'warning'>>
> = Object.freeze({
  warning: 'lock',
  lock: 'active',
  active: 'expired',
});

const assertPositiveFinite = (value: number, name: string): void => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive finite number.`);
  }
};

const assertValidWarningGeometry = (geometry: Readonly<TelegraphedHazardWarningGeometry>): void => {
  if (
    !Number.isFinite(geometry.leftOffset) ||
    !Number.isFinite(geometry.rightOffset) ||
    !Number.isFinite(geometry.topOffset) ||
    !Number.isFinite(geometry.bottomOffset)
  ) {
    throw new RangeError('Telegraphed hazard warning offsets must be finite.');
  }

  if (geometry.rightOffset <= geometry.leftOffset || geometry.bottomOffset <= geometry.topOffset) {
    throw new RangeError(
      'Telegraphed hazard warning geometry must have positive width and height.',
    );
  }
};

export const assertValidTelegraphedHazardLifecycleConfig = (
  config: Readonly<TelegraphedHazardLifecycleConfig>,
): void => {
  assertPositiveFinite(config.durations.warningSeconds, 'Hazard warningSeconds');
  assertPositiveFinite(config.durations.lockSeconds, 'Hazard lockSeconds');
  assertPositiveFinite(config.durations.activeSeconds, 'Hazard activeSeconds');
  assertValidWarningGeometry(config.warningGeometry);
};

/** Validates and snapshots authorable logical lifecycle tuning. */
export const createTelegraphedHazardLifecycleConfig = (
  definition: Readonly<TelegraphedHazardLifecycleConfig>,
): Readonly<TelegraphedHazardLifecycleConfig> => {
  assertValidTelegraphedHazardLifecycleConfig(definition);

  return Object.freeze({
    durations: Object.freeze({ ...definition.durations }),
    warningGeometry: Object.freeze({ ...definition.warningGeometry }),
  });
};

/** PROTOTYPE timings and logical warning area; final values require Director playtesting. */
export const PROTOTYPE_TELEGRAPHED_HAZARD_LIFECYCLE_CONFIG = createTelegraphedHazardLifecycleConfig(
  {
    durations: {
      warningSeconds: 0.8,
      lockSeconds: 0.25,
      activeSeconds: 0.6,
    },
    warningGeometry: {
      leftOffset: -32,
      rightOffset: 32,
      topOffset: -48,
      bottomOffset: 48,
    },
  },
);

const snapshotTarget = (
  target: Readonly<TelegraphedHazardTarget>,
): Readonly<TelegraphedHazardTarget> => {
  if (
    !Number.isFinite(target.runDistance) ||
    target.runDistance < 0 ||
    !Number.isFinite(target.positionY)
  ) {
    throw new RangeError(
      'Telegraphed hazard target coordinates must be finite and non-negative in run distance.',
    );
  }

  return Object.freeze({ ...target });
};

const freezeState = (
  state: TelegraphedHazardLifecycleState,
): Readonly<TelegraphedHazardLifecycleState> => Object.freeze(state);

/** Creates the required safe warning phase. There is no constructor path directly to lethal state. */
export const createTelegraphedHazardLifecycle = (
  initialTarget: Readonly<TelegraphedHazardTarget>,
): Readonly<TelegraphedHazardLifecycleState> =>
  freezeState({
    elapsedPhaseSeconds: 0,
    latestObservedTarget: snapshotTarget(initialTarget),
    lockedTarget: null,
    phase: 'warning',
  });

const getPhaseDuration = (
  phase: Exclude<TelegraphedHazardPhase, 'expired'>,
  durations: Readonly<TelegraphedHazardPhaseDurations>,
): number => {
  switch (phase) {
    case 'warning':
      return durations.warningSeconds;
    case 'lock':
      return durations.lockSeconds;
    case 'active':
      return durations.activeSeconds;
  }
};

const createTransition = (
  from: Exclude<TelegraphedHazardPhase, 'expired'>,
  to: Exclude<TelegraphedHazardPhase, 'warning'>,
): Readonly<TelegraphedHazardPhaseTransition> => Object.freeze({ from, to });

const createActiveInterval = (
  startSeconds: number,
  endSeconds: number,
): Readonly<TelegraphedHazardActiveInterval> | null =>
  endSeconds > startSeconds ? Object.freeze({ endSeconds, startSeconds }) : null;

/**
 * Advances from delta already normalized by TimeService. No Phaser Clock, callback, or wall clock
 * owns gameplay timing. Overflow carries into the next phase for frame-rate-independent timing,
 * while the one-transition limit keeps warning, lock, and active observable for at least one update
 * instead of a large frame skipping multiple phases.
 */
export const stepTelegraphedHazardLifecycle = (
  state: Readonly<TelegraphedHazardLifecycleState>,
  elapsedSeconds: number,
  observedTarget: Readonly<TelegraphedHazardTarget>,
  config: Readonly<TelegraphedHazardLifecycleConfig> = PROTOTYPE_TELEGRAPHED_HAZARD_LIFECYCLE_CONFIG,
  resolveTargetAtDelta?: TelegraphedHazardTargetResolver,
): Readonly<TelegraphedHazardLifecycleStep> => {
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) {
    throw new RangeError('Telegraphed hazard elapsedSeconds must be non-negative and finite.');
  }
  if (!Number.isFinite(state.elapsedPhaseSeconds) || state.elapsedPhaseSeconds < 0) {
    throw new RangeError(
      'Telegraphed hazard state elapsedPhaseSeconds must be non-negative and finite.',
    );
  }
  assertValidTelegraphedHazardLifecycleConfig(config);

  if (elapsedSeconds === 0 || state.phase === 'expired') {
    return Object.freeze({ activeInterval: null, state, transition: null });
  }

  const duration = getPhaseDuration(state.phase, config.durations);
  const elapsedPhaseSeconds = state.elapsedPhaseSeconds + elapsedSeconds;

  if (!Number.isFinite(elapsedPhaseSeconds)) {
    throw new RangeError('Telegraphed hazard accumulated phase time must remain finite.');
  }

  if (elapsedPhaseSeconds < duration) {
    const latestObservedTarget =
      state.phase === 'warning'
        ? snapshotTarget(
            resolveTargetAtDelta ? resolveTargetAtDelta(elapsedSeconds) : observedTarget,
          )
        : state.latestObservedTarget;

    return Object.freeze({
      activeInterval: state.phase === 'active' ? createActiveInterval(0, elapsedSeconds) : null,
      state: freezeState({
        ...state,
        elapsedPhaseSeconds,
        latestObservedTarget,
      }),
      transition: null,
    });
  }

  const nextPhase = PHASE_AFTER[state.phase];
  const timeToBoundary = Math.max(
    0,
    Math.min(elapsedSeconds, duration - state.elapsedPhaseSeconds),
  );
  let lockedTarget = state.lockedTarget;
  let latestObservedTarget = state.latestObservedTarget;

  if (state.phase === 'warning') {
    const boundaryTarget = resolveTargetAtDelta
      ? resolveTargetAtDelta(timeToBoundary)
      : observedTarget;
    lockedTarget = snapshotTarget(boundaryTarget);
    latestObservedTarget = lockedTarget;
  }

  const nextState = freezeState({
    elapsedPhaseSeconds: nextPhase === 'expired' ? 0 : elapsedPhaseSeconds - duration,
    latestObservedTarget,
    lockedTarget,
    phase: nextPhase,
  });

  return Object.freeze({
    activeInterval:
      state.phase === 'lock'
        ? createActiveInterval(timeToBoundary, elapsedSeconds)
        : state.phase === 'active'
          ? createActiveInterval(0, timeToBoundary)
          : null,
    state: nextState,
    transition: createTransition(state.phase, nextPhase),
  });
};

/** Logical collision/presentation code may be lethal only during this phase. */
export const isTelegraphedHazardLethal = (
  state: Readonly<TelegraphedHazardLifecycleState>,
): boolean => state.phase === 'active';
