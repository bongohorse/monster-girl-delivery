import type { GameObjects, Scene } from 'phaser';
import { PROTOTYPE_DELIVERY_TUNING } from '../config/DeliveryTuning';
import {
  type PrototypeVerticalProjection,
  projectLogicalYToScreen,
} from '../game/PrototypeFlightLayout';
import type { ParcelDeliveryRoute, ParcelDeliveryRunState } from '../systems/ParcelDelivery';

const drawCue = (
  graphics: GameObjects.Graphics,
  x: number,
  y: number,
  scale: number,
  direction: 'down' | 'right',
  alpha = 1,
): void => {
  graphics.fillStyle(0x211936, 0.94);
  graphics.fillRoundedRect(x - 34 * scale, y - 28 * scale, 68 * scale, 56 * scale, 10 * scale);
  graphics.lineStyle(3 * scale, 0xffd166, alpha);
  graphics.strokeRoundedRect(x - 34 * scale, y - 28 * scale, 68 * scale, 56 * scale, 10 * scale);
  graphics.fillStyle(0x6fffe9, alpha);
  graphics.fillRect(x - 13 * scale, y - 21 * scale, 26 * scale, 5 * scale);
  graphics.fillStyle(0xffd166, alpha);
  if (direction === 'right') {
    graphics.fillTriangle(
      x - 10 * scale,
      y - 17 * scale,
      x - 10 * scale,
      y + 17 * scale,
      x + 13 * scale,
      y,
    );
  } else {
    graphics.fillTriangle(
      x - 17 * scale,
      y - 10 * scale,
      x + 17 * scale,
      y - 10 * scale,
      x,
      y + 13 * scale,
    );
  }
};

/** Lightweight, provisional shapes for the route; the authoritative contact lives in the run. */
export class FirstDeliveryPresentation {
  private readonly graphics: GameObjects.Graphics;

  constructor(scene: Scene) {
    this.graphics = scene.add.graphics().setDepth(20);
  }

  render(
    route: Readonly<ParcelDeliveryRoute>,
    delivery: Readonly<ParcelDeliveryRunState> | undefined,
    runDistance: number,
    playerScreenX: number,
    viewportWidth: number,
    projection: Readonly<PrototypeVerticalProjection>,
  ): void {
    const graphics = this.graphics;
    graphics.clear();
    if (delivery?.phase === 'delivered' || delivery?.phase === 'missed') return;

    if (delivery?.phase !== 'carrying') {
      const x = playerScreenX + route.pickup.runDistance - runDistance;
      if (x >= -32 && x <= viewportWidth + 32) {
        const y = projectLogicalYToScreen(route.pickup.y, projection);
        graphics.fillStyle(0xf8d768, 0.98);
        graphics.fillRect(x - 13, y - 11, 26, 22);
        graphics.lineStyle(3, 0x69478c, 1);
        graphics.strokeRect(x - 13, y - 11, 26, 22);
        graphics.lineBetween(x, y - 11, x, y + 11);
        graphics.lineBetween(x - 5, y - 12, x - 2, y - 23);
        graphics.lineBetween(x + 5, y - 12, x + 2, y - 23);
        if (x >= 40 && x <= viewportWidth - 40) {
          drawCue(graphics, x, y - 49, 0.62, 'down');
        }
      }
      return;
    }

    const x = playerScreenX + route.recipient.runDistance - runDistance;
    const y = projectLogicalYToScreen(route.recipient.y, projection);
    if (x >= -65 && x <= viewportWidth + 65) {
      const height = 144 * projection.scaleY;
      graphics.fillStyle(0x6fffe9, 0.18);
      graphics.fillRect(x - 52, y - height / 2, 104, height);
      graphics.lineStyle(3, 0x6fffe9, 0.95);
      graphics.strokeRect(x - 52, y - height / 2, 104, height);
      graphics.fillStyle(0xffd166, 1);
      graphics.fillCircle(x, y, 13);
      graphics.fillStyle(0x281c48, 1);
      graphics.fillCircle(x, y - 2, 5);
    }
    const distanceToDrop = route.recipient.runDistance - runDistance;
    if (
      distanceToDrop <= PROTOTYPE_DELIVERY_TUNING.dropCueLeadDistance &&
      x >= playerScreenX - 52
    ) {
      if (x > viewportWidth - 52) {
        const blink = Math.floor(runDistance / 110) % 2 === 0 ? 1 : 0.3;
        drawCue(graphics, viewportWidth - 40, y, 0.82, 'right', blink);
      } else {
        drawCue(graphics, x, y - 41, 1, 'down');
      }
    }
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
