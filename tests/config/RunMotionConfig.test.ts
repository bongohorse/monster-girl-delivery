import { describe, expect, it } from 'vitest';
import {
  PROTOTYPE_RUN_MOTION_DEFAULTS,
  RunMotionConfig,
  type RunMotionUpdate,
} from '../../src/config/RunMotionConfig';
import { createAppServices } from '../../src/core/AppServices';

describe('RunMotionConfig', () => {
  it('starts with the documented prototype base scroll speed', () => {
    const config = new RunMotionConfig();

    expect(PROTOTYPE_RUN_MOTION_DEFAULTS).toEqual({ baseScrollSpeed: 350 });
    expect(config.getSnapshot()).toEqual(PROTOTYPE_RUN_MOTION_DEFAULTS);
  });

  it('applies valid live updates to the shared application configuration', () => {
    const services = createAppServices();
    const sharedConfig = services.runMotion;

    sharedConfig.update({ baseScrollSpeed: 425 });
    sharedConfig.update({ baseScrollSpeed: 0 });

    expect(services.runMotion).toBe(sharedConfig);
    expect(services.runMotion.getSnapshot()).toEqual({ baseScrollSpeed: 0 });
  });

  it('rejects invalid speeds without changing state', () => {
    const invalidValues = [
      -1,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      undefined,
    ];

    for (const value of invalidValues) {
      const config = new RunMotionConfig();
      const update: RunMotionUpdate = { baseScrollSpeed: value };

      expect(() => config.update(update)).toThrow(RangeError);
      expect(config.getSnapshot()).toEqual(PROTOTYPE_RUN_MOTION_DEFAULTS);
    }
  });

  it('ignores empty partial updates', () => {
    const config = new RunMotionConfig();

    config.update({});

    expect(config.getSnapshot()).toEqual(PROTOTYPE_RUN_MOTION_DEFAULTS);
  });

  it('reuses immutable snapshots until run motion actually changes', () => {
    const config = new RunMotionConfig();
    const original = config.getSnapshot();

    expect(Object.isFrozen(PROTOTYPE_RUN_MOTION_DEFAULTS)).toBe(true);
    expect(Object.isFrozen(original)).toBe(true);
    expect(Reflect.set(original, 'baseScrollSpeed', 999)).toBe(false);
    expect(config.getSnapshot()).toBe(original);

    config.update({});
    config.update({ baseScrollSpeed: original.baseScrollSpeed });
    expect(config.getSnapshot()).toBe(original);

    config.update({ baseScrollSpeed: 400 });
    const updated = config.getSnapshot();

    expect(original.baseScrollSpeed).toBe(350);
    expect(updated.baseScrollSpeed).toBe(400);
    expect(updated).not.toBe(original);
    expect(config.getSnapshot()).toBe(updated);
  });
});
