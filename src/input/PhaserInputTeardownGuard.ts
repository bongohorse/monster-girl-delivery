import { Core, type Game } from 'phaser';

interface MouseManagerWithWheelHandler {
  onMouseWheel: EventListener;
}

const getWheelHandler = (game: Game): EventListener | null => {
  const mouse = game.input.mouse as unknown as Partial<MouseManagerWithWheelHandler> | null;

  return typeof mouse?.onMouseWheel === 'function' ? mouse.onMouseWheel : null;
};

/**
 * Works around Phaser 4.2.1 leaving its canvas wheel listener attached after Game teardown.
 *
 * Phaser issue #7340 tracks the upstream omission in MouseManager.stopListeners(). Keep this
 * scoped to the canvas and remove it once Phaser fixes the listener symmetry in our pinned version.
 */
export const installPhaserInputTeardownGuard = (game: Game): (() => void) => {
  let canvas: HTMLCanvasElement | null = null;
  let wheelHandler: EventListener | null = null;
  let disposed = false;

  const captureWheelHandler = (): void => {
    if (disposed) {
      return;
    }

    canvas = game.canvas;
    wheelHandler = getWheelHandler(game);
  };

  const dispose = (): void => {
    if (disposed) {
      return;
    }

    disposed = true;
    game.events.off(Core.Events.BOOT, captureWheelHandler);
    game.events.off(Core.Events.DESTROY, dispose);

    if (canvas && wheelHandler) {
      canvas.removeEventListener('wheel', wheelHandler);
    }

    canvas = null;
    wheelHandler = null;
  };

  if (game.isBooted) {
    captureWheelHandler();
  } else {
    game.events.once(Core.Events.BOOT, captureWheelHandler);
  }

  game.events.once(Core.Events.DESTROY, dispose);

  return dispose;
};
