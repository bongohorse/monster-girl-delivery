import { describe, expect, it } from 'vitest';
import { DIRECTOR_LASER_VARIANTS } from '../../src/generation/DirectorLaserCatalog';

describe('DirectorLaserCatalog', () => {
  it('cycles five authored reachable horizontal Laser lanes', () => {
    expect(DIRECTOR_LASER_VARIANTS.map((selection) => selection.label)).toEqual([
      'LOW',
      'ML',
      'MID',
      'MH',
      'HIGH',
    ]);
    expect(DIRECTOR_LASER_VARIANTS.map((selection) => selection.laneId)).toEqual([
      'low',
      'mid-low',
      'middle',
      'mid-high',
      'high',
    ]);
    expect(
      DIRECTOR_LASER_VARIANTS.map((selection) => selection.pattern.entries[0]?.behavior),
    ).toEqual(
      Array.from({ length: 5 }, () =>
        expect.objectContaining({ kind: 'laser', orientation: 'horizontal', span: 'screen' }),
      ),
    );
    expect(
      DIRECTOR_LASER_VARIANTS.map((selection) => {
        const hitbox = selection.pattern.entries[0]?.hitbox;
        return hitbox ? (hitbox.top + hitbox.bottom) / 2 : null;
      }),
    ).toEqual([96, 146, 195, 244, 294]);
  });
});
