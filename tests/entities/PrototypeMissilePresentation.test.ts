import type { Scene } from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import { PrototypeHazardPresentation } from '../../src/entities/PrototypeHazardPresentation';
import { scheduleNextPattern } from '../../src/generation/PatternSpawnScheduler';
import { PROTOTYPE_MISSILE_PATTERN } from '../../src/generation/PrototypeHazardPatternFixtures';
import { createRunGenerationState } from '../../src/generation/RunGenerationState';
import {
  createTelegraphedHazardSimulationState,
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

  const scene = {
    add: { graphics: vi.fn(() => graphics) },
    cameras: { main: { width: 400, zoom: 1 } },
  } as unknown as Scene;

  return { graphics, scene };
};

describe('M5 Missile presentation', () => {
  it('pins the warning to the right edge, makes lock obvious, then launches the committed strike', () => {
    const spawn = createMissileSpawn();
    const { graphics, scene } = createSceneFake();
    const presentation = new PrototypeHazardPresentation(scene, spawn);
    let state = stepTelegraphedHazardSimulation(
      createTelegraphedHazardSimulationState(),
      [spawn],
      0,
      { positionY: 100, runDistance: 0 },
    );

    presentation.render(
      { distance: 0 },
      100,
      getTelegraphedHazardLifecycle(state, spawn),
    );
    expect(graphics.setPosition).toHaveBeenLastCalledWith(354, 78);
    expect(graphics.setVisible).toHaveBeenLastCalledWith(true);

    state = stepTelegraphedHazardSimulation(
      state,
      [spawn],
      1.4,
      { positionY: 100, runDistance: 0 },
      (delta) => ({ positionY: 100 + 50 * delta, runDistance: 350 * delta }),
    );
    presentation.render(
      { distance: 490 },
      100,
      getTelegraphedHazardLifecycle(state, spawn),
    );
    expect(graphics.setPosition).toHaveBeenLastCalledWith(354, 120);
    expect(graphics.fillStyle).toHaveBeenCalledWith(0xff9f1c, 0.64);
    expect(graphics.lineStyle).toHaveBeenCalledWith(6, 0xffffff, 1);

    state = stepTelegraphedHazardSimulation(state, [spawn], 0.4, {
      positionY: 72,
      runDistance: 630,
    });
    presentation.render(
      { distance: 630 },
      100,
      getTelegraphedHazardLifecycle(state, spawn),
    );
    expect(graphics.setPosition).toHaveBeenLastCalledWith(400, 118);
  });
});
