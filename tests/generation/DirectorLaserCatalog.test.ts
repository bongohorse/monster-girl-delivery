import { describe, expect, it } from 'vitest';
import { DIRECTOR_LASER_VARIANTS } from '../../src/generation/DirectorLaserCatalog';

describe('DirectorLaserCatalog', () => {
  it('exposes only the horizontal M5 Director Laser until a reachable vertical encounter exists', () => {
    expect(DIRECTOR_LASER_VARIANTS.map((selection) => selection.label)).toEqual(['H']);
    expect(
      DIRECTOR_LASER_VARIANTS.map((selection) => selection.pattern.entries[0]?.behavior),
    ).toEqual([
      expect.objectContaining({ kind: 'laser', orientation: 'horizontal', span: 'screen' }),
    ]);
  });
});
