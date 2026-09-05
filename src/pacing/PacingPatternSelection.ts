import type { HazardPattern } from '../generation/HazardPattern';
import {
  assertValidPacingPressureLimits,
  type PacingIntensity,
  type PacingPressureLimits,
  type PacingSnapshot,
} from './PacingSystem';

export interface PacingPatternRequest extends PacingPressureLimits {
  readonly intensity: PacingIntensity;
  /** Do not let a selected pattern's authored span cross into the next pacing window. */
  readonly maximumRunLength: number;
}

export type PatternPacingIneligibilityReason =
  | 'pacing-entry-limit'
  | 'pacing-density-limit'
  | 'pacing-window-limit';

export interface PatternPacingEligibility {
  readonly eligible: boolean;
  readonly hazardDensityPer1000Distance: number;
  readonly patternEntryCount: number;
  readonly reasons: ReadonlyArray<PatternPacingIneligibilityReason>;
}

/**
 * For future encounters, calculate the snapshot at the proposed pattern start distance,
 * not the player's earlier scheduling-time distance. Existing accepted spawns are immutable.
 */
export const createPacingPatternRequest = (
  pacing: Readonly<PacingSnapshot>,
): Readonly<PacingPatternRequest> =>
  Object.freeze({
    intensity: pacing.intensity,
    maximumHazardsPer1000Distance: pacing.maximumHazardsPer1000Distance,
    maximumPatternEntries: pacing.maximumPatternEntries,
    maximumRunLength: pacing.remainingPhaseDistance,
  });

export const evaluatePatternPacingEligibility = (
  pattern: Readonly<HazardPattern>,
  request: Readonly<PacingPatternRequest>,
): Readonly<PatternPacingEligibility> => {
  assertValidPacingPressureLimits(request);

  if (!Number.isFinite(request.maximumRunLength) || request.maximumRunLength <= 0) {
    throw new RangeError('Pacing maximumRunLength must be positive and finite.');
  }

  if (!Number.isFinite(pattern.runLength) || pattern.runLength <= 0) {
    throw new RangeError('Pattern runLength must be positive and finite.');
  }

  const patternEntryCount = pattern.entries.length;
  const hazardDensityPer1000Distance = (patternEntryCount / pattern.runLength) * 1_000;

  if (!Number.isFinite(hazardDensityPer1000Distance)) {
    throw new RangeError('Pattern hazard density must remain finite.');
  }

  const reasons: PatternPacingIneligibilityReason[] = [];

  if (patternEntryCount > request.maximumPatternEntries) {
    reasons.push('pacing-entry-limit');
  }
  if (hazardDensityPer1000Distance > request.maximumHazardsPer1000Distance) {
    reasons.push('pacing-density-limit');
  }
  if (pattern.runLength > request.maximumRunLength) {
    reasons.push('pacing-window-limit');
  }

  return Object.freeze({
    eligible: reasons.length === 0,
    hazardDensityPer1000Distance,
    patternEntryCount,
    reasons: Object.freeze(reasons),
  });
};

/**
 * Preserves catalog order and consumes no RNG. Intersect with difficulty eligibility and pass
 * candidates through the existing fairness validator/scheduler. An empty result means no match;
 * callers must explicitly leave recovery space or supply suitable content, never relax limits
 * or pass an empty catalog to the generator. Live orchestration belongs to #120.
 */
export const filterPatternsForPacing = (
  catalog: ReadonlyArray<Readonly<HazardPattern>>,
  request: Readonly<PacingPatternRequest>,
): ReadonlyArray<Readonly<HazardPattern>> =>
  Object.freeze(
    catalog.filter((pattern) => evaluatePatternPacingEligibility(pattern, request).eligible),
  );
