import { describe, expect, it } from 'vitest';
import { PROTOTYPE_FLIGHT_TUNING_DEFAULTS } from '../../src/config/FlightTuningConfig';
import { scheduleNextPattern } from '../../src/generation/PatternSpawnScheduler';
import { PROTOTYPE_TIMED_PULSE_PATTERN } from '../../src/generation/PrototypeHazardPatternFixtures';
import { createRunGenerationState } from '../../src/generation/RunGenerationState';
import {
  createTelegraphedHazardSimulationState,
  getCollisionHazardsForTelegraphedSimulation,
  getTelegraphedHazardLifecycle,
  stepTelegraphedHazardSimulation,
} from '../../src/hazards/TelegraphedHazardSimulation';
import { type PrototypeRunState, stepPrototypeRun } from '../../src/systems/PrototypeRunSimulation';

const createTimedSpawn = () => {
  const schedule = scheduleNextPattern({
    catalog: [PROTOTYPE_TIMED_PULSE_PATTERN],
    patternStartDistance: 1_000,
    state: createRunGenerationState('timed-pulse-graze-expiry'),
  });

  if (schedule.status !== 'accepted' || !schedule.spawns[0]) {
    throw new Error('Expected the timed pulse fixture to produce one accepted spawn.');
  }

  return schedule.spawns[0];
};

const evaluateExpiryStep = (elapsedSeconds: number) => {
  const spawn = createTimedSpawn();
  const playerTarget = Object.freeze({ positionY: 195, runDistance: 0 });
  let lifecycle = createTelegraphedHazardSimulationState();

  lifecycle = stepTelegraphedHazardSimulation(lifecycle, [spawn], 0, playerTarget);
  lifecycle = stepTelegraphedHazardSimulation(lifecycle, [spawn], 1.6, playerTarget);
  lifecycle = stepTelegraphedHazardSimulation(lifecycle, [spawn], 0.25, playerTarget);
  lifecycle = stepTelegraphedHazardSimulation(lifecycle, [spawn], elapsedSeconds, playerTarget);

  expect(getTelegraphedHazardLifecycle(lifecycle, spawn)?.phase).toBe('expired');

  const collisionHazards = getCollisionHazardsForTelegraphedSimulation(lifecycle, [spawn]);
  expect(collisionHazards).toHaveLength(1);
  expect(collisionHazards[0]?.collisionInterval?.startSeconds).toBe(0);
  expect(collisionHazards[0]?.collisionInterval?.endSeconds).toBeCloseTo(0.9, 12);

  const positionY = spawn.hitbox.bottom + 28;
  const distance = (spawn.hitbox.left + spawn.hitbox.right) / 2;
  const result = stepPrototypeRun(
    {
      phase: 'running',
      motion: { distance },
      flight: { positionY, velocityY: 0 },
    },
    elapsedSeconds,
    {
      flightBounds: { ceilingY: -10_000, floorY: 10_000 },
      flightTuning: {
        gravity: 0,
        thrust: 0,
        maxFallVelocity: 1_000,
        maxRiseVelocity: 1_000,
      },
      hazards: collisionHazards,
      runMotionTuning: { baseScrollSpeed: 0 },
      thrustHeld: false,
    },
  );

  expect(result.enteredDead).toBe(false);
  return result.state.graze?.count ?? 0;
};

describe('timed hazard Graze lifecycle boundary', () => {
  it.each([
    { label: 'pending', scrollSpeed: 0, countBeforeExpiry: 0 },
    { label: 'consumed', scrollSpeed: 2_000, countBeforeExpiry: 1 },
  ])(
    'preserves $label Graze across a zero-delta lifecycle update',
    ({ scrollSpeed, countBeforeExpiry }) => {
      const spawn = createTimedSpawn();
      const distance = (spawn.hitbox.left + spawn.hitbox.right) / 2;
      const target = { positionY: 195, runDistance: distance };
      let lifecycle = createTelegraphedHazardSimulationState();
      lifecycle = stepTelegraphedHazardSimulation(lifecycle, [spawn], 1.6, target);
      lifecycle = stepTelegraphedHazardSimulation(lifecycle, [spawn], 0.25, target);
      let state: PrototypeRunState = {
        phase: 'running',
        motion: { distance },
        flight: { positionY: spawn.hitbox.top - 29, velocityY: -300 },
      };
      const advance = (elapsedSeconds: number) => {
        lifecycle = stepTelegraphedHazardSimulation(lifecycle, [spawn], elapsedSeconds, target);
        state = stepPrototypeRun(state, elapsedSeconds, {
          flightBounds: { ceilingY: 28, floorY: 362 },
          flightTuning: { gravity: 0, thrust: 0, maxFallVelocity: 700, maxRiseVelocity: 550 },
          hazards: getCollisionHazardsForTelegraphedSimulation(lifecycle, [spawn]),
          runMotionTuning: { baseScrollSpeed: scrollSpeed },
          thrustHeld: false,
        }).state;
      };

      advance(0.05);
      expect(state.graze?.count).toBe(countBeforeExpiry);
      const beforePause = state.graze;
      advance(0);
      expect(getCollisionHazardsForTelegraphedSimulation(lifecycle, [spawn])).toHaveLength(0);
      expect(state.graze).toBe(beforePause);
      advance(0.05);
      expect(state.graze?.count).toBe(countBeforeExpiry);
      advance(0.8);
      expect(getTelegraphedHazardLifecycle(lifecycle, spawn)?.phase).toBe('expired');
      expect(state.phase).toBe('running');
      expect(state.graze?.count).toBe(1);
      advance(0.01);
      expect(state.graze?.consumedOccurrenceIds).toHaveLength(0);
      expect(state.graze?.pendingOccurrenceIds).toHaveLength(0);
      expect(state.graze?.count).toBe(1);
    },
  );

  it.each([
    ...[30, 60, 90, 120, 144].map((hz) => ({ label: `${hz} Hz`, steps: [1 / hz] })),
    { label: 'jitter', steps: [0.007, 0.011, 0.005, 0.023] },
  ])('never rewards a pulse that subsequently kills the player at $label', ({ steps }) => {
    const spawn = createTimedSpawn();
    const distance = (spawn.hitbox.left + spawn.hitbox.right) / 2;
    const target = { positionY: 195, runDistance: distance };
    let lifecycle = createTelegraphedHazardSimulationState();
    lifecycle = stepTelegraphedHazardSimulation(lifecycle, [spawn], 1.6, target);
    lifecycle = stepTelegraphedHazardSimulation(lifecycle, [spawn], 0.25, target);
    let state: PrototypeRunState = {
      phase: 'running',
      motion: { distance },
      flight: { positionY: spawn.hitbox.top - 29, velocityY: 300 },
    };

    for (let index = 0; index < 10 && state.phase === 'running'; index += 1) {
      const elapsedSeconds = steps[index % steps.length];
      lifecycle = stepTelegraphedHazardSimulation(lifecycle, [spawn], elapsedSeconds, target);
      state = stepPrototypeRun(state, elapsedSeconds, {
        flightBounds: { ceilingY: 28, floorY: 362 },
        flightTuning: PROTOTYPE_FLIGHT_TUNING_DEFAULTS,
        hazards: getCollisionHazardsForTelegraphedSimulation(lifecycle, [spawn]),
        runMotionTuning: { baseScrollSpeed: 300 },
        thrustHeld: false,
      }).state;
    }

    expect(getTelegraphedHazardLifecycle(lifecycle, spawn)?.phase).toBe('active');
    expect(state.phase).toBe('dead');
    expect(state.finalResult?.grazeCount).toBe(0);
  });

  it('resolves the same Graze when Active expiry lands on or inside the enclosing step boundary', () => {
    expect(evaluateExpiryStep(0.9)).toBe(1);
    expect(evaluateExpiryStep(0.91)).toBe(1);
  });
});
