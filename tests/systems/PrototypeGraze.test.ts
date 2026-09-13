import { describe, expect, it } from 'vitest';
import type { LogicalHazard } from '../../src/systems/HazardCollision';
import {
  createPrototypeRunState,
  type PrototypeRunState,
  stepPrototypeRun,
} from '../../src/systems/PrototypeRunSimulation';

const BOUNDS = Object.freeze({ ceilingY: -100, floorY: 100 });
const FLIGHT = Object.freeze({
  gravity: 0,
  thrust: 0,
  maxFallVelocity: 1000,
  maxRiseVelocity: 1000,
});
const MOTION = Object.freeze({ baseScrollSpeed: 100 });

const hazard = (
  id: string,
  top: number,
  bottom: number,
  left = 50,
  right = 60,
): Readonly<LogicalHazard> =>
  Object.freeze({
    grazeOccurrenceId: id,
    hitbox: Object.freeze({ left, right, top, bottom }),
  }) as Readonly<LogicalHazard>;

const context = (hazards: ReadonlyArray<Readonly<LogicalHazard>>) => ({
  flightBounds: BOUNDS,
  flightTuning: FLIGHT,
  hazards,
  runMotionTuning: MOTION,
  thrustHeld: false,
});

const START: PrototypeRunState = {
  phase: 'running',
  motion: { distance: 0 },
  flight: { positionY: 0, velocityY: 0 },
};

const runPartitioned = (
  steps: ReadonlyArray<number>,
  hazards: ReadonlyArray<Readonly<LogicalHazard>>,
): Readonly<PrototypeRunState> => {
  let state: Readonly<PrototypeRunState> = START;
  for (const step of steps) {
    state = stepPrototypeRun(state, step, context(hazards)).state;
  }
  return state;
};

describe('prototype Graze skill layer', () => {
  it('distinguishes clear miss, Graze-only crossing, and lethal core overlap', () => {
    expect(
      stepPrototypeRun(START, 1, context([hazard('miss', 40, 45)])).state.graze,
    ).toBeUndefined();

    const grazed = stepPrototypeRun(START, 1, context([hazard('graze', 25, 30)]));
    expect(grazed.enteredDead).toBe(false);
    expect(grazed.state.graze?.count).toBe(1);

    const lethal = stepPrototypeRun(START, 1, context([hazard('lethal', 20, 30)]));
    expect(lethal.enteredDead).toBe(true);
    expect(lethal.state.graze).toBeUndefined();
    expect(lethal.state.finalResult?.grazeCount).toBe(0);
  });

  it('keeps positive-area core and Graze boundaries explicit', () => {
    const outerEdge = stepPrototypeRun(START, 1, context([hazard('outer-edge', 32, 40)]));
    expect(outerEdge.enteredDead).toBe(false);
    expect(outerEdge.state.graze).toBeUndefined();

    const outerInside = stepPrototypeRun(START, 1, context([hazard('outer-inside', 31.999, 40)]));
    expect(outerInside.enteredDead).toBe(false);
    expect(outerInside.state.graze?.count).toBe(1);

    const coreEdge = stepPrototypeRun(START, 1, context([hazard('core-edge', 24, 30)]));
    expect(coreEdge.enteredDead).toBe(false);
    expect(coreEdge.state.graze?.count).toBe(1);

    const coreInside = stepPrototypeRun(START, 1, context([hazard('core-inside', 23.999, 30)]));
    expect(coreInside.enteredDead).toBe(true);
    expect(coreInside.state.graze).toBeUndefined();
  });

  it('does not duplicate one occurrence and allows a second occurrence independently', () => {
    const firstHazard = hazard('first', 25, 30, 40, 200);
    const first = stepPrototypeRun(START, 0.5, context([firstHazard])).state;
    const repeated = stepPrototypeRun(first, 0.5, context([firstHazard])).state;
    expect(repeated.graze?.count).toBe(1);

    const second = stepPrototypeRun(
      repeated,
      0.5,
      context([hazard('second', 25, 30, 100, 300)]),
    ).state;
    expect(second.graze?.count).toBe(2);
  });

  it('suppresses a later different-hazard Graze in a terminal enclosing step', () => {
    const result = stepPrototypeRun(
      START,
      1,
      context([hazard('lethal', 20, 30, 20, 30), hazard('later-graze', -30, -25, 70, 80)]),
    );

    expect(result.enteredDead).toBe(true);
    expect(result.state.graze).toBeUndefined();
    expect(result.state.finalResult?.grazeCount).toBe(0);
  });

  it('retains an earlier completed different-hazard Graze before a later lethal opportunity', () => {
    const result = stepPrototypeRun(
      START,
      1.5,
      context([hazard('early-graze', -30, -25, 20, 30), hazard('lethal', 20, 30, 100, 110)]),
    );

    expect(result.enteredDead).toBe(true);
    expect(result.state.graze?.count).toBe(1);
    expect(result.state.finalResult?.grazeCount).toBe(1);
  });

  it('freezes Graze after death and resets it with a fresh run', () => {
    const grazed = stepPrototypeRun(START, 1, context([hazard('graze', 25, 30)])).state;
    const dead = stepPrototypeRun(grazed, 1, context([hazard('death', 20, 30, 100, 110)])).state;
    const repeated = stepPrototypeRun(dead, 10, context([hazard('late', 25, 30, 0, 1000)])).state;

    expect(repeated).toBe(dead);
    expect(repeated.finalResult?.grazeCount).toBe(1);
    expect(createPrototypeRunState(BOUNDS).graze).toBeUndefined();
  });

  it.each([30, 60, 90, 120, 144])('keeps one Graze across %i Hz partitions', (hz) => {
    const step = 1 / hz;
    const state = runPartitioned(
      Array.from({ length: hz }, () => step),
      [hazard('partitioned', 25, 30)],
    );
    expect(state.graze?.count).toBe(1);
  });

  it.each([30, 60, 90, 120, 144])(
    'keeps later Graze suppressed when an earlier lethal contact ends the run at %i Hz',
    (hz) => {
      const step = 1 / hz;
      const state = runPartitioned(
        Array.from({ length: hz }, () => step),
        [hazard('lethal', 20, 30, 20, 30), hazard('later-graze', -30, -25, 70, 80)],
      );
      expect(state.phase).toBe('dead');
      expect(state.finalResult?.grazeCount).toBe(0);
    },
  );

  it.each([30, 60, 90, 120, 144])(
    'retains an earlier completed Graze before a later lethal contact at %i Hz',
    (hz) => {
      const step = 1 / hz;
      const state = runPartitioned(
        Array.from({ length: Math.ceil(1.5 * hz) }, () => step),
        [hazard('early-graze', -30, -25, 20, 30), hazard('lethal', 20, 30, 100, 110)],
      );
      expect(state.phase).toBe('dead');
      expect(state.finalResult?.grazeCount).toBe(1);
    },
  );

  it('keeps one Graze under deterministic jitter partitions', () => {
    const state = runPartitioned(
      [0.07, 0.11, 0.03, 0.19, 0.08, 0.17, 0.05, 0.13, 0.09, 0.08],
      [hazard('jitter', 25, 30)],
    );
    expect(state.graze?.count).toBe(1);
  });

  it('keeps terminal ordering stable under deterministic jitter partitions', () => {
    const steps = [0.07, 0.11, 0.03, 0.19, 0.08, 0.17, 0.05, 0.13, 0.09, 0.08];
    const laterGraze = runPartitioned(steps, [
      hazard('lethal', 20, 30, 20, 30),
      hazard('later-graze', -30, -25, 70, 80),
    ]);
    expect(laterGraze.phase).toBe('dead');
    expect(laterGraze.finalResult?.grazeCount).toBe(0);

    const earlyGraze = runPartitioned(
      [...steps, 0.2, 0.2, 0.1],
      [hazard('early-graze', -30, -25, 20, 30), hazard('lethal', 20, 30, 100, 110)],
    );
    expect(earlyGraze.phase).toBe('dead');
    expect(earlyGraze.finalResult?.grazeCount).toBe(1);
  });
});
