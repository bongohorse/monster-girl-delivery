import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAppServices } from '../../../src/core/AppServices';
import { ViewportService } from '../../../src/core/ViewportService';
import {
  createPrototypeFlightBounds,
  getPrototypeVerticalProjection,
  projectLogicalYToScreen,
} from '../../../src/game/PrototypeFlightLayout';
import { Foundation } from '../../../src/game/scenes/Foundation';
import { PROTOTYPE_PATTERN_REACHABILITY_CONTEXT } from '../../../src/generation/FlightReachability';
import {
  advanceGeneratedHazardStream,
  createGeneratedHazardStream,
  type GeneratedHazardStreamState,
  PROTOTYPE_LIVE_RUN_SEED,
} from '../../../src/generation/GeneratedHazardStream';
import { evaluateHazardApproachTiming } from '../../../src/generation/HazardApproachTiming';
import type { HazardPattern } from '../../../src/generation/HazardPattern';
import { PROTOTYPE_LIVE_ENCOUNTER_POLICY_CONFIG } from '../../../src/generation/LiveEncounterPolicy';
import { scheduleNextPattern } from '../../../src/generation/PatternSpawnScheduler';
import {
  PROTOTYPE_LINE_PATTERN,
  PROTOTYPE_M4_HAZARD_PATTERN_FIXTURES,
  PROTOTYPE_OFFSET_PAIR_PATTERN,
  PROTOTYPE_TARGET_LOCK_STRIKE_PATTERN,
} from '../../../src/generation/PrototypeHazardPatternFixtures';
import { createRunGenerationState } from '../../../src/generation/RunGenerationState';
import { resolveHazardHitboxAtRunDistance } from '../../../src/hazards/HazardArchetype';
import * as TelegraphedHazardSimulation from '../../../src/hazards/TelegraphedHazardSimulation';
import {
  createTelegraphedHazardSimulationState,
  getTelegraphedHazardLifecycle,
  stepTelegraphedHazardSimulation,
  type TelegraphedHazardSimulationState,
} from '../../../src/hazards/TelegraphedHazardSimulation';
import type { PrototypeRunState } from '../../../src/systems/PrototypeRunSimulation';
import { type RunMotionState, stepRunMotion } from '../../../src/systems/RunMotionSimulation';
import {
  stepVerticalFlight,
  type VerticalFlightState,
} from '../../../src/systems/VerticalFlightSimulation';

vi.mock('phaser', () => ({
  Scale: { Events: { RESIZE: 'resize' } },
  Scene: class {},
  Scenes: { Events: { SHUTDOWN: 'shutdown' } },
}));

const getFlightState = (foundation: Foundation): VerticalFlightState =>
  (Reflect.get(foundation, 'runState') as PrototypeRunState).flight;
const getRunMotionState = (foundation: Foundation): RunMotionState =>
  (Reflect.get(foundation, 'runState') as PrototypeRunState).motion;
const getRunState = (foundation: Foundation): PrototypeRunState =>
  Reflect.get(foundation, 'runState') as PrototypeRunState;
const getHazardStream = (foundation: Foundation): Readonly<GeneratedHazardStreamState> =>
  Reflect.get(foundation, 'hazardStream') as Readonly<GeneratedHazardStreamState>;
const getTelegraphedHazardState = (
  foundation: Foundation,
): Readonly<TelegraphedHazardSimulationState> =>
  Reflect.get(foundation, 'telegraphedHazardState') as Readonly<TelegraphedHazardSimulationState>;
const createTestHazardStreamContext = (
  services: ReturnType<typeof createAppServices>,
  catalog: ReadonlyArray<Readonly<HazardPattern>> = PROTOTYPE_M4_HAZARD_PATTERN_FIXTURES,
) =>
  Object.freeze({
    catalog,
    policy: PROTOTYPE_LIVE_ENCOUNTER_POLICY_CONFIG,
    reachability: Object.freeze({
      flightState: PROTOTYPE_PATTERN_REACHABILITY_CONTEXT.flightState,
      flightTuning: services.flightTuning.getSnapshot(),
      playerExtents: PROTOTYPE_PATTERN_REACHABILITY_CONTEXT.playerExtents,
    }),
  });

const createLowPhaseHazardStream = (services: ReturnType<typeof createAppServices>) => {
  const context = createTestHazardStreamContext(services, [PROTOTYPE_OFFSET_PAIR_PATTERN]);
  const initial = createGeneratedHazardStream(
    PROTOTYPE_LIVE_RUN_SEED,
    context,
    services.runMotion.getSnapshot(),
  );
  const stream = advanceGeneratedHazardStream(
    initial,
    1_800,
    context,
    services.runMotion.getSnapshot(),
  );

  return Object.freeze({ context, stream });
};

const createFoundationHarness = () => {
  const services = createAppServices();
  const foundation = new Foundation(services, true);
  const viewportService = new ViewportService(400, 800);
  const directorPanel = { layout: vi.fn(), update: vi.fn(), destroy: vi.fn(), reset: vi.fn() };
  const directorRunControls = { destroy: vi.fn(), layout: vi.fn() };
  const directorTuningControls = { destroy: vi.fn(), layout: vi.fn() };
  const generatedHazardPresentation = { destroy: vi.fn(), sync: vi.fn() };
  const instructions = {
    setPosition: vi.fn(),
    setText: vi.fn(),
    setWordWrapWidth: vi.fn(),
  };
  instructions.setPosition.mockReturnValue(instructions);
  instructions.setText.mockReturnValue(instructions);
  instructions.setWordWrapWidth.mockReturnValue(instructions);
  const playerPresentation = { destroy: vi.fn(), setPosition: vi.fn(), setScale: vi.fn() };
  const scrollingWorldPresentation = { destroy: vi.fn(), render: vi.fn() };
  const scaleOff = vi.fn();
  const cameraResize = vi.fn();

  Reflect.set(foundation, 'viewportService', viewportService);
  Reflect.set(foundation, 'directorPanel', directorPanel);
  Reflect.set(foundation, 'directorRunControls', directorRunControls);
  Reflect.set(foundation, 'directorTuningControls', directorTuningControls);
  Reflect.set(foundation, 'generatedHazardPresentation', generatedHazardPresentation);
  const hazardStream = createGeneratedHazardStream(
    PROTOTYPE_LIVE_RUN_SEED,
    createTestHazardStreamContext(services),
    services.runMotion.getSnapshot(),
  );
  Reflect.set(foundation, 'hazardStream', hazardStream);
  Reflect.set(
    foundation,
    'telegraphedHazardState',
    stepTelegraphedHazardSimulation(
      createTelegraphedHazardSimulationState(),
      hazardStream.spawns,
      0,
      { positionY: 195, runDistance: 0 },
    ),
  );
  Reflect.set(foundation, 'instructions', instructions);
  Reflect.set(foundation, 'playerPresentation', playerPresentation);
  Reflect.set(foundation, 'scrollingWorldPresentation', scrollingWorldPresentation);
  Reflect.set(foundation, 'runState', {
    phase: 'running',
    motion: { distance: 0 },
    flight: { positionY: 195, velocityY: 0 },
  });
  Reflect.set(foundation, 'game', { loop: { actualFps: 60, rawDelta: 16 } });
  Reflect.set(foundation, 'scale', { off: scaleOff });
  Reflect.set(foundation, 'cameras', { resize: cameraResize });

  return {
    cameraResize,
    directorTuningControls,
    directorPanel,
    directorRunControls,
    foundation,
    generatedHazardPresentation,
    instructions,
    playerPresentation,
    scrollingWorldPresentation,
    scaleOff,
    services,
    viewportService,
  };
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Foundation scene gameplay orchestration', () => {
  it('passes the lifecycle-resolved collision intervals into the authoritative run step', () => {
    const { foundation } = createFoundationHarness();
    const schedule = scheduleNextPattern({
      catalog: [PROTOTYPE_LINE_PATTERN],
      patternStartDistance: 1_080,
      state: createRunGenerationState('foundation-collision-wiring'),
    });
    if (schedule.status !== 'accepted' || !schedule.spawns[0]) {
      throw new Error('Expected a scheduled collision hazard.');
    }
    Reflect.set(foundation, 'runState', {
      phase: 'running',
      motion: { distance: 1_180 },
      flight: { positionY: 195, velocityY: 0 },
    });
    const collisionHazards = vi
      .spyOn(TelegraphedHazardSimulation, 'getCollisionHazardsForTelegraphedSimulation')
      .mockReturnValue([schedule.spawns[0]]);

    foundation.update(0, 16);

    expect(collisionHazards).toHaveBeenCalledOnce();
    expect(getRunState(foundation).phase).toBe('dead');
  });

  it('commits new telegraphs after the frame step and keeps reservation and lifecycle clocks aligned', () => {
    const { foundation, services } = createFoundationHarness();
    const initial = createGeneratedHazardStream(
      1,
      createTestHazardStreamContext(services),
      services.runMotion.getSnapshot(),
    );
    Reflect.set(foundation, 'hazardStream', initial);
    // Moving the scheduling horizon makes the old first-pass path admit a timed pulse.
    Reflect.set(foundation, 'runState', {
      phase: 'running',
      motion: { distance: 1800 },
      flight: { positionY: 400, velocityY: 0 },
    });
    foundation.update(0, 16);
    const stream = getHazardStream(foundation);
    const spawn = stream.spawns[0];
    const reservation = stream.policy?.readability.reservations[0];
    if (!spawn || !reservation || spawn.behavior.archetype !== 'timed')
      throw new Error('Expected the seeded timed pulse.');
    expect(spawn.approachTiming.observedAtRunDistance).toBeCloseTo(1805.6);
    expect(
      getTelegraphedHazardLifecycle(getTelegraphedHazardState(foundation), spawn),
    ).toMatchObject({ phase: 'warning', elapsedPhaseSeconds: 0 });
    expect(reservation.warningWindows[0]?.endSeconds).toBe(1.85);
    const durations = spawn.behavior.lifecycle.durations;
    for (let frame = 0; frame < 180; frame += 1) {
      foundation.update(0, 16);
      const lifecycle = getTelegraphedHazardLifecycle(getTelegraphedHazardState(foundation), spawn);
      const pending = getHazardStream(foundation).policy?.readability.reservations.find(
        (entry) => entry.encounterId === reservation.encounterId,
      );
      if (!lifecycle || lifecycle.phase === 'expired') {
        expect(pending).toBeUndefined();
        break;
      }
      const elapsed =
        lifecycle.elapsedPhaseSeconds +
        (lifecycle.phase === 'warning' ? 0 : durations.warningSeconds) +
        (lifecycle.phase === 'active' ? durations.lockSeconds : 0);
      expect(pending?.activeWindow.endSeconds).toBeCloseTo(
        durations.warningSeconds + durations.lockSeconds + durations.activeSeconds - elapsed,
      );
      const warningNow = pending?.warningWindows.some(
        (window) => window.startSeconds <= 0 && window.endSeconds > 0,
      );
      const lethalNow = pending?.lethalWindows.some(
        (window) => window.startSeconds <= 0 && window.endSeconds > 0,
      );
      expect(Boolean(warningNow)).toBe(lifecycle.phase === 'warning' || lifecycle.phase === 'lock');
      expect(Boolean(lethalNow)).toBe(lifecycle.phase === 'active');
    }
  });

  it('steps flight and horizontal progress from the same TimeService delta', () => {
    const {
      foundation,
      directorPanel,
      generatedHazardPresentation,
      playerPresentation,
      scrollingWorldPresentation,
      services,
      viewportService,
    } = createFoundationHarness();
    const initialState: VerticalFlightState = { positionY: 195, velocityY: 0 };
    services.input.setSpaceHeld(true);

    foundation.update(0, 1_000);

    expect(services.time.getDeltaSeconds()).toBe(0.05);
    const expected = stepVerticalFlight(
      initialState,
      services.time.getDeltaSeconds(),
      true,
      services.flightTuning.getSnapshot(),
      createPrototypeFlightBounds(viewportService.getSnapshot()),
    );
    const actual = getFlightState(foundation);
    const expectedRunMotion = stepRunMotion(
      { distance: 0 },
      services.time.getDeltaSeconds(),
      services.runMotion.getSnapshot(),
    );
    expect(actual.positionY).toBeCloseTo(expected.positionY);
    expect(actual.velocityY).toBeCloseTo(expected.velocityY);
    expect(playerPresentation.setPosition).toHaveBeenLastCalledWith(
      100,
      projectLogicalYToScreen(
        expected.positionY,
        getPrototypeVerticalProjection(viewportService.getSnapshot()),
      ),
    );
    expect(playerPresentation.setScale).toHaveBeenLastCalledWith(
      1,
      getPrototypeVerticalProjection(viewportService.getSnapshot()).scaleY,
    );
    expect(getRunMotionState(foundation)).toEqual(expectedRunMotion);
    expect(scrollingWorldPresentation.render).toHaveBeenLastCalledWith(
      expectedRunMotion.distance,
      viewportService.getSnapshot(),
    );
    expect(generatedHazardPresentation.sync).toHaveBeenLastCalledWith(
      getHazardStream(foundation).spawns,
      expectedRunMotion,
      100,
      getTelegraphedHazardState(foundation),
      getPrototypeVerticalProjection(viewportService.getSnapshot()),
    );
    expect(directorPanel.update).toHaveBeenLastCalledWith(
      1_000,
      viewportService.getSnapshot(),
      services.input.getSnapshot(),
      services.lifecycle.getSnapshot(),
      getHazardStream(foundation),
      getTelegraphedHazardState(foundation),
    );
  });

  it('keeps an unsafe requested speed increase out of the authoritative run path', () => {
    const { foundation, services } = createFoundationHarness();
    const { stream: scheduledHazardStream } = createLowPhaseHazardStream(services);

    expect(scheduledHazardStream.spawns.length).toBeGreaterThan(0);

    Reflect.set(foundation, 'hazardStream', scheduledHazardStream);
    Reflect.set(foundation, 'runState', {
      phase: 'running',
      motion: { distance: scheduledHazardStream.runDistance },
      flight: { positionY: 400, velocityY: 0 },
    });

    services.runMotion.update({ baseScrollSpeed: 700 });
    foundation.update(0, 0);

    expect(services.runMotion.getSnapshot()).toEqual({ baseScrollSpeed: 700 });
    expect(getHazardStream(foundation)).toBe(scheduledHazardStream);
    expect(getHazardStream(foundation).schedulingWindow.scrollSpeed).toBe(350);
    expect(getRunMotionState(foundation)).toEqual({
      distance: scheduledHazardStream.runDistance,
    });
  });

  it('keeps player screen-space X stable while the world advances', () => {
    const { foundation, playerPresentation, scrollingWorldPresentation } =
      createFoundationHarness();

    foundation.update(0, 16);
    foundation.update(0, 16);

    expect(playerPresentation.setPosition.mock.calls.map(([x]) => x)).toEqual([100, 100]);
    const renderedDistances = scrollingWorldPresentation.render.mock.calls.map(
      ([distance]) => distance as number,
    );
    expect(renderedDistances[1]).toBeGreaterThan(renderedDistances[0] ?? 0);
  });

  it('uses retained policy flight tuning while a Director change waits for accepted hazards', () => {
    const { foundation, services, viewportService } = createFoundationHarness();
    const { stream } = createLowPhaseHazardStream(services);
    const flight = { positionY: 195, velocityY: 0 };
    Reflect.set(foundation, 'hazardStream', stream);
    Reflect.set(foundation, 'runState', {
      phase: 'running',
      motion: { distance: stream.runDistance },
      flight,
    });
    const acceptedTuning = services.flightTuning.getSnapshot();
    services.flightTuning.update({ gravity: 200 });
    foundation.update(0, 16);
    expect(getHazardStream(foundation).policy?.flightTuning).toEqual(acceptedTuning);
    expect(getFlightState(foundation)).toEqual(
      stepVerticalFlight(
        flight,
        0.016,
        false,
        acceptedTuning,
        createPrototypeFlightBounds(viewportService.getSnapshot()),
      ),
    );
    expect(services.flightTuning.getSnapshot().gravity).toBe(200);
  });

  it('does not jump while paused or on the first frame after resume', () => {
    const { foundation, scrollingWorldPresentation, services } = createFoundationHarness();
    services.input.pressPointer(7, 'touch');
    services.lifecycle.pause('hidden');
    const beforePause = getFlightState(foundation);
    const runBeforePause = getRunMotionState(foundation);
    const hazardsBeforePause = getHazardStream(foundation);
    const telegraphedHazardsBeforePause = getTelegraphedHazardState(foundation);

    foundation.update(0, 5_000);
    expect(getFlightState(foundation)).toEqual(beforePause);
    expect(getRunMotionState(foundation)).toEqual(runBeforePause);
    expect(getHazardStream(foundation)).toBe(hazardsBeforePause);
    expect(getTelegraphedHazardState(foundation)).toBe(telegraphedHazardsBeforePause);
    expect(scrollingWorldPresentation.render).toHaveBeenLastCalledWith(
      runBeforePause.distance,
      expect.any(Object),
    );
    expect(services.input.isThrustHeld()).toBe(false);

    services.lifecycle.resume('hidden');
    foundation.update(0, 5_000);
    expect(getFlightState(foundation)).toEqual(beforePause);
    expect(getRunMotionState(foundation)).toEqual(runBeforePause);
    expect(getHazardStream(foundation)).toBe(hazardsBeforePause);
    expect(getTelegraphedHazardState(foundation)).toBe(telegraphedHazardsBeforePause);

    foundation.update(0, 16);
    expect(getFlightState(foundation).positionY).toBeGreaterThan(beforePause.positionY);
    expect(getRunMotionState(foundation).distance).toBeGreaterThan(runBeforePause.distance);
  });

  it('enters death once, holds simulation, and restarts from fresh input', () => {
    const {
      foundation,
      generatedHazardPresentation,
      instructions,
      services,
      scrollingWorldPresentation,
    } = createFoundationHarness();
    const initialHazardStream = getHazardStream(foundation);
    const { context: lowPhaseContext, stream: scheduledHazardStream } =
      createLowPhaseHazardStream(services);
    const collisionHazard = scheduledHazardStream.spawns.find(
      (spawn) => spawn.behavior.archetype === 'geometric',
    );

    expect(collisionHazard).toBeDefined();
    if (!collisionHazard) {
      throw new Error('Expected the live generated stream to contain a collision hazard.');
    }
    const collisionHitbox = resolveHazardHitboxAtRunDistance(
      collisionHazard,
      collisionHazard.hitbox.left,
    );
    const collisionRunDistance = collisionHazard.hitbox.left - 17.5;
    const progressedHazardStream = advanceGeneratedHazardStream(
      scheduledHazardStream,
      collisionRunDistance,
      lowPhaseContext,
      services.runMotion.getSnapshot(),
      (collisionRunDistance - scheduledHazardStream.runDistance) /
        scheduledHazardStream.schedulingWindow.scrollSpeed,
    );

    Reflect.set(foundation, 'hazardStream', progressedHazardStream);
    Reflect.set(foundation, 'runState', {
      phase: 'running',
      motion: { distance: collisionHazard.hitbox.left - 17.5 },
      flight: {
        positionY: (collisionHitbox.top + collisionHitbox.bottom) / 2,
        velocityY: 0,
      },
    });

    foundation.update(0, 50);

    const deadState = getRunState(foundation);
    expect(deadState.phase).toBe('dead');
    expect(deadState.motion.distance).toBe(collisionHazard.hitbox.left);
    expect(services.input.isThrustHeld()).toBe(false);
    expect(instructions.setText).toHaveBeenCalledExactlyOnceWith(
      'Delivery interrupted\nTap, click, or press Space to restart.',
    );

    foundation.update(0, 1_000);

    expect(getRunState(foundation)).toEqual(deadState);
    expect(instructions.setText).toHaveBeenCalledOnce();

    services.input.pressPointer(9, 'touch');
    foundation.update(0, 16);

    expect(getRunState(foundation)).toEqual({
      phase: 'running',
      motion: { distance: 0 },
      flight: { positionY: -10, velocityY: 0 },
    });
    expect(getHazardStream(foundation)).toEqual(initialHazardStream);
    expect(services.input.isThrustHeld()).toBe(false);
    expect(instructions.setText).toHaveBeenNthCalledWith(
      2,
      'M4 moving, timed + target-lock hazards\nHold touch, mouse, or Space to thrust.',
    );
    expect(scrollingWorldPresentation.render).toHaveBeenLastCalledWith(0, expect.any(Object));
    expect(generatedHazardPresentation.sync).toHaveBeenLastCalledWith(
      initialHazardStream.spawns,
      { distance: 0 },
      100,
      getTelegraphedHazardState(foundation),
      { offsetY: expect.any(Number), scaleY: expect.any(Number) },
    );
  });

  it('recalculates resize bounds immediately without advancing simulation time', () => {
    const {
      cameraResize,
      foundation,
      playerPresentation,
      scrollingWorldPresentation,
      services,
      viewportService,
    } = createFoundationHarness();
    vi.stubGlobal('document', { getElementById: vi.fn(() => null) });
    Reflect.set(foundation, 'runState', {
      phase: 'running',
      motion: { distance: 123 },
      flight: { positionY: 250, velocityY: 120 },
    });
    services.time.update(16);
    const hazardStreamBeforeResize = getHazardStream(foundation);
    const tuningBefore = services.flightTuning.getSnapshot();
    const runTuningBefore = services.runMotion.getSnapshot();

    const handleResize: unknown = Reflect.get(foundation, 'handleResize');
    expect(handleResize).toBeTypeOf('function');
    if (typeof handleResize !== 'function') {
      throw new TypeError('Foundation resize handler is unavailable.');
    }

    handleResize({ width: 800, height: 600 });

    expect(cameraResize).toHaveBeenLastCalledWith(800, 600);
    expect(viewportService.getSnapshot().orientation).toBe('landscape');
    expect(getFlightState(foundation)).toEqual({ positionY: 250, velocityY: 120 });
    expect(playerPresentation.setPosition).toHaveBeenLastCalledWith(200, 460);
    expect(services.time.getDeltaSeconds()).toBeCloseTo(0.016);
    expect(services.flightTuning.getSnapshot()).toEqual(tuningBefore);
    expect(services.runMotion.getSnapshot()).toEqual(runTuningBefore);
    expect(getRunMotionState(foundation)).toEqual({ distance: 123 });
    expect(getHazardStream(foundation)).toBe(hazardStreamBeforeResize);
    expect(scrollingWorldPresentation.render).toHaveBeenLastCalledWith(
      123,
      viewportService.getSnapshot(),
    );

    handleResize({ width: 800, height: 300 });

    expect(getFlightState(foundation)).toEqual({ positionY: 250, velocityY: 120 });
    expect(playerPresentation.setPosition).toHaveBeenLastCalledWith(
      200,
      projectLogicalYToScreen(250, getPrototypeVerticalProjection(viewportService.getSnapshot())),
    );
    expect(playerPresentation.setScale).toHaveBeenLastCalledWith(1, 300 / 390);
    expect(services.time.getDeltaSeconds()).toBeCloseTo(0.016);

    foundation.update(0, 0);
    expect(getFlightState(foundation)).toEqual({ positionY: 250, velocityY: 120 });
    expect(getRunMotionState(foundation)).toEqual({ distance: 123 });
  });

  it('flies into the added upper room and clamps on shrink without resetting the run', () => {
    const { foundation, services, playerPresentation } = createFoundationHarness();
    vi.stubGlobal('document', { getElementById: vi.fn(() => null) });
    const handleResize = Reflect.get(foundation, 'handleResize') as (size: {
      width: number;
      height: number;
    }) => void;
    handleResize({ width: 1280, height: 720 });
    services.input.setSpaceHeld(true);

    for (let frame = 0; frame < 40; frame += 1) {
      foundation.update(0, 50);
    }

    expect(getRunState(foundation).phase).toBe('running');
    expect(getFlightState(foundation)).toEqual({ positionY: -302, velocityY: 0 });
    expect(playerPresentation.setPosition).toHaveBeenLastCalledWith(320, 28);
    expect(playerPresentation.setScale).toHaveBeenLastCalledWith(1, 1);
    const motion = getRunMotionState(foundation);
    const stream = getHazardStream(foundation);
    const telegraphs = getTelegraphedHazardState(foundation);

    handleResize({ width: 844, height: 390 });

    expect(getFlightState(foundation)).toEqual({ positionY: 28, velocityY: 0 });
    expect(getRunMotionState(foundation)).toBe(motion);
    expect(getHazardStream(foundation)).toBe(stream);
    expect(getTelegraphedHazardState(foundation)).toBe(telegraphs);
    expect(services.time.getDeltaSeconds()).toBe(0.05);
  });

  it('cleans scene-owned integration once while keeping application time reusable', () => {
    const {
      directorTuningControls,
      directorRunControls,
      foundation,
      generatedHazardPresentation,
      playerPresentation,
      scaleOff,
      scrollingWorldPresentation,
      services,
    } = createFoundationHarness();
    const inputAdapter = { destroy: vi.fn() };
    const lifecycleAdapter = { destroy: vi.fn() };
    const directorPerformanceHud = { destroy: vi.fn() };
    Reflect.set(foundation, 'inputAdapter', inputAdapter);
    Reflect.set(foundation, 'lifecycleAdapter', lifecycleAdapter);
    Reflect.set(foundation, 'directorPerformanceHud', directorPerformanceHud);
    services.input.pressPointer(1, 'touch');
    services.input.setGameplayBlocked(true);
    services.time.update(16);

    const handleShutdown: unknown = Reflect.get(foundation, 'handleShutdown');
    expect(handleShutdown).toBeTypeOf('function');

    if (typeof handleShutdown !== 'function') {
      throw new TypeError('Foundation shutdown handler is unavailable.');
    }

    directorTuningControls.destroy.mockImplementation(() => {
      services.input.setGameplayBlocked(false);
    });

    handleShutdown();
    handleShutdown();

    expect(scaleOff).toHaveBeenCalledOnce();
    expect(directorTuningControls.destroy).toHaveBeenCalledOnce();
    expect(directorRunControls.destroy).toHaveBeenCalledOnce();
    expect(directorPerformanceHud.destroy).toHaveBeenCalledOnce();
    expect(playerPresentation.destroy).toHaveBeenCalledOnce();
    expect(generatedHazardPresentation.destroy).toHaveBeenCalledOnce();
    expect(scrollingWorldPresentation.destroy).toHaveBeenCalledOnce();
    expect(inputAdapter.destroy).toHaveBeenCalledOnce();
    expect(lifecycleAdapter.destroy).toHaveBeenCalledOnce();
    expect(services.input.getSnapshot().gameplayBlocked).toBe(false);
    expect(services.input.isThrustHeld()).toBe(false);
    expect(services.lifecycle.isPaused()).toBe(false);
    expect(services.time.isPaused()).toBe(false);
    expect(services.time.update(16)).toBeCloseTo(0.016);
  });

  it('samples the moving player target at the exact warning-to-lock boundary during update', () => {
    const { foundation, services, viewportService } = createFoundationHarness();

    // 1. Establish a real target-lock spawn through the scheduler authority
    const scheduleResult = scheduleNextPattern({
      catalog: [PROTOTYPE_TARGET_LOCK_STRIKE_PATTERN],
      patternStartDistance: 1_000,
      state: createRunGenerationState('foundation-target-lock-regression'),
    });
    if (scheduleResult.status !== 'accepted' || !scheduleResult.spawns[0]) {
      throw new Error('Expected target lock pattern to be accepted.');
    }
    const rawSpawn = scheduleResult.spawns[0];
    const currentStream = Reflect.get(foundation, 'hazardStream') as GeneratedHazardStreamState;
    const targetLockSpawn = Object.freeze({
      ...rawSpawn,
      approachTiming: evaluateHazardApproachTiming(
        rawSpawn.runDistance,
        0,
        currentStream.schedulingWindow,
      ),
    });

    // Inject into stream ahead of current distance so it is retained by generation
    Reflect.set(foundation, 'hazardStream', {
      ...currentStream,
      spawns: [targetLockSpawn],
    });

    // 2. Place the lifecycle shortly before the warning -> lock boundary.
    // Authored warning duration is 1.40s. Place elapsed at 1.38s (boundary is at delta 0.02s).
    const preInitialTarget = { positionY: 150, runDistance: 100 };
    const initialTelegraphedState = stepTelegraphedHazardSimulation(
      createTelegraphedHazardSimulationState(),
      [targetLockSpawn],
      1.38,
      preInitialTarget,
    );
    Reflect.set(foundation, 'telegraphedHazardState', initialTelegraphedState);

    const beforeLifecycle = getTelegraphedHazardLifecycle(
      getTelegraphedHazardState(foundation),
      targetLockSpawn,
    );
    expect(beforeLifecycle?.phase).toBe('warning');
    expect(beforeLifecycle?.elapsedPhaseSeconds).toBeCloseTo(1.38, 9);
    expect(beforeLifecycle?.lockedTarget).toBeNull();

    // 3. Use a player state that is moving at the boundary
    const initialFlight: VerticalFlightState = { positionY: 150, velocityY: 100 };
    const initialMotion: RunMotionState = { distance: 100 };
    Reflect.set(foundation, 'runState', {
      phase: 'running',
      flight: initialFlight,
      motion: initialMotion,
    });
    services.input.setSpaceHeld(false);

    // 4. Run one foundation.update() whose normalized delta crosses that boundary.
    // 30 ms raw delta produces 0.030s simulation delta.
    // Boundary transition occurs at 1.40s - 1.38s = 0.020s into the frame.
    const updateDeltaMs = 30;
    const boundaryDeltaSeconds = 1.4 - 1.38; // 0.02s

    foundation.update(0, updateDeltaMs);

    // 5. Assert:
    const afterLifecycle = getTelegraphedHazardLifecycle(
      getTelegraphedHazardState(foundation),
      targetLockSpawn,
    );
    expect(afterLifecycle).not.toBeNull();
    if (!afterLifecycle) {
      throw new Error('Expected telegraphed hazard lifecycle.');
    }

    // Lifecycle must have entered lock phase
    expect(afterLifecycle.phase).toBe('lock');
    expect(afterLifecycle.elapsedPhaseSeconds).toBeCloseTo(0.03 - boundaryDeltaSeconds, 9);
    expect(afterLifecycle.lockedTarget).not.toBeNull();

    // Authoritative expected flight at exact boundary delta (0.02s)
    const flightBounds = createPrototypeFlightBounds(viewportService.getSnapshot());
    const stream = Reflect.get(foundation, 'hazardStream') as GeneratedHazardStreamState;
    const activeFlightTuning = stream.policy?.flightTuning ?? services.flightTuning.getSnapshot();
    const expectedBoundaryFlight = stepVerticalFlight(
      initialFlight,
      boundaryDeltaSeconds,
      false,
      activeFlightTuning,
      flightBounds,
    );

    // Authoritative expected motion at exact boundary delta (0.02s)
    const runMotionTuning = Object.freeze({
      baseScrollSpeed: stream.schedulingWindow.scrollSpeed,
    });
    const expectedBoundaryMotion = stepRunMotion(
      initialMotion,
      boundaryDeltaSeconds,
      runMotionTuning,
    );

    // Assert lockedTarget matches authoritative motion at the exact boundary delta
    expect(afterLifecycle.lockedTarget?.positionY).toBeCloseTo(expectedBoundaryFlight.positionY, 9);
    expect(afterLifecycle.lockedTarget?.runDistance).toBeCloseTo(
      expectedBoundaryMotion.distance,
      9,
    );

    // Assert the locked target is not merely the pre-step player target
    expect(afterLifecycle.lockedTarget?.positionY).not.toBe(initialFlight.positionY);
    expect(afterLifecycle.lockedTarget?.runDistance).not.toBe(initialMotion.distance);
    expect(
      Math.abs((afterLifecycle.lockedTarget?.positionY ?? 0) - initialFlight.positionY),
    ).toBeGreaterThan(1.0);
    expect(
      Math.abs((afterLifecycle.lockedTarget?.runDistance ?? 0) - initialMotion.distance),
    ).toBeGreaterThan(5.0);
  });
});
