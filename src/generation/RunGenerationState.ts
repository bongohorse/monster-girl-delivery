import { normalizeSeed, type SeedInput, stepSeededPrng } from './SeededPrng';

export interface RunGenerationState {
  /** Normalized seed retained for diagnostics and same-seed restart. */
  readonly seed: number;
  /** Explicit current state used for deterministic continuation. */
  readonly prngState: number;
}

export interface RunGenerationStep {
  readonly value: number;
  readonly state: Readonly<RunGenerationState>;
}

/** Creates the deterministic initial generation state for a run. */
export const createRunGenerationState = (seedInput: SeedInput): Readonly<RunGenerationState> => {
  const seed = normalizeSeed(seedInput);
  return Object.freeze({ seed, prngState: seed });
};

/** Consumes one random value and returns a new immutable run-generation state. */
export const stepRunGeneration = (
  state: Readonly<RunGenerationState>,
): Readonly<RunGenerationStep> => {
  const randomStep = stepSeededPrng(state.prngState);
  const nextState = Object.freeze({ seed: state.seed, prngState: randomStep.state });

  return Object.freeze({ value: randomStep.value, state: nextState });
};
