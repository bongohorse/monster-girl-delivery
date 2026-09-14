import type { Scene } from 'phaser';
import type { ViewportSnapshot } from '../core/ViewportService';
import type { InputService } from '../input/InputService';
import { DIRECTOR_PANEL_VISIBILITY_EVENT } from './DirectorPanel';
import { createDirectorResponsiveLayout } from './DirectorResponsiveLayout';

interface PointerEventData {
  stopPropagation?: () => void;
}

interface PointerData {
  id: number;
}

type RunAction = 'new-seed' | 'restart';

const BUTTON_GAP = 8;

/** Development-only actions for restarting or replacing the current deterministic run seed. */
export class DirectorRunControls {
  private readonly restartButton: Phaser.GameObjects.Text;
  private readonly newSeedButton: Phaser.GameObjects.Text;
  private destroyed = false;
  private visible = true;
  private activePointerId: number | null = null;
  private pressedAction: RunAction | null = null;

  constructor(
    private readonly scene: Scene,
    private readonly inputService: InputService,
    private readonly restartSameSeed: () => void,
    private readonly startNewSeed: () => void,
  ) {
    this.restartButton = this.createButton(scene, 'Restart same seed', 'restart');
    this.newSeedButton = this.createButton(scene, 'New random seed', 'new-seed');
    this.scene.game.canvas.addEventListener('pointercancel', this.cancelInteraction);
    this.scene.events.on(DIRECTOR_PANEL_VISIBILITY_EVENT, this.handlePanelVisibility);
  }

  layout(viewport: ViewportSnapshot): void {
    if (this.destroyed) {
      return;
    }

    const { diagnostics } = createDirectorResponsiveLayout(viewport);
    const controlsWidth = Math.max(0, diagnostics.width - 24);
    const buttonWidth = Math.max(0, (controlsWidth - BUTTON_GAP) / 2);
    const textResolution = this.scene.cameras.main.zoom;
    const y = diagnostics.y + diagnostics.height - 40;

    this.restartButton
      .setResolution(textResolution)
      .setPosition(diagnostics.x + 12, y)
      .setFixedSize(buttonWidth, 32);
    this.newSeedButton
      .setResolution(textResolution)
      .setPosition(diagnostics.x + 12 + buttonWidth + BUTTON_GAP, y)
      .setFixedSize(buttonWidth, 32);
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.cancelInteraction();
    this.scene.game.canvas.removeEventListener('pointercancel', this.cancelInteraction);
    this.scene.events.off(DIRECTOR_PANEL_VISIBILITY_EVENT, this.handlePanelVisibility);
    this.restartButton.destroy();
    this.newSeedButton.destroy();
  }

  private readonly blockGameplay = (): void => {
    this.inputService.setGameplayBlocked(true);
  };

  private readonly handlePanelVisibility = (visible: boolean): void => {
    if (this.destroyed || visible === this.visible) {
      return;
    }

    this.visible = visible;
    this.cancelInteraction();
    this.restartButton.setVisible(visible);
    this.newSeedButton.setVisible(visible);

    for (const button of [this.restartButton, this.newSeedButton]) {
      if (visible) {
        button.setInteractive();
      } else {
        button.disableInteractive();
      }
    }
  };

  private createButton(scene: Scene, label: string, action: RunAction): Phaser.GameObjects.Text {
    const button = scene.add
      .text(0, 0, label, {
        align: 'center',
        backgroundColor: '#26314f',
        color: '#ffffff',
        fixedWidth: 164,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: '12px',
        fontStyle: 'bold',
        padding: { y: 6 },
      })
      .setScrollFactor(0)
      .setDepth(10_002)
      .setInteractive();

    button.on('pointerover', this.blockGameplay);
    button.on(
      'pointerdown',
      (pointer: PointerData, _localX: number, _localY: number, event: PointerEventData) => {
        this.handlePointerDown(action, pointer, event);
      },
    );
    button.on(
      'pointerup',
      (pointer: PointerData, _localX: number, _localY: number, event: PointerEventData) => {
        this.handlePointerUp(action, pointer, event);
      },
    );
    button.on('pointerout', this.cancelInteraction);
    button.on('pointerupoutside', this.cancelInteraction);

    return button;
  }

  private handlePointerDown(
    action: RunAction,
    pointer: PointerData,
    event?: PointerEventData,
  ): void {
    event?.stopPropagation?.();
    if (this.activePointerId !== null) {
      return;
    }

    this.blockGameplay();
    this.activePointerId = pointer.id;
    this.pressedAction = action;
  }

  private handlePointerUp(action: RunAction, pointer: PointerData, event?: PointerEventData): void {
    event?.stopPropagation?.();
    if (pointer.id !== this.activePointerId || action !== this.pressedAction) {
      return;
    }

    this.cancelInteraction();
    if (action === 'restart') this.restartSameSeed();
    else this.startNewSeed();
  }

  private readonly cancelInteraction = (): void => {
    this.activePointerId = null;
    this.pressedAction = null;
    this.inputService.setGameplayBlocked(false);
  };
}
