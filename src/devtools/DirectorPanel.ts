import type { Scene } from 'phaser';
import type { LifecycleSnapshot } from '../core/LifecycleService';
import type { ViewportSnapshot } from '../core/ViewportService';
import type { InputSnapshot } from '../input/InputService';

const PANEL_MARGIN = 12;
const PANEL_HEIGHT = 164;
const PANEL_MAX_WIDTH = 360;

/** Minimal read-only diagnostics for Director device testing. */
export class DirectorPanel {
  private readonly background: Phaser.GameObjects.Rectangle;
  private readonly text: Phaser.GameObjects.Text;
  private elapsedSinceRefresh = Number.POSITIVE_INFINITY;

  constructor(scene: Scene) {
    this.background = scene.add
      .rectangle(0, 0, PANEL_MAX_WIDTH, PANEL_HEIGHT, 0x080a14, 0.88)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(10_000);
    this.text = scene.add
      .text(0, 0, '', {
        color: '#eaf1ff',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: '13px',
        lineSpacing: 3,
      })
      .setScrollFactor(0)
      .setDepth(10_001);
  }

  layout(viewport: ViewportSnapshot): void {
    const availableWidth = Math.max(
      160,
      viewport.width - viewport.safeArea.left - viewport.safeArea.right - PANEL_MARGIN * 2,
    );
    const panelWidth = Math.min(PANEL_MAX_WIDTH, availableWidth);
    const x = viewport.safeArea.left + PANEL_MARGIN;
    const y = viewport.safeArea.top + PANEL_MARGIN;

    this.background.setPosition(x, y).setSize(panelWidth, PANEL_HEIGHT);
    this.text.setPosition(x + 12, y + 10).setWordWrapWidth(panelWidth - 24);
    this.elapsedSinceRefresh = Number.POSITIVE_INFINITY;
  }

  update(
    frameDeltaMilliseconds: number,
    framesPerSecond: number,
    viewport: ViewportSnapshot,
    input: InputSnapshot,
    lifecycle: LifecycleSnapshot,
  ): void {
    this.elapsedSinceRefresh += frameDeltaMilliseconds;

    if (this.elapsedSinceRefresh < 250) {
      return;
    }

    this.elapsedSinceRefresh = 0;
    const pointer = input.pointerHeld
      ? `${input.pointerSource ?? 'unknown'} #${input.activePointerId ?? '?'}`
      : 'none';
    const pauseState = lifecycle.paused ? lifecycle.pauseReasons.join(', ') : 'running';

    this.text.setText([
      'DIRECTOR DIAGNOSTICS — M1',
      `FPS: ${Math.round(framesPerSecond)}`,
      `Viewport: ${Math.round(viewport.width)} × ${Math.round(viewport.height)}`,
      `Orientation: ${viewport.orientation}`,
      `Pointer: ${pointer} | Space: ${input.spaceHeld ? 'held' : 'up'}`,
      `Thrust intent: ${input.thrustHeld ? 'held' : 'idle'}`,
      `Gameplay blocked: ${input.gameplayBlocked ? 'yes' : 'no'}`,
      `Lifecycle: ${pauseState}`,
    ]);
  }
}
