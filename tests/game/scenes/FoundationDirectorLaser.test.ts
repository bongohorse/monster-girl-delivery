import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({
  Scale: { Events: { RESIZE: 'resize' } },
  Scene: class {},
  Scenes: { Events: { SHUTDOWN: 'shutdown' } },
}));

import { createAppServices } from '../../../src/core/AppServices';
import { ViewportService } from '../../../src/core/ViewportService';
import { Foundation } from '../../../src/game/scenes/Foundation';
import type { LogicalHazardSpawnInstance } from '../../../src/generation/PatternSpawnScheduler';
import {
  getTimedLaserLifecycle,
  type TelegraphedHazardSimulationState,
} from '../../../src/hazards/TelegraphedHazardSimulation';

const getManualHazards = (
  foundation: Foundation,
): ReadonlyArray<Readonly<LogicalHazardSpawnInstance>> =>
  Reflect.get(foundation, 'directorManualHazards') as ReadonlyArray<
    Readonly<LogicalHazardSpawnInstance>
  >;

const getLaserLifecycle = (foundation: Foundation, spawn: Readonly<LogicalHazardSpawnInstance>) =>
  getTimedLaserLifecycle(
    Reflect.get(foundation, 'telegraphedHazardState') as Readonly<TelegraphedHazardSimulationState>,
    spawn,
  );

const centerY = (spawn: Readonly<LogicalHazardSpawnInstance>): number =>
  (spawn.hitbox.top + spawn.hitbox.bottom) / 2;

describe('Foundation Director Laser cycle', () => {
  it('cycles from single lanes into multi-Laser groups and registers every lifecycle', () => {
    const foundation = new Foundation(createAppServices(), true);
    Reflect.set(foundation, 'viewportService', new ViewportService(800, 450));

    const spawnLaser = Reflect.get(foundation, 'spawnDirectorLaserVariant') as () => void;
    expect(spawnLaser).toBeTypeOf('function');

    for (let index = 0; index < 6; index += 1) {
      spawnLaser();
    }

    const hazards = getManualHazards(foundation);
    expect(hazards).toHaveLength(8);
    expect(hazards.map(centerY)).toEqual([294, 244, 195, 146, 96, 294, 244, 195]);
    expect(hazards.map((hazard) => hazard.behavior)).toEqual(
      Array.from({ length: 8 }, () =>
        expect.objectContaining({ kind: 'laser', orientation: 'horizontal', span: 'screen' }),
      ),
    );
    for (const hazard of hazards) {
      expect(getLaserLifecycle(foundation, hazard)).toMatchObject({
        complete: false,
        elapsedPhaseSeconds: 0,
        phase: 'off',
      });
    }
  });

  it('resets the Laser lane/group cycle to LOW when Director hazards are cleared', () => {
    const foundation = new Foundation(createAppServices(), true);
    Reflect.set(foundation, 'viewportService', new ViewportService(800, 450));

    const spawnLaser = Reflect.get(foundation, 'spawnDirectorLaserVariant') as () => void;
    const clearHazards = Reflect.get(foundation, 'clearDirectorHazards') as () => void;

    for (let index = 0; index < 7; index += 1) {
      spawnLaser();
    }
    clearHazards();
    expect(getManualHazards(foundation)).toEqual([]);

    spawnLaser();
    const hazards = getManualHazards(foundation);
    expect(hazards).toHaveLength(1);
    const first = hazards[0];
    if (!first) {
      throw new Error('Expected Director LOW Laser after clear.');
    }
    expect(centerY(first)).toBe(294);
    expect(first.behavior).toMatchObject({
      kind: 'laser',
      orientation: 'horizontal',
      span: 'screen',
    });
  });
});
