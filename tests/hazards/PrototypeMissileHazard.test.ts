import { describe, expect, it } from 'vitest';
import { scheduleNextPattern } from '../../src/generation/PatternSpawnScheduler';
import { PROTOTYPE_MISSILE_PATTERN } from '../../src/generation/PrototypeHazardPatternFixtures';
import { createRunGenerationState } from '../../src/generation/RunGenerationState';
import { isTargetLockStrikeHazardBehavior } from '../../src/hazards/HazardArchetype';
import {
  isPrototypeMissileBehavior,
  resolvePrototypeMissileTravelHitbox,
} from '../../src/hazards/PrototypeMissileHazard';
import {
  createTelegraphedHazardSimulationState,
  getLethalHazardsForTelegraphedSimulation,
  getTelegraphedHazardLifecycle,
  stepTelegraphedHazardSimulation,
} from '../../src/hazards/TelegraphedHazardSimulation';
import { isPlayerCollidingWithHazard } from '../../src/systems/HazardCollision';
import { STANDARD_FRAME_SCHEDULES } from '../support/FramePartitionHarness';

const MISSILE_LAYOUT = Object.freeze({
  playerRunDistance: 630,
  playerScreenX: 100,
  viewportLeft: 0,
  viewportRight: 400,
});

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

  it('commits the lagged marker, launches offscreen, and cannot retarget afterward', () => {
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

    const locked = getLifecycle(state, spawn);
    expect(locked.phase).toBe('lock');
    expect(locked.latestObservedTarget.positionY).toBeCloseTo(142, 9);
    expect(locked.latestObservedTarget.runDistance).toBeCloseTo(490, 9);
    expect(locked.lockedTarget?.positionY).toBeCloseTo(142, 9);
    expect(locked.lockedTarget?.runDistance).toBeCloseTo(490, 9);

    state = stepTelegraphedHazardSimulation(state, [spawn], 0.4, {
      positionY: 72,
      runDistance: 630,
    });

    const active = getLifecycle(state, spawn);
    expect(active.phase).toBe('active');
    expect(active.elapsedPhaseSeconds).toBeCloseTo(0, 9);
    expect(active.latestObservedTarget.positionY).toBeCloseTo(142, 9);
    expect(active.lockedTarget?.positionY).toBeCloseTo(142, 9);

    const launched = getLethalHazardsForTelegraphedSimulation(state, [spawn], MISSILE_LAYOUT)[0];
    expect(launched?.hitbox).toEqual({ left: 978, right: 1042, top: 118, bottom: 166 });

    state = stepTelegraphedHazardSimulation(state, [spawn], 0.5, {
      positionY: 60,
      runDistance: 805,
    });
    const crossingLayout = { ...MISSILE_LAYOUT, playerRunDistance: 805 };
    const crossing = getLethalHazardsForTelegraphedSimulation(state, [spawn], crossingLayout)[0];
    expect(crossing?.hitbox).toEqual({ left: 803, right: 867, top: 118, bottom: 166 });
    if (!crossing) {
      throw new Error('Expected active Missile crossing the player lane.');
    }

    expect(
      isPlayerCollidingWithHazard({ distance: 805 }, { positionY: 142, velocityY: 0 }, crossing),
    ).toBe(true);
    expect(
      isPlayerCollidingWithHazard({ distance: 805 }, { positionY: 60, velocityY: 0 }, crossing),
    ).toBe(false);
  });

  it('models launch side as data so a left-side Missile travels right', () => {
    const spawn = createMissileSpawn();
    if (
      !isTargetLockStrikeHazardBehavior(spawn.behavior) ||
      !isPrototypeMissileBehavior(spawn.behavior)
    ) {
      throw new Error('Expected M5 Missile behavior.');
    }

    const target = Object.freeze({ positionY: 142, runDistance: 490 });
    const leftLaunch = Object.freeze({
      ...spawn,
      behavior: Object.freeze({
        ...spawn.behavior,
        missile: Object.freeze({ ...spawn.behavior.missile, launchSide: 'left' as const }),
      }),
    });
    const launch = resolvePrototypeMissileTravelHitbox(leftLaunch, target, 0, MISSILE_LAYOUT);
    const later = resolvePrototypeMissileTravelHitbox(leftLaunch, target, 0.5, MISSILE_LAYOUT);

    expect(launch.left - MISSILE_LAYOUT.playerRunDistance + MISSILE_LAYOUT.playerScreenX).toBe(
      -112,
    );
    expect(later.left - MISSILE_LAYOUT.playerRunDistance + MISSILE_LAYOUT.playerScreenX).toBe(238);
    expect(later.left).toBeGreaterThan(launch.left);
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

  it('locks to the same target and travel position across all supported frame partitions', () => {
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
        const missile = getLethalHazardsForTelegraphedSimulation(state, [spawn], {
          ...MISSILE_LAYOUT,
          playerRunDistance: 700,
        })[0];
        return [name, { lifecycle, hitbox: missile?.hitbox }];
      }),
    );

    for (const result of Object.values(results)) {
      expect(result.lifecycle.phase).toBe('active');
      expect(result.lifecycle.lockedTarget?.positionY).toBeCloseTo(142, 9);
      expect(result.lifecycle.lockedTarget?.runDistance).toBeCloseTo(490, 9);
      expect(result.hitbox?.left).toBeCloseTo(908, 9);
      expect(result.hitbox?.right).toBeCloseTo(972, 9);
      expect(result.hitbox?.top).toBeCloseTo(118, 9);
      expect(result.hitbox?.bottom).toBeCloseTo(166, 9);
    }
  });
});
