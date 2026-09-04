import { describe, expect, it } from 'vitest';
import { normalizeSeed, stepSeededPrng } from '../../src/generation/SeededPrng';

const collectSequence = (initialState: number, length: number): number[] => {
  const values: number[] = [];
  let state = initialState;

  for (let index = 0; index < length; index += 1) {
    const step = stepSeededPrng(state);
    values.push(step.value);
    state = step.state;
  }

  return values;
};

describe('seed normalization', () => {
  it('wraps representative safe-integer edges into unsigned 32-bit values', () => {
    expect(normalizeSeed(0)).toBe(0);
    expect(normalizeSeed(-0)).toBe(0);
    expect(normalizeSeed(0x1_0000_0000)).toBe(0);
    expect(normalizeSeed(0x1_0000_0007)).toBe(7);
    expect(normalizeSeed(-1)).toBe(0xffff_ffff);
  });

  it('hashes exact string inputs deterministically', () => {
    expect(normalizeSeed('monster-girl-delivery')).toBe(3_088_653_489);
    expect(normalizeSeed('0')).not.toBe(normalizeSeed(0));
    expect(normalizeSeed('é')).not.toBe(normalizeSeed('e\u0301'));
  });

  it('rejects unsupported numeric seed values', () => {
    const invalidSeeds = [
      1.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      Number.MAX_SAFE_INTEGER + 1,
    ];

    for (const seed of invalidSeeds) {
      expect(() => normalizeSeed(seed)).toThrow(RangeError);
    }
  });
});

describe('stepSeededPrng', () => {
  it('keeps the documented sequence stable for replay compatibility', () => {
    expect(collectSequence(normalizeSeed(0), 5)).toEqual([
      1_144_304_738, 1_416_247, 958_946_056, 627_933_444, 2_007_157_716,
    ]);
  });

  it('produces the same sequence from the same seed', () => {
    const seed = normalizeSeed('courier');

    expect(collectSequence(seed, 8)).toEqual(collectSequence(seed, 8));
  });

  it('produces different sequences for representative different seeds', () => {
    expect(collectSequence(normalizeSeed(1), 8)).not.toEqual(collectSequence(normalizeSeed(2), 8));
  });

  it('returns immutable steps without mutating the supplied state', () => {
    const initialState = normalizeSeed(42);
    const step = stepSeededPrng(initialState);

    expect(initialState).toBe(42);
    expect(step.state).not.toBe(initialState);
    expect(Object.isFrozen(step)).toBe(true);
  });

  it('rejects invalid explicit PRNG state', () => {
    for (const state of [-1, 0x1_0000_0000, 1.5, Number.NaN]) {
      expect(() => stepSeededPrng(state)).toThrow(RangeError);
    }
  });
});
