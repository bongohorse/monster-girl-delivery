import { describe, expect, it } from 'vitest';
import { scheduleNextPattern } from '../../src/generation/PatternSpawnScheduler';
import { PROTOTYPE_MISSILE_PATTERN } from '../../src/generation/PrototypeHazardPatternFixtures';
import { createRunGenerationState } from '../../src/generation/RunGenerationState';
import {
  createTelegraphedHazardSimulationState,
  getLethalHazardsForTelegraphedSimulation,
  getTelegraphedHazardLifecycle,
  stepTelegraphedHazardSimulation,
} from '../../src/hazards/TelegraphedHazardSimulation';
import { isPlayerCollidingWithHazard } from '../../src/systems/HazardCollision';
import { STANDARD_FRAME_SCHEDULES } from '../support/FramePartitionHarness';

const createMissileSpawn = () => {
  const schedule = scheduleNextPattern({
    catalog: [PROTOTYPE_MISSILE_PATTERN],
    patternStartDistance: 0,
    state: createRunGenerationState('m5-missile'),
  });

  if (schedule.status !== 'accepted' || !schedule.spawns[0]) {
    throw new Error('Expected M5 Missile fixture to produce one accepted spawn.');
  }

  return schedule.spawns[0];
};

const getLifecycle = (
  state: ReturnType<typeof createTelegraphedHazardSimulationState>,
  spawn: ReturnType<typeof createMissileSpawn>,
) => {
  const lifecycle = getTelegraphedHazardLifecycle(state, spawn);
  if (!lifecycle) {
    throw new Error('Expected Missile lifecycle.');
  }
  return lifecycle;
};

describe('M5 bait-and-dodge Missile', () => {
  it('trails player movement during warning instead of snapping to the player', () => {
    const spawn = createMissileSpawn();
    let state = stepTelegraphedHazardSimulation(
      createTelegraphedHazardSimulationState(),
      [spawn],
      0,
      { positionY: 100, runDistance: 0 },
    );

    state = stepTelegraphedHazardSimulation(state, [spawn], 0.6, {
      positionY: 180,
      runDistance: 210,
    });

    expect(getLifecycle(state, spawn)).toMatchObject({
      phase: 'warning',
      latestObservedTarget: { positionY: 148, runDistance: 210 },
      lockedTarget: null,
    });
  });

  it('commits the lagged marker at the exact lock boundary and cannot retarget afterward', () => {
    const spawn = createMissileSpawn();
    let state = stepTelegraphedHazardSimulation(
      createTelegraphedHazardSimulationState(),
      [spawn],
      0,
      { positionY: 100, runDistance: 0 },
    );

    state = stepTelegraphedHazardSimulation(
      state,
      [spawn],
      1.4,
      { positionY: 100, runDistance: 0 },
      (delta) => ({
        positionY: 100 + 50 * delta,
        runDistance: 350 * delta,
      }),
    );

    expect(getLifecycle(state, spawn)).toMatchObject({
      phase: 'lock',
      latestObservedTarget: { positionY: 142, runDistance: 490 },
      lockedTarget: { positionY: 142, runDistance: 490 },
    });

    state = stepTelegraphedHazardSimulation(state, [spawn], 0.4, {
      positionY: 72,
      runDistance: 630,
    });

    expect(getLifecycle(state, spawn)).toMatchObject({
      phase: 'active',
      latestObservedTarget: { positionY: 142, runDistance: 490 },
      lockedTarget: { positionY: 142, runDistance: 490 },
    });

    const missile = getLethalHazardsForTelegraphedSimulation(state, [spawn])[0];
    expect(missile?.hitbox).toEqual({ left: 930, right: 994, top: 118, bottom: 166 });
    if (!missile) {
      throw new Error('Expected active Missile.');
    }

    expect(isPlayerCollidingWithHazard({ distance: 962 }, { positionY: 142, velocityY: 0 }, missile)).toBe(
      true,
    );
    expect(isPlayerCollidingWithHazard({ distance: 962 }, { positionY: 60, velocityY: 0 }, missile)).toBe(
      false,
    );
  });

  it('does not advance targeting or lifecycle on zero delta', () => {
    const spawn = createMissileSpawn();
    const state = stepTelegraphedHazardSimulation(
      createTelegraphedHazardSimulationState(),
      [spawn],
      0.5,
      { positionY: 150, runDistance: 175 },
    );
    const unchanged = stepTelegraphedHazardSimulation(state, [spawn], 0, {
      positionY: 72,
      runDistance: 999,
    });

    expect(unchanged).toBe(state);
  });

  it('locks to the same target and strike across all supported frame partitions', () => {
    const spawn = createMissileSpawn();
    const results = Object.fromEntries(
      Object.entries(STANDARD_FRAME_SCHEDULES).map(([name, schedule]) => {
        let state = stepTelegraphedHazardSimulation(
          createTelegraphedHazardSimulationState(),
          [spawn],
          0,
          { positionY: 100, runDistance: 0 },
        );
        let elapsed = 0;
        let steps = 0;
        const targetTime = 2;

        while (elapsed < targetTime - 1e-12) {
          const delta = Math.min(schedule.getNextDelta(elapsed, steps), targetTime - elapsed);
          const stepStart = elapsed;
          state = stepTelegraphedHazardSimulation(
            state,
            [spawn],
            delta,
            {
              positionY: 100 + 50 * stepStart,
              runDistance: 350 * stepStart,
            },
            (subDelta) => ({
              positionY: 100 + 50 * (stepStart + subDelta),
              runDistance: 350 * (stepStart + subDelta),
            }),
          );
          elapsed += delta;
          steps += 1;
        }

        const lifecycle = getLifecycle(state, spawn);
        const missile = getLethalHazardsForTelegraphedSimulation(state, [spawn])[0];
        return [name, { lifecycle, hitbox: missile?.hitbox }];
      }),
    );

    for (const result of Object.values(results)) {
      expect(result.lifecycle.phase).toBe('active');
      expect(result.lifecycle.lockedTarget?.positionY).toBeCloseTo(142, 9);
      expect(result.lifecycle.lockedTarget?.runDistance).toBeCloseTo(490, 9);
      expect(result.hitbox?.left).toBeCloseTo(930, 9);
      expect(result.hitbox?.right).toBeCloseTo(994, 9);
      expect(result.hitbox?.top).toBeCloseTo(118, 9);
      expect(result.hitbox?.bottom).toBeCloseTo(166, 9);
    }
  });
});
