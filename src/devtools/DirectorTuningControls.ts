import type { Scene } from 'phaser';
import type { FlightTuningConfig, FlightTuningValues } from '../config/FlightTuningConfig';
import type { RunMotionConfig, RunMotionValues } from '../config/RunMotionConfig';
import type { ViewportSnapshot } from '../core/ViewportService';
import type { InputService } from '../input/InputService';
import { createDirectorResponsiveLayout } from './DirectorResponsiveLayout';

type TuningKey = keyof FlightTuningValues | keyof RunMotionValues;
type AdjustmentDirection = -1 | 1;

interface ControlDefinition {
  key: TuningKey;
  label: string;
  step: number;
  unit: string;
}

interface ControlRow {
  definition: ControlDefinition;
  label: Phaser.GameObjects.Text;
  minus: Phaser.GameObjects.Text;
  plus: Phaser.GameObjects.Text;
}

interface PointerEventData {
  stopPropagation?: () => void;
}

/** Prototype adjustment steps for rapid Director playtesting. */
const CONTROLS: readonly ControlDefinition[] = [
  { key: 'gravity', label: 'Gravity', step: 100, unit: 'px/s²' },
  { key: 'thrust', label: 'Thrust', step: 100, unit: 'px/s²' },
  { key: 'maxFallVelocity', label: 'Max fall', step: 25, unit: 'px/s' },
  { key: 'maxRiseVelocity', label: 'Max rise', step: 25, unit: 'px/s' },
  { key: 'baseScrollSpeed', label: 'Scroll', step: 25, unit: 'px/s' },
];

/**
 * Temporary Director controls for live PROTOTYPE flight and run-motion tuning.
 * The shared runtime configs remain the single sources of truth.
 */
export class DirectorTuningControls {
  private readonly background: Phaser.GameObjects.Rectangle;
  private readonly title: Phaser.GameObjects.Text;
  private readonly visibilityButton: Phaser.GameObjects.Text;
  private readonly rows: ControlRow[];
  private hidden = false;
  private visibilityPointerId: number | null = null;
  private destroyed = false;

  constructor(
    private readonly scene: Scene,
    private readonly flightTuning: FlightTuningConfig,
    private readonly runMotion: RunMotionConfig,
    private readonly inputService: InputService,
  ) {
    this.background = scene.add
      .rectangle(0, 0, 360, 230, 0x080a14, 0.88)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(10_000);
    this.title = scene.add
      .text(0, 0, 'DIRECTOR TUNING — PROTOTYPE', {
        color: '#ffffff',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: '13px',
        fontStyle: 'bold',
      })
      .setScrollFactor(0)
      .setDepth(10_001);
    this.visibilityButton = scene.add
      .text(0, 0, '👁', {
        backgroundColor: '#26314f',
        color: '#ffffff',
        fixedWidth: 28,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: '14px',
        padding: { y: 3 },
        align: 'center',
      })
      .setScrollFactor(0)
      .setDepth(10_003)
      .setInteractive();
    this.visibilityButton.on('pointerdown', this.handleVisibilityPointerDown);
    this.visibilityButton.on('pointerup', this.handleVisibilityPointerUp);
    this.visibilityButton.on('pointerout', this.cancelVisibilityInteraction);
    this.visibilityButton.on('pointerupoutside', this.cancelVisibilityInteraction);
    this.visibilityButton.on('pointercancel', this.cancelVisibilityInteraction);

    this.rows = CONTROLS.map((definition) => ({
      definition,
      label: scene.add
        .text(0, 0, '', {
          color: '#eaf1ff',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          fontSize: '13px',
        })
        .setScrollFactor(0)
        .setDepth(10_001),
      minus: this.createButton(definition, -1, '−'),
      plus: this.createButton(definition, 1, '+'),
    }));

    this.refreshValues();
  }

  /** Rejects invalid values instead of allowing non-finite simulation configuration. */
  setValue(key: TuningKey, value: number): boolean {
    if (this.destroyed || !Number.isFinite(value) || value < 0) {
      return false;
    }

    if (key === 'baseScrollSpeed') {
      this.runMotion.update({ baseScrollSpeed: value });
    } else {
      this.flightTuning.update({ [key]: value });
    }
    this.refreshValues();
    return true;
  }

  layout(viewport: ViewportSnapshot): void {
    if (this.destroyed) {
      return;
    }

    const { tuningControls } = createDirectorResponsiveLayout(viewport);
    const buttonLeft = tuningControls.x + tuningControls.width - 72;

    this.background
      .setPosition(tuningControls.x, tuningControls.y)
      .setSize(tuningControls.width, tuningControls.height);
    this.title.setPosition(tuningControls.x + 12, tuningControls.y + 10);
    this.visibilityButton.setPosition(
      tuningControls.x + tuningControls.width - 40,
      tuningControls.y + 8,
    );

    this.rows.forEach((row, index) => {
      const rowY = tuningControls.y + 44 + index * 34;
      row.label.setPosition(tuningControls.x + 12, rowY);
      row.minus.setPosition(buttonLeft, rowY - 4);
      row.plus.setPosition(buttonLeft + 38, rowY - 4);
    });
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.cancelVisibilityInteraction();
    this.inputService.setGameplayBlocked(false);
    this.background.destroy();
    this.title.destroy();
    this.visibilityButton.destroy();

    for (const row of this.rows) {
      row.label.destroy();
      row.minus.destroy();
      row.plus.destroy();
    }
  }

  private createButton(
    definition: ControlDefinition,
    direction: AdjustmentDirection,
    text: string,
  ): Phaser.GameObjects.Text {
    const button = this.scene.add
      .text(0, 0, text, {
        backgroundColor: '#26314f',
        color: '#ffffff',
        fixedWidth: 32,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: '20px',
        padding: { y: 2 },
        align: 'center',
      })
      .setScrollFactor(0)
      .setDepth(10_002)
      .setInteractive();

    const blockGameplay = (): void => {
      this.inputService.setGameplayBlocked(true);
    };
    const releaseGameplay = (): void => {
      this.inputService.setGameplayBlocked(false);
    };
    const adjust = (
      _pointer?: unknown,
      _localX?: unknown,
      _localY?: unknown,
      event?: PointerEventData,
    ): void => {
      event?.stopPropagation?.();
      blockGameplay();
      const current = this.getValue(definition.key);
      const next = Math.max(0, current + definition.step * direction);
      this.setValue(definition.key, next);
    };
    const release = (
      _pointer?: unknown,
      _localX?: unknown,
      _localY?: unknown,
      event?: PointerEventData,
    ): void => {
      event?.stopPropagation?.();
      releaseGameplay();
    };

    button.on('pointerover', blockGameplay);
    button.on('pointerdown', adjust);
    button.on('pointerup', release);
    button.on('pointerout', releaseGameplay);

    return button;
  }

  private readonly handleVisibilityPointerDown = (
    pointer: { id: number },
    _localX?: unknown,
    _localY?: unknown,
    event?: PointerEventData,
  ): void => {
    event?.stopPropagation?.();
    if (this.visibilityPointerId !== null) return;
    this.visibilityPointerId = pointer.id;
    this.inputService.setGameplayBlocked(true);
  };

  private readonly handleVisibilityPointerUp = (
    pointer: { id: number },
    _localX?: unknown,
    _localY?: unknown,
    event?: PointerEventData,
  ): void => {
    event?.stopPropagation?.();
    if (pointer.id !== this.visibilityPointerId) return;
    this.cancelVisibilityInteraction();
    this.setHidden(!this.hidden);
  };

  private readonly cancelVisibilityInteraction = (): void => {
    if (this.visibilityPointerId !== null) this.inputService.setGameplayBlocked(false);
    this.visibilityPointerId = null;
  };

  private setHidden(hidden: boolean): void {
    this.hidden = hidden;
    this.background.setVisible(!hidden);
    this.title.setVisible(!hidden);

    for (const row of this.rows) {
      row.label.setVisible(!hidden);
      row.minus.setVisible(!hidden);
      row.plus.setVisible(!hidden);
      if (hidden) {
        row.minus.disableInteractive();
        row.plus.disableInteractive();
      } else {
        row.minus.setInteractive();
        row.plus.setInteractive();
      }
    }

    if (!hidden) this.refreshValues();
  }

  private refreshValues(): void {
    if (this.destroyed) {
      return;
    }

    for (const row of this.rows) {
      row.label.setText(
        `${row.definition.label}: ${this.getValue(row.definition.key)} ${row.definition.unit}`,
      );
    }
  }

  private getValue(key: TuningKey): number {
    return key === 'baseScrollSpeed'
      ? this.runMotion.getSnapshot().baseScrollSpeed
      : this.flightTuning.getSnapshot()[key];
  }
}
