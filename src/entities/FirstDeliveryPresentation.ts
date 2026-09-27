import type { GameObjects, Scene } from 'phaser';
import {
  type PrototypeVerticalProjection,
  projectLogicalYToScreen,
} from '../game/PrototypeFlightLayout';
import type { ParcelDeliveryRoute, ParcelDeliveryRunState } from '../systems/ParcelDelivery';

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
    // Keep the destination height readable from pickup onward, including while it is off screen.
    if (x > playerScreenX) {
      const cueX = Math.min(viewportWidth - 40, Math.max(playerScreenX + 48, x));
      const cueY = y - 41;
      const pulse = 0.78 + 0.22 * Math.sin(runDistance / 35) ** 2;
      graphics.fillStyle(0x211936, 0.94);
      graphics.fillRoundedRect(cueX - 34, cueY - 28, 68, 56, 10);
      graphics.lineStyle(3, 0xffd166, pulse);
      graphics.strokeRoundedRect(cueX - 34, cueY - 28, 68, 56, 10);
      graphics.fillStyle(0x6fffe9, 1);
      graphics.fillRect(cueX - 13, cueY - 21, 26, 5);
      graphics.fillStyle(0xffd166, pulse);
      graphics.fillTriangle(cueX - 17, cueY - 10, cueX + 17, cueY - 10, cueX, cueY + 13);
    }
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
