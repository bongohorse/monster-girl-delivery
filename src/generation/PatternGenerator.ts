import type { HazardPattern } from './HazardPattern';
import { type RunGenerationState, stepRunGeneration } from './RunGenerationState';

export interface PatternGenerationStep {
  /** Index selected from the catalog's authored array order. */
  readonly catalogIndex: number;
  readonly pattern: Readonly<HazardPattern>;
  readonly state: Readonly<RunGenerationState>;
}

const UINT32_RANGE = 0x1_0000_0000;

const assertValidPatternCatalog = (catalog: ReadonlyArray<Readonly<HazardPattern>>): void => {
  if (catalog.length === 0) {
    throw new RangeError('Pattern catalog must contain at least one pattern.');
  }

  const patternIds = new Set<string>();

  for (const pattern of catalog) {
    if (pattern === undefined || pattern === null || pattern.id.trim().length === 0) {
      throw new TypeError('Pattern catalog entries must have non-empty ids.');
    }

    if (patternIds.has(pattern.id)) {
      throw new TypeError(`Pattern catalog ids must be unique: ${pattern.id}`);
    }

    patternIds.add(pattern.id);
  }
};

/**
 * Selects one pattern from explicit state and catalog data without fairness or spawning behavior.
 *
 * Every successful call consumes exactly one PRNG step. The unsigned output is scaled across array
 * indices, so catalog order is deterministic and intentionally sequence-significant. Pattern ids
 * must be unique so later validation, diagnostics, and replay evidence can identify each choice.
 */
export const generateNextPattern = (
  state: Readonly<RunGenerationState>,
  catalog: ReadonlyArray<Readonly<HazardPattern>>,
): Readonly<PatternGenerationStep> => {
  assertValidPatternCatalog(catalog);

  const randomStep = stepRunGeneration(state);
  const catalogIndex = Math.floor((randomStep.value / UINT32_RANGE) * catalog.length);
  const pattern = catalog[catalogIndex];

  if (pattern === undefined) {
    throw new RangeError('Seeded pattern selection produced an invalid catalog index.');
  }

  return Object.freeze({
    catalogIndex,
    pattern,
    state: randomStep.state,
  });
};
