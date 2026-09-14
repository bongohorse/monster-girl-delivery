import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAppServices } from '../../../src/core/AppServices';
import { ViewportService } from '../../../src/core/ViewportService';
import { createPrototypeFlightBounds } from '../../../src/game/PrototypeFlightLayout';
import { Foundation } from '../../../src/game/scenes/Foundation';
import { PROTOTYPE_PATTERN_REACHABILITY_CONTEXT } from '../../../src/generation/FlightReachability';
import {
  createGeneratedHazardStream,
  type GeneratedHazardStreamState,
  PROTOTYPE_LIVE_RUN_SEED,
} from '../../../src/generation/GeneratedHazardStream';
import { PROTOTYPE_LIVE_ENCOUNTER_POLICY_CONFIG } from '../../../src/generation/LiveEncounterPolicy';
import { createPrototypeHazardVerticalDomain } from '../../../src/generation/PrototypeHazardVerticalDomain';
import * as TelegraphedHazardSimulation from '../../../src/hazards/TelegraphedHazardSimulation';
import {
  createTelegraphedHazardSimulationState,
  stepTelegraphedHazardSimulation,
  type TelegraphedHazardSimulationState,
} from '../../../src/hazards/TelegraphedHazardSimulation';
import {
  enterPrototypeFailState,
  type PrototypeDeathRetryState,
} from '../../../src/systems/PrototypeDeathRetryFlow';
import { createPrototypeRunResultSnapshot } from '../../../src/systems/PrototypeRunResult';
import type { PrototypeRunState } from '../../../src/systems/PrototypeRunSimulation';

vi.mock('phaser', () => ({
  Scale: { Events: { RESIZE: 'resize' } },
  Scene: class {},
  Scenes: { Events: { SHUTDOWN: 'shutdown' } },
}));

const createHarness = () => {
  const services = createAppServices();
  const foundation = new Foundation(services, false);
  const viewportService = new ViewportService(400, 800);
  const viewport = viewportService.getSnapshot();
  const verticalDomain = createPrototypeHazardVerticalDomain(createPrototypeFlightBounds(viewport));
  const streamContext = Object.freeze({
    catalog: verticalDomain.catalog,
    constraints: verticalDomain.constraints,
    policy: PROTOTYPE_LIVE_ENCOUNTER_POLICY_CONFIG,
    reachability: Object.freeze({
      flightState: Object.freeze({
        ...PROTOTYPE_PATTERN_REACHABILITY_CONTEXT.flightState,
        positionY: verticalDomain.mapAuthoredCenterY(
          PROTOTYPE_PATTERN_REACHABILITY_CONTEXT.flightState.positionY,
        ),
      }),
      flightTuning: services.flightTuning.getSnapshot(),
      playerExtents: PROTOTYPE_PATTERN_REACHABILITY_CONTEXT.playerExtents,
    }),
  });
  const hazardStream = createGeneratedHazardStream(
    PROTOTYPE_LIVE_RUN_SEED,
    streamContext,
    services.runMotion.getSnapshot(),
  );
  const telegraphedHazardState = stepTelegraphedHazardSimulation(
    createTelegraphedHazardSimulationState(),
    hazardStream.spawns,
    0,
    { positionY: -10, runDistance: 0 },
  );
  const instructions = {
    setPosition: vi.fn(),
    setResolution: vi.fn(),
    setText: vi.fn(),
    setWordWrapWidth: vi.fn(),
  };
  instructions.setPosition.mockReturnValue(instructions);
  instructions.setText.mockReturnValue(instructions);
  instructions.setWordWrapWidth.mockReturnValue(instructions);
  const playerPresentation = {
    destroy: vi.fn(),
    setPosition: vi.fn(),
    setRotation: vi.fn(),
    setScale: vi.fn(),
  };
  const generatedHazardPresentation = { destroy: vi.fn(), sync: vi.fn() };
  const scrollingWorldPresentation = { destroy: vi.fn(), render: vi.fn() };
  const cameraMain = { setOrigin: vi.fn(), setZoom: vi.fn() };
  cameraMain.setOrigin.mockReturnValue(cameraMain);
  cameraMain.setZoom.mockReturnValue(cameraMain);

  Reflect.set(foundation, 'viewportService', viewportService);
  Reflect.set(foundation, 'hazardVerticalDomain', verticalDomain);
  Reflect.set(foundation, 'hazardStream', hazardStream);
  Reflect.set(foundation, 'telegraphedHazardState', telegraphedHazardState);
  Reflect.set(foundation, 'instructions', instructions);
  Reflect.set(foundation, 'playerPresentation', playerPresentation);
  Reflect.set(foundation, 'generatedHazardPresentation', generatedHazardPresentation);
  Reflect.set(foundation, 'scrollingWorldPresentation', scrollingWorldPresentation);
  Reflect.set(foundation, 'runState', {
    phase: 'running',
    motion: { distance: 100 },
    flight: { positionY: 195, velocityY: 0 },
  } satisfies PrototypeRunState);
  Reflect.set(foundation, 'game', { loop: { actualFps: 60, rawDelta: 16 } });
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

  return {
    foundation,
    generatedHazardPresentation,
    hazardStream,
    instructions,
    playerPresentation,
    scrollingWorldPresentation,
    services,
    telegraphedHazardState,
    viewportService,
  };
};

const getRunState = (foundation: Foundation): PrototypeRunState =>
  Reflect.get(foundation, 'runState') as PrototypeRunState;
const getDeathRetryState = (foundation: Foundation): Readonly<PrototypeDeathRetryState> =>
  Reflect.get(foundation, 'deathRetryState') as Readonly<PrototypeDeathRetryState>;
const getHazardStream = (foundation: Foundation): Readonly<GeneratedHazardStreamState> =>
  Reflect.get(foundation, 'hazardStream') as Readonly<GeneratedHazardStreamState>;
const getTelegraphedState = (foundation: Foundation): Readonly<TelegraphedHazardSimulationState> =>
  Reflect.get(foundation, 'telegraphedHazardState') as Readonly<TelegraphedHazardSimulationState>;

const forceLethalCollision = (foundation: Foundation): void => {
  vi.spyOn(
    TelegraphedHazardSimulation,
    'getCollisionHazardsForTelegraphedSimulation',
  ).mockReturnValue([
    {
      behavior: { archetype: 'geometric', kind: 'static' },
      entryId: 'death-retry-lethal',
      hitbox: { left: 100, right: 130, top: 160, bottom: 230 },
      patternEntryIndex: 0,
      patternId: 'death-retry-test',
      runDistance: 100,
      type: 'placeholder-barrier',
    },
  ]);
  foundation.update(0, 16);
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Foundation M5 death-to-retry flow', () => {
  it('freezes authoritative run truth through aftermath and accepts exactly one fresh post-ready retry action', () => {
    const {
      foundation,
      hazardStream: initialStream,
      instructions,
      playerPresentation,
      services,
    } = createHarness();
    vi.stubGlobal('crypto', {
      getRandomValues: vi.fn((values: Uint32Array) => {
        values[0] = 123_456_789;
        return values;
      }),
    });

    forceLethalCollision(foundation);

    const deadState = getRunState(foundation);
    const deadStream = getHazardStream(foundation);
    const deadTelegraphs = getTelegraphedState(foundation);
    const finalResult = deadState.finalResult;
    expect(deadState.phase).toBe('dead');
    expect(finalResult).toBeDefined();
    expect(getDeathRetryState(foundation)).toMatchObject({
      elapsedSeconds: 0,
      phase: 'fail-state',
      result: finalResult,
    });
    expect(instructions.setText).toHaveBeenLastCalledWith(
      expect.stringContaining('Delivery interrupted'),
    );
    expect(instructions.setText).toHaveBeenLastCalledWith(expect.stringContaining('Score'));
    expect(instructions.setText).toHaveBeenLastCalledWith(expect.stringContaining('Grazes'));
    expect(instructions.setText).toHaveBeenLastCalledWith(expect.stringContaining('Items'));
    expect(instructions.setText).toHaveBeenLastCalledWith(expect.stringContaining('Reward'));
    expect(services.input.isThrustHeld()).toBe(false);

    services.input.pressPointer(4, 'touch');
    foundation.update(0, 50);
    services.input.releasePointer(4);
    for (let frame = 0; frame < 11; frame += 1) {
      foundation.update(0, 50);
    }

    expect(getDeathRetryState(foundation).phase).toBe('fail-state');
    expect(getRunState(foundation)).toBe(deadState);
    expect(getRunState(foundation).finalResult).toBe(finalResult);
    expect(getHazardStream(foundation)).toBe(deadStream);
    expect(getTelegraphedState(foundation)).toBe(deadTelegraphs);

    services.input.setSpaceHeld(true);
    foundation.update(0, 50);
    expect(getDeathRetryState(foundation).phase).toBe('retry-ready');
    expect(instructions.setText).toHaveBeenLastCalledWith(
      expect.stringContaining('press Space to retry'),
    );
    expect(getRunState(foundation)).toBe(deadState);
    expect(services.input.consumePrimaryActionPress()).toBe(false);

    services.input.setSpaceHeld(false);
    services.input.setSpaceHeld(true);
    foundation.update(0, 0);

    const restarted = getRunState(foundation);
    expect(restarted).toMatchObject({ phase: 'running', motion: { distance: 0 } });
    expect(restarted.finalResult).toBeUndefined();
    expect(getDeathRetryState(foundation)).toEqual({
      elapsedSeconds: 0,
      phase: 'running',
      result: null,
    });
    expect(getHazardStream(foundation).generationState.seed).toBe(123_456_789);
    expect(getHazardStream(foundation).generationState.seed).not.toBe(
      initialStream.generationState.seed,
    );
    expect(services.input.isThrustHeld()).toBe(false);
    expect(services.input.consumePrimaryActionPress()).toBe(false);
    expect(playerPresentation.setRotation).toHaveBeenLastCalledWith(0);
  });

  it('does not advance fail-state time while paused or on the first resume frame', () => {
    const { foundation, services } = createHarness();
    forceLethalCollision(foundation);
    const deadState = getRunState(foundation);
    const deadStream = getHazardStream(foundation);

    services.lifecycle.pause('hidden');
    for (let frame = 0; frame < 10; frame += 1) {
      foundation.update(0, 1_000);
    }
    expect(getDeathRetryState(foundation).elapsedSeconds).toBe(0);
    expect(getRunState(foundation)).toBe(deadState);
    expect(getHazardStream(foundation)).toBe(deadStream);

    services.lifecycle.resume('hidden');
    foundation.update(0, 1_000);
    expect(getDeathRetryState(foundation).elapsedSeconds).toBe(0);

    foundation.update(0, 50);
    expect(getDeathRetryState(foundation)).toMatchObject({
      elapsedSeconds: 0.05,
      phase: 'fail-state',
    });
  });

  it('keeps dead run, result, generation, hazards, and retry timing immutable across resize', () => {
    const { foundation, services } = createHarness();
    vi.stubGlobal('document', { getElementById: vi.fn(() => null) });
    forceLethalCollision(foundation);
    foundation.update(0, 50);

    const deadState = getRunState(foundation);
    const finalResult = deadState.finalResult;
    const deadStream = getHazardStream(foundation);
    const deadTelegraphs = getTelegraphedState(foundation);
    const retryState = getDeathRetryState(foundation);
    const handleResize = Reflect.get(foundation, 'handleResize') as (size: {
      width: number;
      height: number;
    }) => void;

    handleResize({ width: 844, height: 390 });

    expect(getRunState(foundation)).toBe(deadState);
    expect(getRunState(foundation).finalResult).toBe(finalResult);
    expect(getHazardStream(foundation)).toBe(deadStream);
    expect(getHazardStream(foundation).generationState).toBe(deadStream.generationState);
    expect(getTelegraphedState(foundation)).toBe(deadTelegraphs);
    expect(getDeathRetryState(foundation)).toBe(retryState);
    expect(services.time.getDeltaSeconds()).toBe(0.05);
  });

  it('keeps Director same-seed restart distinct from ordinary new-seed retry', () => {
    const { foundation } = createHarness();
    const currentSeed = getHazardStream(foundation).generationState.seed;
    const handleRestartSameSeed = Reflect.get(foundation, 'handleRestartSameSeed') as () => void;

    handleRestartSameSeed();

    expect(getHazardStream(foundation).generationState.seed).toBe(currentSeed);
    expect(getRunState(foundation).phase).toBe('running');
    expect(getDeathRetryState(foundation).phase).toBe('running');
  });

  it('reuses scene-owned presentation across repeated logical retries without stale result/input', () => {
    const {
      foundation,
      generatedHazardPresentation,
      playerPresentation,
      scrollingWorldPresentation,
      services,
      viewportService,
    } = createHarness();
    const restartRun = (
      Reflect.get(foundation, 'restartRun') as (
        viewport: ReturnType<ViewportService['getSnapshot']>,
        seed: number,
      ) => void
    ).bind(foundation);
    const result = createPrototypeRunResultSnapshot(600, {
      collectedCount: 0,
      collectedValue: 0,
      earnedReward: 0,
      grazeCount: 3,
    });

    for (const seed of [11, 22, 33]) {
      Reflect.set(foundation, 'runState', {
        phase: 'dead',
        motion: { distance: result.finalDistance },
        flight: { positionY: 195, velocityY: 0 },
        finalResult: result,
      } satisfies PrototypeRunState);
      Reflect.set(foundation, 'deathRetryState', enterPrototypeFailState(result));
      services.input.pressPointer(seed, 'touch');

      restartRun(viewportService.getSnapshot(), seed);

      expect(getRunState(foundation)).toMatchObject({ phase: 'running', motion: { distance: 0 } });
      expect(getRunState(foundation).finalResult).toBeUndefined();
      expect(getDeathRetryState(foundation).phase).toBe('running');
      expect(getHazardStream(foundation).generationState.seed).toBe(seed);
      expect(services.input.isThrustHeld()).toBe(false);
      expect(Reflect.get(foundation, 'playerPresentation')).toBe(playerPresentation);
      expect(Reflect.get(foundation, 'generatedHazardPresentation')).toBe(
        generatedHazardPresentation,
      );
      expect(Reflect.get(foundation, 'scrollingWorldPresentation')).toBe(
        scrollingWorldPresentation,
      );
    }

    expect(playerPresentation.destroy).not.toHaveBeenCalled();
    expect(generatedHazardPresentation.destroy).not.toHaveBeenCalled();
    expect(scrollingWorldPresentation.destroy).not.toHaveBeenCalled();
  });
});
