import { describe, expect, it, vi } from 'vitest';
import { createAppServices } from '../../../src/core/AppServices';
import { ViewportService } from '../../../src/core/ViewportService';
import { createPrototypeFlightBounds } from '../../../src/game/PrototypeFlightLayout';
import { Foundation } from '../../../src/game/scenes/Foundation';
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

const createFoundationHarness = () => {
  const services = createAppServices();
  const foundation = new Foundation(services);
  const viewportService = new ViewportService(400, 800);
  const directorPanel = { layout: vi.fn(), update: vi.fn() };
  const playerPresentation = { destroy: vi.fn(), setPosition: vi.fn() };
  const scaleOff = vi.fn();

  Reflect.set(foundation, 'viewportService', viewportService);
  Reflect.set(foundation, 'directorPanel', directorPanel);
  Reflect.set(foundation, 'playerPresentation', playerPresentation);
  Reflect.set(foundation, 'flightState', { positionY: 400, velocityY: 0 });
  Reflect.set(foundation, 'game', { loop: { actualFps: 60 } });
  Reflect.set(foundation, 'scale', { off: scaleOff });

  return {
    directorPanel,
    foundation,
    playerPresentation,
    scaleOff,
    services,
    viewportService,
  };
};

describe('Foundation scene flight orchestration', () => {
  it('steps flight from TimeService delta and high-level thrust intent', () => {
    const { foundation, playerPresentation, services, viewportService } = createFoundationHarness();
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
    expect(actual.positionY).toBeCloseTo(expected.positionY);
    expect(actual.velocityY).toBeCloseTo(expected.velocityY);
    expect(playerPresentation.setPosition).toHaveBeenLastCalledWith(100, expected.positionY);
  });

  it('does not jump while paused or on the first frame after resume', () => {
    const { foundation, services } = createFoundationHarness();
    services.input.pressPointer(7, 'touch');
    services.lifecycle.pause('hidden');
    const beforePause = getFlightState(foundation);

    foundation.update(0, 5_000);
    expect(getFlightState(foundation)).toEqual(beforePause);
    expect(services.input.isThrustHeld()).toBe(false);

    services.lifecycle.resume('hidden');
    foundation.update(0, 5_000);
    expect(getFlightState(foundation)).toEqual(beforePause);

    foundation.update(0, 16);
    expect(getFlightState(foundation).positionY).toBeGreaterThan(beforePause.positionY);
  });

  it('cleans scene-owned integration once while keeping application time reusable', () => {
    const { foundation, playerPresentation, scaleOff, services } = createFoundationHarness();
    const inputAdapter = { destroy: vi.fn() };
    const lifecycleAdapter = { destroy: vi.fn() };
    Reflect.set(foundation, 'inputAdapter', inputAdapter);
    Reflect.set(foundation, 'lifecycleAdapter', lifecycleAdapter);
    services.input.pressPointer(1, 'touch');
    services.time.update(16);

    const handleShutdown: unknown = Reflect.get(foundation, 'handleShutdown');
    expect(handleShutdown).toBeTypeOf('function');

    if (typeof handleShutdown !== 'function') {
      throw new TypeError('Foundation shutdown handler is unavailable.');
    }

    handleShutdown();
    handleShutdown();

    expect(scaleOff).toHaveBeenCalledOnce();
    expect(playerPresentation.destroy).toHaveBeenCalledOnce();
    expect(inputAdapter.destroy).toHaveBeenCalledOnce();
    expect(lifecycleAdapter.destroy).toHaveBeenCalledOnce();
    expect(services.input.isThrustHeld()).toBe(false);
    expect(services.lifecycle.isPaused()).toBe(false);
    expect(services.time.isPaused()).toBe(false);
    expect(services.time.update(16)).toBeCloseTo(0.016);
  });
});
