import { describe, expect, it } from 'vitest';
import {
  DIRECTOR_ZAPPER_GROUPS,
  DIRECTOR_ZAPPER_VARIANTS,
} from '../../src/generation/DirectorZapperCatalog';
import { validatePattern } from '../../src/generation/PatternValidator';

describe('Director Zapper catalog', () => {
  it('keeps the approved deterministic single-variant cycle order', () => {
    expect(DIRECTOR_ZAPPER_VARIANTS.map((selection) => selection.label)).toEqual([
      'H-short',
      'H-long',
      'V',
      'D↗',
      'D↘',
      'ROT↻',
      'ROT↺',
      'TIMED',
    ]);
  });

  it('uses real Zapper behavior for every single variant and explicit test group', () => {
    for (const selection of [...DIRECTOR_ZAPPER_VARIANTS, ...DIRECTOR_ZAPPER_GROUPS]) {
      for (const entry of selection.pattern.entries) {
        expect(entry.behavior.kind, selection.label).toBe('zapper');
      }
    }
  });

  it('keeps all authored Director patterns inside existing fairness validation', () => {
    for (const selection of [...DIRECTOR_ZAPPER_VARIANTS, ...DIRECTOR_ZAPPER_GROUPS]) {
      const result = validatePattern(selection.pattern);
      expect(result.issues, selection.label).toEqual([]);
      expect(result.valid, selection.label).toBe(true);
    }
  });

  it('keeps clockwise, counterclockwise, and timed behavior distinct', () => {
    const clockwise = DIRECTOR_ZAPPER_VARIANTS[5]?.pattern.entries[0];
    const counterclockwise = DIRECTOR_ZAPPER_VARIANTS[6]?.pattern.entries[0];
    const timed = DIRECTOR_ZAPPER_VARIANTS[7]?.pattern.entries[0];

    expect(clockwise?.behavior.kind).toBe('zapper');
    expect(counterclockwise?.behavior.kind).toBe('zapper');
    expect(timed?.behavior.kind).toBe('zapper');

    if (
      clockwise?.behavior.kind !== 'zapper' ||
      counterclockwise?.behavior.kind !== 'zapper' ||
      timed?.behavior.kind !== 'zapper'
    ) {
      throw new Error('Director Zapper variants must retain Zapper behavior.');
    }

    expect(clockwise.behavior.rotation?.direction).toBe('clockwise');
    expect(counterclockwise.behavior.rotation?.direction).toBe('counterclockwise');
    expect(clockwise.behavior.rotation?.speedDegreesPerSecond).toBe(30);
    expect(counterclockwise.behavior.rotation?.speedDegreesPerSecond).toBe(30);
    expect(timed.behavior.timing).toEqual({
      offSeconds: 0.8,
      chargeSeconds: 1.2,
      onSeconds: 1.2,
      mode: 'cyclic',
    });
  });
});
