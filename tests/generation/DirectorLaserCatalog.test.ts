import { describe, expect, it } from 'vitest';
import { DIRECTOR_LASER_VARIANTS } from '../../src/generation/DirectorLaserCatalog';

const getCenters = (variantIndex: number): ReadonlyArray<number> => {
  const variant = DIRECTOR_LASER_VARIANTS[variantIndex];
  if (!variant) {
    throw new Error(`Expected Director Laser variant ${variantIndex}.`);
  }
  return variant.pattern.entries.map((entry) => (entry.hitbox.top + entry.hitbox.bottom) / 2);
};

describe('DirectorLaserCatalog', () => {
  it('cycles five single lanes before the authored multi-Laser patterns', () => {
    expect(DIRECTOR_LASER_VARIANTS.map((selection) => selection.label)).toEqual([
      'LOW',
      'ML',
      'MID',
      'MH',
      'HIGH',
      'G-LOW',
      'G-HIGH',
      'G-MID',
      'SW-DN',
      'SW-UP',
    ]);
    expect(DIRECTOR_LASER_VARIANTS.slice(0, 5).map((selection) => selection.laneId)).toEqual([
      'low',
      'mid-low',
      'middle',
      'mid-high',
      'high',
    ]);
    expect(DIRECTOR_LASER_VARIANTS.slice(5).map((selection) => selection.groupId)).toEqual([
      'bottom-stack',
      'top-stack',
      'center-corridor',
      'sweep-down',
      'sweep-up',
    ]);
  });

  it('authors obvious simultaneous safe-corridor formations', () => {
    expect(getCenters(5)).toEqual([294, 244, 195]);
    expect(getCenters(6)).toEqual([195, 146, 96]);
    expect(getCenters(7)).toEqual([294, 96]);
  });

  it('keeps every group member horizontal and screen-spanning', () => {
    for (const selection of DIRECTOR_LASER_VARIANTS) {
      for (const entry of selection.pattern.entries) {
        expect(entry.behavior).toMatchObject({
          kind: 'laser',
          orientation: 'horizontal',
          span: 'screen',
        });
      }
    }
  });

  it('stages sweep ON order through increasing charge duration while showing the full formation', () => {
    expect(getCenters(8)).toEqual([96, 195, 294]);
    expect(getCenters(9)).toEqual([294, 195, 96]);

    for (const variantIndex of [8, 9]) {
      const variant = DIRECTOR_LASER_VARIANTS[variantIndex];
      if (!variant) {
        throw new Error('Expected directional Laser sweep variant.');
      }
      expect(
        variant.pattern.entries.map((entry) =>
          entry.behavior.kind === 'laser' ? entry.behavior.lifecycle.chargeSeconds : null,
        ),
      ).toEqual([0.55, 1.25, 1.95]);
      expect(
        variant.pattern.entries.map((entry) =>
          entry.behavior.kind === 'laser' ? entry.behavior.lifecycle.telegraphSeconds : null,
        ),
      ).toEqual([1.2, 1.2, 1.2]);
    }
  });
});
