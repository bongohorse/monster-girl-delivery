export type SeedInput = number | string;

export interface SeededPrngStep {
  /** Unsigned 32-bit output for this step. */
  readonly value: number;
  /** Unsigned 32-bit state to supply to the next step. */
  readonly state: number;
}

const UINT32_MAX = 0xffff_ffff;
const FNV_OFFSET_BASIS = 0x811c_9dc5;
const FNV_PRIME = 0x0100_0193;
const MULBERRY32_INCREMENT = 0x6d2b_79f5;

const assertUint32 = (value: number, name: string): void => {
  if (!Number.isInteger(value) || value < 0 || value > UINT32_MAX) {
    throw new RangeError(`${name} must be an unsigned 32-bit integer.`);
  }
};

const hashStringSeed = (seed: string): number => {
  let hash = FNV_OFFSET_BASIS;

  // Hash the exact JavaScript UTF-16 code-unit sequence so seed identity is stable and explicit.
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, FNV_PRIME);
  }

  return hash >>> 0;
};

/**
 * Normalizes supported seed inputs to an unsigned 32-bit value.
 *
 * Safe integers wrap modulo 2^32. Strings are hashed from their exact UTF-16 code-unit sequence;
 * visually equivalent strings with different Unicode representations intentionally remain distinct.
 */
export const normalizeSeed = (seed: SeedInput): number => {
  if (typeof seed === 'string') {
    return hashStringSeed(seed);
  }

  if (!Number.isSafeInteger(seed)) {
    throw new RangeError('Numeric seeds must be finite safe integers.');
  }

  return seed >>> 0;
};

/**
 * Advances one Mulberry32 step without hidden mutable state.
 * This generator is deterministic gameplay infrastructure, not cryptographic randomness.
 */
export const stepSeededPrng = (state: number): Readonly<SeededPrngStep> => {
  assertUint32(state, 'PRNG state');

  const nextState = (state + MULBERRY32_INCREMENT) >>> 0;
  let value = nextState;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  value = (value ^ (value >>> 14)) >>> 0;

  return Object.freeze({ value, state: nextState });
};
