import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppServices } from '../../../src/core/AppServices';

const directorPanelConstructed = vi.hoisted(() => vi.fn());
const directorControlsConstructed = vi.hoisted(() => vi.fn());
const directorControlsDestroyed = vi.hoisted(() => vi.fn());

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
    readonly game = { loop: { actualFps: 60 } };
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

vi.mock('../../../src/entities/PrototypeHazardPresentation', () => ({
  PrototypeHazardPresentation: class {
    destroy() {}
    render() {}
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

import { Foundation } from '../../../src/game/scenes/Foundation';

beforeEach(() => {
  directorPanelConstructed.mockClear();
  directorControlsConstructed.mockClear();
  directorControlsDestroyed.mockClear();
  vi.stubGlobal('document', { getElementById: () => null });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Foundation Director mode boundary', () => {
  it('does not construct Director tooling when Director mode is disabled', () => {
    const services = createAppServices();
    const runMotionBefore = services.runMotion.getSnapshot();
    const foundation = new Foundation(services, false);

    foundation.create();
    foundation.update(0, 16);

    expect(directorPanelConstructed).not.toHaveBeenCalled();
    expect(directorControlsConstructed).not.toHaveBeenCalled();
    expect(Reflect.get(foundation, 'directorPanel')).toBeUndefined();
    expect(Reflect.get(foundation, 'directorTuningControls')).toBeUndefined();
    expect(services.time.getDeltaSeconds()).toBeCloseTo(0.016);
    expect(services.input.getSnapshot().gameplayBlocked).toBe(false);
    expect(services.runMotion.getSnapshot()).toEqual(runMotionBefore);

    const handleShutdown: unknown = Reflect.get(foundation, 'handleShutdown');
    expect(handleShutdown).toBeTypeOf('function');
    if (typeof handleShutdown !== 'function') {
      throw new TypeError('Foundation shutdown handler is unavailable.');
    }

    handleShutdown();

    expect(directorControlsDestroyed).not.toHaveBeenCalled();
    expect(services.input.getSnapshot().gameplayBlocked).toBe(false);
  });

  it('keeps Director tooling enabled when Director mode is enabled', () => {
    const services = createAppServices();
    const foundation = new Foundation(services, true);

    foundation.create();

    expect(directorPanelConstructed).toHaveBeenCalledOnce();
    expect(directorControlsConstructed).toHaveBeenCalledWith(
      foundation,
      services.flightTuning,
      services.runMotion,
      services.input,
    );
  });
});
