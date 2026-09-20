import type { AppServices } from '../../src/core/AppServices';
import type { ViewportService } from '../../src/core/ViewportService';
import StartGame from '../../src/game/main';
import {
  installRenderResolutionController,
  type RenderResolutionController,
} from '../../src/game/RenderResolution';
import { installPhaserInputTeardownGuard } from '../../src/input/PhaserInputTeardownGuard';

interface FoundationRuntimeProbe {
  readonly services: AppServices;
  readonly viewportService?: ViewportService;
}

interface SmokeEvidence {
  readonly initialCanvas: string;
  readonly rendererType: number;
  readonly scene: string;
  readonly keyboardInput: boolean;
  readonly pointerInput: boolean;
  readonly lifecycle: boolean;
  readonly portraitResize: string;
  readonly landscapeResize: string;
  readonly teardown: boolean;
}

const resultElement = document.getElementById('smoke-result');
const container = document.getElementById('game-container');

if (!(resultElement instanceof HTMLElement) || !(container instanceof HTMLElement)) {
  throw new Error('Browser smoke DOM fixture is incomplete.');
}

const runtimeErrors: string[] = [];

window.addEventListener(
  'error',
  (event) => {
    const target = event.target;
    if (target && target !== window) {
      runtimeErrors.push(`resource error: ${String((target as Element).tagName ?? target)}`);
      return;
    }
    runtimeErrors.push(
      event.error instanceof Error ? (event.error.stack ?? event.error.message) : event.message,
    );
  },
  true,
);

window.addEventListener('unhandledrejection', (event) => {
  runtimeErrors.push(
    event.reason instanceof Error
      ? (event.reason.stack ?? event.reason.message)
      : String(event.reason),
  );
});

const assert = (condition: unknown, message: string): asserts condition => {
  if (!condition) {
    throw new Error(message);
  }
};

const delay = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds));

const waitFor = async (
  predicate: () => boolean,
  message: string,
  timeoutMilliseconds = 5_000,
): Promise<void> => {
  const startedAt = performance.now();
  while (!predicate()) {
    if (performance.now() - startedAt > timeoutMilliseconds) {
      throw new Error(message);
    }
    await delay(16);
  }
};

const dispatchSpace = (type: 'keydown' | 'keyup'): void => {
  const event = new KeyboardEvent(type, {
    bubbles: true,
    cancelable: true,
    code: 'Space',
    key: ' ',
  });
  Object.defineProperty(event, 'keyCode', { configurable: true, value: 32 });
  Object.defineProperty(event, 'which', { configurable: true, value: 32 });
  window.dispatchEvent(event);
};

const readFoundation = (game: ReturnType<typeof StartGame>): FoundationRuntimeProbe =>
  game.scene.getScene('Foundation') as unknown as FoundationRuntimeProbe;

const readViewport = (probe: FoundationRuntimeProbe) => {
  const viewportService = probe.viewportService;
  if (!viewportService) {
    throw new Error('Foundation viewport service was not created.');
  }
  return viewportService.getSnapshot();
};

let controller: RenderResolutionController | undefined;
let game: ReturnType<typeof StartGame> | undefined;

const run = async (): Promise<SmokeEvidence> => {
  game = StartGame('game-container', { directorMode: false, renderScaleCap: 1 });
  controller = installRenderResolutionController(game, 'game-container', 1);
  installPhaserInputTeardownGuard(game);

  await waitFor(
    () => game?.scene.isActive('Foundation') === true,
    'Foundation did not become active through Boot -> Preloader.',
  );

  const canvas = game.canvas;
  assert(canvas instanceof HTMLCanvasElement, 'Phaser did not create an HTML canvas.');
  assert(canvas.isConnected, 'Phaser canvas is not connected to the browser DOM.');
  assert(container.querySelectorAll('canvas').length === 1, 'Expected exactly one Phaser canvas.');
  assert(canvas.width > 0 && canvas.height > 0, 'Phaser canvas backing size must be positive.');
  assert(game.renderer.type > 0, 'Phaser did not initialize a concrete renderer.');
  assert(game.textures.exists('background'), 'Boot/Preloader browser asset path did not load.');

  await waitFor(
    () => canvas.dataset.mgdLogicalSize === '640x360',
    'Render-resolution metadata did not publish the initial 640x360 logical viewport.',
  );

  const foundation = readFoundation(game);
  const initialViewport = readViewport(foundation);
  assert(
    initialViewport.orientation === 'landscape',
    'Initial Foundation viewport is not landscape.',
  );

  dispatchSpace('keydown');
  await waitFor(
    () => foundation.services.input.getSnapshot().spaceHeld,
    'Real browser keydown did not reach PhaserInputAdapter/InputService.',
  );
  const keyboardInput = foundation.services.input.getSnapshot().thrustHeld;

  window.dispatchEvent(new Event('pagehide'));
  await waitFor(
    () => foundation.services.lifecycle.getSnapshot().pauseReasons.includes('suspended'),
    'Browser pagehide did not reach PhaserLifecycleAdapter.',
  );
  assert(
    !foundation.services.input.getSnapshot().thrustHeld,
    'Lifecycle pause did not release held browser input.',
  );

  window.dispatchEvent(new Event('pageshow'));
  await waitFor(
    () => !foundation.services.lifecycle.getSnapshot().pauseReasons.includes('suspended'),
    'Browser pageshow did not release the suspended lifecycle reason.',
  );
  dispatchSpace('keyup');

  const rect = canvas.getBoundingClientRect();
  canvas.dispatchEvent(
    new MouseEvent('mousedown', {
      bubbles: true,
      button: 0,
      buttons: 1,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
    }),
  );
  await waitFor(
    () => foundation.services.input.getSnapshot().pointerHeld,
    'Real browser mousedown did not reach PhaserInputAdapter/InputService.',
  );
  const pointerInput = foundation.services.input.getSnapshot().thrustHeld;

  window.dispatchEvent(
    new MouseEvent('mouseup', {
      bubbles: true,
      button: 0,
      buttons: 0,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
    }),
  );
  await waitFor(
    () => !foundation.services.input.getSnapshot().pointerHeld,
    'Real browser mouseup did not release InputService pointer state.',
  );

  container.style.width = '360px';
  container.style.height = '640px';
  await waitFor(
    () =>
      controller?.getSnapshot().logicalWidth === 360 &&
      controller.getSnapshot().logicalHeight === 640 &&
      readViewport(foundation).orientation === 'portrait',
    'ResizeObserver/Phaser resize did not reconcile the 360x640 portrait viewport.',
  );
  const portraitResize = canvas.dataset.mgdLogicalSize ?? '';

  container.style.width = '800px';
  container.style.height = '450px';
  await waitFor(
    () =>
      controller?.getSnapshot().logicalWidth === 800 &&
      controller.getSnapshot().logicalHeight === 450 &&
      readViewport(foundation).orientation === 'landscape',
    'ResizeObserver/Phaser resize did not reconcile the 800x450 landscape viewport.',
  );
  const landscapeResize = canvas.dataset.mgdLogicalSize ?? '';

  assert(game.scene.isActive('Foundation'), 'Foundation stopped after browser resize.');
  assert(runtimeErrors.length === 0, `Browser runtime errors: ${runtimeErrors.join(' | ')}`);
  const rendererType = game.renderer.type;

  game.destroy(true);
  await waitFor(
    () => container.querySelector('canvas') === null,
    'Game.destroy(true) did not remove the Phaser canvas.',
  );

  assert(runtimeErrors.length === 0, `Browser teardown errors: ${runtimeErrors.join(' | ')}`);

  return {
    initialCanvas: '640x360',
    rendererType,
    scene: 'Foundation',
    keyboardInput,
    pointerInput,
    lifecycle: true,
    portraitResize,
    landscapeResize,
    teardown: true,
  };
};

void run()
  .then((evidence) => {
    document.body.dataset.smokeStatus = 'passed';
    resultElement.textContent = JSON.stringify(evidence);
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
    document.body.dataset.smokeStatus = 'failed';
    resultElement.textContent = JSON.stringify({ error: message, runtimeErrors });
  })
  .finally(() => {
    controller?.destroy();
  });
