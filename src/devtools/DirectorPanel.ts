import type { Scene } from 'phaser';
import type { LifecycleSnapshot } from '../core/LifecycleService';
import type { ViewportSnapshot } from '../core/ViewportService';
import type { GeneratedHazardStreamState } from '../generation/GeneratedHazardStream';
import type { TelegraphedHazardSimulationState } from '../hazards/TelegraphedHazardSimulation';
import type { InputService, InputSnapshot } from '../input/InputService';
import {
  DIRECTOR_DIAGNOSTIC_PAGES,
  DirectorEncounterDiagnostics,
} from './DirectorEncounterDiagnostics';
import {
  createDirectorResponsiveLayout,
  DIRECTOR_DIAGNOSTICS_PANEL_HEIGHT,
} from './DirectorResponsiveLayout';

export const fitDirectorDiagnosticLines = (lines: readonly string[], width: number): string[] => {
  const columns = Math.max(1, Math.floor(width / 6.6));
  return lines
    .slice(0, 8)
    .map((line) => (line.length <= columns ? line : `${line.slice(0, columns - 1)}…`));
};

interface DirectorPageLifecycleTarget {
  addEventListener(type: 'pagehide', listener: EventListener): void;
  removeEventListener(type: 'pagehide', listener: EventListener): void;
}

type DirectorPanelControl = 'page' | 'visibility';

/** Paged, read-only evidence at 4 Hz inside the existing Director footprint. */
export class DirectorPanel {
  private readonly background: Phaser.GameObjects.Rectangle;
  private readonly text: Phaser.GameObjects.Text;
  private readonly pageButton: Phaser.GameObjects.Text;
  private readonly visibilityButton: Phaser.GameObjects.Text;
  private readonly evidence = new DirectorEncounterDiagnostics();
  readonly observeEncounter = this.evidence.observe;
  private elapsedSinceRefresh = Number.POSITIVE_INFINITY;
  private page = 0;
  private textWidth = 336;
  private activePointerId: number | null = null;
  private activeControl: DirectorPanelControl | null = null;
  private hidden = false;
  private destroyed = false;

  constructor(
    private readonly scene: Scene,
    private readonly inputService: InputService,
    private readonly pageLifecycleTarget: DirectorPageLifecycleTarget = window,
  ) {
    this.background = scene.add
      .rectangle(0, 0, 360, DIRECTOR_DIAGNOSTICS_PANEL_HEIGHT, 0x080a14, 0.88)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(10_000);
    this.text = scene.add
      .text(0, 0, '', {
        color: '#eaf1ff',
        fontFamily: 'monospace',
        fontSize: '11px',
        lineSpacing: 2,
      })
      .setScrollFactor(0)
      .setDepth(10_001);
    this.pageButton = scene.add
      .text(0, 0, '', {
        color: '#ffffff',
        backgroundColor: '#26314f',
        fontFamily: 'monospace',
        fontSize: '12px',
        padding: { y: 4 },
        align: 'center',
      })
      .setScrollFactor(0)
      .setDepth(10_002)
      .setInteractive();
    this.visibilityButton = scene.add
      .text(0, 0, '👁', {
        color: '#ffffff',
        backgroundColor: '#26314f',
        fixedWidth: 28,
        fontFamily: 'monospace',
        fontSize: '14px',
        padding: { y: 3 },
        align: 'center',
      })
      .setScrollFactor(0)
      .setDepth(10_003)
      .setInteractive();

    this.pageButton.on('pointerdown', this.handlePagePointerDown);
    this.pageButton.on('pointerup', this.handlePagePointerUp);
    this.pageButton.on('pointerout', this.cancelInteraction);
    this.pageButton.on('pointerupoutside', this.cancelInteraction);
    this.pageButton.on('pointercancel', this.cancelInteraction);
    this.visibilityButton.on('pointerdown', this.handleVisibilityPointerDown);
    this.visibilityButton.on('pointerup', this.handleVisibilityPointerUp);
    this.visibilityButton.on('pointerout', this.cancelInteraction);
    this.visibilityButton.on('pointerupoutside', this.cancelInteraction);
    this.visibilityButton.on('pointercancel', this.cancelInteraction);
    this.scene.game.canvas.addEventListener('pointercancel', this.cancelInteraction);
    this.scene.game.events.on('blur', this.cancelInteraction);
    this.scene.game.events.on('hidden', this.cancelInteraction);
    this.pageLifecycleTarget.addEventListener('pagehide', this.cancelInteraction);
    this.refreshTitle();
  }

  reset(): void {
    this.evidence.reset();
    this.elapsedSinceRefresh = Number.POSITIVE_INFINITY;
    this.cancelInteraction();
  }

  layout(viewport: ViewportSnapshot): void {
    if (this.destroyed) return;
    const { diagnostics } = createDirectorResponsiveLayout(viewport);
    this.textWidth = Math.max(1, diagnostics.width - 24);
    this.background
      .setPosition(diagnostics.x, diagnostics.y)
      .setSize(diagnostics.width, diagnostics.height);
    this.pageButton
      .setPosition(diagnostics.x + 12, diagnostics.y + 8)
      .setFixedSize(Math.max(1, this.textWidth - 36), 24);
    this.visibilityButton.setPosition(diagnostics.x + diagnostics.width - 40, diagnostics.y + 8);
    this.text.setPosition(diagnostics.x + 12, diagnostics.y + 40);
    this.cancelInteraction();
    this.elapsedSinceRefresh = Number.POSITIVE_INFINITY;
  }

  update(
    frameDeltaMilliseconds: number,
    viewport: ViewportSnapshot,
    input: InputSnapshot,
    lifecycle: LifecycleSnapshot,
    stream: Readonly<GeneratedHazardStreamState>,
    telegraphs: Readonly<TelegraphedHazardSimulationState>,
  ): void {
    if (this.destroyed || this.hidden) return;
    if (lifecycle.paused) this.cancelInteraction();
    if (this.page === DIRECTOR_DIAGNOSTIC_PAGES.length - 1) return;
    this.elapsedSinceRefresh += Math.max(
      0,
      Number.isFinite(frameDeltaMilliseconds) ? frameDeltaMilliseconds : 0,
    );
    if (this.elapsedSinceRefresh < 250) return;
    this.elapsedSinceRefresh = 0;
    this.text.setText(
      fitDirectorDiagnosticLines(
        this.evidence.lines(this.page, { viewport, input, lifecycle, stream, telegraphs }),
        this.textWidth,
      ),
    );
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.cancelInteraction();
    this.scene.game.canvas.removeEventListener('pointercancel', this.cancelInteraction);
    this.scene.game.events.off('blur', this.cancelInteraction);
    this.scene.game.events.off('hidden', this.cancelInteraction);
    this.pageLifecycleTarget.removeEventListener('pagehide', this.cancelInteraction);
    this.visibilityButton.destroy();
    this.pageButton.destroy();
    this.text.destroy();
    this.background.destroy();
    this.evidence.reset();
  }

  private readonly handlePagePointerDown = (
    pointer: { id: number },
    _x: number,
    _y: number,
    event: { stopPropagation(): void },
  ): void => {
    this.beginInteraction('page', pointer.id, event);
  };

  private readonly handlePagePointerUp = (
    pointer: { id: number },
    _x: number,
    _y: number,
    event: { stopPropagation(): void },
  ): void => {
    event.stopPropagation();
    if (!this.finishInteraction('page', pointer.id)) return;
    this.page = (this.page + 1) % DIRECTOR_DIAGNOSTIC_PAGES.length;
    this.text.setText('');
    this.refreshTitle();
    this.elapsedSinceRefresh = Number.POSITIVE_INFINITY;
  };

  private readonly handleVisibilityPointerDown = (
    pointer: { id: number },
    _x: number,
    _y: number,
    event: { stopPropagation(): void },
  ): void => {
    this.beginInteraction('visibility', pointer.id, event);
  };

  private readonly handleVisibilityPointerUp = (
    pointer: { id: number },
    _x: number,
    _y: number,
    event: { stopPropagation(): void },
  ): void => {
    event.stopPropagation();
    if (!this.finishInteraction('visibility', pointer.id)) return;
    this.setHidden(!this.hidden);
  };

  private beginInteraction(
    control: DirectorPanelControl,
    pointerId: number,
    event: { stopPropagation(): void },
  ): void {
    event.stopPropagation();
    if (this.activePointerId !== null) return;
    this.activePointerId = pointerId;
    this.activeControl = control;
    this.inputService.setGameplayBlocked(true);
  }

  private finishInteraction(control: DirectorPanelControl, pointerId: number): boolean {
    if (pointerId !== this.activePointerId || control !== this.activeControl) return false;
    this.cancelInteraction();
    return true;
  }

  private readonly cancelInteraction = (): void => {
    if (this.activePointerId !== null) this.inputService.setGameplayBlocked(false);
    this.activePointerId = null;
    this.activeControl = null;
  };

  private setHidden(hidden: boolean): void {
    this.hidden = hidden;
    this.background.setVisible(!hidden);
    this.text.setVisible(!hidden);
    this.pageButton.setVisible(!hidden);
    if (hidden) {
      this.pageButton.disableInteractive();
      return;
    }

    this.pageButton.setInteractive();
    this.elapsedSinceRefresh = Number.POSITIVE_INFINITY;
  }

  private refreshTitle(): void {
    this.pageButton.setText(
      `M5 ${DIRECTOR_DIAGNOSTIC_PAGES[this.page]} ${this.page + 1}/${DIRECTOR_DIAGNOSTIC_PAGES.length} ›`,
    );
  }
}
