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
    expect(step.state).toMatchObject({ phase: 'charge' });
    expect(step.state.elapsedPhaseSeconds).toBeCloseTo(0.6, 12);
    expect(step.lethalIntervals).toEqual([]);
  });

  it('emits only the exact ON slice when a coarse step crosses CHARGE to ON', () => {
    const charge = stepTimedLaserLifecycle(stepToCharge(), 0.6).state;
    const step = stepTimedLaserLifecycle(charge, 0.5);

    expect(step.lethalIntervals).toHaveLength(1);
    expect(step.lethalIntervals[0]?.startSeconds).toBeCloseTo(0.2, 12);
    expect(step.lethalIntervals[0]?.endSeconds).toBeCloseTo(0.5, 12);
    expect(step.lethalIntervals[0]?.endsPhase).toBe(false);
    expect(step.state.phase).toBe('on');
    expect(step.state.elapsedPhaseSeconds).toBeCloseTo(0.3, 12);
  });

  it('clips lethality at ON to RECOVERY inside a coarse step', () => {
    const on = stepTimedLaserLifecycle(createTimedLaserLifecycleState(), 2.7).state;
    expect(on.phase).toBe('on');
    expect(on.elapsedPhaseSeconds).toBeCloseTo(0.2, 12);

    const step = stepTimedLaserLifecycle(on, 0.8);
    expect(step.lethalIntervals).toHaveLength(1);
    expect(step.lethalIntervals[0]?.startSeconds).toBe(0);
    expect(step.lethalIntervals[0]?.endSeconds).toBeCloseTo(0.5, 12);
    expect(step.lethalIntervals[0]?.endsPhase).toBe(true);
    expect(step.state.phase).toBe('recovery');
    expect(step.state.elapsedPhaseSeconds).toBeCloseTo(0.3, 12);
    expect(step.state.complete).toBe(false);
  });

  it('never emits an ON collision interval beyond the current step when boundary epsilon applies', () => {
    const on = stepTimedLaserLifecycle(createTimedLaserLifecycleState(), 2.5).state;
    const delta = PROTOTYPE_TIMED_LASER_CONFIG.onSeconds - 5e-13;
    const step = stepTimedLaserLifecycle(on, delta);

    expect(step.lethalIntervals).toHaveLength(1);
    expect(step.lethalIntervals[0]?.startSeconds).toBe(0);
    expect(step.lethalIntervals[0]?.endSeconds).toBe(delta);
    expect(step.lethalIntervals[0]?.endSeconds).toBeLessThanOrEqual(delta);
    expect(step.lethalIntervals[0]?.endsPhase).toBe(true);
    expect(step.state).toMatchObject({ phase: 'recovery', elapsedPhaseSeconds: 0, complete: false });
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
    expect(step.state).toMatchObject({ complete: false, phase: 'off' });
    expect(step.state.elapsedPhaseSeconds).toBeCloseTo(0.25, 12);
    expect(step.lethalIntervals).toHaveLength(1);
  });

  it('is frame-partition stable across fixed rates and deterministic jitter', () => {
    const totalSeconds = 3.4;
    const baseline = stepTimedLaserLifecycle(createTimedLaserLifecycleState(), totalSeconds);
    const partitions = [
      ...[30, 60, 90, 120, 144].map((hz) => ({ label: `${hz}hz`, steps: [1 / hz] })),
      { label: 'jitter', steps: [0.007, 0.011, 0.005, 0.023] },
    ];

    for (const partition of partitions) {
      let state = createTimedLaserLifecycleState();
      let elapsed = 0;
      let lethalSeconds = 0;
      let stepIndex = 0;
      while (elapsed < totalSeconds) {
        const requested = partition.steps[stepIndex % partition.steps.length] ?? 0;
        const delta = Math.min(requested, totalSeconds - elapsed);
        const step = stepTimedLaserLifecycle(state, delta);
        state = step.state;
        lethalSeconds += step.lethalIntervals.reduce(
          (sum, interval) => sum + interval.endSeconds - interval.startSeconds,
          0,
        );
        elapsed += delta;
        stepIndex += 1;
      }

      expect(state.phase, partition.label).toBe(baseline.state.phase);
      expect(state.elapsedPhaseSeconds, partition.label).toBeCloseTo(
        baseline.state.elapsedPhaseSeconds,
        9,
      );
      expect(state.complete, partition.label).toBe(baseline.state.complete);
      expect(lethalSeconds, partition.label).toBeCloseTo(PROTOTYPE_TIMED_LASER_CONFIG.onSeconds, 9);
    }
  });
});
