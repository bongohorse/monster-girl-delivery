import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAppServices } from '../../../src/core/AppServices';
import { ViewportService } from '../../../src/core/ViewportService';
import { createPrototypeFlightBounds } from '../../../src/game/PrototypeFlightLayout';
import { Foundation } from '../../../src/game/scenes/Foundation';
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
  Reflect.get(foundation, 'flightState') as VerticalFlightState;
const getRunMotionState = (foundation: Foundation): RunMotionState =>
  Reflect.get(foundation, 'runMotionState') as RunMotionState;

const createFoundationHarness = () => {
  const services = createAppServices();
  const foundation = new Foundation(services, true);
  const viewportService = new ViewportService(400, 800);
  const directorPanel = { layout: vi.fn(), update: vi.fn() };
  const directorTuningControls = { destroy: vi.fn(), layout: vi.fn() };
  const playerPresentation = { destroy: vi.fn(), setPosition: vi.fn() };
  const scrollingWorldPresentation = { destroy: vi.fn(), render: vi.fn() };
  const scaleOff = vi.fn();
  const cameraResize = vi.fn();

  Reflect.set(foundation, 'viewportService', viewportService);
  Reflect.set(foundation, 'directorPanel', directorPanel);
  Reflect.set(foundation, 'directorTuningControls', directorTuningControls);
  Reflect.set(foundation, 'playerPresentation', playerPresentation);
  Reflect.set(foundation, 'scrollingWorldPresentation', scrollingWorldPresentation);
  Reflect.set(foundation, 'flightState', { positionY: 400, velocityY: 0 });
  Reflect.set(foundation, 'game', { loop: { actualFps: 60 } });
  Reflect.set(foundation, 'scale', { off: scaleOff });
  Reflect.set(foundation, 'cameras', { resize: cameraResize });

  return {
    cameraResize,
    directorTuningControls,
    directorPanel,
    foundation,
    playerPresentation,
    scrollingWorldPresentation,
    scaleOff,
    services,
    viewportService,
  };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Foundation scene gameplay orchestration', () => {
  it('steps flight and horizontal progress from the same TimeService delta', () => {
    const {
      foundation,
      playerPresentation,
      scrollingWorldPresentation,
      services,
      viewportService,
    } = createFoundationHarness();
    const initialState: VerticalFlightState = { positionY: 400, velocityY: 0 };
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
    expect(playerPresentation.setPosition).toHaveBeenLastCalledWith(100, expected.positionY);
    expect(getRunMotionState(foundation)).toEqual(expectedRunMotion);
    expect(scrollingWorldPresentation.render).toHaveBeenLastCalledWith(
      expectedRunMotion.distance,
      viewportService.getSnapshot(),
    );
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

  it('does not jump while paused or on the first frame after resume', () => {
    const { foundation, scrollingWorldPresentation, services } = createFoundationHarness();
    services.input.pressPointer(7, 'touch');
    services.lifecycle.pause('hidden');
    const beforePause = getFlightState(foundation);
    const runBeforePause = getRunMotionState(foundation);

    foundation.update(0, 5_000);
    expect(getFlightState(foundation)).toEqual(beforePause);
    expect(getRunMotionState(foundation)).toEqual(runBeforePause);
    expect(scrollingWorldPresentation.render).toHaveBeenLastCalledWith(
      runBeforePause.distance,
      expect.any(Object),
    );
    expect(services.input.isThrustHeld()).toBe(false);

    services.lifecycle.resume('hidden');
    foundation.update(0, 5_000);
    expect(getFlightState(foundation)).toEqual(beforePause);
    expect(getRunMotionState(foundation)).toEqual(runBeforePause);

    foundation.update(0, 16);
    expect(getFlightState(foundation).positionY).toBeGreaterThan(beforePause.positionY);
    expect(getRunMotionState(foundation).distance).toBeGreaterThan(runBeforePause.distance);
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
    Reflect.set(foundation, 'flightState', { positionY: 500, velocityY: 120 });
    Reflect.set(foundation, 'runMotionState', { distance: 123 });
    services.time.update(16);
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
    expect(getFlightState(foundation)).toEqual({ positionY: 500, velocityY: 120 });
    expect(playerPresentation.setPosition).toHaveBeenLastCalledWith(200, 500);
    expect(services.time.getDeltaSeconds()).toBeCloseTo(0.016);
    expect(services.flightTuning.getSnapshot()).toEqual(tuningBefore);
    expect(services.runMotion.getSnapshot()).toEqual(runTuningBefore);
    expect(getRunMotionState(foundation)).toEqual({ distance: 123 });
    expect(scrollingWorldPresentation.render).toHaveBeenLastCalledWith(
      123,
      viewportService.getSnapshot(),
    );

    handleResize({ width: 800, height: 300 });

    expect(getFlightState(foundation)).toEqual({ positionY: 272, velocityY: 0 });
    expect(playerPresentation.setPosition).toHaveBeenLastCalledWith(200, 272);
    expect(services.time.getDeltaSeconds()).toBeCloseTo(0.016);

    foundation.update(0, 0);
    expect(getFlightState(foundation)).toEqual({ positionY: 272, velocityY: 0 });
    expect(getRunMotionState(foundation)).toEqual({ distance: 123 });
  });

  it('cleans scene-owned integration once while keeping application time reusable', () => {
    const {
      directorTuningControls,
      foundation,
      playerPresentation,
      scaleOff,
      scrollingWorldPresentation,
      services,
    } = createFoundationHarness();
    const inputAdapter = { destroy: vi.fn() };
    const lifecycleAdapter = { destroy: vi.fn() };
    Reflect.set(foundation, 'inputAdapter', inputAdapter);
    Reflect.set(foundation, 'lifecycleAdapter', lifecycleAdapter);
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
    expect(playerPresentation.destroy).toHaveBeenCalledOnce();
    expect(scrollingWorldPresentation.destroy).toHaveBeenCalledOnce();
    expect(inputAdapter.destroy).toHaveBeenCalledOnce();
    expect(lifecycleAdapter.destroy).toHaveBeenCalledOnce();
    expect(services.input.getSnapshot().gameplayBlocked).toBe(false);
    expect(services.input.isThrustHeld()).toBe(false);
    expect(services.lifecycle.isPaused()).toBe(false);
    expect(services.time.isPaused()).toBe(false);
    expect(services.time.update(16)).toBeCloseTo(0.016);
  });
});
