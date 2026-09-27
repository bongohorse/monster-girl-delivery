import type { GameObjects, Scene } from 'phaser';

export const ART_GATE_POSE_A_TEXTURE_KEY = 'art-gate-pose-a-concept';
export const ART_GATE_POSE_B_TEXTURE_KEY = 'art-gate-pose-b-ascent';
export const ART_GATE_POSE_C_TEXTURE_KEY = 'art-gate-pose-c-descent';

/** Visual bounds of the three concept images at alpha > 64; collisions stay unchanged. */
const ART_GATE_VISIBLE_HEIGHT = [1046, 1130, 1166] as const;
const ART_GATE_TEXTURE_KEYS = [
  ART_GATE_POSE_A_TEXTURE_KEY,
  ART_GATE_POSE_B_TEXTURE_KEY,
  ART_GATE_POSE_C_TEXTURE_KEY,
] as const;
const ART_GATE_VISIBLE_VIEWPORT_FRACTION = 0.255;
const POSE_VELOCITY_THRESHOLD = 90;
const POSE_SETTLE_SECONDS = 0.12;
const POSE_MIN_HOLD_SECONDS = 0.18;
type FlightPose = 0 | 1 | 2;

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
  private image?: GameObjects.Image;
  private imageViewportHeight = -1;
  private pose: FlightPose = 0;
  private pendingPose: FlightPose = 0;
  private pendingSeconds = 0;
  private poseSeconds = 0;

  constructor(
    private readonly scene: Scene,
    x = 0,
    y = 0,
  ) {
    // This branch loads a concept for an in-run Art Gate check. It is not production art.
    if (scene.textures?.exists(ART_GATE_POSE_A_TEXTURE_KEY)) {
      this.image = scene.add.image(x, y, ART_GATE_POSE_A_TEXTURE_KEY);
      return;
    }

    const graphics = scene.add.graphics({ x, y });
    drawPrototypePlayer(graphics);
    this.graphics = graphics;
  }

  setPosition(x: number, y: number): void {
    this.graphics?.setPosition(x, y);
    this.image?.setPosition(x, y);
  }

  setRotation(rotationRadians: number): void {
    if (!Number.isFinite(rotationRadians)) {
      throw new RangeError('Player presentation rotation must be finite.');
    }

    this.graphics?.setRotation(rotationRadians);
    this.image?.setRotation(rotationRadians);
  }

  /** Presentation only: use sustained vertical movement, never raw touch transitions. */
  setFlightVelocity(velocityY: number, elapsedSeconds: number): void {
    if (
      !this.image ||
      !Number.isFinite(velocityY) ||
      !Number.isFinite(elapsedSeconds) ||
      elapsedSeconds <= 0
    ) {
      return;
    }

    const requested: FlightPose =
      velocityY < -POSE_VELOCITY_THRESHOLD ? 1 : velocityY > POSE_VELOCITY_THRESHOLD ? 2 : 0;
    this.poseSeconds += elapsedSeconds;
    if (requested !== this.pendingPose) {
      this.pendingPose = requested;
      this.pendingSeconds = 0;
    }
    if (requested === this.pose) {
      this.pendingSeconds = 0;
      return;
    }

    this.pendingSeconds += elapsedSeconds;
    if (this.pendingSeconds < POSE_SETTLE_SECONDS || this.poseSeconds < POSE_MIN_HOLD_SECONDS) {
      return;
    }

    this.pose = this.scene.textures.exists(ART_GATE_TEXTURE_KEYS[requested]) ? requested : 0;
    this.pendingSeconds = 0;
    this.poseSeconds = 0;
    this.image.setTexture(ART_GATE_TEXTURE_KEYS[this.pose]);
    this.imageViewportHeight = -1;
    this.setScale(1, 1);
  }

  resetFlightPose(): void {
    this.pendingPose = 0;
    this.pendingSeconds = 0;
    this.poseSeconds = 0;
    if (this.image && this.pose !== 0) {
      this.pose = 0;
      this.image.setTexture(ART_GATE_POSE_A_TEXTURE_KEY);
      this.imageViewportHeight = -1;
      this.setScale(1, 1);
    }
  }

  setScale(x: number, y: number): void {
    if (this.image) {
      // The artwork is measured in screen space, independently of the logical flight corridor.
      const viewportHeight = this.scene.scale.height * this.scene.scale.zoom;
      if (viewportHeight !== this.imageViewportHeight) {
        this.imageViewportHeight = viewportHeight;
        this.image.setScale(
          (viewportHeight * ART_GATE_VISIBLE_VIEWPORT_FRACTION) /
            ART_GATE_VISIBLE_HEIGHT[this.pose],
        );
      }
      return;
    }

    this.graphics?.setScale(
      x * PROTOTYPE_PLAYER_PRESENTATION_SCALE,
      y * PROTOTYPE_PLAYER_PRESENTATION_SCALE,
    );
  }

  destroy(): void {
    const graphics = this.graphics;

    this.image?.destroy();
    this.image = undefined;

    if (!graphics) {
      return;
    }

    this.graphics = undefined;
    graphics.destroy();
  }
}
