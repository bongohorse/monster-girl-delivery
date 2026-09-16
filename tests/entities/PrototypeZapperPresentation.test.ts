import type { Scene } from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import {
  PROTOTYPE_ZAPPER_SHARED_SHADER_CAPACITY,
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
  options: Readonly<{ rotating?: boolean; timed?: boolean }> = {},
): Readonly<LogicalHazardSpawnInstance> => {
  const baseBehavior = createPrototypeZapperBehavior(
    angleDegrees,
    PROTOTYPE_ZAPPER_LENGTHS.medium,
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

const createShaderMock = () => {
  const shader = {
    destroy: vi.fn(),
    setDepth: vi.fn(),
    setDisplaySize: vi.fn(),
    setOrigin: vi.fn(),
    setPosition: vi.fn(),
    setSize: vi.fn(),
    setVisible: vi.fn(),
  };
  for (const method of [
    shader.setDepth,
    shader.setDisplaySize,
    shader.setOrigin,
    shader.setPosition,
    shader.setSize,
    shader.setVisible,
  ]) {
    method.mockReturnValue(shader);
  }
  return shader;
};

const createSceneFake = (withShader: boolean) => {
  const graphics = createGraphicsMock();
  const shader = createShaderMock();
  let shaderConfig: unknown;
  const addShader = vi.fn((config: unknown) => {
    shaderConfig = config;
    return shader;
  });
  const add = {
    graphics: vi.fn(() => graphics),
    ...(withShader ? { shader: addShader } : {}),
  };
  const scene = { add } as unknown as Scene;
  return { addShader, graphics, scene, shader, getShaderConfig: () => shaderConfig };
};

const readUniforms = (config: unknown) => {
  const setupUniforms = (
    config as { setupUniforms?: (set: (name: string, value: unknown) => void) => void }
  ).setupUniforms;
  if (!setupUniforms) {
    throw new Error('Expected shared Zapper shader setupUniforms callback.');
  }
  const uniforms = new Map<string, unknown>();
  setupUniforms((name, value) => uniforms.set(name, value));
  return uniforms;
};

describe('PrototypeZapperPresentation', () => {
  it('shares one shader and one fallback layer across horizontal, vertical, diagonal, and rotating Zappers', () => {
    const { addShader, graphics, scene, shader, getShaderConfig } = createSceneFake(true);
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
    expect(addShader).toHaveBeenCalledOnce();
    expect(shader.setVisible).toHaveBeenLastCalledWith(true);
    expect(graphics.setVisible).toHaveBeenLastCalledWith(true);

    const uniforms = readUniforms(getShaderConfig());
    expect(uniforms.get('uCount')).toBe(4);
    expect(uniforms.get('uSegments[0]')).toBeInstanceOf(Float32Array);
    expect((uniforms.get('uSegments[0]') as Float32Array).length).toBe(
      PROTOTYPE_ZAPPER_SHARED_SHADER_CAPACITY * 4,
    );
    expect(uniforms.get('uParams[0]')).toBeInstanceOf(Float32Array);

    presentation.destroy();
    expect(shader.destroy).toHaveBeenCalledOnce();
    expect(graphics.destroy).toHaveBeenCalledOnce();
  });

  it('pads the shared shader quad beyond endpoint glow so Zapper sides are not clipped', () => {
    const { scene, shader } = createSceneFake(true);
    const presentation = new PrototypeZapperPresentation(scene);

    presentation.render(
      [createSpawn('padding', 0, 280)],
      { distance: 0, simulationSeconds: 0 },
      100,
    );

    expect(shader.setPosition).toHaveBeenLastCalledWith(278, 163);
    expect(shader.setSize).toHaveBeenLastCalledWith(204, 64);
    expect(shader.setDisplaySize).toHaveBeenLastCalledWith(204, 64);
  });

  it('keeps the vector fallback readable when no Shader factory is available', () => {
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

  it('uses authoritative simulation time for rotation/flicker and keeps resize projection explicit', () => {
    const { scene, getShaderConfig } = createSceneFake(true);
    const presentation = new PrototypeZapperPresentation(scene);
    const spawn = createSpawn('rotating', 45, 400, { rotating: true });

    presentation.render([spawn], { distance: 0, simulationSeconds: 0 }, 100, {
      offsetY: 0,
      scaleY: 1,
    });
    const firstUniforms = readUniforms(getShaderConfig());
    const firstSegments = Array.from(firstUniforms.get('uSegments[0]') as Float32Array);

    presentation.render([spawn], { distance: 0, simulationSeconds: 1 }, 100, {
      offsetY: 20,
      scaleY: 0.5,
    });
    const secondUniforms = readUniforms(getShaderConfig());
    const secondSegments = Array.from(secondUniforms.get('uSegments[0]') as Float32Array);

    expect(secondUniforms.get('uTime')).toBe(1);
    expect(secondUniforms.get('uProjectionY')).toEqual([20, 0.5]);
    expect(secondSegments.slice(0, 4)).not.toEqual(firstSegments.slice(0, 4));
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
    expect(onFake.graphics.strokePath).toHaveBeenCalledTimes(3);
  });
});
