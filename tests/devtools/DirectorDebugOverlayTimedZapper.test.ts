import { describe, expect, it } from 'vitest';
import { ViewportService } from '../../src/core/ViewportService';
import { createDirectorDebugGeometry } from '../../src/devtools/DirectorDebugOverlay';
import { DIRECTOR_ZAPPER_VARIANTS } from '../../src/generation/DirectorZapperCatalog';
import { scheduleNextPattern } from '../../src/generation/PatternSpawnScheduler';
import { createRunGenerationState } from '../../src/generation/RunGenerationState';
import { createTelegraphedHazardSimulationState } from '../../src/hazards/TelegraphedHazardSimulation';
import {
  createTimedZapperSimulationState,
  stepTimedZapperSimulation,
  type TimedZapperSimulationState,
} from '../../src/hazards/TimedZapperSimulation';

const createTimedZapperSpawn = () => {
  const selection = DIRECTOR_ZAPPER_VARIANTS.find((candidate) => candidate.label === 'TIMED');
  if (!selection) {
    throw new Error('Expected Director TIMED Zapper variant.');
  }

  const schedule = scheduleNextPattern({
    catalog: [selection.pattern],
    patternStartDistance: 0,
    state: createRunGenerationState('director-debug-timed-zapper'),
  });
  if (schedule.status !== 'accepted' || !schedule.spawns[0]) {
    throw new Error('Expected Director TIMED Zapper spawn.');
  }

  return schedule.spawns[0];
};

const createGeometry = (
  timedZappers: Readonly<TimedZapperSimulationState>,
  zapper: ReturnType<typeof createTimedZapperSpawn>,
) =>
  createDirectorDebugGeometry({
    collectibles: [],
    consumedCollectibleIds: [],
    flight: { positionY: 195, velocityY: 0 },
    hazards: [zapper],
    motion: { distance: 0 },
    nextPatternStartDistance: null,
    telegraphedHazards: createTelegraphedHazardSimulationState(),
    timedZappers,
    viewport: new ViewportService(400, 800).getSnapshot(),
  });

describe('DirectorDebugOverlay Timed Zapper authority', () => {
  it('shows OFF and CHARGE as preview geometry and only ON as lethal geometry', () => {
    const zapper = createTimedZapperSpawn();
    let timedZappers = stepTimedZapperSimulation(
      createTimedZapperSimulationState(),
      [zapper],
      0,
    );

    expect(createGeometry(timedZappers, zapper).paths).toHaveLength(3);
    expect(createGeometry(timedZappers, zapper).paths.every((path) => path.kind === 'hazard-preview')).toBe(
      true,
    );

    timedZappers = stepTimedZapperSimulation(timedZappers, [zapper], 0.8);
    expect(createGeometry(timedZappers, zapper).paths.every((path) => path.kind === 'hazard-preview')).toBe(
      true,
    );

    timedZappers = stepTimedZapperSimulation(timedZappers, [zapper], 0.6);
    expect(createGeometry(timedZappers, zapper).paths.every((path) => path.kind === 'hazard-lethal')).toBe(
      true,
    );
  });
});
