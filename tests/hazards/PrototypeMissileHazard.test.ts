import { describe, expect, it } from 'vitest';
import { scheduleNextPattern } from '../../src/generation/PatternSpawnScheduler';
import { PROTOTYPE_MISSILE_PATTERN } from '../../src/generation/PrototypeHazardPatternFixtures';
import { createPrototypeHazardVerticalDomain } from '../../src/generation/PrototypeHazardVerticalDomain';
import { createRunGenerationState } from '../../src/generation/RunGenerationState';
import { isTargetLockStrikeHazardBehavior } from '../../src/hazards/HazardArchetype';
import {
  isPrototypeMissileBehavior,
  resolvePrototypeMissileTravelHitbox,
} from '../../src/hazards/PrototypeMissileHazard';
import {
  createTelegraphedHazardSimulationState,
  getLethalHazardsForTelegraphedSimulation,
  getPrototypeMissileLaunchRelativeLeft,
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
  it('can track the player throughout the whole flight band, including the floor and a tall viewport ceiling', () => {
    for (const bounds of [
      { ceilingY: 28, floorY: 362 },
      { ceilingY: -272, floorY: 362 },
    ]) {
      const domain = createPrototypeHazardVerticalDomain(bounds, [PROTOTYPE_MISSILE_PATTERN]);
      const schedule = scheduleNextPattern({
        catalog: domain.catalog,
        constraints: domain.constraints,
        patternStartDistance: 0,
        state: createRunGenerationState('full-height-missile'),
      });
      expect(schedule.status).toBe('accepted');
      if (schedule.status !== 'accepted' || !schedule.spawns[0]) {
        throw new Error('Expected an accepted Missile at this flight height.');
      }
      const spawn = schedule.spawns[0];
      for (const playerY of [bounds.ceilingY, bounds.floorY]) {
        let state = stepTelegraphedHazardSimulation(
          createTelegraphedHazardSimulationState(),
          [spawn],
          0,
          { positionY: playerY, runDistance: 0 },
        );
        state = stepTelegraphedHazardSimulation(state, [spawn], 2.2, {
          positionY: playerY,
          runDistance: 770,
        });
        expect(getLifecycle(state, spawn).phase).toBe('lock');
        expect(getLifecycle(state, spawn).lockedTarget?.positionY).toBe(playerY);
        state = stepTelegraphedHazardSimulation(state, [spawn], 0.8, {
          positionY: bounds.ceilingY,
          runDistance: 1050,
        });
        expect(getLifecycle(state, spawn).phase).toBe('active');
        expect(
          getLethalHazardsForTelegraphedSimulation(state, [spawn], MISSILE_LAYOUT)[0]?.hitbox,
        ).toMatchObject({
          top: playerY - 24,
          bottom: playerY + 24,
        });
      }
    }
  });

  it('trails fast player movement during warning at a bounded chase speed', () => {
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
      latestObservedTarget: { positionY: 172, runDistance: 210 },
      lockedTarget: null,
    });
  });

  it('continues chasing after player thrust reversal until the marker actually catches the player', () => {
    const spawn = createMissileSpawn();
    let state = stepTelegraphedHazardSimulation(
      createTelegraphedHazardSimulationState(),
      [spawn],
      0,
      { positionY: 100, runDistance: 0 },
    );

    state = stepTelegraphedHazardSimulation(state, [spawn], 0.5, {
      positionY: 200,
      runDistance: 175,
    });
    expect(getLifecycle(state, spawn).latestObservedTarget.positionY).toBe(160);

    // The player has started moving upward again (200 -> 190), but is still below the marker.
    // A real chase must continue downward toward the player instead of stopping with the input reversal.
    state = stepTelegraphedHazardSimulation(state, [spawn], 0.2, {
      positionY: 190,
      runDistance: 245,
    });
    expect(getLifecycle(state, spawn).latestObservedTarget.positionY).toBe(184);

    // Only after the player crosses above the marker should the warning marker reverse direction.
    state = stepTelegraphedHazardSimulation(state, [spawn], 0.2, {
      positionY: 140,
      runDistance: 315,
    });
    expect(getLifecycle(state, spawn).latestObservedTarget.positionY).toBe(160);
  });

  it('commits the tracked marker, launches offscreen, and cannot retarget afterward', () => {
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
      2.2,
      { positionY: 100, runDistance: 0 },
      (delta) => ({
        positionY: 100 + (70 / 2.2) * delta,
        runDistance: (490 / 2.2) * delta,
      }),
    );

    const locked = getLifecycle(state, spawn);
    expect(locked.phase).toBe('lock');
    expect(locked.latestObservedTarget.positionY).toBeCloseTo(170, 9);
    expect(locked.latestObservedTarget.runDistance).toBeCloseTo(490, 9);
    expect(locked.lockedTarget?.positionY).toBeCloseTo(170, 9);
    expect(locked.lockedTarget?.runDistance).toBeCloseTo(490, 9);

    state = stepTelegraphedHazardSimulation(state, [spawn], 0.8, {
      positionY: 72,
      runDistance: 630,
    });

    const active = getLifecycle(state, spawn);
    expect(active.phase).toBe('active');
    expect(active.elapsedPhaseSeconds).toBeCloseTo(0, 9);
    expect(active.latestObservedTarget.positionY).toBeCloseTo(170, 9);
    expect(active.lockedTarget?.positionY).toBeCloseTo(170, 9);

    const launched = getLethalHazardsForTelegraphedSimulation(state, [spawn], MISSILE_LAYOUT)[0];
    expect(launched?.hitbox).toEqual({ left: 978, right: 1042, top: 146, bottom: 194 });

    state = stepTelegraphedHazardSimulation(state, [spawn], 0.5, {
      positionY: 60,
      runDistance: 805,
    });
    const crossingLayout = { ...MISSILE_LAYOUT, playerRunDistance: 805 };
    const crossing = getLethalHazardsForTelegraphedSimulation(state, [spawn], crossingLayout)[0];
    expect(crossing?.hitbox).toEqual({ left: 803, right: 867, top: 146, bottom: 194 });
    if (!crossing) {
      throw new Error('Expected active Missile crossing the player lane.');
    }

    expect(
      isPlayerCollidingWithHazard({ distance: 805 }, { positionY: 170, velocityY: 0 }, crossing),
    ).toBe(true);
    expect(
      isPlayerCollidingWithHazard({ distance: 805 }, { positionY: 60, velocityY: 0 }, crossing),
    ).toBe(false);
  });

  it('freezes the Active launch offset so resize cannot change an in-flight Missile trajectory', () => {
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
      2.2,
      { positionY: 100, runDistance: 0 },
      (delta) => ({ positionY: 100 + (70 / 2.2) * delta, runDistance: (490 / 2.2) * delta }),
    );
    state = stepTelegraphedHazardSimulation(
      state,
      [spawn],
      0.8,
      { positionY: 72, runDistance: 630 },
      undefined,
      MISSILE_LAYOUT,
    );

    expect(getPrototypeMissileLaunchRelativeLeft(state, spawn)).toBe(348);

    state = stepTelegraphedHazardSimulation(state, [spawn], 0.5, {
      positionY: 60,
      runDistance: 805,
    });

    const narrowLayout = { ...MISSILE_LAYOUT, playerRunDistance: 805 };
    const wideLayout = {
      playerRunDistance: 805,
      playerScreenX: 160,
      viewportLeft: 0,
      viewportRight: 640,
    };
    const narrow = getLethalHazardsForTelegraphedSimulation(state, [spawn], narrowLayout)[0];
    const wide = getLethalHazardsForTelegraphedSimulation(state, [spawn], wideLayout)[0];
    if (!narrow || !wide) {
      throw new Error('Expected active Missile before and after resize.');
    }

    expect(wide.hitbox).toEqual(narrow.hitbox);
    expect(wide.hitbox).toEqual({ left: 803, right: 867, top: 146, bottom: 194 });
    const narrowScreenLeft =
      narrow.hitbox.left - narrowLayout.playerRunDistance + narrowLayout.playerScreenX;
    const wideScreenLeft =
      wide.hitbox.left - wideLayout.playerRunDistance + wideLayout.playerScreenX;
    expect(narrowScreenLeft - narrowLayout.playerScreenX).toBe(-2);
    expect(wideScreenLeft - wideLayout.playerScreenX).toBe(-2);
    expect(getLifecycle(state, spawn).lockedTarget?.positionY).toBeCloseTo(170, 9);
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

  it('resumes warning from authoritative elapsed time without a targeting or lifecycle jump', () => {
    const spawn = createMissileSpawn();
    let state = stepTelegraphedHazardSimulation(
      createTelegraphedHazardSimulationState(),
      [spawn],
      0,
      { positionY: 100, runDistance: 0 },
    );
    state = stepTelegraphedHazardSimulation(state, [spawn], 1.1, {
      positionY: 150,
      runDistance: 245,
    });

    const beforePause = getLifecycle(state, spawn);
    const paused = stepTelegraphedHazardSimulation(state, [spawn], 0, {
      positionY: 40,
      runDistance: 999,
    });
    expect(paused).toBe(state);
    expect(getLifecycle(paused, spawn)).toEqual(beforePause);

    state = stepTelegraphedHazardSimulation(
      paused,
      [spawn],
      1.1,
      beforePause.latestObservedTarget,
      (delta) => ({
        positionY: 150 + (14 / 1.1) * delta,
        runDistance: 245 + (245 / 1.1) * delta,
      }),
    );

    const resumed = getLifecycle(state, spawn);
    expect(resumed.phase).toBe('lock');
    expect(resumed.elapsedPhaseSeconds).toBeCloseTo(0, 9);
    expect(resumed.lockedTarget).toEqual(resumed.latestObservedTarget);
    expect(resumed.lockedTarget?.positionY).toBeCloseTo(164, 9);
    expect(resumed.lockedTarget?.runDistance).toBeCloseTo(490, 9);
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
        const targetTime = 3.2;

        while (elapsed < targetTime - 1e-12) {
          const delta = Math.min(schedule.getNextDelta(elapsed, steps), targetTime - elapsed);
          const stepStart = elapsed;
          state = stepTelegraphedHazardSimulation(
            state,
            [spawn],
            delta,
            {
              positionY: 100 + (70 / 2.2) * stepStart,
              runDistance: (490 / 2.2) * stepStart,
            },
            (subDelta) => ({
              positionY: 100 + (70 / 2.2) * (stepStart + subDelta),
              runDistance: (490 / 2.2) * (stepStart + subDelta),
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
      expect(result.lifecycle.lockedTarget?.positionY).toBeCloseTo(170, 9);
      expect(result.lifecycle.lockedTarget?.runDistance).toBeCloseTo(490, 9);
      expect(result.hitbox?.left).toBeCloseTo(908, 9);
      expect(result.hitbox?.right).toBeCloseTo(972, 9);
      expect(result.hitbox?.top).toBeCloseTo(146, 9);
      expect(result.hitbox?.bottom).toBeCloseTo(194, 9);
    }
  });
});
