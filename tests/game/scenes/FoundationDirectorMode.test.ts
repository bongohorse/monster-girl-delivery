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
      main: { setBackgroundColor: () => undefined },
      resize: () => undefined,
    };
    readonly events = { once: () => undefined };
    readonly game = { loop: { actualFps: 60, rawDelta: 17 } };
    readonly scale = {
      height: 450,
      off: () => undefined,
      on: () => undefined,
      width: 800,
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
    );
    expect(directorPerformanceHudLayout).toHaveBeenCalledOnce();

    foundation.update(0, 16);
    expect(directorPerformanceHudUpdate).toHaveBeenCalledWith(17, 60, false, false);
  });

  it('routes the Director action through the same deterministic run reset', () => {
    const services = createAppServices();
    const foundation = new Foundation(services, true);
    foundation.create();
    const initialRunState = structuredClone(Reflect.get(foundation, 'runState'));
    const initialHazardStream = Reflect.get(foundation, 'hazardStream');
    const restartSameSeed = directorRunControlsConstructed.mock.calls[0]?.[2];

    expect(restartSameSeed).toBeTypeOf('function');
    if (typeof restartSameSeed !== 'function') {
      throw new TypeError('Director restart callback is unavailable.');
    }

    foundation.update(0, 50);
    restartSameSeed();

    expect(Reflect.get(foundation, 'runState')).toEqual(initialRunState);
    expect(Reflect.get(foundation, 'hazardStream')).toEqual(initialHazardStream);

    foundation.update(0, 50);
    restartSameSeed();

    expect(Reflect.get(foundation, 'runState')).toEqual(initialRunState);
    expect(Reflect.get(foundation, 'hazardStream')).toEqual(initialHazardStream);
    expect(services.input.getSnapshot().gameplayBlocked).toBe(false);
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
