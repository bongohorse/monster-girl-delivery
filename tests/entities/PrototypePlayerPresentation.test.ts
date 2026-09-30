import type { Scene } from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import {
  ART_GATE_POSE_A_TEXTURE_KEY,
  PROTOTYPE_PLAYER_PRESENTATION_SCALE,
  PrototypePlayerPresentation,
} from '../../src/entities/PrototypePlayerPresentation';
import {
  createPrototypeFlightBounds,
  getPrototypeVerticalProjection,
  projectLogicalYToScreen,
} from '../../src/game/PrototypeFlightLayout';

const createSceneFake = () => {
  const graphics = {
    destroy: vi.fn(),
    fillCircle: vi.fn(),
    fillRoundedRect: vi.fn(),
    fillStyle: vi.fn(),
    fillTriangle: vi.fn(),
    lineStyle: vi.fn(),
    setPosition: vi.fn(),
    setRotation: vi.fn(),
    setScale: vi.fn(),
    strokeCircle: vi.fn(),
    strokeRoundedRect: vi.fn(),
  };

  for (const method of [
    graphics.fillCircle,
    graphics.fillRoundedRect,
    graphics.fillStyle,
    graphics.fillTriangle,
    graphics.lineStyle,
    graphics.setPosition,
    graphics.setRotation,
    graphics.strokeCircle,
    graphics.strokeRoundedRect,
  ]) {
    method.mockReturnValue(graphics);
  }

  const addGraphics = vi.fn(() => graphics);
  const scene = { add: { graphics: addGraphics } } as unknown as Scene;

  return { addGraphics, graphics, scene };
};

describe('PrototypePlayerPresentation', () => {
  it('creates a visible primitive placeholder at the supplied position', () => {
    const { addGraphics, graphics, scene } = createSceneFake();

    new PrototypePlayerPresentation(scene, 120, 240);

    expect(addGraphics).toHaveBeenCalledOnce();
    expect(addGraphics).toHaveBeenCalledWith({ x: 120, y: 240 });
    expect(graphics.fillRoundedRect).toHaveBeenCalled();
    expect(graphics.fillCircle).toHaveBeenCalled();
    expect(graphics.fillTriangle).toHaveBeenCalled();
  });

  it('accepts position and fail-state rotation updates from scene orchestration', () => {
    const { graphics, scene } = createSceneFake();
    const presentation = new PrototypePlayerPresentation(scene);

    presentation.setPosition(320, 180);
    presentation.setPosition(330, 170);
    presentation.setRotation(Math.PI / 2);

    expect(graphics.setPosition).toHaveBeenNthCalledWith(1, 320, 180);
    expect(graphics.setPosition).toHaveBeenNthCalledWith(2, 330, 170);
    expect(graphics.setRotation).toHaveBeenCalledWith(Math.PI / 2);
  });

  it('uses a smaller visual placeholder without changing caller-owned gameplay projection', () => {
    const { graphics, scene } = createSceneFake();
    const presentation = new PrototypePlayerPresentation(scene);

    presentation.setScale(1, 0.5);

    expect(PROTOTYPE_PLAYER_PRESENTATION_SCALE).toBe(6 / 7);
    expect(PROTOTYPE_PLAYER_PRESENTATION_SCALE * 28).toBe(24);
    expect(graphics.setScale).toHaveBeenLastCalledWith(6 / 7, 3 / 7);
  });

  it('shows the loaded Art Gate concept at the same world size across browser heights and applies uniform short-viewport projection', () => {
    const image = {
      destroy: vi.fn(),
      setPosition: vi.fn(),
      setRotation: vi.fn(),
      setScale: vi.fn(),
      setDisplayOrigin: vi.fn(),
    };
    const addImage = vi.fn(() => image);
    const scale = { height: 800, zoom: 0.5 };
    const scene = {
      add: { graphics: vi.fn(), image: addImage },
      scale,
      textures: { exists: vi.fn(() => true) },
    } as unknown as Scene;
    const presentation = new PrototypePlayerPresentation(scene, 120, 240);

    presentation.setScale(1, 0.75);
    expect(addImage).toHaveBeenCalledWith(120, 240, ART_GATE_POSE_A_TEXTURE_KEY);
    expect(image.setScale).toHaveBeenLastCalledWith((28 / 633) * 0.75);
    expect(image.setDisplayOrigin).toHaveBeenLastCalledWith(609, 633);
    expect(scene.add.graphics).not.toHaveBeenCalled();

    presentation.setPosition(130, 250);
    presentation.setRotation(0.25);
    expect(image.setPosition).toHaveBeenCalledWith(130, 250);
    expect(image.setRotation).toHaveBeenCalledWith(0.25);

    scale.height = 1600;
    presentation.setScale(1, 1);
    expect(image.setScale).toHaveBeenLastCalledWith(28 / 633);
    scale.zoom = 1;
    presentation.setScale(1, 1);
    expect(image.setScale).toHaveBeenLastCalledWith(28 / 633);

    scale.height = 600;
    presentation.setScale(1, 0.5);
    expect(image.setScale).toHaveBeenLastCalledWith((28 / 633) * 0.5);
    presentation.destroy();
    expect(image.destroy).toHaveBeenCalledOnce();
  });

  it('waits for sustained motion before changing pose and keeps quick taps visually steady', () => {
    const image = {
      destroy: vi.fn(),
      setTexture: vi.fn(),
      setScale: vi.fn(),
      setDisplayOrigin: vi.fn(),
    };
    const scene = {
      add: { image: vi.fn(() => image) },
      scale: { height: 800, zoom: 0.5 },
      textures: { exists: vi.fn(() => true) },
    } as unknown as Scene;
    const presentation = new PrototypePlayerPresentation(scene);

    presentation.setFlightVelocity(-220, 0.07);
    presentation.setFlightVelocity(180, 0.06);
    presentation.setFlightVelocity(-300, 0.06);
    expect(image.setTexture).not.toHaveBeenCalled();

    presentation.setFlightVelocity(-300, 0.07);
    expect(image.setTexture).toHaveBeenCalledWith('art-gate-pose-b-ascent');
    expect(image.setScale).toHaveBeenLastCalledWith(48 / 1130);
    expect(image.setDisplayOrigin).toHaveBeenLastCalledWith(614, 616);

    presentation.setFlightVelocity(300, 0.13);
    expect(image.setTexture).toHaveBeenCalledTimes(1);
    presentation.setFlightVelocity(300, 0.05);
    expect(image.setTexture).toHaveBeenLastCalledWith('art-gate-pose-c-descent');
    expect(image.setScale).toHaveBeenLastCalledWith(48 / 1166);
    expect(image.setDisplayOrigin).toHaveBeenLastCalledWith(619.5, 620);

    presentation.setFlightVelocity(0, 0.13);
    presentation.setFlightVelocity(0, 0.13);
    expect(image.setTexture).toHaveBeenLastCalledWith(ART_GATE_POSE_A_TEXTURE_KEY);

    presentation.setFlightVelocity(-300, 0.13);
    presentation.setFlightVelocity(-300, 0.13);
    presentation.resetFlightPose();
    expect(image.setTexture).toHaveBeenLastCalledWith(ART_GATE_POSE_A_TEXTURE_KEY);
  });

  it.each([300, 390, 800, 1200])(
    'keeps all three poses inside floor and ceiling at height %s, including after pose changes',
    (height) => {
      const image = { setTexture: vi.fn(), setScale: vi.fn(), setDisplayOrigin: vi.fn() };
      const scene = {
        add: { image: () => image },
        textures: { exists: () => true },
      } as unknown as Scene;
      const presentation = new PrototypePlayerPresentation(scene);
      const viewport = { height, safeArea: { top: 12, bottom: 18, left: 0, right: 0 } };
      const projection = getPrototypeVerticalProjection(viewport);
      const bounds = createPrototypeFlightBounds(viewport);
      presentation.setScale(1, projection.scaleY);
      for (const velocity of [0, -300, 300]) {
        presentation.setFlightVelocity(velocity, 0.13);
        presentation.setFlightVelocity(velocity, 0.13);
        const scale = image.setScale.mock.lastCall?.[0] as number;
        const originY = image.setDisplayOrigin.mock.lastCall?.[1] as number;
        const ceilingScreen = projectLogicalYToScreen(bounds.ceilingY, projection);
        const floorScreen = projectLogicalYToScreen(bounds.floorY, projection);
        expect(ceilingScreen - originY * scale).toBeGreaterThanOrEqual(12 - 1e-9);
        expect(floorScreen + (1254 - originY) * scale).toBeLessThanOrEqual(height - 18 + 1e-9);
      }
    },
  );

  it('rejects non-finite presentation rotation', () => {
    const { scene } = createSceneFake();
    const presentation = new PrototypePlayerPresentation(scene);

    expect(() => presentation.setRotation(Number.NaN)).toThrow(RangeError);
  });

  it('destroys its Phaser object once and ignores later presentation updates', () => {
    const { graphics, scene } = createSceneFake();
    const presentation = new PrototypePlayerPresentation(scene);

    presentation.destroy();
    presentation.destroy();
    presentation.setPosition(320, 180);
    presentation.setRotation(0.5);

    expect(graphics.destroy).toHaveBeenCalledOnce();
    expect(graphics.setPosition).not.toHaveBeenCalled();
    expect(graphics.setRotation).not.toHaveBeenCalled();
  });
});
