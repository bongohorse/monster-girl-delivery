import { describe, expect, it } from 'vitest';
import { scheduleNextPattern } from '../../src/generation/PatternSpawnScheduler';
import { PROTOTYPE_MISSILE_PATTERN } from '../../src/generation/PrototypeHazardPatternFixtures';
import { createRunGenerationState } from '../../src/generation/RunGenerationState';
import {
  createTelegraphedHazardSimulationState,
  getCollisionHazardsForTelegraphedSimulation,
  getPrototypeMissileLaunchRelativeLeft,
  getTelegraphedHazardLifecycle,
  stepTelegraphedHazardSimulation,
} from '../../src/hazards/TelegraphedHazardSimulation';

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
    state: createRunGenerationState('m5-missile-mid-frame-collision'),
  });

  if (schedule.status !== 'accepted' || !schedule.spawns[0]) {
    throw new Error('Expected M5 Missile fixture to produce one accepted spawn.');
  }

  return schedule.spawns[0];
};

describe('M5 Missile mid-frame launch collision', () => {
  it('back-extrapolates the trajectory so Active starts at the true launch position', () => {
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
      (delta) => ({ positionY: 100 + 50 * delta, runDistance: 350 * delta }),
    );
    expect(getTelegraphedHazardLifecycle(state, spawn)?.phase).toBe('lock');

    // Lock lasts 0.4s, so this 0.5s frame enters Active 0.4s into the frame.
    state = stepTelegraphedHazardSimulation(
      state,
      [spawn],
      0.5,
      { positionY: 72, runDistance: MISSILE_LAYOUT.playerRunDistance },
      undefined,
      MISSILE_LAYOUT,
    );

    const lifecycle = getTelegraphedHazardLifecycle(state, spawn);
    expect(lifecycle?.phase).toBe('active');
    expect(lifecycle?.elapsedPhaseSeconds).toBeCloseTo(0.1, 9);
    expect(getPrototypeMissileLaunchRelativeLeft(state, spawn)).toBe(348);

    const collision = getCollisionHazardsForTelegraphedSimulation(state, [spawn], {
      ...MISSILE_LAYOUT,
      scrollSpeed: 350,
    })[0];
    if (!collision?.collisionInterval || collision.horizontalVelocity === undefined) {
      throw new Error('Expected an Active Missile collision interval and horizontal velocity.');
    }

    expect(collision.collisionInterval.startSeconds).toBeCloseTo(0.4, 9);
    expect(collision.collisionInterval.endSeconds).toBeCloseTo(0.5, 9);
    expect(collision.horizontalVelocity).toBe(-350);

    // At frame start the linear trajectory is intentionally extrapolated 0.4s backward.
    expect(collision.hitbox.left).toBeCloseTo(1258, 9);
    expect(collision.hitbox.right).toBeCloseTo(1322, 9);
    expect(collision.hitbox.top).toBeCloseTo(118, 9);
    expect(collision.hitbox.bottom).toBeCloseTo(166, 9);

    // At the exact Active boundary the Missile must be at its frozen offscreen launch offset,
    // not 0.4s farther along its path as the old clamp-to-zero representation would imply.
    const launchBoundarySeconds = collision.collisionInterval.startSeconds;
    const playerDistanceAtLaunch = MISSILE_LAYOUT.playerRunDistance + 350 * launchBoundarySeconds;
    const missileLeftAtLaunch =
      collision.hitbox.left + collision.horizontalVelocity * launchBoundarySeconds;
    expect(missileLeftAtLaunch - playerDistanceAtLaunch).toBeCloseTo(348, 9);
  });
});
