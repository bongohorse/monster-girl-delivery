import type { GameObjects, Scene } from 'phaser';
import {
  type PrototypeVerticalOffsetOrProjection,
  resolveVerticalProjection,
} from '../game/PrototypeFlightLayout';
import type { LogicalHazardSpawnInstance } from '../generation/PatternSpawnScheduler';
import type { RunMotionState } from '../systems/RunMotionSimulation';

/** Trial art follows the existing static logical hitbox; it never owns collision. */
export class MoltenSpikePresentation {
  private readonly image: GameObjects.Image;

  constructor(
    scene: Scene,
    private readonly hazard: Readonly<LogicalHazardSpawnInstance>,
  ) {
    this.image = scene.add.image(0, 0, 'molten-spike-trial').setDepth(-50).setFlipX(true);
  }

  render(
    runState: Readonly<RunMotionState>,
    playerScreenX: number,
    verticalProjection: PrototypeVerticalOffsetOrProjection = 0,
  ): void {
    const projection = resolveVerticalProjection(verticalProjection);
    const { hitbox } = this.hazard;
    const centerX = playerScreenX + (hitbox.left + hitbox.right) / 2 - runState.distance;
    const centerY = projection.offsetY + ((hitbox.top + hitbox.bottom) / 2) * projection.scaleY;
    // The visible spikes extend beyond the conservative inner collision box, avoiding invisible hits.
    this.image
      .setPosition(centerX, centerY)
      .setDisplaySize(
        (hitbox.right - hitbox.left) * 1.5,
        (hitbox.bottom - hitbox.top) * projection.scaleY * 1.5,
      );
  }

  destroy(): void {
    this.image.destroy();
  }
}
