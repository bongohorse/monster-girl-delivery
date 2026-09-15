import type { GameObjects, Scene } from 'phaser';
import {
  type PrototypeVerticalOffsetOrProjection,
  resolveVerticalProjection,
} from '../game/PrototypeFlightLayout';
import { projectHazardHitboxToScreen } from '../hazards/PrototypeHazard';
import {
  type PrototypeZapperGeometry,
  resolvePrototypeZapperGeometry,
} from '../hazards/PrototypeZapperHazard';
import type { LogicalHazard } from '../systems/HazardCollision';
import type { RunMotionState } from '../systems/RunMotionSimulation';

/**
 * M5 vector fallback for the Zapper. #251 may replace the beam with a shared shader, but both this
 * renderer and that future shader consume the same authoritative logical geometry.
 */
export class PrototypeZapperPresentation {
  private graphics?: GameObjects.Graphics;
  private readonly geometry: Readonly<PrototypeZapperGeometry>;

  constructor(scene: Scene, hazard: Readonly<LogicalHazard>) {
    const geometry = resolvePrototypeZapperGeometry(hazard);
    if (!geometry) {
      throw new TypeError('PrototypeZapperPresentation requires a Zapper hazard.');
    }
    this.geometry = geometry;

    const graphics = scene.add.graphics().setDepth(-50);
    this.graphics = graphics;
    const localAX = geometry.endpointA.center.x - geometry.bounds.left;
    const localAY = geometry.endpointA.center.y - geometry.bounds.top;
    const localBX = geometry.endpointB.center.x - geometry.bounds.left;
    const localBY = geometry.endpointB.center.y - geometry.bounds.top;
    const beamWidth = geometry.beam.radius * 2;

    graphics.lineStyle(beamWidth + 8, 0xffd166, 0.22);
    graphics.beginPath();
    graphics.moveTo(localAX, localAY);
    graphics.lineTo(localBX, localBY);
    graphics.strokePath();

    graphics.lineStyle(beamWidth, 0xfff3a6, 1);
    graphics.beginPath();
    graphics.moveTo(localAX, localAY);
    graphics.lineTo(localBX, localBY);
    graphics.strokePath();

    graphics.fillStyle(0xffc928, 0.3);
    graphics.fillCircle(localAX, localAY, geometry.endpointA.radius + 5);
    graphics.fillCircle(localBX, localBY, geometry.endpointB.radius + 5);
    graphics.fillStyle(0xffe45e, 1);
    graphics.fillCircle(localAX, localAY, geometry.endpointA.radius);
    graphics.fillCircle(localBX, localBY, geometry.endpointB.radius);
    graphics.fillStyle(0xffffff, 0.9);
    graphics.fillCircle(localAX, localAY, Math.max(3, geometry.endpointA.radius * 0.32));
    graphics.fillCircle(localBX, localBY, Math.max(3, geometry.endpointB.radius * 0.32));
  }

  render(
    runState: Readonly<RunMotionState>,
    playerScreenX: number,
    verticalProjection: PrototypeVerticalOffsetOrProjection = 0,
  ): void {
    const graphics = this.graphics;
    if (!graphics) {
      return;
    }

    const projection = resolveVerticalProjection(verticalProjection);
    const screenBounds = projectHazardHitboxToScreen(
      { hitbox: this.geometry.bounds },
      runState,
      playerScreenX,
      projection,
    );
    graphics.setPosition(screenBounds.left, screenBounds.top);
    graphics.setScale?.(1, projection.scaleY);
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
