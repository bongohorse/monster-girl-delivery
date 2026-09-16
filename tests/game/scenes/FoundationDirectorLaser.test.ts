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

describe('Foundation Director Laser cycle', () => {
  it('keeps L on the reachable horizontal M5 Laser and registers the real lifecycle', () => {
    const foundation = new Foundation(createAppServices(), true);
    Reflect.set(foundation, 'viewportService', new ViewportService(800, 450));

    const spawnLaser = Reflect.get(foundation, 'spawnDirectorLaserVariant') as () => void;
    expect(spawnLaser).toBeTypeOf('function');

    spawnLaser();
    spawnLaser();

    const hazards = getManualHazards(foundation);
    expect(hazards).toHaveLength(2);
    expect(hazards.map((hazard) => hazard.behavior)).toEqual([
      expect.objectContaining({ kind: 'laser', orientation: 'horizontal', span: 'screen' }),
      expect.objectContaining({ kind: 'laser', orientation: 'horizontal', span: 'screen' }),
    ]);
    const first = hazards[0];
    const second = hazards[1];
    if (!first || !second) {
      throw new Error('Expected Director horizontal Laser spawns.');
    }
    expect(getLaserLifecycle(foundation, first)).toMatchObject({
      complete: false,
      elapsedPhaseSeconds: 0,
      phase: 'off',
    });
    expect(getLaserLifecycle(foundation, second)).toMatchObject({
      complete: false,
      elapsedPhaseSeconds: 0,
      phase: 'off',
    });
  });

  it('continues to spawn H after Director hazards are cleared', () => {
    const foundation = new Foundation(createAppServices(), true);
    Reflect.set(foundation, 'viewportService', new ViewportService(800, 450));

    const spawnLaser = Reflect.get(foundation, 'spawnDirectorLaserVariant') as () => void;
    const clearHazards = Reflect.get(foundation, 'clearDirectorHazards') as () => void;

    spawnLaser();
    clearHazards();
    expect(getManualHazards(foundation)).toEqual([]);

    spawnLaser();
    const hazards = getManualHazards(foundation);
    expect(hazards).toHaveLength(1);
    expect(hazards[0]?.behavior).toMatchObject({
      kind: 'laser',
      orientation: 'horizontal',
      span: 'screen',
    });
  });
});
