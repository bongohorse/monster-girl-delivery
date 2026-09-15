import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppServices } from '../../../src/core/AppServices';

const directorPanelConstructed = vi.hoisted(() => vi.fn());
const directorPerformanceHudConstructed = vi.hoisted(() => vi.fn());
const directorPerformanceHudDestroyed = vi.hoisted(() => vi.fn());
const directorPerformanceHudLayout = vi.hoisted(() => vi.fn());
const directorPerformanceHudUpdate = vi.hoisted(() => vi.fn());
const directorControlsConstructed = vi.hoisted(() => vi.fn());
const directorControlsDestroyed = vi.hoisted(() => vi.fn());
const directorRunControlsConstructed = vi.hoisted(() => vi.fn());
const directorRunControlsDestroyed = vi.hoisted(() => vi.fn());
const setFpsLimit = vi.hoisted(() => vi.fn());

vi.mock('phaser', () => {
  const createText = () => ({
    setFontSize() {
      return this;
    },
    setOrigin() {
      return this;
    },
    setPosition() {
      return this;
    },
    setResolution() {
      return this;
    },
    setText() {
      return this;
    },
    setWordWrapWidth() {
      return this;
    },
  });

  class Scene {
    readonly add = { text: () => createText() };
    readonly cameras = {
      main: {
        setBackgroundColor: () => undefined,
        setOrigin() {
          return this;
        },
        setZoom() {
          return this;
        },
      },
      resize: () => undefined,
    };
    readonly events = { once: () => undefined };
    readonly game = { loop: { actualFps: 60, rawDelta: 17, setFPSLimit: setFpsLimit } };
    readonly scale = {
      height: 450,
      off: () => undefined,
      on: () => undefined,
      width: 800,
      zoom: 1,
    };
  }

  return {
    Scale: { Events: { RESIZE: 'resize' } },
    Scene,
    Scenes: { Events: { SHUTDOWN: 'shutdown' } },
  };
});

vi.mock('../../../src/core/PhaserLifecycleAdapter', () => ({
  PhaserLifecycleAdapter: class {
    destroy() {}
  },
}));

vi.mock('../../../src/input/PhaserInputAdapter', () => ({
  PhaserInputAdapter: class {
    destroy() {}
  },
}));

vi.mock('../../../src/entities/PrototypePlayerPresentation', () => ({
  PrototypePlayerPresentation: class {
    destroy() {}
    setPosition() {}
  },
}));

vi.mock('../../../src/entities/GeneratedHazardPresentation', () => ({
  GeneratedHazardPresentation: class {
    destroy() {}
    sync() {}
  },
}));

vi.mock('../../../src/entities/PrototypeScrollingWorldPresentation', () => ({
  PrototypeScrollingWorldPresentation: class {
    destroy() {}
    render() {}
  },
}));

vi.mock('../../../src/devtools/DirectorPanel', () => ({
  DirectorPanel: class {
    constructor() {
      directorPanelConstructed();
    }
    destroy() {}
    reset() {}
    layout() {}
    update() {}
  },
}));

vi.mock('../../../src/devtools/DirectorPerformanceHud', () => ({
  DirectorPerformanceHud: class {
    constructor(...args: unknown[]) {
      directorPerformanceHudConstructed(...args);
    }
    destroy() {
      directorPerformanceHudDestroyed();
    }
    layout(...args: unknown[]) {
      directorPerformanceHudLayout(...args);
    }
    update(...args: unknown[]) {
      directorPerformanceHudUpdate(...args);
    }
  },
}));

vi.mock('../../../src/devtools/DirectorTuningControls', () => ({
  DirectorTuningControls: class {
    constructor(...args: unknown[]) {
      directorControlsConstructed(...args);
    }
    destroy() {
      directorControlsDestroyed();
    }
    layout() {}
  },
}));

vi.mock('../../../src/devtools/DirectorRunControls', () => ({
  DirectorRunControls: class {
    constructor(...args: unknown[]) {
      directorRunControlsConstructed(...args);
    }
    destroy() {
      directorRunControlsDestroyed();
    }
    layout() {}
  },
}));

import { getPrototypePlayerX } from '../../../src/game/PrototypeFlightLayout';
import { Foundation } from '../../../src/game/scenes/Foundation';

beforeEach(() => {
  directorPanelConstructed.mockClear();
  directorPerformanceHudConstructed.mockClear();
  directorPerformanceHudDestroyed.mockClear();
  directorPerformanceHudLayout.mockClear();
  directorPerformanceHudUpdate.mockClear();
  directorControlsConstructed.mockClear();
  directorControlsDestroyed.mockClear();
  directorRunControlsConstructed.mockClear();
  directorRunControlsDestroyed.mockClear();
  setFpsLimit.mockClear();
  const gameContainer = {};
  vi.stubGlobal('document', {
    getElementById: (id: string) => (id === 'game-container' ? gameContainer : null),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Foundation Director mode boundary', () => {
  it('does not construct Director tooling when Director mode is disabled', () => {
    const services = createAppServices();
    const getLifecycleSnapshot = vi.spyOn(services.lifecycle, 'getSnapshot');
    const runMotionBefore = services.runMotion.getSnapshot();
    const foundation = new Foundation(services, false);

    foundation.create();
    foundation.update(0, 16);

    expect(directorPanelConstructed).not.toHaveBeenCalled();
    expect(directorPerformanceHudConstructed).not.toHaveBeenCalled();
    expect(directorControlsConstructed).not.toHaveBeenCalled();
    expect(directorRunControlsConstructed).not.toHaveBeenCalled();
    expect(Reflect.get(foundation, 'directorDebugOverlay')).toBeUndefined();
    expect(Reflect.get(foundation, 'directorPanel')).toBeUndefined();
    expect(Reflect.get(foundation, 'directorPerformanceHud')).toBeUndefined();
    expect(Reflect.get(foundation, 'directorRunControls')).toBeUndefined();
    expect(Reflect.get(foundation, 'directorTuningControls')).toBeUndefined();
    expect(services.time.getDeltaSeconds()).toBeCloseTo(0.016);
    expect(services.input.getSnapshot().gameplayBlocked).toBe(false);
    expect(services.runMotion.getSnapshot()).toEqual(runMotionBefore);
    expect(getLifecycleSnapshot).not.toHaveBeenCalled();

    const handleShutdown: unknown = Reflect.get(foundation, 'handleShutdown');
    expect(handleShutdown).toBeTypeOf('function');
    if (typeof handleShutdown !== 'function') {
      throw new TypeError('Foundation shutdown handler is unavailable.');
    }

    handleShutdown();

    expect(directorControlsDestroyed).not.toHaveBeenCalled();
    expect(directorPerformanceHudDestroyed).not.toHaveBeenCalled();
    expect(directorRunControlsDestroyed).not.toHaveBeenCalled();
    expect(services.input.getSnapshot().gameplayBlocked).toBe(false);
  });

  it('keeps Director tooling enabled when Director mode is enabled', () => {
    const services = createAppServices();
    const foundation = new Foundation(services, true);

    foundation.create();

    expect(directorPanelConstructed).toHaveBeenCalledOnce();
    expect(directorPerformanceHudConstructed).toHaveBeenCalledWith(
      expect.any(Object),
      services.input,
      undefined,
      expect.objectContaining({
        setFpsLimit: expect.any(Function),
        setWireframesEnabled: expect.any(Function),
      }),
    );
    expect(directorControlsConstructed).toHaveBeenCalledWith(
      foundation,
      services.flightTuning,
      services.runMotion,
      services.input,
    );
    expect(directorRunControlsConstructed).toHaveBeenCalledWith(
      foundation,
      services.input,
      expect.any(Function),
      expect.any(Function),
    );
    expect(directorPerformanceHudLayout).toHaveBeenCalledOnce();

    const performanceControls = directorPerformanceHudConstructed.mock.calls[0]?.[3] as
      | { setFpsLimit?: (limit: number) => void }
      | undefined;
    performanceControls?.setFpsLimit?.(90);
    expect(setFpsLimit).toHaveBeenCalledWith(90);

    foundation.update(0, 16);
    expect(directorPerformanceHudUpdate).toHaveBeenCalledWith(17, 60, false, false);
  });

  it('uses Director Z to spawn the real Zapper fully beyond the right viewport edge', () => {
    const services = createAppServices();
    const foundation = new Foundation(services, true);
    foundation.create();

    const performanceControls = directorPerformanceHudConstructed.mock.calls[0]?.[3] as
      | { spawnZapper?: () => void }
      | undefined;
    expect(performanceControls?.spawnZapper).toBeTypeOf('function');
    performanceControls?.spawnZapper?.();

    const manualHazards = Reflect.get(foundation, 'directorManualHazards') as ReadonlyArray<{
      behavior: { kind: string };
      hitbox: { left: number };
    }>;
    const viewportService = Reflect.get(foundation, 'viewportService') as {
      getSnapshot: () => ReturnType<
        typeof import('../../../src/core/ViewportService').ViewportService.prototype.getSnapshot
      >;
    };
    const runState = Reflect.get(foundation, 'runState') as { motion: { distance: number } };
    const viewport = viewportService.getSnapshot();
    const spawn = manualHazards[0];

    expect(manualHazards).toHaveLength(1);
    expect(spawn?.behavior.kind).toBe('zapper');
    if (!spawn) {
      throw new Error('Expected Director Zapper spawn.');
    }
    const screenLeft = getPrototypePlayerX(viewport) + spawn.hitbox.left - runState.motion.distance;
    expect(screenLeft).toBeGreaterThan(viewport.width);
    expect(screenLeft).toBeCloseTo(viewport.width + 24, 9);
  });

  it('starts explicit new seeds and makes each one the same-seed restart authority', () => {
    const entropySeeds: number[] = [];
    const getRandomValues = vi.fn((values: Uint32Array) => {
      const seed = entropySeeds.shift();
      if (seed === undefined) throw new Error('Expected a test seed.');
      values[0] = seed;
      return values;
    });
    vi.stubGlobal('crypto', { getRandomValues });
    const services = createAppServices();
    const foundation = new Foundation(services, true);
    foundation.create();
    const initialHazardStream = Reflect.get(foundation, 'hazardStream') as {
      generationState: { seed: number };
    };
    const firstNewSeed = (initialHazardStream.generationState.seed + 1) >>> 0;
    const secondNewSeed = (firstNewSeed + 1) >>> 0;
    entropySeeds.push(firstNewSeed, firstNewSeed);
    const restartSameSeed = directorRunControlsConstructed.mock.calls[0]?.[2];
    const startNewSeed = directorRunControlsConstructed.mock.calls[0]?.[3];

    expect(restartSameSeed).toBeTypeOf('function');
    expect(startNewSeed).toBeTypeOf('function');
    if (typeof restartSameSeed !== 'function' || typeof startNewSeed !== 'function') {
      throw new TypeError('Director run callbacks are unavailable.');
    }

    foundation.update(0, 50);
    services.input.pressPointer(7, 'touch');
    startNewSeed();

    const firstNewRunState = structuredClone(Reflect.get(foundation, 'runState'));
    const firstNewHazardStream = Reflect.get(foundation, 'hazardStream');
    const firstNewTelegraphState = Reflect.get(foundation, 'telegraphedHazardState');
    expect(firstNewHazardStream).toMatchObject({ generationState: { seed: firstNewSeed } });
    expect(Reflect.get(foundation, 'runState')).toMatchObject({ motion: { distance: 0 } });
    expect(services.input.getSnapshot()).toMatchObject({
      activePointerId: null,
      gameplayBlocked: false,
      pointerHeld: false,
      thrustHeld: false,
    });
    expect(services.input.consumePrimaryActionPress()).toBe(false);

    foundation.update(0, 50);
    restartSameSeed();

    expect(Reflect.get(foundation, 'runState')).toEqual(firstNewRunState);
    expect(Reflect.get(foundation, 'hazardStream')).toEqual(firstNewHazardStream);
    expect(Reflect.get(foundation, 'telegraphedHazardState')).toEqual(firstNewTelegraphState);

    foundation.update(0, 50);
    restartSameSeed();

    expect(Reflect.get(foundation, 'runState')).toEqual(firstNewRunState);
    expect(Reflect.get(foundation, 'hazardStream')).toEqual(firstNewHazardStream);
    expect(Reflect.get(foundation, 'telegraphedHazardState')).toEqual(firstNewTelegraphState);

    startNewSeed();
    expect(Reflect.get(foundation, 'hazardStream')).toMatchObject({
      generationState: { seed: secondNewSeed },
    });
    expect(Reflect.get(foundation, 'runState')).toEqual(firstNewRunState);
    expect(getRandomValues).toHaveBeenCalledTimes(2);
    expect(services.input.getSnapshot().gameplayBlocked).toBe(false);
    expect(services.input.isThrustHeld()).toBe(false);
    expect(services.input.consumePrimaryActionPress()).toBe(false);
  });

  it('gates raw samples during pause and on the first resume frame', () => {
    const services = createAppServices();
    const foundation = new Foundation(services, true);
    foundation.create();

    services.lifecycle.pause('hidden');
    foundation.update(0, 5_000);
    expect(directorPerformanceHudUpdate).toHaveBeenLastCalledWith(17, 60, true, false);

    services.lifecycle.resume('hidden');
    foundation.update(0, 5_000);
    expect(directorPerformanceHudUpdate).toHaveBeenLastCalledWith(17, 60, false, true);
  });
});
