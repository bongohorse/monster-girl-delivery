import type { Scene } from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import {
  PrototypeZapperPresentation,
  resolvePrototypeZapperPresentationSample,
} from '../../src/entities/PrototypeZapperPresentation';
import type { LogicalHazardSpawnInstance } from '../../src/generation/PatternSpawnScheduler';
import {
  createPrototypeZapperBehavior,
  createPrototypeZapperHitbox,
  PROTOTYPE_ZAPPER_LENGTHS,
  PROTOTYPE_ZAPPER_ROTATION_SPEEDS,
} from '../../src/hazards/PrototypeZapperHazard';
import { PROTOTYPE_TIMED_ZAPPER_CONFIG } from '../../src/hazards/TimedZapperLifecycle';

const createSpawn = (
  entryId: string,
  angleDegrees: number,
  centerX: number,
  options: Readonly<{ length?: number; rotating?: boolean; timed?: boolean }> = {},
): Readonly<LogicalHazardSpawnInstance> => {
  const baseBehavior = createPrototypeZapperBehavior(
    angleDegrees,
    options.length ?? PROTOTYPE_ZAPPER_LENGTHS.medium,
    options.rotating
      ? {
          direction: 'clockwise',
          speedDegreesPerSecond: PROTOTYPE_ZAPPER_ROTATION_SPEEDS.slow,
        }
      : undefined,
  );
  const behavior = Object.freeze({
    ...baseBehavior,
    ...(options.timed ? { timing: PROTOTYPE_TIMED_ZAPPER_CONFIG } : {}),
  });
  const hitbox = createPrototypeZapperHitbox(centerX, 195, behavior);
  return Object.freeze({
    behavior,
    entryId,
    hitbox,
    patternEntryIndex: 0,
    patternId: `zapper-${entryId}`,
    runDistance: hitbox.left,
    type: 'placeholder-barrier',
  });
};

const createGraphicsMock = () => {
  const graphics = {
    beginPath: vi.fn(),
    clear: vi.fn(),
    destroy: vi.fn(),
    fillCircle: vi.fn(),
    fillStyle: vi.fn(),
    lineStyle: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    setDepth: vi.fn(),
    setPosition: vi.fn(),
    setScale: vi.fn(),
    setVisible: vi.fn(),
    strokeCircle: vi.fn(),
    strokePath: vi.fn(),
  };
  for (const method of [
    graphics.beginPath,
    graphics.clear,
    graphics.fillCircle,
    graphics.fillStyle,
    graphics.lineStyle,
    graphics.lineTo,
    graphics.moveTo,
    graphics.setDepth,
    graphics.setPosition,
    graphics.setScale,
    graphics.setVisible,
    graphics.strokeCircle,
    graphics.strokePath,
  ]) {
    method.mockReturnValue(graphics);
  }
  return graphics;
};

const createSceneFake = (withShader: boolean, viewportWidth = 400, zoom = 1) => {
  const graphics = createGraphicsMock();
  const addShader = vi.fn();
  const add = {
    graphics: vi.fn(() => graphics),
    ...(withShader ? { shader: addShader } : {}),
  };
  const scene = {
    add,
    cameras: { main: { width: viewportWidth * zoom, height: 390 * zoom, zoom } },
  } as unknown as Scene;
  return { addShader, graphics, scene };
};

describe('PrototypeZapperPresentation', () => {
  it('draws every visible long beam with the same layered glow without a shader or slot limit', () => {
    const { addShader, graphics, scene } = createSceneFake(true, 2_200);
    const presentation = new PrototypeZapperPresentation(scene);
    const spawns = Array.from({ length: 14 }, (_, index) =>
      createSpawn(`long-${index}`, 0, 150 + index * 140, {
        length: PROTOTYPE_ZAPPER_LENGTHS.long,
      }),
    );

    presentation.render(spawns, { distance: 0, simulationSeconds: 0 }, 100);

    expect(addShader).not.toHaveBeenCalled();
    expect(graphics.strokePath).toHaveBeenCalledTimes(spawns.length * 4);
    expect(graphics.lineStyle).toHaveBeenCalledWith(46, 0xff9f1c, 0.14);
    expect(graphics.lineStyle).toHaveBeenCalledWith(32, 0xff9f1c, 0.24);
  });

  it('draws visible Zappers without redrawing older or future offscreen spawns', () => {
    const { graphics, scene } = createSceneFake(true, 400, 2);
    const presentation = new PrototypeZapperPresentation(scene);
    const offscreen = Array.from({ length: 12 }, (_, i) =>
      createSpawn(`old-${i}`, 90, 100 + i * 10),
    );
    const visible = createSpawn('visible-long-horizontal', 0, 850, {
      length: PROTOTYPE_ZAPPER_LENGTHS.long,
    });
    const outsideLogicalViewport = createSpawn('future-long-horizontal', 0, 1_300, {
      length: PROTOTYPE_ZAPPER_LENGTHS.long,
    });

    presentation.render(
      [...offscreen, visible, outsideLogicalViewport],
      { distance: 700, simulationSeconds: 0 },
      100,
    );

    expect(graphics.strokePath).toHaveBeenCalledTimes(4);
    expect(graphics.moveTo).toHaveBeenCalledWith(150, 195);
    expect(graphics.lineTo).toHaveBeenCalledWith(350, 195);
  });

  it('shares one Graphics layer across horizontal, vertical, diagonal, and rotating Zappers', () => {
    const { addShader, graphics, scene } = createSceneFake(true, 1_300);
    const presentation = new PrototypeZapperPresentation(scene);
    const spawns = [
      createSpawn('horizontal', 0, 280),
      createSpawn('vertical', 90, 520),
      createSpawn('diagonal', 45, 760),
      createSpawn('rotating', 30, 1_000, { rotating: true }),
    ];

    presentation.render(spawns, { distance: 0, simulationSeconds: 0 }, 100);
    presentation.render(spawns, { distance: 20, simulationSeconds: 0.1 }, 100);

    expect(scene.add.graphics).toHaveBeenCalledOnce();
    expect(addShader).not.toHaveBeenCalled();
    expect(graphics.strokePath).toHaveBeenCalledTimes(spawns.length * 4 * 2);
    expect(graphics.setVisible).toHaveBeenLastCalledWith(true);

    presentation.destroy();
    expect(graphics.destroy).toHaveBeenCalledOnce();
  });

  it('draws the same glow when the Shader factory is unavailable', () => {
    const { graphics, scene } = createSceneFake(false);
    const presentation = new PrototypeZapperPresentation(scene);

    presentation.render(
      [createSpawn('fallback', 0, 280)],
      { distance: 0, simulationSeconds: 0 },
      100,
    );

    expect(scene.add.graphics).toHaveBeenCalledOnce();
    expect(graphics.strokePath).toHaveBeenCalled();
    expect(graphics.fillCircle).toHaveBeenCalled();
    expect(graphics.lineStyle).toHaveBeenCalledWith(46, 0xff9f1c, 0.14);
    expect(graphics.setVisible).toHaveBeenLastCalledWith(true);
  });

  it('derives ON, CHARGE, OFF, disabled, and destroyed visuals only from authoritative state', () => {
    const permanent = createSpawn('permanent', 0, 280);
    const timed = createSpawn('timed', 0, 520, { timed: true });

    expect(resolvePrototypeZapperPresentationSample(permanent, null)).toEqual({
      chargeProgress: 1,
      state: 'on',
    });
    expect(resolvePrototypeZapperPresentationSample(timed, null)).toEqual({
      chargeProgress: 0,
      state: 'off',
    });
    expect(
      resolvePrototypeZapperPresentationSample(timed, {
        complete: false,
        elapsedPhaseSeconds: 0.3,
        phase: 'charge',
      }),
    ).toEqual({ chargeProgress: 0.25, state: 'charge' });
    expect(
      resolvePrototypeZapperPresentationSample(timed, {
        complete: false,
        elapsedPhaseSeconds: 0.2,
        phase: 'on',
      }),
    ).toEqual({ chargeProgress: 1, state: 'on' });
    expect(
      resolvePrototypeZapperPresentationSample(
        timed,
        { complete: false, elapsedPhaseSeconds: 0.2, phase: 'on' },
        'disabled',
      ),
    ).toEqual({ chargeProgress: 0, state: 'disabled' });
    expect(
      resolvePrototypeZapperPresentationSample(
        timed,
        { complete: false, elapsedPhaseSeconds: 0.2, phase: 'on' },
        'destroyed',
      ),
    ).toEqual({ chargeProgress: 0, state: 'destroyed' });
  });

  it('uses authoritative simulation time for rotation and keeps resize projection explicit', () => {
    const { graphics, scene } = createSceneFake(true, 900);
    const presentation = new PrototypeZapperPresentation(scene);
    const spawn = createSpawn('rotating', 45, 400, { rotating: true });

    presentation.render([spawn], { distance: 0, simulationSeconds: 0 }, 100, {
      offsetY: 0,
      scaleY: 1,
    });
    const firstEndpoint = graphics.moveTo.mock.lastCall;

    presentation.render([spawn], { distance: 0, simulationSeconds: 1 }, 100, {
      offsetY: 20,
      scaleY: 0.5,
    });
    expect(graphics.setPosition).toHaveBeenLastCalledWith(0, 20);
    expect(graphics.setScale).toHaveBeenLastCalledWith(1, 0.5);
    expect(graphics.moveTo.mock.lastCall).not.toEqual(firstEndpoint);
  });

  it('makes timed CHARGE structurally dashed while OFF has no beam and ON has a continuous beam', () => {
    const timed = createSpawn('timed', 0, 400, { timed: true });

    const chargeFake = createSceneFake(false);
    const chargePresentation = new PrototypeZapperPresentation(chargeFake.scene);
    chargePresentation.render([timed], { distance: 0, simulationSeconds: 0.3 }, 100, 0, {
      timedZappers: {
        stepElapsedSeconds: 0.3,
        instances: [
          {
            spawnIdentity: `${timed.patternId}:${timed.patternEntryIndex}:${timed.entryId}:${timed.runDistance}`,
            lethalIntervals: [],
            lifecycle: { complete: false, elapsedPhaseSeconds: 0.3, phase: 'charge' },
          },
        ],
      },
    });
    expect(chargeFake.graphics.strokePath.mock.calls.length).toBeGreaterThan(2);

    const offFake = createSceneFake(false);
    const offPresentation = new PrototypeZapperPresentation(offFake.scene);
    offPresentation.render([timed], { distance: 0, simulationSeconds: 0 }, 100);
    expect(offFake.graphics.strokeCircle).toHaveBeenCalledTimes(2);
    expect(offFake.graphics.strokePath).not.toHaveBeenCalled();

    const onFake = createSceneFake(false);
    const onPresentation = new PrototypeZapperPresentation(onFake.scene);
    onPresentation.render([timed], { distance: 0, simulationSeconds: 2.2 }, 100, 0, {
      timedZappers: {
        stepElapsedSeconds: 0.2,
        instances: [
          {
            spawnIdentity: `${timed.patternId}:${timed.patternEntryIndex}:${timed.entryId}:${timed.runDistance}`,
            lethalIntervals: [],
            lifecycle: { complete: false, elapsedPhaseSeconds: 0.2, phase: 'on' },
          },
        ],
      },
    });
    expect(onFake.graphics.fillCircle).toHaveBeenCalled();
    expect(onFake.graphics.strokePath).toHaveBeenCalledTimes(4);
  });
});
