import { describe, expect, it, vi } from 'vitest';
import { createAppServices } from '../../../src/core/AppServices';
import { ViewportService } from '../../../src/core/ViewportService';
import {
  createPrototypeFlightBounds,
  getPrototypePlayerX,
} from '../../../src/game/PrototypeFlightLayout';
import { Foundation } from '../../../src/game/scenes/Foundation';
import { PROTOTYPE_PATTERN_REACHABILITY_CONTEXT } from '../../../src/generation/FlightReachability';
import {
  createGeneratedHazardStream,
  PROTOTYPE_LIVE_RUN_SEED,
} from '../../../src/generation/GeneratedHazardStream';
import { PROTOTYPE_LIVE_ENCOUNTER_POLICY_CONFIG } from '../../../src/generation/LiveEncounterPolicy';
import { scheduleNextPattern } from '../../../src/generation/PatternSpawnScheduler';
import { PROTOTYPE_MISSILE_PATTERN } from '../../../src/generation/PrototypeHazardPatternFixtures';
import { createPrototypeHazardVerticalDomain } from '../../../src/generation/PrototypeHazardVerticalDomain';
import { createRunGenerationState } from '../../../src/generation/RunGenerationState';
import {
  createTelegraphedHazardSimulationState,
  getLethalHazardsForTelegraphedSimulation,
  getPrototypeMissileLaunchRelativeLeft,
  getTelegraphedHazardLifecycle,
  stepTelegraphedHazardSimulation,
  type TelegraphedHazardSimulationState,
} from '../../../src/hazards/TelegraphedHazardSimulation';
import type { PrototypeRunState } from '../../../src/systems/PrototypeRunSimulation';

vi.mock('phaser', () => ({
  Scale: { Events: { RESIZE: 'resize' } },
  Scene: class {},
  Scenes: { Events: { SHUTDOWN: 'shutdown' } },
}));

const getRunState = (foundation: Foundation): PrototypeRunState =>
  Reflect.get(foundation, 'runState') as PrototypeRunState;

const getTelegraphedState = (foundation: Foundation): Readonly<TelegraphedHazardSimulationState> =>
  Reflect.get(foundation, 'telegraphedHazardState') as Readonly<TelegraphedHazardSimulationState>;

describe('Foundation M5 Missile resize integration', () => {
  it('keeps an Active Missile on its logical trajectory when the live viewport is resized', () => {
    vi.stubGlobal('document', { getElementById: vi.fn(() => null) });

    const services = createAppServices();
    const foundation = new Foundation(services, false);
    const viewportService = new ViewportService(400, 800);
    const viewport = viewportService.getSnapshot();
    const verticalDomain = createPrototypeHazardVerticalDomain(
      createPrototypeFlightBounds(viewport),
    );
    const stream = createGeneratedHazardStream(
      PROTOTYPE_LIVE_RUN_SEED,
      Object.freeze({
        catalog: verticalDomain.catalog,
        constraints: verticalDomain.constraints,
        policy: PROTOTYPE_LIVE_ENCOUNTER_POLICY_CONFIG,
        reachability: Object.freeze({
          flightState: PROTOTYPE_PATTERN_REACHABILITY_CONTEXT.flightState,
          flightTuning: services.flightTuning.getSnapshot(),
          playerExtents: PROTOTYPE_PATTERN_REACHABILITY_CONTEXT.playerExtents,
        }),
      }),
      services.runMotion.getSnapshot(),
    );
    const schedule = scheduleNextPattern({
      catalog: [PROTOTYPE_MISSILE_PATTERN],
      patternStartDistance: 0,
      state: createRunGenerationState('foundation-active-missile-resize'),
    });
    if (schedule.status !== 'accepted' || !schedule.spawns[0]) {
      throw new Error('Expected M5 Missile spawn.');
    }
    const missile = schedule.spawns[0];

    let telegraphedState = stepTelegraphedHazardSimulation(
      createTelegraphedHazardSimulationState(),
      [missile],
      0,
      { positionY: 100, runDistance: 0 },
    );
    telegraphedState = stepTelegraphedHazardSimulation(
      telegraphedState,
      [missile],
      1.4,
      { positionY: 100, runDistance: 0 },
      (delta) => ({ positionY: 100 + 50 * delta, runDistance: 350 * delta }),
    );
    expect(getTelegraphedHazardLifecycle(telegraphedState, missile)?.phase).toBe('lock');

    const playerPresentation = {
      setPosition: vi.fn(),
      setRotation: vi.fn(),
      setScale: vi.fn(),
    };
    const cameraMain = { setOrigin: vi.fn(), setZoom: vi.fn() };
    cameraMain.setOrigin.mockReturnValue(cameraMain);
    cameraMain.setZoom.mockReturnValue(cameraMain);

    Reflect.set(foundation, 'viewportService', viewportService);
    Reflect.set(foundation, 'hazardVerticalDomain', verticalDomain);
    Reflect.set(foundation, 'hazardStream', stream);
    Reflect.set(foundation, 'directorAutoHazardsEnabled', false);
    Reflect.set(foundation, 'directorManualHazards', Object.freeze([missile]));
    Reflect.set(foundation, 'telegraphedHazardState', telegraphedState);
    Reflect.set(foundation, 'playerPresentation', playerPresentation);
    Reflect.set(foundation, 'runState', {
      phase: 'running',
      motion: { distance: 630 },
      flight: { positionY: 60, velocityY: 0 },
    } satisfies PrototypeRunState);
    Reflect.set(foundation, 'game', { loop: { actualFps: 60, rawDelta: 50 } });
    Reflect.set(foundation, 'scale', {
      height: 800,
      off: vi.fn(),
      width: 400,
      zoom: 1,
    });
    Reflect.set(foundation, 'cameras', {
      main: cameraMain,
      resize: vi.fn(),
    });

    for (let frame = 0; frame < 8; frame += 1) {
      foundation.update(0, 50);
    }

    const activeState = getTelegraphedState(foundation);
    expect(getTelegraphedHazardLifecycle(activeState, missile)?.phase).toBe('active');
    expect(getPrototypeMissileLaunchRelativeLeft(activeState, missile)).toBe(348);

    const motion = getRunState(foundation).motion;
    const beforePlayerX = getPrototypePlayerX(viewportService.getSnapshot());
    const before = getLethalHazardsForTelegraphedSimulation(activeState, [missile], {
      playerRunDistance: motion.distance,
      playerScreenX: beforePlayerX,
      viewportLeft: 0,
      viewportRight: viewportService.getSnapshot().width,
    })[0];
    if (!before) {
      throw new Error('Expected Active Missile before resize.');
    }

    const handleResize = Reflect.get(foundation, 'handleResize') as (size: {
      width: number;
      height: number;
    }) => void;
    handleResize({ width: 640, height: 800 });

    const afterState = getTelegraphedState(foundation);
    expect(afterState).toBe(activeState);
    expect(getPrototypeMissileLaunchRelativeLeft(afterState, missile)).toBe(348);
    const afterPlayerX = getPrototypePlayerX(viewportService.getSnapshot());
    const after = getLethalHazardsForTelegraphedSimulation(afterState, [missile], {
      playerRunDistance: motion.distance,
      playerScreenX: afterPlayerX,
      viewportLeft: 0,
      viewportRight: viewportService.getSnapshot().width,
    })[0];
    if (!after) {
      throw new Error('Expected Active Missile after resize.');
    }

    expect(after.hitbox).toEqual(before.hitbox);
    const beforeRelativeScreenLeft =
      before.hitbox.left - motion.distance;
    const afterRelativeScreenLeft =
      after.hitbox.left - motion.distance;
    expect(afterRelativeScreenLeft).toBe(beforeRelativeScreenLeft);
    expect(afterPlayerX).toBe(160);
  });
});
