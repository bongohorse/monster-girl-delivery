import { describe, expect, it } from 'vitest';
import { DIRECTOR_LASER_VARIANTS } from '../../src/generation/DirectorLaserCatalog';

describe('DirectorLaserCatalog', () => {
  it('keeps the approved deterministic H then V cycle', () => {
    expect(DIRECTOR_LASER_VARIANTS.map((selection) => selection.label)).toEqual(['H', 'V']);
    expect(DIRECTOR_LASER_VARIANTS.map((selection) => selection.pattern.entries[0]?.behavior)).toEqual([
      expect.objectContaining({ kind: 'laser', orientation: 'horizontal', span: 'screen' }),
      expect.objectContaining({ kind: 'laser', orientation: 'vertical', span: 'screen' }),
    ]);
  });
});
