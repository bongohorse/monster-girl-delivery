import type { Scene } from 'phaser';
import type { ViewportSnapshot } from '../core/ViewportService';
import type { InputService } from '../input/InputService';
import { createDirectorResponsiveLayout } from './DirectorResponsiveLayout';

interface PointerEventData {
  stopPropagation?: () => void;
}

/** Development-only action for replaying the current deterministic run from its initial seed. */
export class DirectorRunControls {
  private readonly restartButton: Phaser.GameObjects.Text;
  private destroyed = false;
  private restartPressed = false;

  constructor(
    scene: Scene,
    private readonly inputService: InputService,
    private readonly restartSameSeed: () => void,
  ) {
    this.restartButton = scene.add
      .text(0, 0, 'Restart same seed', {
        align: 'center',
        backgroundColor: '#26314f',
        color: '#ffffff',
        fixedWidth: 336,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: '14px',
        fontStyle: 'bold',
        padding: { y: 6 },
      })
      .setScrollFactor(0)
      .setDepth(10_002)
      .setInteractive();

    this.restartButton.on('pointerover', this.blockGameplay);
    this.restartButton.on('pointerdown', this.handlePointerDown);
    this.restartButton.on('pointerup', this.handlePointerUp);
    this.restartButton.on('pointerout', this.cancelInteraction);
    this.restartButton.on('pointerupoutside', this.cancelInteraction);
  }

  layout(viewport: ViewportSnapshot): void {
    if (this.destroyed) {
      return;
    }

    const { diagnostics } = createDirectorResponsiveLayout(viewport);
    this.restartButton
      .setPosition(diagnostics.x + 12, diagnostics.y + diagnostics.height - 40)
      .setFixedSize(Math.max(0, diagnostics.width - 24), 32);
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.restartPressed = false;
    this.inputService.setGameplayBlocked(false);
    this.restartButton.destroy();
  }

  private readonly blockGameplay = (): void => {
    this.inputService.setGameplayBlocked(true);
  };

  private readonly handlePointerDown = (
    _pointer?: unknown,
    _localX?: unknown,
    _localY?: unknown,
    event?: PointerEventData,
  ): void => {
    event?.stopPropagation?.();
    this.blockGameplay();
    this.restartPressed = true;
  };

  private readonly handlePointerUp = (
    _pointer?: unknown,
    _localX?: unknown,
    _localY?: unknown,
    event?: PointerEventData,
  ): void => {
    event?.stopPropagation?.();
    const shouldRestart = this.restartPressed;
    this.restartPressed = false;
    this.inputService.setGameplayBlocked(false);

    if (shouldRestart) {
      this.restartSameSeed();
    }
  };

  private readonly cancelInteraction = (): void => {
    this.restartPressed = false;
    this.inputService.setGameplayBlocked(false);
  };
}
