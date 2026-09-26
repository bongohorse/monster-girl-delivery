import type { GameObjects, Scene } from 'phaser';

/**
 * Visual-only placeholder scale. The primitive artwork extends 28 logical units below its origin;
 * 6 / 7 keeps that drawn edge at 24, exactly covering the authoritative collision bottom extent.
 */
export const PROTOTYPE_PLAYER_PRESENTATION_SCALE = 6 / 7;

const drawPrototypePlayer = (graphics: GameObjects.Graphics): void => {
  const outline = 0x18233d;

  // Wings and parcel make the placeholder readable as a flying courier at prototype scale.
  graphics
    .fillStyle(0x52ded2, 1)
    .fillTriangle(-14, -12, -44, -28, -30, 2)
    .fillTriangle(-14, 10, -40, 28, -28, -2)
    .fillStyle(0xf5b942, 1)
    .fillRoundedRect(-32, -14, 20, 29, 4)
    .lineStyle(3, outline, 1)
    .strokeRoundedRect(-32, -14, 20, 29, 4)
    .fillStyle(0xff6b61, 1)
    .fillRoundedRect(-18, -18, 38, 38, 12)
    .lineStyle(3, outline, 1)
    .strokeRoundedRect(-18, -18, 38, 38, 12)
    .fillStyle(0xffd2ad, 1)
    .fillCircle(16, -20, 14)
    .lineStyle(3, outline, 1)
    .strokeCircle(16, -20, 14)
    .fillStyle(outline, 1)
    .fillTriangle(5, -30, 8, -45, 14, -31)
    .fillTriangle(18, -33, 26, -44, 25, -27)
    .fillStyle(0xffffff, 1)
    .fillCircle(21, -22, 4)
    .fillStyle(outline, 1)
    .fillCircle(22, -22, 2);
};

/**
 * Temporary M1 player presentation built only from Phaser primitives.
 * Scene orchestration owns gameplay state and drives this object's position.
 */
export class PrototypePlayerPresentation {
  private graphics?: GameObjects.Graphics;

  constructor(scene: Scene, x = 0, y = 0) {
    const graphics = scene.add.graphics({ x, y });
    drawPrototypePlayer(graphics);
    this.graphics = graphics;
  }

  setPosition(x: number, y: number): void {
    this.graphics?.setPosition(x, y);
  }

  setRotation(rotationRadians: number): void {
    if (!Number.isFinite(rotationRadians)) {
      throw new RangeError('Player presentation rotation must be finite.');
    }

    this.graphics?.setRotation(rotationRadians);
  }

  setScale(x: number, y: number): void {
    this.graphics?.setScale(
      x * PROTOTYPE_PLAYER_PRESENTATION_SCALE,
      y * PROTOTYPE_PLAYER_PRESENTATION_SCALE,
    );
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
