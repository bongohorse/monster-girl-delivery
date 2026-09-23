import type { Scene } from 'phaser';
import {
  DIAGNOSTICS_HOLD_MILLISECONDS,
  DIAGNOSTICS_JOIN_WINDOW_MILLISECONDS,
  DIAGNOSTICS_REQUIRED_TOUCH_COUNT,
  type DiagnosticsGestureSnapshot,
} from './DiagnosticsAccess';

const RED = 0xff5c64;
const GREEN = 0x61e6a1;

/** Temporary production-only gesture feedback; all objects belong to the scene. */
export class DiagnosticsGestureOverlay {
  private readonly lines: Array<Phaser.GameObjects.Text>;
  private readonly circles: Phaser.GameObjects.Graphics;

  constructor(scene: Scene) {
    this.lines = Array.from({ length: 3 }, () =>
      scene.add
        .text(0, 0, '', {
          color: '#ff5c64',
          fontFamily: 'monospace',
          fontSize: '14px',
          fontStyle: 'bold',
        })
        .setDepth(20_001),
    );
    this.circles = scene.add.graphics().setDepth(20_000);
  }

  layout(safeLeft: number, safeTop: number): void {
    for (let index = 0; index < this.lines.length; index += 1) {
      this.lines[index]?.setPosition(safeLeft + 10, safeTop + 8 + index * 18);
    }
  }

  render(snapshot: DiagnosticsGestureSnapshot): void {
    const validHold = snapshot.phase === 'holding' || snapshot.phase === 'completed-await-release';
    const completed = snapshot.phase === 'completed-await-release';
    const statuses = [
      {
        text: `FINGERS  ${snapshot.touches.length}/${DIAGNOSTICS_REQUIRED_TOUCH_COUNT}`,
        green: validHold && snapshot.touches.length === DIAGNOSTICS_REQUIRED_TOUCH_COUNT,
      },
      {
        text: `JOIN     ${(snapshot.joinElapsedMilliseconds / 1_000).toFixed(2)} / ${(DIAGNOSTICS_JOIN_WINDOW_MILLISECONDS / 1_000).toFixed(2)} s`,
        green: validHold,
      },
      {
        text: `HOLD     ${(snapshot.holdElapsedMilliseconds / 1_000).toFixed(2)} / ${(DIAGNOSTICS_HOLD_MILLISECONDS / 1_000).toFixed(2)} s`,
        green: completed,
      },
    ];
    for (let index = 0; index < this.lines.length; index += 1) {
      const status = statuses[index];
      if (status)
        this.lines[index]?.setText(status.text).setColor(status.green ? '#61e6a1' : '#ff5c64');
    }
    this.circles.clear();
    if (snapshot.phase === 'failed-await-release' || completed) return;
    this.circles.lineStyle(3, validHold ? GREEN : RED, 1);
    for (const touch of snapshot.touches) {
      this.circles.strokeCircle(touch.x, touch.y, 45);
    }
  }

  destroy(): void {
    for (const line of this.lines) line.destroy();
    this.circles.destroy();
  }
}
