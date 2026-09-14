import type { GameObjects, Scene } from 'phaser';
import {
  type PrototypeVerticalOffsetOrProjection,
  projectLogicalYToScreen,
  resolveVerticalProjection,
} from '../game/PrototypeFlightLayout';
import {
  getLogicalCollectibleSpawnIdentity,
  type LogicalCollectibleSpawnInstance,
} from '../generation/GeneratedCollectibles';
import type { RunMotionState } from '../systems/RunMotionSimulation';

interface ActiveCollectiblePresentation {
  readonly graphics: GameObjects.Graphics;
}

const drawCollectible = (
  graphics: GameObjects.Graphics,
  collectible: Readonly<LogicalCollectibleSpawnInstance>,
): void => {
  const riskReward = collectible.intent === 'risk-reward';
  const fillColor = riskReward ? 0xffd166 : 0x6fffe9;
  const strokeColor = riskReward ? 0xff2d95 : 0xffffff;

  graphics
    .fillStyle(fillColor, 0.95)
    .fillCircle(0, 0, 8)
    .lineStyle(3, strokeColor, 1)
    .strokeCircle(0, 0, 10);

  if (riskReward) {
    graphics.lineStyle(2, fillColor, 0.85).strokeCircle(0, 0, 14);
  }
};

/**
 * Temporary M5 pickup presentation. Logical placement and collection remain Phaser-independent;
 * this class only mirrors unconsumed generated collectibles into bounded scene graphics.
 */
export class GeneratedCollectiblePresentation {
  private readonly active = new Map<string, ActiveCollectiblePresentation>();
  private destroyed = false;

  constructor(private readonly scene: Scene) {}

  sync(
    spawns: ReadonlyArray<Readonly<LogicalCollectibleSpawnInstance>>,
    consumedCollectibleIds: ReadonlyArray<string>,
    runState: Readonly<RunMotionState>,
    playerScreenX: number,
    verticalProjection: PrototypeVerticalOffsetOrProjection = 0,
  ): void {
    if (this.destroyed) {
      return;
    }

    const consumed = new Set(consumedCollectibleIds);
    const retainedIdentities = new Set<string>();
    const projection = resolveVerticalProjection(verticalProjection);

    for (const spawn of spawns) {
      const identity = getLogicalCollectibleSpawnIdentity(spawn);
      if (consumed.has(identity)) {
        continue;
      }

      retainedIdentities.add(identity);
      let active = this.active.get(identity);
      if (!active) {
        const graphics = this.scene.add.graphics().setDepth(-40);
        drawCollectible(graphics, spawn);
        active = { graphics };
        this.active.set(identity, active);
      }

      active.graphics
        .setPosition(
          playerScreenX + (spawn.runDistance - runState.distance),
          projectLogicalYToScreen(spawn.y, projection),
        )
        .setScale?.(1, projection.scaleY);
    }

    for (const [identity, active] of this.active) {
      if (retainedIdentities.has(identity)) {
        continue;
      }

      active.graphics.destroy();
      this.active.delete(identity);
    }
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    for (const active of this.active.values()) {
      active.graphics.destroy();
    }
    this.active.clear();
  }
}
