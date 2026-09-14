import { describe, expect, it } from 'vitest';
import { ViewportService } from '../../src/core/ViewportService';
import {
  createDirectorDebugGeometry,
  DIRECTOR_DEBUG_COLORS,
} from '../../src/devtools/DirectorDebugOverlay';
import type { LogicalCollectibleSpawnInstance } from '../../src/generation/GeneratedCollectibles';
import type { LogicalHazardSpawnInstance } from '../../src/generation/PatternSpawnScheduler';
import { STATIC_GEOMETRIC_HAZARD_BEHAVIOR } from '../../src/hazards/HazardArchetype';
import { createTelegraphedHazardSimulationState } from '../../src/hazards/TelegraphedHazardSimulation';

const HAZARD: Readonly<LogicalHazardSpawnInstance> = Object.freeze({
  behavior: STATIC_GEOMETRIC_HAZARD_BEHAVIOR,
  entryId: 'hazard-a',
  hitbox: Object.freeze({ left: 120, right: 140, top: 80, bottom: 120 }),
  patternEntryIndex: 0,
  patternId: 'debug-pattern',
  runDistance: 120,
  type: 'placeholder-barrier',
});

const COLLECTIBLE: Readonly<LogicalCollectibleSpawnInstance> = Object.freeze({
  intent: 'safe-guide',
  pathId: 'guide',
  pathPointIndex: 0,
  patternId: 'debug-pattern',
  patternStartDistance: 100,
  runDistance: 110,
  value: 1,
  y: 100,
});

const createFrame = (consumedCollectibleIds: readonly string[] = []) => ({
  collectibles: [COLLECTIBLE],
  consumedCollectibleIds,
  flight: { positionY: 100, velocityY: 0 },
  hazards: [HAZARD],
  motion: { distance: 100 },
  nextPatternStartDistance: 250,
  telegraphedHazards: createTelegraphedHazardSimulationState(),
  viewport: new ViewportService(400, 800).getSnapshot(),
});

describe('DirectorDebugOverlay geometry', () => {
  it('projects authoritative player, Graze, hazard, collectible, and gameplay boundaries', () => {
    const geometry = createDirectorDebugGeometry(createFrame());
    const byKind = new Map(geometry.rectangles.map((rectangle) => [rectangle.kind, rectangle]));
    const lineByKind = new Map(geometry.lines.map((line) => [line.kind, line]));

    expect(byKind.get('player-core')).toMatchObject({
      color: DIRECTOR_DEBUG_COLORS.playerCore,
      hitbox: { left: 82, right: 118, top: 486, bottom: 534 },
    });
    expect(byKind.get('player-graze')).toMatchObject({
      color: DIRECTOR_DEBUG_COLORS.playerGraze,
      hitbox: { left: 74, right: 126, top: 478, bottom: 542 },
    });
    expect(byKind.get('hazard-lethal')).toMatchObject({
      color: DIRECTOR_DEBUG_COLORS.hazardLethal,
      hitbox: { left: 120, right: 140, top: 490, bottom: 530 },
    });
    expect(byKind.get('collectible')).toMatchObject({
      color: DIRECTOR_DEBUG_COLORS.collectible,
      hitbox: { left: 102, right: 118, top: 502, bottom: 518 },
    });
    expect(byKind.get('viewport')?.hitbox).toEqual({ left: 0, right: 400, top: 0, bottom: 800 });
    expect(byKind.get('safe-area')?.hitbox).toEqual({ left: 0, right: 400, top: 0, bottom: 800 });

    expect(lineByKind.get('flight-ceiling')).toMatchObject({ x1: 0, x2: 400, y1: 28, y2: 28 });
    expect(lineByKind.get('flight-floor')).toMatchObject({ x1: 0, x2: 400, y1: 772, y2: 772 });
    expect(lineByKind.get('despawn-boundary')).toMatchObject({ x1: -60, x2: -60 });
    expect(lineByKind.get('despawn-indicator')).toMatchObject({ x1: 1, x2: 1, y1: 0, y2: 800 });
    expect(geometry.labels).toEqual([
      {
        color: DIRECTOR_DEBUG_COLORS.despawnBoundary,
        text: 'DESPAWN ← 60px',
        x: 4,
        y: 4,
      },
    ]);
    expect(lineByKind.get('scheduling-boundary')).toMatchObject({ x1: 250, x2: 250 });
  });

  it('does not draw already consumed collectible hitboxes', () => {
    const identity = 'debug-pattern:100:guide:0';
    const geometry = createDirectorDebugGeometry(createFrame([identity]));

    expect(geometry.rectangles.some((rectangle) => rectangle.kind === 'collectible')).toBe(false);
  });
});
