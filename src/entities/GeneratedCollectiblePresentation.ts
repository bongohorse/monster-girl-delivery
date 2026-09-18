import type { GameObjects, Scene } from 'phaser';
import {
  type PrototypeVerticalOffsetOrProjection,
  resolveVerticalProjection,
} from '../game/PrototypeFlightLayout';
import {
  getLogicalCollectibleSpawnIdentity,
  type LogicalCollectibleSpawnInstance,
} from '../generation/GeneratedCollectibles';
import type { RunMotionState } from '../systems/RunMotionSimulation';

const SAFE_GUIDE_COLOR = 0x6fffe9;
const RISK_REWARD_COLOR = 0xffd166;
const COLLECTIBLE_RADIUS = 7;

/**
 * Temporary M5 pickup presentation. All visible coins share one Graphics object instead of creating
 * one Phaser GameObject per coin. Geometry is redrawn only when the accepted collectible set,
 * consumed ids, or viewport projection changes; ordinary scrolling is one object transform.
 */
export class GeneratedCollectiblePresentation {
  private readonly graphics: GameObjects.Graphics;
  private destroyed = false;
  private anchorRunDistance = 0;
  private renderedSpawns: ReadonlyArray<Readonly<LogicalCollectibleSpawnInstance>> | null = null;
  private renderedConsumedCollectibleIds: ReadonlyArray<string> | null = null;
  private renderedPlayerScreenX = Number.NaN;
  private renderedProjectionOffsetY = Number.NaN;
  private renderedProjectionScaleY = Number.NaN;

  constructor(scene: Scene) {
    this.graphics = scene.add.graphics().setDepth(-40);
  }

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

    const projection = resolveVerticalProjection(verticalProjection);
    const contentChanged =
      spawns !== this.renderedSpawns ||
      consumedCollectibleIds !== this.renderedConsumedCollectibleIds ||
      playerScreenX !== this.renderedPlayerScreenX ||
      projection.offsetY !== this.renderedProjectionOffsetY ||
      projection.scaleY !== this.renderedProjectionScaleY;

    if (contentChanged) {
      this.anchorRunDistance = runState.distance;
      this.graphics
        .clear()
        .setPosition(0, projection.offsetY)
        .setScale(1, projection.scaleY);
      const consumed = consumedCollectibleIds.length === 0 ? null : new Set(consumedCollectibleIds);

      this.drawIntent(spawns, consumed, 'safe-guide', SAFE_GUIDE_COLOR, playerScreenX);
      this.drawIntent(
        spawns,
        consumed,
        'risk-reward',
        RISK_REWARD_COLOR,
        playerScreenX,
      );

      this.renderedSpawns = spawns;
      this.renderedConsumedCollectibleIds = consumedCollectibleIds;
      this.renderedPlayerScreenX = playerScreenX;
      this.renderedProjectionOffsetY = projection.offsetY;
      this.renderedProjectionScaleY = projection.scaleY;
      return;
    }

    this.graphics.setPosition(
      this.anchorRunDistance - runState.distance,
      this.renderedProjectionOffsetY,
    );
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.graphics.destroy();
  }

  private drawIntent(
    spawns: ReadonlyArray<Readonly<LogicalCollectibleSpawnInstance>>,
    consumed: ReadonlySet<string> | null,
    intent: LogicalCollectibleSpawnInstance['intent'],
    color: number,
    playerScreenX: number,
  ): void {
    this.graphics.fillStyle(color, 0.95);

    for (const spawn of spawns) {
      if (
        spawn.intent !== intent ||
        consumed?.has(getLogicalCollectibleSpawnIdentity(spawn)) === true
      ) {
        continue;
      }

      this.graphics.fillCircle(
        playerScreenX + (spawn.runDistance - this.anchorRunDistance),
        spawn.y,
        COLLECTIBLE_RADIUS,
      );
    }
  }
}
