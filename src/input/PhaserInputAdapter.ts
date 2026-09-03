import { Input, type Scene, Scenes } from 'phaser';
import type { InputService, PointerSource } from './InputService';

/** Bridges Phaser input events to InputService and owns all raw gameplay listeners. */
export class PhaserInputAdapter {
  private destroyed = false;
  private readonly keyboard: Phaser.Input.Keyboard.KeyboardPlugin | null;

  constructor(
    private readonly scene: Scene,
    private readonly inputService: InputService,
  ) {
    this.keyboard = scene.input.keyboard;
    scene.input.on(Input.Events.POINTER_DOWN, this.handlePointerDown);
    scene.input.on(Input.Events.POINTER_UP, this.handlePointerUp);
    scene.input.on(Input.Events.POINTER_UP_OUTSIDE, this.handlePointerUp);
    this.keyboard?.addCapture(Input.Keyboard.KeyCodes.SPACE);
    this.keyboard?.on('keydown-SPACE', this.handleSpaceDown);
    this.keyboard?.on('keyup-SPACE', this.handleSpaceUp);
    scene.events.once(Scenes.Events.SHUTDOWN, this.destroy);
  }

  destroy = (): void => {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.scene.input.off(Input.Events.POINTER_DOWN, this.handlePointerDown);
    this.scene.input.off(Input.Events.POINTER_UP, this.handlePointerUp);
    this.scene.input.off(Input.Events.POINTER_UP_OUTSIDE, this.handlePointerUp);
    this.keyboard?.off('keydown-SPACE', this.handleSpaceDown);
    this.keyboard?.off('keyup-SPACE', this.handleSpaceUp);
    this.keyboard?.removeCapture(Input.Keyboard.KeyCodes.SPACE);
    this.scene.events.off(Scenes.Events.SHUTDOWN, this.destroy);
    this.inputService.releaseAll();
  };

  private readonly handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
    if (pointer.button !== 0) {
      return;
    }

    const source: PointerSource = pointer.wasTouch ? 'touch' : 'mouse';
    this.inputService.pressPointer(pointer.id, source);
  };

  private readonly handlePointerUp = (pointer: Phaser.Input.Pointer): void => {
    if (pointer.wasCanceled) {
      this.inputService.cancelPointer(pointer.id);
      return;
    }

    this.inputService.releasePointer(pointer.id);
  };

  private readonly handleSpaceDown = (event?: KeyboardEvent): void => {
    if (event?.repeat) {
      return;
    }

    this.inputService.setSpaceHeld(true);
  };

  private readonly handleSpaceUp = (): void => {
    this.inputService.setSpaceHeld(false);
  };
}
