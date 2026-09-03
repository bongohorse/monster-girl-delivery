import type { GameObjects, Scene } from 'phaser';
import type { ViewportSnapshot } from '../core/ViewportService';
import { createPrototypeScrollingWorldLayout } from '../game/PrototypeScrollingWorldLayout';

/** Temporary M2 scrolling-world presentation built only from Phaser primitives. */
export class PrototypeScrollingWorldPresentation {
  private graphics?: GameObjects.Graphics;

  constructor(scene: Scene) {
    this.graphics = scene.add.graphics().setDepth(-100);
  }

  render(distance: number, viewport: ViewportSnapshot): void {
    const graphics = this.graphics;

    if (!graphics) {
      return;
    }

    const layout = createPrototypeScrollingWorldLayout(viewport, distance);
    graphics.clear().fillStyle(0x1a2540, 1);

    for (const building of layout.buildings) {
      graphics.fillRoundedRect(building.x, building.y, building.width, building.height, 4);
    }

    graphics
      .fillStyle(0x35466e, 1)
      .fillRect(0, layout.groundTopY, layout.width, layout.height - layout.groundTopY);
    graphics.fillStyle(0x8eb8d9, 0.75);

    for (const marker of layout.groundMarkers) {
      graphics.fillRect(marker.x, layout.groundTopY + 3, marker.width, 3);
    }
  }

  destroy(): void {
    const graphics = this.graphics;

    if (!graphics) {
      return;
    }

    this.graphics = undefined;
    graphics.destroy();
  }
}
