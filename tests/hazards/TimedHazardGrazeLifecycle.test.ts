import { describe, expect, it } from 'vitest';
import { scheduleNextPattern } from '../../src/generation/PatternSpawnScheduler';
import { PROTOTYPE_TIMED_PULSE_PATTERN } from '../../src/generation/PrototypeHazardPatternFixtures';
import { createRunGenerationState } from '../../src/generation/RunGenerationState';
import {
  createTelegraphedHazardSimulationState,
  getCollisionHazardsForTelegraphedSimulation,
  getTelegraphedHazardLifecycle,
  stepTelegraphedHazardSimulation,
} from '../../src/hazards/TelegraphedHazardSimulation';
import { stepPrototypeRun } from '../../src/systems/PrototypeRunSimulation';

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
  it('resolves the same Graze when Active expiry lands on or inside the enclosing step boundary', () => {
    expect(evaluateExpiryStep(0.9)).toBe(1);
    expect(evaluateExpiryStep(0.91)).toBe(1);
  });
});
