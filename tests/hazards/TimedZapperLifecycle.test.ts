import { describe, expect, it } from 'vitest';
import {
  createTimedZapperLifecycleState,
  PROTOTYPE_TIMED_ZAPPER_CONFIG,
  stepTimedZapperLifecycle,
  type TimedZapperLifecycleState,
} from '../../src/hazards/TimedZapperLifecycle';
import { STANDARD_FRAME_SCHEDULES } from '../support/FramePartitionHarness';

const advance = (state: Readonly<TimedZapperLifecycleState>, elapsedSeconds: number) =>
  stepTimedZapperLifecycle(state, elapsedSeconds, PROTOTYPE_TIMED_ZAPPER_CONFIG);

const expectInterval = (
  interval: Readonly<{ startSeconds: number; endSeconds: number; endsPhase: boolean }> | undefined,
  startSeconds: number,
  endSeconds: number,
  endsPhase: boolean,
): void => {
  expect(interval?.startSeconds).toBeCloseTo(startSeconds, 12);
  expect(interval?.endSeconds).toBeCloseTo(endSeconds, 12);
  expect(interval?.endsPhase).toBe(endsPhase);
};

describe('Timed Zapper lifecycle', () => {
  it('uses the approved OFF -> CHARGE -> ON -> OFF cyclic timings', () => {
    let state = createTimedZapperLifecycleState();

    state = advance(state, 0.8).state;
    expect(state).toEqual({ phase: 'charge', elapsedPhaseSeconds: 0, complete: false });

    state = advance(state, 0.6).state;
    expect(state).toEqual({ phase: 'on', elapsedPhaseSeconds: 0, complete: false });

    state = advance(state, 1.2).state;
    expect(state).toEqual({ phase: 'off', elapsedPhaseSeconds: 0, complete: false });
  });

  it('exposes only the ON portion when one coarse step crosses CHARGE -> ON', () => {
    const charge = advance(createTimedZapperLifecycleState(), 1.2).state;
    const result = advance(charge, 0.4);

    expect(result.lethalIntervals).toHaveLength(1);
    expectInterval(result.lethalIntervals[0], 0.2, 0.4, false);
    expect(result.state.phase).toBe('on');
    expect(result.state.elapsedPhaseSeconds).toBeCloseTo(0.2, 12);
  });

  it('cuts lethality exactly at ON -> OFF instead of extending it to the frame end', () => {
    const on = advance(createTimedZapperLifecycleState(), 2.4).state;
    const result = advance(on, 0.4);

    expect(result.lethalIntervals).toHaveLength(1);
    expectInterval(result.lethalIntervals[0], 0, 0.2, true);
    expect(result.state.phase).toBe('off');
    expect(result.state.elapsedPhaseSeconds).toBeCloseTo(0.2, 12);
  });

  it('can carry multiple exact ON slices through an unexpectedly large delta without a fixed step', () => {
    const result = advance(createTimedZapperLifecycleState(), 6.6);

    expect(result.lethalIntervals).toHaveLength(2);
    expectInterval(result.lethalIntervals[0], 1.4, 2.6, true);
    expectInterval(result.lethalIntervals[1], 4, 5.2, true);
    expect(result.state.phase).toBe('on');
    expect(result.state.elapsedPhaseSeconds).toBeCloseTo(0, 12);
  });

  it('does not advance or become newly lethal on zero simulation delta', () => {
    const on = advance(createTimedZapperLifecycleState(), 1.6).state;
    const result = advance(on, 0);

    expect(result.state).toBe(on);
    expect(result.lethalIntervals).toEqual([]);
  });

  it('supports one-shot data that cannot reactivate after its first ON phase', () => {
    const config = { ...PROTOTYPE_TIMED_ZAPPER_CONFIG, mode: 'one-shot' as const };
    const completed = stepTimedZapperLifecycle(createTimedZapperLifecycleState(), 2.6, config);

    expect(completed.state).toEqual({ phase: 'off', elapsedPhaseSeconds: 0, complete: true });
    expect(completed.lethalIntervals).toHaveLength(1);
    expectInterval(completed.lethalIntervals[0], 1.4, 2.6, true);
    expect(stepTimedZapperLifecycle(completed.state, 10, config).lethalIntervals).toEqual([]);
  });

  it('reaches equivalent phase state across standard frame partitions including jitter', () => {
    for (const schedule of Object.values(STANDARD_FRAME_SCHEDULES)) {
      let state = createTimedZapperLifecycleState();
      let elapsed = 0;
      let stepIndex = 0;

      while (elapsed < 3) {
        const delta = Math.min(schedule.getNextDelta(elapsed, stepIndex), 3 - elapsed);
        state = advance(state, delta).state;
        elapsed += delta;
        stepIndex += 1;
      }

      expect(state.phase, schedule.name).toBe('off');
      expect(state.complete, schedule.name).toBe(false);
      expect(state.elapsedPhaseSeconds, schedule.name).toBeCloseTo(0.4, 9);
    }
  });
});
