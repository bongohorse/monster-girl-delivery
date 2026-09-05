import type { EncounterReadabilityBudgetDecision } from './EncounterReadabilityBudget';
import type { LiveEncounterCandidateSelection } from './LiveEncounterPolicy';
import type { PatternSpawnSchedule } from './PatternSpawnScheduler';

/** Optional observation of decisions already made by the stream; never an input to policy. */
export interface EncounterStreamObservation {
  readonly kind:
    | 'accepted'
    | 'no-content'
    | 'readability-deferred'
    | 'scheduler-rejected'
    | 'trajectory-rejected'
    | 'reaction-rejected'
    | 'parameters-deferred';
  readonly runDistance: number;
  readonly patternStartDistance: number;
  readonly selection?: Readonly<LiveEncounterCandidateSelection>;
  readonly schedule?: Readonly<PatternSpawnSchedule>;
  readonly readability?: Readonly<EncounterReadabilityBudgetDecision>;
  readonly fallbackUsed?: boolean;
}
