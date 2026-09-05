import { describe, expect, it } from 'vitest';
import { TimeService } from '../../src/core/TimeService';
import { scheduleNextPattern } from '../../src/generation/PatternSpawnScheduler';
import { PROTOTYPE_TIMED_PULSE_PATTERN } from '../../src/generation/PrototypeHazardPatternFixtures';
import { createRunGenerationState } from '../../src/generation/RunGenerationState';
import {
  createTimedHazardSimulationState,
  getLethalHazardsForTimedSimulation,
  getTimedHazardLifecycle,
  stepTimedHazardSimulation,
  type TimedHazardSimulationState,
} from '../../src/hazards/TimedHazardSimulation';
import { isPlayerCollidingWithHazard } from '../../src/systems/HazardCollision';

const createTimedSpawn = () => {
  const schedule = scheduleNextPattern({
    catalog: [PROTOTYPE_TIMED_PULSE_PATTERN],
    patternStartDistance: 1_000,
    state: createRunGenerationState('timed-pulse'),
  });

  if (schedule.status !== 'accepted' || !schedule.spawns[0]) {
    throw new Error('Expected the timed pulse fixture to produce one accepted spawn.');
  }

  return schedule.spawns[0];
};

const getLifecycle = (
  state: Readonly<TimedHazardSimulationState>,
  spawn: ReturnType<typeof createTimedSpawn>,
) => {
  const lifecycle = getTimedHazardLifecycle(state, spawn);
  if (!lifecycle) {
    throw new Error('Expected a tracked timed hazard lifecycle.');
  }
  return lifecycle;
};

describe('timed hazard simulation', () => {
  it('advances warning through lock and active before expiring at exact boundaries', () => {
    const spawn = createTimedSpawn();
    let state = stepTimedHazardSimulation(createTimedHazardSimulationState(), [spawn], 0);
    expect(getLifecycle(state, spawn).phase).toBe('warning');
    expect(getLethalHazardsForTimedSimulation(state, [spawn])).toEqual([]);

    state = stepTimedHazardSimulation(state, [spawn], 1.6);
    expect(getLifecycle(state, spawn).phase).toBe('lock');
    expect(getLethalHazardsForTimedSimulation(state, [spawn])).toEqual([]);

    state = stepTimedHazardSimulation(state, [spawn], 0.25);
    expect(getLifecycle(state, spawn).phase).toBe('active');
    expect(getLethalHazardsForTimedSimulation(state, [spawn])).toEqual([spawn]);

    state = stepTimedHazardSimulation(state, [spawn], 0.9);
    expect(getLifecycle(state, spawn).phase).toBe('expired');
    expect(getLethalHazardsForTimedSimulation(state, [spawn])).toEqual([]);
  });

  it('holds on zero delta and cannot skip warning directly into lethal after a large frame', () => {
    const spawn = createTimedSpawn();
    const warning = stepTimedHazardSimulation(createTimedHazardSimulationState(), [spawn], 0);

    expect(stepTimedHazardSimulation(warning, [spawn], 0)).toBe(warning);

    const afterLargeDelta = stepTimedHazardSimulation(warning, [spawn], 60);
    expect(getLifecycle(afterLargeDelta, spawn).phase).toBe('lock');
    expect(getLethalHazardsForTimedSimulation(afterLargeDelta, [spawn])).toEqual([]);
  });

  it('consumes TimeService-normalized delta and remains frozen across pause and resume', () => {
    const spawn = createTimedSpawn();
    const time = new TimeService({ maxDeltaSeconds: 1 });
    let state = stepTimedHazardSimulation(createTimedHazardSimulationState(), [spawn], 0);

    state = stepTimedHazardSimulation(state, [spawn], time.update(500));
    expect(getLifecycle(state, spawn)).toMatchObject({
      phase: 'warning',
      elapsedPhaseSeconds: 0.5,
    });

    time.pause();
    const paused = stepTimedHazardSimulation(state, [spawn], time.update(60_000));
    expect(paused).toBe(state);

    time.resume();
    const firstResumeFrame = stepTimedHazardSimulation(paused, [spawn], time.update(60_000));
    expect(firstResumeFrame).toBe(paused);
  });

  it('feeds the shared collision authority only during the configured lethal phase', () => {
    const spawn = createTimedSpawn();
    const playerMotion = { distance: spawn.hitbox.left + 32 };
    const playerFlight = {
      positionY: (spawn.hitbox.top + spawn.hitbox.bottom) / 2,
      velocityY: 0,
    };
    let state = stepTimedHazardSimulation(createTimedHazardSimulationState(), [spawn], 0);

    expect(getLethalHazardsForTimedSimulation(state, [spawn])).toEqual([]);

    state = stepTimedHazardSimulation(state, [spawn], 1.6);
    state = stepTimedHazardSimulation(state, [spawn], 0.25);
    const activeHazards = getLethalHazardsForTimedSimulation(state, [spawn]);
    expect(activeHazards).toEqual([spawn]);
    const activeHazard = activeHazards[0];
    expect(activeHazard).toBeDefined();
    if (!activeHazard) {
      throw new Error('Expected the timed pulse to be lethal during active.');
    }
    expect(isPlayerCollidingWithHazard(playerMotion, playerFlight, activeHazard)).toBe(true);

    state = stepTimedHazardSimulation(state, [spawn], 0.9);
    expect(getLethalHazardsForTimedSimulation(state, [spawn])).toEqual([]);
  });

  it('replays the same scheduled behavior and lifecycle trace from the same seed and deltas', () => {
    const replay = () => {
      const spawn = createTimedSpawn();
      let state = createTimedHazardSimulationState();
      const trace = [];

      for (const delta of [0, 0.4, 0.6, 0.6, 0.1, 0.15, 0.45, 0.45]) {
        state = stepTimedHazardSimulation(state, [spawn], delta);
        trace.push({
          lifecycle: getLifecycle(state, spawn),
          lethal: getLethalHazardsForTimedSimulation(state, [spawn]).length > 0,
          spawn,
        });
      }

      return trace;
    };

    expect(replay()).toEqual(replay());
    expect(JSON.parse(JSON.stringify(replay()))).toEqual(replay());
  });

  it('removes lifecycle state when a timed spawn leaves the logical stream', () => {
    const spawn = createTimedSpawn();
    const tracked = stepTimedHazardSimulation(createTimedHazardSimulationState(), [spawn], 0);
    const removed = stepTimedHazardSimulation(tracked, [], 0);

    expect(tracked.instances).toHaveLength(1);
    expect(removed).toBe(createTimedHazardSimulationState());
  });
});
