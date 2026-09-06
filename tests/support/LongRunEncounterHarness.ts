import { PROTOTYPE_RUN_MOTION_DEFAULTS } from '../../src/config/RunMotionConfig';
import type { EncounterReadabilityUsage } from '../../src/generation/EncounterReadabilityBudget';
import type { EncounterTransitionValidationResult } from '../../src/generation/EncounterTransitionValidator';
import { PROTOTYPE_PATTERN_REACHABILITY_CONTEXT } from '../../src/generation/FlightReachability';
import {
  advanceGeneratedHazardStream,
  createGeneratedHazardStream,
  type GeneratedHazardStreamContext,
  PROTOTYPE_GENERATED_HAZARD_STREAM_CONFIG,
} from '../../src/generation/GeneratedHazardStream';
import type { HazardPattern } from '../../src/generation/HazardPattern';
import {
  type LiveEncounterPolicyConfig,
  PROTOTYPE_LIVE_ENCOUNTER_POLICY_CONFIG,
} from '../../src/generation/LiveEncounterPolicy';
import type { RejectedPatternCandidate } from '../../src/generation/PatternSpawnScheduler';
import { PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS } from '../../src/generation/PatternValidator';
import { PROTOTYPE_M4_HAZARD_PATTERN_FIXTURES } from '../../src/generation/PrototypeHazardPatternFixtures';

export interface EncounterTraceEntry {
  readonly runDistance: number;
  readonly difficultyTier: number;
  readonly pacingIntensity: string;
  readonly varietyFamilyId?: string;
  /** True when the accepted encounter reused recent content as a deterministic fallback. */
  readonly fallbackUsed?: boolean;
  readonly type: 'reserved' | 'rejected' | 'deferred';
  readonly patternId?: string;
  readonly reason?: string;
  readonly transitionValidation?: Readonly<EncounterTransitionValidationResult> | null;
  /** Scheduler rejection path: 'pattern' for geometry/reachability, 'transition' for sequence fairness. */
  readonly rejectionReason?: RejectedPatternCandidate['reason'];
  /** Distinct pattern-validation issue codes across the rejected candidates. */
  readonly rejectionIssueCodes?: ReadonlyArray<string>;
}

export interface LongRunEncounterTraceResult {
  readonly trace: ReadonlyArray<Readonly<EncounterTraceEntry>>;
  readonly finalState: ReturnType<typeof createGeneratedHazardStream>;
  readonly maxRetainedSpawns: number;
  readonly maxReservations: number;
  readonly maxRecentFamilies: number;
  readonly maxConcurrentWarnings: number;
  readonly maxConcurrentLethalWindows: number;
  readonly maxActivePressureCost: number;
  readonly maxActiveReadabilityCost: number;
}

export class LongRunEncounterHarness {
  constructor(
    private readonly catalog: ReadonlyArray<
      Readonly<HazardPattern>
    > = PROTOTYPE_M4_HAZARD_PATTERN_FIXTURES,
    private readonly policy: Readonly<LiveEncounterPolicyConfig> = PROTOTYPE_LIVE_ENCOUNTER_POLICY_CONFIG,
  ) {}

  run(seed: string | number, maxDistance: number): LongRunEncounterTraceResult {
    const trace: EncounterTraceEntry[] = [];

    let maxRetainedSpawns = 0;
    let maxReservations = 0;
    let maxRecentFamilies = 0;
    let maxConcurrentWarnings = 0;
    let maxConcurrentLethalWindows = 0;
    let maxActivePressureCost = 0;
    let maxActiveReadabilityCost = 0;

    const trackReadabilityUsage = (
      usage: Readonly<EncounterReadabilityUsage> | undefined,
    ): void => {
      if (usage === undefined) {
        return;
      }
      maxConcurrentWarnings = Math.max(maxConcurrentWarnings, usage.concurrentWarnings.actual);
      maxConcurrentLethalWindows = Math.max(
        maxConcurrentLethalWindows,
        usage.concurrentLethalWindows.actual,
      );
      maxActivePressureCost = Math.max(maxActivePressureCost, usage.activePressureCost.actual);
      maxActiveReadabilityCost = Math.max(
        maxActiveReadabilityCost,
        usage.activeReadabilityCost.actual,
      );
    };

    // Create Context
    const context: GeneratedHazardStreamContext = {
      config: PROTOTYPE_GENERATED_HAZARD_STREAM_CONFIG,
      policy: this.policy,
      catalog: this.catalog,
      reachability: PROTOTYPE_PATTERN_REACHABILITY_CONTEXT,
      constraints: PROTOTYPE_PATTERN_VALIDATION_CONSTRAINTS,
      observeEncounter: (event) => {
        if (event.kind === 'accepted') {
          const acceptedPatternId =
            event.schedule && event.schedule.status === 'accepted'
              ? event.schedule.patternId
              : undefined;
          trace.push({
            runDistance: event.runDistance,
            difficultyTier: event.selection?.difficulty.tierIndex || 0,
            pacingIntensity: event.selection?.pacing.intensity || 'low',
            type: 'reserved',
            patternId: acceptedPatternId,
            varietyFamilyId:
              acceptedPatternId === undefined
                ? undefined
                : this.catalog.find((pattern) => pattern.id === acceptedPatternId)?.profile
                    .varietyFamilyId,
            fallbackUsed: event.fallbackUsed ?? false,
            reason: event.kind,
            transitionValidation:
              event.schedule && event.schedule.status === 'accepted'
                ? event.schedule.transitionValidation
                : null,
          });
          trackReadabilityUsage(event.readability?.usage);
        } else if (
          event.kind === 'scheduler-rejected' ||
          event.kind === 'trajectory-rejected' ||
          event.kind === 'reaction-rejected'
        ) {
          // If scheduler rejected it, pick the last rejection reason from attempts if any
          let tValidation: Readonly<EncounterTransitionValidationResult> | null = null;
          let rejectionReason: RejectedPatternCandidate['reason'] | undefined;
          let rejectionIssueCodes: ReadonlyArray<string> | undefined;
          let rejectedPatternId: string | undefined;
          if (
            event.kind === 'scheduler-rejected' &&
            event.schedule &&
            event.schedule.rejections &&
            event.schedule.rejections.length > 0
          ) {
            const rejections = event.schedule.rejections;
            const lastRejection = rejections[rejections.length - 1];
            tValidation = lastRejection?.transitionValidation ?? null;
            rejectionReason = lastRejection?.reason;
            rejectedPatternId = lastRejection?.patternId;
            const issueCodes = new Set<string>();
            for (const rejection of rejections) {
              for (const issue of rejection.issues) {
                issueCodes.add(issue.code);
              }
            }
            rejectionIssueCodes = Object.freeze([...issueCodes]);
          }
          trace.push({
            runDistance: event.runDistance,
            difficultyTier: event.selection?.difficulty.tierIndex || 0,
            pacingIntensity: event.selection?.pacing.intensity || 'low',
            type: 'rejected',
            patternId:
              event.schedule && event.schedule.status === 'accepted'
                ? event.schedule.patternId
                : rejectedPatternId,
            reason: event.kind,
            transitionValidation: tValidation,
            rejectionReason,
            rejectionIssueCodes,
          });
        } else if (
          event.kind === 'readability-deferred' ||
          event.kind === 'parameters-deferred' ||
          event.kind === 'no-content'
        ) {
          trace.push({
            runDistance: event.runDistance,
            difficultyTier: event.selection?.difficulty.tierIndex || 0,
            pacingIntensity: event.selection?.pacing.intensity || 'low',
            type: 'deferred',
            reason: event.kind,
          });
        }
      },
    };

    // Start Simulation
    let stream = createGeneratedHazardStream(seed, context, PROTOTYPE_RUN_MOTION_DEFAULTS);

    let distance = 0;
    const timeStep = 1 / 60;
    let limit = 0;

    while (distance < maxDistance && limit < 1000000) {
      // Miror live progression two-phase evaluation:
      // Pre-step parameter resolution pass (elapsedSeconds = 0, scheduleEncounters = false)
      stream = advanceGeneratedHazardStream(
        stream,
        distance,
        context,
        PROTOTYPE_RUN_MOTION_DEFAULTS,
        0,
        false,
      );

      // Progress distance by active scroll speed
      distance += stream.schedulingWindow.scrollSpeed * timeStep;

      // Post-step scheduling and advancing pass
      stream = advanceGeneratedHazardStream(
        stream,
        distance,
        context,
        PROTOTYPE_RUN_MOTION_DEFAULTS,
        timeStep,
        true,
      );

      // Track absolute maxima
      maxRetainedSpawns = Math.max(maxRetainedSpawns, stream.spawns.length);
      if (stream.policy) {
        maxReservations = Math.max(maxReservations, stream.policy.readability.reservations.length);
        maxRecentFamilies = Math.max(
          maxRecentFamilies,
          stream.policy.variety.recentFamilyIds.length,
        );
      }

      if (stream.status === 'exhausted') {
        break;
      }
      limit++;
    }

    return {
      trace: Object.freeze(trace),
      finalState: stream,
      maxRetainedSpawns,
      maxReservations,
      maxRecentFamilies,
      maxConcurrentWarnings,
      maxConcurrentLethalWindows,
      maxActivePressureCost,
      maxActiveReadabilityCost,
    };
  }
}
/**
 * Note: Bounded soak sampling provides engineering evidence of safety and stability.
 * It is not a mathematical or universal proof that every possible seed and run
 * is entirely safe, but a deterministic heuristic validation.
 */
