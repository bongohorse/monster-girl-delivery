import { describe, expect, it } from 'vitest';
import {
  createTimedLaserLifecycleConfig,
  createTimedLaserLifecycleState,
  PROTOTYPE_TIMED_LASER_CONFIG,
  stepTimedLaserLifecycle,
} from '../../src/hazards/TimedLaserLifecycle';

const stepToCharge = () =>
  stepTimedLaserLifecycle(
    createTimedLaserLifecycleState(),
    PROTOTYPE_TIMED_LASER_CONFIG.offSeconds + PROTOTYPE_TIMED_LASER_CONFIG.telegraphSeconds,
  ).state;

describe('TimedLaserLifecycle', () => {
  it('uses the Director-approved prototype timings', () => {
    expect(PROTOTYPE_TIMED_LASER_CONFIG).toMatchObject({
      offSeconds: 0.5,
      telegraphSeconds: 1.2,
      chargeSeconds: 0.8,
      onSeconds: 0.7,
      recoverySeconds: 0.4,
      mode: 'one-shot',
    });
    expect(PROTOTYPE_TIMED_LASER_CONFIG.durations).toEqual({
      warningSeconds: 1.7,
      lockSeconds: 0.8,
      activeSeconds: 0.7,
    });
  });

  it('crosses OFF, TELEGRAPH and CHARGE without becoming lethal early', () => {
    let state = createTimedLaserLifecycleState();
    state = stepTimedLaserLifecycle(state, 0.5).state;
    expect(state).toMatchObject({ phase: 'telegraph', elapsedPhaseSeconds: 0 });
    state = stepTimedLaserLifecycle(state, 1.2).state;
    expect(state).toMatchObject({ phase: 'charge', elapsedPhaseSeconds: 0 });
    const step = stepTimedLaserLifecycle(state, 0.6);
    expect(step.state).toMatchObject({ phase: 'charge', elapsedPhaseSeconds: 0.6 });
    expect(step.lethalIntervals).toEqual([]);
  });

  it('emits only the exact ON slice when a coarse step crosses CHARGE to ON', () => {
    const charge = stepTimedLaserLifecycle(stepToCharge(), 0.6).state;
    const step = stepTimedLaserLifecycle(charge, 0.5);

    expect(step.lethalIntervals).toEqual([
      { startSeconds: 0.2, endSeconds: 0.5, endsPhase: false },
    ]);
    expect(step.state.phase).toBe('on');
    expect(step.state.elapsedPhaseSeconds).toBeCloseTo(0.3, 12);
  });

  it('clips lethality at ON to RECOVERY inside a coarse step', () => {
    const on = stepTimedLaserLifecycle(createTimedLaserLifecycleState(), 2.7).state;
    expect(on.phase).toBe('on');
    expect(on.elapsedPhaseSeconds).toBeCloseTo(0.2, 12);

    const step = stepTimedLaserLifecycle(on, 0.8);
    expect(step.lethalIntervals).toEqual([{ startSeconds: 0, endSeconds: 0.5, endsPhase: true }]);
    expect(step.state.phase).toBe('off');
    expect(step.state.complete).toBe(true);
  });

  it('freezes on zero delta and completes one-shot only after recovery', () => {
    const state = stepTimedLaserLifecycle(createTimedLaserLifecycleState(), 3.25).state;
    expect(state.phase).toBe('recovery');
    const frozen = stepTimedLaserLifecycle(state, 0);
    expect(frozen.state).toBe(state);
    expect(frozen.lethalIntervals).toEqual([]);

    const complete = stepTimedLaserLifecycle(state, 0.35).state;
    expect(complete).toEqual({ complete: true, elapsedPhaseSeconds: 0, phase: 'off' });
  });

  it('supports cyclic Laser content without changing the M5 one-shot baseline', () => {
    const cyclic = createTimedLaserLifecycleConfig({
      ...PROTOTYPE_TIMED_LASER_CONFIG,
      mode: 'cyclic',
    });
    const cycleSeconds = 0.5 + 1.2 + 0.8 + 0.7 + 0.4;
    const step = stepTimedLaserLifecycle(
      createTimedLaserLifecycleState(),
      cycleSeconds + 0.25,
      cyclic,
    );
    expect(step.state).toMatchObject({ complete: false, phase: 'off', elapsedPhaseSeconds: 0.25 });
    expect(step.lethalIntervals).toHaveLength(1);
  });

  it('is frame-partition stable across representative fixed rates', () => {
    const totalSeconds = 3.15;
    const baseline = stepTimedLaserLifecycle(createTimedLaserLifecycleState(), totalSeconds).state;

    for (const hz of [30, 60, 90, 120, 144]) {
      let state = createTimedLaserLifecycleState();
      const delta = 1 / hz;
      let elapsed = 0;
      while (elapsed + delta < totalSeconds) {
        state = stepTimedLaserLifecycle(state, delta).state;
        elapsed += delta;
      }
      state = stepTimedLaserLifecycle(state, totalSeconds - elapsed).state;
      expect(state.phase, `${hz}hz`).toBe(baseline.phase);
      expect(state.elapsedPhaseSeconds, `${hz}hz`).toBeCloseTo(baseline.elapsedPhaseSeconds, 9);
      expect(state.complete, `${hz}hz`).toBe(baseline.complete);
    }
  });
});
