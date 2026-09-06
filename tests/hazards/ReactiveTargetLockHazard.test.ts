import { describe, expect, it } from 'vitest';
import { TimeService } from '../../src/core/TimeService';
import { scheduleNextPattern } from '../../src/generation/PatternSpawnScheduler';
import { PROTOTYPE_TARGET_LOCK_STRIKE_PATTERN } from '../../src/generation/PrototypeHazardPatternFixtures';
import { createRunGenerationState } from '../../src/generation/RunGenerationState';
import { getHazardSweptHitbox } from '../../src/hazards/HazardArchetype';
import {
  createTelegraphedHazardSimulationState,
  getCollisionHazardsForTelegraphedSimulation,
  getLethalHazardsForTelegraphedSimulation,
  getTelegraphedHazardLifecycle,
  stepTelegraphedHazardSimulation,
  type TelegraphedHazardSimulationState,
} from '../../src/hazards/TelegraphedHazardSimulation';
import { isPlayerCollidingWithHazard } from '../../src/systems/HazardCollision';

const createReactiveSpawn = () => {
  const schedule = scheduleNextPattern({
    catalog: [PROTOTYPE_TARGET_LOCK_STRIKE_PATTERN],
    patternStartDistance: 1_000,
    state: createRunGenerationState('reactive-target-lock'),
  });

  if (schedule.status !== 'accepted' || !schedule.spawns[0]) {
    throw new Error('Expected the reactive target-lock fixture to produce one accepted spawn.');
  }

  return schedule.spawns[0];
};

const getLifecycle = (
  state: Readonly<TelegraphedHazardSimulationState>,
  spawn: ReturnType<typeof createReactiveSpawn>,
) => {
  const lifecycle = getTelegraphedHazardLifecycle(state, spawn);
  if (!lifecycle) {
    throw new Error('Expected a tracked reactive hazard lifecycle.');
  }
  return lifecycle;
};

describe('reactive target-lock hazard', () => {
  it('records the effective player target within its authored fair target band', () => {
    const spawn = createReactiveSpawn();
    const state = stepTelegraphedHazardSimulation(
      createTelegraphedHazardSimulationState(),
      [spawn],
      0,
      { positionY: 500, runDistance: 0 },
    );

    expect(getLifecycle(state, spawn).latestObservedTarget).toEqual({
      positionY: 222,
      runDistance: 0,
    });
  });

  it('samples player state during warning and freezes it at the explicit lock boundary', () => {
    const spawn = createReactiveSpawn();
    let state = stepTelegraphedHazardSimulation(
      createTelegraphedHazardSimulationState(),
      [spawn],
      0,
      { positionY: 100, runDistance: 0 },
    );
    state = stepTelegraphedHazardSimulation(state, [spawn], 0.6, {
      positionY: 140,
      runDistance: 210,
    });
    expect(getLifecycle(state, spawn)).toMatchObject({
      phase: 'warning',
      latestObservedTarget: { positionY: 140, runDistance: 210 },
      lockedTarget: null,
    });

    state = stepTelegraphedHazardSimulation(state, [spawn], 0.8, {
      positionY: 200,
      runDistance: 490,
    });
    expect(getLifecycle(state, spawn)).toMatchObject({
      phase: 'lock',
      latestObservedTarget: { positionY: 200, runDistance: 490 },
      lockedTarget: { positionY: 200, runDistance: 490 },
    });

    state = stepTelegraphedHazardSimulation(state, [spawn], 0.4, {
      positionY: 80,
      runDistance: 630,
    });
    expect(getLifecycle(state, spawn)).toMatchObject({
      phase: 'active',
      latestObservedTarget: { positionY: 200, runDistance: 490 },
      lockedTarget: { positionY: 200, runDistance: 490 },
    });
  });

  it('samples player target at the exact warning-to-lock boundary when a resolver is provided', () => {
    const spawn = createReactiveSpawn();
    // Authored warning duration is 1.4s.
    let state = stepTelegraphedHazardSimulation(
      createTelegraphedHazardSimulationState(),
      [spawn],
      1.0,
      { positionY: 100, runDistance: 0 },
    );
    expect(getLifecycle(state, spawn)).toMatchObject({
      phase: 'warning',
      elapsedPhaseSeconds: 1.0,
    });

    // Step 0.8s. Boundary transition occurs at 1.4 - 1.0 = 0.4s into this step.
    const preStepTarget = { positionY: 100, runDistance: 350 };
    const resolver = (delta: number) => ({
      positionY: 100 + delta * 150, // at delta 0.4: 100 + 60 = 160
      runDistance: 350 + delta * 350, // at delta 0.4: 350 + 140 = 490
    });

    state = stepTelegraphedHazardSimulation(state, [spawn], 0.8, preStepTarget, resolver);

    const lifecycle = getLifecycle(state, spawn);
    expect(lifecycle.phase).toBe('lock');
    expect(lifecycle.elapsedPhaseSeconds).toBeCloseTo(0.4, 9);
    expect(lifecycle.lockedTarget).toEqual({ positionY: 160, runDistance: 490 });
    expect(lifecycle.latestObservedTarget).toBe(lifecycle.lockedTarget);
  });

  it('executes a deterministic fixed strike at the locked height through shared collision', () => {
    const spawn = createReactiveSpawn();
    let state = stepTelegraphedHazardSimulation(
      createTelegraphedHazardSimulationState(),
      [spawn],
      1.4,
      { positionY: 200, runDistance: 490 },
    );
    expect(getLethalHazardsForTelegraphedSimulation(state, [spawn])).toEqual([]);

    state = stepTelegraphedHazardSimulation(state, [spawn], 0.4, {
      positionY: 80,
      runDistance: 630,
    });
    const activeHazard = getLethalHazardsForTelegraphedSimulation(state, [spawn])[0];
    expect(activeHazard?.hitbox).toEqual({ left: 1_120, right: 1_184, top: 176, bottom: 224 });
    if (!activeHazard) {
      throw new Error('Expected the reactive strike to be lethal while active.');
    }

    const playerMotion = { distance: 1_152 };
    expect(
      isPlayerCollidingWithHazard(playerMotion, { positionY: 200, velocityY: 0 }, activeHazard),
    ).toBe(true);
    expect(
      isPlayerCollidingWithHazard(playerMotion, { positionY: 100, velocityY: 0 }, activeHazard),
    ).toBe(false);

    state = stepTelegraphedHazardSimulation(state, [spawn], 0.2, {
      positionY: 80,
      runDistance: 700,
    });
    expect(getLethalHazardsForTelegraphedSimulation(state, [spawn])[0]?.hitbox).toEqual(
      activeHazard.hitbox,
    );
    expect(getCollisionHazardsForTelegraphedSimulation(state, [spawn])[0]).toMatchObject({
      collisionInterval: { startSeconds: 0, endSeconds: 0.2 },
      hitbox: activeHazard.hitbox,
    });

    state = stepTelegraphedHazardSimulation(state, [spawn], 0.8, {
      positionY: 220,
      runDistance: 980,
    });
    expect(getLifecycle(state, spawn).phase).toBe('expired');
    expect(getLethalHazardsForTelegraphedSimulation(state, [spawn])).toEqual([]);
  });

  it('holds target and phase on zero delta, pause, and the first resume frame', () => {
    const spawn = createReactiveSpawn();
    const time = new TimeService({ maxDeltaSeconds: 1 });
    let state = stepTelegraphedHazardSimulation(
      createTelegraphedHazardSimulationState(),
      [spawn],
      time.update(500),
      { positionY: 150, runDistance: 175 },
    );
    const beforePause = state;

    time.pause();
    state = stepTelegraphedHazardSimulation(state, [spawn], time.update(60_000), {
      positionY: 220,
      runDistance: 700,
    });
    expect(state).toBe(beforePause);

    time.resume();
    state = stepTelegraphedHazardSimulation(state, [spawn], time.update(60_000), {
      positionY: 80,
      runDistance: 800,
    });
    expect(state).toBe(beforePause);
    expect(getLifecycle(state, spawn)).toMatchObject({
      phase: 'warning',
      latestObservedTarget: { positionY: 150, runDistance: 175 },
    });
  });

  it('replays identical targets, phase changes, and attacks from the same seed and input timing', () => {
    const replay = () => {
      const spawn = createReactiveSpawn();
      let state = createTelegraphedHazardSimulationState();
      const trace = [];
      const frames = [
        { delta: 0, positionY: 195, runDistance: 0 },
        { delta: 0.4, positionY: 180, runDistance: 140 },
        { delta: 0.5, positionY: 150, runDistance: 315 },
        { delta: 0.5, positionY: 205, runDistance: 490 },
        { delta: 0.4, positionY: 120, runDistance: 630 },
        { delta: 0.5, positionY: 90, runDistance: 805 },
      ];

      for (const frame of frames) {
        state = stepTelegraphedHazardSimulation(state, [spawn], frame.delta, frame);
        trace.push({
          lethalHitboxes: getLethalHazardsForTelegraphedSimulation(state, [spawn]).map(
            (hazard) => hazard.hitbox,
          ),
          lifecycle: getLifecycle(state, spawn),
          spawn,
        });
      }

      return trace;
    };

    expect(replay()).toEqual(replay());
    expect(JSON.parse(JSON.stringify(replay()))).toEqual(replay());
  });

  it('exposes the full target band to the existing conservative fairness authority', () => {
    const entry = PROTOTYPE_TARGET_LOCK_STRIKE_PATTERN.entries[0];
    expect(entry).toBeDefined();
    if (!entry) {
      throw new Error('Expected the reactive fixture entry.');
    }

    expect(getHazardSweptHitbox(entry)).toEqual({
      left: 120,
      right: 184,
      top: 48,
      bottom: 246,
    });
  });
});
