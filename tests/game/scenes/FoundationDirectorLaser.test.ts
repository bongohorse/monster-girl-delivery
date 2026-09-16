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
  it('cycles L through five reachable horizontal lanes and registers the real lifecycle', () => {
    const foundation = new Foundation(createAppServices(), true);
    Reflect.set(foundation, 'viewportService', new ViewportService(800, 450));

    const spawnLaser = Reflect.get(foundation, 'spawnDirectorLaserVariant') as () => void;
    expect(spawnLaser).toBeTypeOf('function');

    for (let index = 0; index < 6; index += 1) {
      spawnLaser();
    }

    const hazards = getManualHazards(foundation);
    expect(hazards).toHaveLength(6);
    expect(hazards.map(centerY)).toEqual([96, 146, 195, 244, 294, 96]);
    expect(hazards.map((hazard) => hazard.behavior)).toEqual(
      Array.from({ length: 6 }, () =>
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

  it('resets the Laser lane cycle to LOW when Director hazards are cleared', () => {
    const foundation = new Foundation(createAppServices(), true);
    Reflect.set(foundation, 'viewportService', new ViewportService(800, 450));

    const spawnLaser = Reflect.get(foundation, 'spawnDirectorLaserVariant') as () => void;
    const clearHazards = Reflect.get(foundation, 'clearDirectorHazards') as () => void;

    spawnLaser();
    spawnLaser();
    clearHazards();
    expect(getManualHazards(foundation)).toEqual([]);

    spawnLaser();
    const hazards = getManualHazards(foundation);
    expect(hazards).toHaveLength(1);
    expect(centerY(hazards[0]!)).toBe(96);
    expect(hazards[0]?.behavior).toMatchObject({
      kind: 'laser',
      orientation: 'horizontal',
      span: 'screen',
    });
  });
});
