import { describe, expect, it } from 'vitest';
import { TimeService } from '../../src/core/TimeService';
import {
  createTelegraphedHazardLifecycle,
  createTelegraphedHazardLifecycleConfig,
  isTelegraphedHazardLethal,
  PROTOTYPE_TELEGRAPHED_HAZARD_LIFECYCLE_CONFIG,
  stepTelegraphedHazardLifecycle,
  type TelegraphedHazardLifecycleConfig,
  type TelegraphedHazardLifecycleState,
  type TelegraphedHazardTarget,
} from '../../src/hazards/TelegraphedHazardLifecycle';

const CONFIG = createTelegraphedHazardLifecycleConfig({
  durations: {
    warningSeconds: 0.5,
    lockSeconds: 0.25,
    activeSeconds: 0.75,
  },
  warningGeometry: {
    leftOffset: -20,
    rightOffset: 20,
    topOffset: -30,
    bottomOffset: 30,
  },
});
const INITIAL_TARGET = Object.freeze({ runDistance: 100, positionY: 180 });

const step = (
  state: Readonly<TelegraphedHazardLifecycleState>,
  elapsedSeconds: number,
  observedTarget: Readonly<TelegraphedHazardTarget> = INITIAL_TARGET,
) => stepTelegraphedHazardLifecycle(state, elapsedSeconds, observedTarget, CONFIG);

describe('telegraphed hazard lifecycle', () => {
  it('requires warning and lock before the exact lethal activation boundary', () => {
    const warning = createTelegraphedHazardLifecycle(INITIAL_TARGET);
    expect(warning).toMatchObject({ phase: 'warning', elapsedPhaseSeconds: 0, lockedTarget: null });
    expect(isTelegraphedHazardLethal(warning)).toBe(false);

    const beforeLock = step(warning, 0.499).state;
    expect(beforeLock).toMatchObject({ phase: 'warning', elapsedPhaseSeconds: 0.499 });

    const lockStep = step(beforeLock, 0.001);
    expect(lockStep.transition).toEqual({ from: 'warning', to: 'lock' });
    expect(lockStep.state).toMatchObject({ phase: 'lock', elapsedPhaseSeconds: 0 });
    expect(isTelegraphedHazardLethal(lockStep.state)).toBe(false);

    const beforeActive = step(lockStep.state, 0.249).state;
    expect(beforeActive).toMatchObject({ phase: 'lock', elapsedPhaseSeconds: 0.249 });

    const activeStep = step(beforeActive, 0.001);
    expect(activeStep.transition).toEqual({ from: 'lock', to: 'active' });
    expect(activeStep.state).toMatchObject({ phase: 'active', elapsedPhaseSeconds: 0 });
    expect(isTelegraphedHazardLethal(activeStep.state)).toBe(true);

    const beforeExpiry = step(activeStep.state, 0.749).state;
    expect(beforeExpiry).toMatchObject({ phase: 'active', elapsedPhaseSeconds: 0.749 });
    expect(isTelegraphedHazardLethal(beforeExpiry)).toBe(true);

    const expiredStep = step(beforeExpiry, 0.001);
    expect(expiredStep.transition).toEqual({ from: 'active', to: 'expired' });
    expect(expiredStep.state).toMatchObject({ phase: 'expired', elapsedPhaseSeconds: 0 });
    expect(isTelegraphedHazardLethal(expiredStep.state)).toBe(false);
    expect(step(expiredStep.state, 10).state).toBe(expiredStep.state);
  });

  it('tracks during warning and freezes an immutable target at lock', () => {
    const initial = createTelegraphedHazardLifecycle(INITIAL_TARGET);
    const observed = { runDistance: 125, positionY: 210 };
    const warning = step(initial, 0.25, observed).state;

    expect(warning.latestObservedTarget).toEqual(observed);
    expect(warning.lockedTarget).toBeNull();
    expect(Object.isFrozen(warning)).toBe(true);
    expect(Object.isFrozen(warning.latestObservedTarget)).toBe(true);

    observed.positionY = 999;
    expect(warning.latestObservedTarget.positionY).toBe(210);

    const locked = step(warning, 0.25, { runDistance: 140, positionY: 230 }).state;
    expect(locked.lockedTarget).toEqual({ runDistance: 140, positionY: 230 });
    expect(locked.latestObservedTarget).toBe(locked.lockedTarget);

    const afterPlayerMoves = step(locked, 0.1, { runDistance: 1_000, positionY: 20 }).state;
    expect(afterPlayerMoves.latestObservedTarget).toEqual({ runDistance: 140, positionY: 230 });
    expect(afterPlayerMoves.lockedTarget).toBe(locked.lockedTarget);
  });

  it('does not advance timing or target sampling on zero simulation delta', () => {
    const initial = createTelegraphedHazardLifecycle(INITIAL_TARGET);
    const result = step(initial, 0, { runDistance: 200, positionY: 300 });

    expect(result).toEqual({ state: initial, transition: null });
    expect(result.state).toBe(initial);
    expect(result.state.latestObservedTarget).toEqual(INITIAL_TARGET);
  });

  it('uses TimeService pause/resume handling without consuming hazard phases', () => {
    const time = new TimeService({ maxDeltaSeconds: 1 });
    let state = createTelegraphedHazardLifecycle(INITIAL_TARGET);
    state = step(state, time.update(200), { runDistance: 120, positionY: 200 }).state;
    expect(state).toMatchObject({ phase: 'warning', elapsedPhaseSeconds: 0.2 });

    time.pause();
    state = step(state, time.update(60_000), { runDistance: 500, positionY: 300 }).state;
    expect(state).toMatchObject({
      phase: 'warning',
      elapsedPhaseSeconds: 0.2,
      latestObservedTarget: { runDistance: 120, positionY: 200 },
    });

    time.resume();
    state = step(state, time.update(60_000), { runDistance: 600, positionY: 320 }).state;
    expect(state).toMatchObject({ phase: 'warning', elapsedPhaseSeconds: 0.2 });

    state = step(state, time.update(300), { runDistance: 150, positionY: 220 }).state;
    expect(state).toMatchObject({
      phase: 'lock',
      lockedTarget: { runDistance: 150, positionY: 220 },
    });
    expect(isTelegraphedHazardLethal(state)).toBe(false);
  });

  it('limits an unexpectedly large delta to one observable phase transition', () => {
    let state = createTelegraphedHazardLifecycle(INITIAL_TARGET);

    const lock = step(state, 60).state;
    expect(lock.phase).toBe('lock');
    expect(isTelegraphedHazardLethal(lock)).toBe(false);

    const active = step(lock, 60).state;
    expect(active.phase).toBe('active');
    expect(isTelegraphedHazardLethal(active)).toBe(true);

    state = step(active, 60).state;
    expect(state.phase).toBe('expired');
  });

  it('carries boundary overflow and resolves normal frame partitions identically', () => {
    const simulate = (delta: number, frameCount: number) => {
      let state = createTelegraphedHazardLifecycle(INITIAL_TARGET);
      for (let frame = 0; frame < frameCount; frame += 1) {
        state = step(state, delta).state;
      }
      return state;
    };

    expect(simulate(0.125, 12)).toEqual(simulate(0.0625, 24));
    expect(simulate(0.125, 12)).toMatchObject({
      phase: 'expired',
      elapsedPhaseSeconds: 0,
    });
  });

  it('replays exactly from the same explicit state, config, deltas, and observations', () => {
    const replay = () => {
      let state = createTelegraphedHazardLifecycle(INITIAL_TARGET);
      const trace = [state];
      const frames = [
        { delta: 0.2, target: { runDistance: 110, positionY: 190 } },
        { delta: 0.3, target: { runDistance: 120, positionY: 205 } },
        { delta: 0.1, target: { runDistance: 140, positionY: 250 } },
        { delta: 0.15, target: { runDistance: 160, positionY: 280 } },
        { delta: 0.4, target: { runDistance: 180, positionY: 300 } },
        { delta: 0.35, target: { runDistance: 200, positionY: 320 } },
      ];

      for (const frame of frames) {
        state = step(state, frame.delta, frame.target).state;
        trace.push(state);
      }
      return trace;
    };

    expect(replay()).toEqual(replay());
    expect(JSON.parse(JSON.stringify(replay()))).toEqual(replay());
  });

  it('deeply snapshots configurable PROTOTYPE durations and warning geometry', () => {
    const mutable = {
      durations: { warningSeconds: 1, lockSeconds: 0.5, activeSeconds: 2 },
      warningGeometry: { leftOffset: -10, rightOffset: 10, topOffset: -20, bottomOffset: 20 },
    };
    const config = createTelegraphedHazardLifecycleConfig(mutable);
    mutable.durations.warningSeconds = 10;
    mutable.warningGeometry.leftOffset = -100;

    expect(config).toEqual({
      durations: { warningSeconds: 1, lockSeconds: 0.5, activeSeconds: 2 },
      warningGeometry: { leftOffset: -10, rightOffset: 10, topOffset: -20, bottomOffset: 20 },
    });
    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.durations)).toBe(true);
    expect(Object.isFrozen(config.warningGeometry)).toBe(true);
    expect(Object.isFrozen(PROTOTYPE_TELEGRAPHED_HAZARD_LIFECYCLE_CONFIG)).toBe(true);
  });

  it.each(['warningSeconds', 'lockSeconds', 'activeSeconds'] as const)(
    'rejects invalid %s',
    (duration) => {
      for (const value of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
        expect(() =>
          createTelegraphedHazardLifecycleConfig({
            ...CONFIG,
            durations: { ...CONFIG.durations, [duration]: value },
          }),
        ).toThrow(RangeError);
      }
    },
  );

  it('rejects non-finite, zero-area, and inverted warning geometry', () => {
    const invalidGeometry = [
      { ...CONFIG.warningGeometry, leftOffset: Number.NaN },
      { ...CONFIG.warningGeometry, rightOffset: Number.POSITIVE_INFINITY },
      { ...CONFIG.warningGeometry, rightOffset: CONFIG.warningGeometry.leftOffset },
      { ...CONFIG.warningGeometry, bottomOffset: CONFIG.warningGeometry.topOffset - 1 },
    ];

    for (const warningGeometry of invalidGeometry) {
      expect(() => createTelegraphedHazardLifecycleConfig({ ...CONFIG, warningGeometry })).toThrow(
        RangeError,
      );
    }
  });

  it('rejects invalid deltas, targets, and elapsed state', () => {
    const state = createTelegraphedHazardLifecycle(INITIAL_TARGET);
    for (const elapsedSeconds of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => step(state, elapsedSeconds)).toThrow(RangeError);
    }
    for (const target of [
      { runDistance: -1, positionY: 100 },
      { runDistance: Number.NaN, positionY: 100 },
      { runDistance: 100, positionY: Number.POSITIVE_INFINITY },
    ]) {
      expect(() => createTelegraphedHazardLifecycle(target)).toThrow(RangeError);
      expect(() => step(state, 0.1, target)).toThrow(RangeError);
    }
    expect(() => step({ ...state, elapsedPhaseSeconds: Number.NaN }, 0.1)).toThrow(RangeError);
    expect(() =>
      step({ ...state, elapsedPhaseSeconds: Number.MAX_VALUE }, Number.MAX_VALUE),
    ).toThrow(RangeError);
  });

  it('validates raw config passed directly to stepping', () => {
    const invalid = {
      ...CONFIG,
      durations: { ...CONFIG.durations, warningSeconds: 0 },
    } satisfies TelegraphedHazardLifecycleConfig;
    expect(() =>
      stepTelegraphedHazardLifecycle(
        createTelegraphedHazardLifecycle(INITIAL_TARGET),
        0.1,
        INITIAL_TARGET,
        invalid,
      ),
    ).toThrow(RangeError);
  });
});
