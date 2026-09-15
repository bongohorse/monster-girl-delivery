import type { Scene } from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import { PrototypeHazardPresentation } from '../../src/entities/PrototypeHazardPresentation';
import { scheduleNextPattern } from '../../src/generation/PatternSpawnScheduler';
import { PROTOTYPE_MISSILE_PATTERN } from '../../src/generation/PrototypeHazardPatternFixtures';
import { createRunGenerationState } from '../../src/generation/RunGenerationState';
import {
  createTelegraphedHazardSimulationState,
  getPrototypeMissileLaunchRelativeLeft,
  getTelegraphedHazardLifecycle,
  stepTelegraphedHazardSimulation,
} from '../../src/hazards/TelegraphedHazardSimulation';

const createMissileSpawn = () => {
  const schedule = scheduleNextPattern({
    catalog: [PROTOTYPE_MISSILE_PATTERN],
    patternStartDistance: 0,
    state: createRunGenerationState('missile-presentation'),
  });
  if (schedule.status !== 'accepted' || !schedule.spawns[0]) {
    throw new Error('Expected M5 Missile spawn.');
  }
  return schedule.spawns[0];
};

const createSceneFake = () => {
  const graphics = {
    clear: vi.fn(),
    destroy: vi.fn(),
    fillRoundedRect: vi.fn(),
    fillStyle: vi.fn(),
    fillTriangle: vi.fn(),
    lineStyle: vi.fn(),
    setDepth: vi.fn(),
    setPosition: vi.fn(),
    setScale: vi.fn(),
    setVisible: vi.fn(),
    strokeRoundedRect: vi.fn(),
  };
  for (const method of [
    graphics.clear,
    graphics.fillRoundedRect,
    graphics.fillStyle,
    graphics.fillTriangle,
    graphics.lineStyle,
    graphics.setDepth,
    graphics.setPosition,
    graphics.setScale,
    graphics.setVisible,
    graphics.strokeRoundedRect,
  ]) {
    method.mockReturnValue(graphics);
  }

  const camera = { width: 400, zoom: 1 };
  const scene = {
    add: { graphics: vi.fn(() => graphics) },
    cameras: { main: camera },
  } as unknown as Scene;

  return { camera, graphics, scene };
};

describe('M5 Missile presentation', () => {
  it('pins warning to the edge, shows lock, launches offscreen, then crosses the player lane', () => {
    const spawn = createMissileSpawn();
    const { graphics, scene } = createSceneFake();
    const presentation = new PrototypeHazardPresentation(scene, spawn);
    let state = stepTelegraphedHazardSimulation(
      createTelegraphedHazardSimulationState(),
      [spawn],
      0,
      { positionY: 100, runDistance: 0 },
    );

    presentation.render({ distance: 0 }, 100, getTelegraphedHazardLifecycle(state, spawn));
    expect(graphics.setPosition).toHaveBeenLastCalledWith(354, 78);
    expect(graphics.setVisible).toHaveBeenLastCalledWith(true);

    state = stepTelegraphedHazardSimulation(
      state,
      [spawn],
      1.4,
      { positionY: 100, runDistance: 0 },
      (delta) => ({ positionY: 100 + 50 * delta, runDistance: 350 * delta }),
    );
    presentation.render({ distance: 490 }, 100, getTelegraphedHazardLifecycle(state, spawn));
    expect(graphics.setPosition).toHaveBeenLastCalledWith(354, 148);
    expect(graphics.fillStyle).toHaveBeenCalledWith(0xff9f1c, 0.64);
    expect(graphics.lineStyle).toHaveBeenCalledWith(6, 0xffffff, 1);

    state = stepTelegraphedHazardSimulation(state, [spawn], 0.4, {
      positionY: 72,
      runDistance: 630,
    });
    presentation.render({ distance: 630 }, 100, getTelegraphedHazardLifecycle(state, spawn));
    expect(graphics.setPosition).toHaveBeenLastCalledWith(448, 146);

    state = stepTelegraphedHazardSimulation(state, [spawn], 0.5, {
      positionY: 60,
      runDistance: 805,
    });
    presentation.render({ distance: 805 }, 100, getTelegraphedHazardLifecycle(state, spawn));
    expect(graphics.setPosition).toHaveBeenLastCalledWith(98, 146);
  });

  it('adapts locked presentation to resize without changing the committed target', () => {
    const spawn = createMissileSpawn();
    const { camera, graphics, scene } = createSceneFake();
    const presentation = new PrototypeHazardPresentation(scene, spawn);
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

    const locked = getTelegraphedHazardLifecycle(state, spawn);
    if (!locked?.lockedTarget) {
      throw new Error('Expected Missile to be locked before resize.');
    }
    const committedTarget = locked.lockedTarget;
    presentation.render({ distance: 490 }, 100, locked);
    expect(graphics.setPosition).toHaveBeenLastCalledWith(354, 148);

    camera.width = 640;
    presentation.render({ distance: 490 }, 100, locked);

    expect(locked.lockedTarget).toBe(committedTarget);
    expect(locked.lockedTarget.positionY).toBeCloseTo(170, 9);
    expect(graphics.setPosition).toHaveBeenLastCalledWith(594, 148);

    state = stepTelegraphedHazardSimulation(state, [spawn], 0.4, {
      positionY: 40,
      runDistance: 630,
    });
    const active = getTelegraphedHazardLifecycle(state, spawn);
    expect(active?.lockedTarget).toBe(committedTarget);
    expect(active?.lockedTarget?.positionY).toBeCloseTo(170, 9);
  });

  it('keeps an Active Missile on the same logical trajectory when resize moves the player anchor', () => {
    const spawn = createMissileSpawn();
    const { camera, graphics, scene } = createSceneFake();
    const presentation = new PrototypeHazardPresentation(scene, spawn);
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
    state = stepTelegraphedHazardSimulation(
      state,
      [spawn],
      0.4,
      { positionY: 72, runDistance: 630 },
      undefined,
      { playerRunDistance: 630, playerScreenX: 100, viewportLeft: 0, viewportRight: 400 },
    );
    state = stepTelegraphedHazardSimulation(state, [spawn], 0.5, {
      positionY: 60,
      runDistance: 805,
    });

    const active = getTelegraphedHazardLifecycle(state, spawn);
    const launchRelativeLeft = getPrototypeMissileLaunchRelativeLeft(state, spawn);
    expect(active?.phase).toBe('active');
    expect(launchRelativeLeft).toBe(348);

    presentation.render({ distance: 805 }, 100, active, 0, launchRelativeLeft);
    expect(graphics.setPosition).toHaveBeenLastCalledWith(98, 146);

    camera.width = 640;
    presentation.render({ distance: 805 }, 160, active, 0, launchRelativeLeft);
    expect(graphics.setPosition).toHaveBeenLastCalledWith(158, 146);
  });
});
