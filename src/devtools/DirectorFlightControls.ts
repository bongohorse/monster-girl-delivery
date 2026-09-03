import type { FlightTuningConfig, FlightTuningValues } from '../config/FlightTuningConfig';
import type { ViewportSnapshot } from '../core/ViewportService';
import type { InputService } from '../input/InputService';
import type { Scene } from 'phaser';

type FlightTuningKey = keyof FlightTuningValues;
type AdjustmentDirection = -1 | 1;

interface ControlDefinition {
  key: FlightTuningKey;
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

const PANEL_MARGIN = 12;
const PANEL_GAP = 12;
const DIAGNOSTICS_PANEL_HEIGHT = 164;
const PANEL_HEIGHT = 196;
const PANEL_MAX_WIDTH = 360;

const CONTROLS: readonly ControlDefinition[] = [
  { key: 'gravity', label: 'Gravity', step: 100, unit: 'px/s²' },
  { key: 'thrust', label: 'Thrust', step: 100, unit: 'px/s²' },
  { key: 'maxFallVelocity', label: 'Max fall', step: 25, unit: 'px/s' },
  { key: 'maxRiseVelocity', label: 'Max rise', step: 25, unit: 'px/s' },
];

/**
 * Temporary M1 Director controls for live PROTOTYPE flight tuning.
 * The shared FlightTuningConfig remains the single source of truth.
 */
export class DirectorFlightControls {
  private readonly background: Phaser.GameObjects.Rectangle;
  private readonly title: Phaser.GameObjects.Text;
  private readonly rows: ControlRow[];
  private destroyed = false;

  constructor(
    private readonly scene: Scene,
    private readonly flightTuning: FlightTuningConfig,
    private readonly inputService: InputService,
  ) {
    this.background = scene.add
      .rectangle(0, 0, PANEL_MAX_WIDTH, PANEL_HEIGHT, 0x080a14, 0.88)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(10_000);
    this.title = scene.add
      .text(0, 0, 'M1 FLIGHT TUNING — PROTOTYPE', {
        color: '#ffffff',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: '13px',
        fontStyle: 'bold',
      })
      .setScrollFactor(0)
      .setDepth(10_001);

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
  setValue(key: FlightTuningKey, value: number): boolean {
    if (this.destroyed || !Number.isFinite(value) || value < 0) {
      return false;
    }

    this.flightTuning.update({ [key]: value });
    this.refreshValues();
    return true;
  }

  layout(viewport: ViewportSnapshot): void {
    if (this.destroyed) {
      return;
    }

    const availableWidth = Math.max(
      160,
      viewport.width - viewport.safeArea.left - viewport.safeArea.right - PANEL_MARGIN * 2,
    );
    const panelWidth = Math.min(PANEL_MAX_WIDTH, availableWidth);
    const x = viewport.safeArea.left + PANEL_MARGIN;
    const y = viewport.safeArea.top + PANEL_MARGIN + DIAGNOSTICS_PANEL_HEIGHT + PANEL_GAP;
    const buttonLeft = x + panelWidth - 72;

    this.background.setPosition(x, y).setSize(panelWidth, PANEL_HEIGHT);
    this.title.setPosition(x + 12, y + 10);

    this.rows.forEach((row, index) => {
      const rowY = y + 44 + index * 34;
      row.label.setPosition(x + 12, rowY);
      row.minus.setPosition(buttonLeft, rowY - 4);
      row.plus.setPosition(buttonLeft + 38, rowY - 4);
    });
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.inputService.setGameplayBlocked(false);
    this.background.destroy();
    this.title.destroy();

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
      const current = this.flightTuning.getSnapshot()[definition.key];
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

  private refreshValues(): void {
    if (this.destroyed) {
      return;
    }

    const values = this.flightTuning.getSnapshot();

    for (const row of this.rows) {
      row.label.setText(
        `${row.definition.label}: ${values[row.definition.key]} ${row.definition.unit}`,
      );
    }
  }
}
