import type { GameObjects, Scene } from 'phaser';
import {
  PROTOTYPE_PLACEHOLDER_HAZARD,
  projectHazardHitboxToScreen,
} from '../hazards/PrototypeHazard';
import type { LogicalHazard } from '../systems/HazardCollision';
import type { RunMotionState } from '../systems/RunMotionSimulation';

/** Temporary barrier presentation; logical collision and generated identity remain outside Phaser. */
export class PrototypeHazardPresentation {
  private graphics?: GameObjects.Graphics;

  constructor(
    scene: Scene,
    private readonly hazard: Readonly<LogicalHazard> = PROTOTYPE_PLACEHOLDER_HAZARD,
  ) {
    const width = hazard.hitbox.right - hazard.hitbox.left;
    const height = hazard.hitbox.bottom - hazard.hitbox.top;
    const graphics = scene.add.graphics().setDepth(-50);

    graphics
      .fillStyle(0xd93f55, 1)
      .fillRoundedRect(0, 0, width, height, 6)
      .lineStyle(4, 0xffd166, 1)
      .strokeRoundedRect(0, 0, width, height, 6)
      .fillStyle(0xffd166, 0.9);

    for (let y = 12; y < height - 8; y += 24) {
      graphics.fillTriangle(8, y, width - 8, y + 8, 8, y + 16);
    }

    this.graphics = graphics;
  }

  render(runState: Readonly<RunMotionState>, playerScreenX: number): void {
    const graphics = this.graphics;

    if (!graphics) {
      return;
    }

    const screenHitbox = projectHazardHitboxToScreen(this.hazard, runState, playerScreenX);
    graphics.setPosition(screenHitbox.left, screenHitbox.top);
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
