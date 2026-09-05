import type { LifecycleSnapshot } from '../core/LifecycleService';
import type { ViewportSnapshot } from '../core/ViewportService';
import type { EncounterStreamObservation } from '../generation/EncounterStreamObservation';
import type { GeneratedHazardStreamState } from '../generation/GeneratedHazardStream';
import { evaluateHazardApproachTiming } from '../generation/HazardApproachTiming';
import type { LiveEncounterCandidateSelection } from '../generation/LiveEncounterPolicy';
import { PROTOTYPE_LIVE_ENCOUNTER_POLICY_CONFIG } from '../generation/LiveEncounterPolicy';
import type { TelegraphedHazardSimulationState } from '../hazards/TelegraphedHazardSimulation';
import { getTelegraphedHazardLifecycle } from '../hazards/TelegraphedHazardSimulation';
import type { InputSnapshot } from '../input/InputService';
import { PROTOTYPE_PLAYER_COLLISION_EXTENTS } from '../systems/HazardCollision';

export const DIRECTOR_DIAGNOSTIC_PAGES = [
  'Run',
  'Encounters',
  'Fairness',
  'Variety',
  'Budget',
  'Telegraphs',
  'Input',
  'Hidden',
] as const;
export interface DirectorDiagnosticSource {
  readonly stream: Readonly<GeneratedHazardStreamState>;
  readonly telegraphs: Readonly<TelegraphedHazardSimulationState>;
  readonly viewport: Readonly<ViewportSnapshot>;
  readonly input: Readonly<InputSnapshot>;
  readonly lifecycle: Readonly<LifecycleSnapshot>;
}
const number = (value: number | null | undefined): string =>
  value == null ? '--' : value.toFixed(2);
const id = (value: string | undefined): string => value ?? 'none';
/** Compact labels preserve the distinction between hard fairness and budget failures. */
const REASON_LABELS: Readonly<Record<string, string>> = {
  'insufficient-reaction-spacing': 'reaction spacing too small',
  'vertical-corridor-too-narrow': 'corridor too narrow',
  'vertical-corridor-unreachable': 'corridor unreachable',
  'vertical-route-blocked': 'route blocked',
  'non-positive-transition-window': 'no transition time',
  'next-entry-unreachable-from-exit-envelope': 'entry unreachable from exit',
  'active-pressure-budget-exceeded': 'pressure cap',
  'active-readability-budget-exceeded': 'readability cap',
  'warning-concurrency-exceeded': 'warning cap',
  'lethal-concurrency-exceeded': 'lethal cap',
  'tracked-encounter-capacity-exceeded': 'tracked encounter cap',
};
export const formatEncounterReason = (reason: string): string => REASON_LABELS[reason] ?? reason;

/** Bounded evidence from real scheduling decisions. Formatting occurs only on panel refresh. */
export class DirectorEncounterDiagnostics {
  latest: Readonly<EncounterStreamObservation> | undefined;
  accepted: Readonly<EncounterStreamObservation> | undefined;
  rejected: Readonly<EncounterStreamObservation> | undefined;
  fairness: Readonly<EncounterStreamObservation> | undefined;
  selection: Readonly<LiveEncounterCandidateSelection> | undefined;

  readonly observe = (event: Readonly<EncounterStreamObservation>): void => {
    this.latest = event;
    if (event.selection) this.selection = event.selection;
    if (event.schedule) this.fairness = event;
    if (event.kind === 'accepted') this.accepted = event;
    if (event.kind.endsWith('rejected') || event.kind === 'readability-deferred')
      this.rejected = event;
    if (event.schedule?.rejections.length) this.rejected = event;
  };

  reset(): void {
    this.latest = undefined;
    this.accepted = undefined;
    this.rejected = undefined;
    this.fairness = undefined;
    this.selection = undefined;
  }

  lines(page: number, source: Readonly<DirectorDiagnosticSource>): string[] {
    const { stream, telegraphs, viewport, input, lifecycle } = source;
    const policy = stream.policy;
    switch (page) {
      case 0:
        return [
          `Seed: ${stream.generationState.seed}`,
          `PRNG: ${stream.generationState.prngState}`,
          `Distance: ${number(stream.runDistance)} | ${stream.status}`,
          `Applied speed: ${number(stream.schedulingWindow.scrollSpeed)}`,
          `Tier: ${policy?.difficulty.tierId ?? 'off'}${policy?.difficulty.capped ? ' (cap)' : ''}`,
          `Pacing: ${policy?.pacing.intensity ?? 'off'} / ${policy?.pacing.cycleIndex ?? '-'}`,
          `Phase ends: ${number(policy?.pacing.phaseEndDistance)}`,
          `Latest: ${this.latest?.kind ?? 'not observed'}`,
        ];
      case 1: {
        const current = stream.spawns.find(
          (spawn) =>
            spawn.hitbox.left - PROTOTYPE_PLAYER_COLLISION_EXTENTS.right <= stream.runDistance &&
            spawn.hitbox.right + PROTOTYPE_PLAYER_COLLISION_EXTENTS.left > stream.runDistance,
        );
        const next = stream.spawns
          .filter((spawn) => spawn.approachTiming.targetRunDistance >= stream.runDistance)
          .sort((a, b) => a.runDistance - b.runDistance)[0];
        const timing = next
          ? evaluateHazardApproachTiming(
              next.approachTiming.targetRunDistance,
              stream.runDistance,
              stream.schedulingWindow,
            )
          : null;
        const lifecycleState = next ? getTelegraphedHazardLifecycle(telegraphs, next) : null;
        return [
          `At player: ${id(current?.patternId)}`,
          `Next: ${id(next?.patternId)}`,
          `Unscheduled start: ${number(stream.nextPatternStartDistance)}`,
          `Accepted patterns: ${stream.scheduledPatternCount}`,
          `Reaction intended: ${number(next?.approachTiming.minimumReactionTimeSeconds)}s`,
          `Live impact: ${number(timing?.timeToImpactSeconds)}s`,
          `Archetype: ${next?.behavior.kind ?? 'none'}`,
          `Phase: ${lifecycleState?.phase ?? 'persistent / none'}`,
        ];
      }
      case 2: {
        const event = this.fairness ?? this.accepted;
        const rejection = event?.schedule?.rejections[event.schedule.rejections.length - 1];
        const transition =
          rejection?.transitionValidation ??
          (event?.schedule?.status === 'accepted' ? event.schedule.transitionValidation : null);
        const issue = rejection?.issues[0];
        const threshold =
          issue && 'actual' in issue
            ? `Margin: ${number(issue.actual - issue.required)} (${number(issue.required)} required)`
            : `Transition time: ${number(transition?.availableTransitionTimeSeconds)}s`;
        return [
          `Fairness event: ${event?.kind ?? 'not observed'}`,
          `Evidence at: ${number(event?.runDistance)}`,
          `Pattern: ${id(rejection?.patternId ?? (event?.schedule?.status === 'accepted' ? event.schedule.patternId : undefined))}`,
          `Isolated: ${issue ? formatEncounterReason(issue.code) : event?.schedule ? 'pass' : 'not tested'}`,
          `Transition: ${transition?.failureReason ? formatEncounterReason(transition.failureReason) : transition?.valid ? 'pass' : 'not tested'}`,
          threshold,
          `Sample path: ${event?.kind === 'trajectory-rejected' ? 'no survivor' : this.accepted ? 'last accepted passed' : 'not tested'}`,
          `Reaction floor: ${number(event?.selection?.difficulty.minimumReactionTimeSeconds ?? stream.schedulingWindow.minimumReactionTimeSeconds)}s`,
        ];
      }
      case 3:
        return [
          `Selection tier: ${this.selection?.difficulty.tierId ?? '--'}`,
          `Selection pacing: ${this.selection?.pacing.intensity ?? '--'}`,
          `Preferred: ${this.selection?.primaryCatalog.length ?? 0} | Deferred: ${this.selection?.deferredCatalog.length ?? 0}`,
          `Last accepted fallback: ${this.accepted?.fallbackUsed ? 'yes' : 'no'}`,
          `Family latest: ${policy?.variety.recentFamilyIds[policy.variety.recentFamilyIds.length - 1] ?? 'none'}`,
          `Family previous: ${policy?.variety.recentFamilyIds[policy.variety.recentFamilyIds.length - 2] ?? 'none'}`,
          `Recent suppressed: ${this.selection?.variety.evaluations.filter((value) => value.recentlyUsed && !value.preferred).length ?? 0}`,
          `Repeat exemptions: ${this.selection?.variety.evaluations.filter((value) => value.repeatable).length ?? 0}`,
        ];
      case 4: {
        const reservations = policy?.readability.reservations ?? [];
        const active = reservations.filter(
          (value) => value.activeWindow.startSeconds <= 0 && value.activeWindow.endSeconds > 0,
        );
        const containsNow = (window: { startSeconds: number; endSeconds: number }) =>
          window.startSeconds <= 0 && window.endSeconds > 0;
        const limits = PROTOTYPE_LIVE_ENCOUNTER_POLICY_CONFIG.readability;
        const decision = this.rejected?.readability ?? this.accepted?.readability;
        const issue = decision?.issues[0];
        return [
          `Now pressure: ${active.reduce((sum, value) => sum + value.pressureCost, 0)} / ${limits.hardLimits.maximumActivePressureCost} hard`,
          `Now readability: ${active.reduce((sum, value) => sum + value.readabilityCost, 0)} / ${limits.hardLimits.maximumActiveReadabilityCost} hard`,
          `Now warnings: ${reservations.flatMap((value) => value.warningWindows).filter(containsNow).length} / ${limits.hardLimits.maximumConcurrentWarnings} hard`,
          `Now lethal: ${reservations.flatMap((value) => value.lethalWindows).filter(containsNow).length} / ${limits.hardLimits.maximumConcurrentLethalWindows} hard`,
          `Tracked: ${reservations.length} / ${limits.maximumTrackedEncounters}`,
          `Last request P/R: ${decision?.effectiveLimits.maximumActivePressureCost ?? '-'} / ${decision?.effectiveLimits.maximumActiveReadabilityCost ?? '-'}`,
          `Defer: ${issue ? formatEncounterReason(issue.code) : 'none observed'}`,
          issue
            ? `${issue.actual} > ${issue.limit} at +${number(issue.atSeconds)}s`
            : 'Budget evidence: last decision',
        ];
      }
      case 5: {
        const signals = stream.spawns
          .map((spawn) => ({ spawn, lifecycle: getTelegraphedHazardLifecycle(telegraphs, spawn) }))
          .filter((signal) => signal.lifecycle && signal.lifecycle.phase !== 'expired');
        return [
          `Live telegraphs: ${signals.length}`,
          ...signals
            .slice(0, 3)
            .flatMap(({ spawn, lifecycle }) => [
              `${spawn.behavior.kind}: ${lifecycle?.phase}`,
              `${spawn.patternId} +${number(lifecycle?.elapsedPhaseSeconds)}s`,
            ]),
          signals.length > 3
            ? `${signals.length - 3} more tracked`
            : 'Phase time from hazard lifecycle',
        ];
      }
      case 6:
        return [
          `Viewport: ${Math.round(viewport.width)} × ${Math.round(viewport.height)}`,
          `Orientation: ${viewport.orientation}`,
          `Pointer: ${input.pointerHeld ? `${input.pointerSource} #${input.activePointerId}` : 'none'}`,
          `Space: ${input.spaceHeld ? 'held' : 'up'}`,
          `Thrust intent: ${input.thrustHeld ? 'held' : 'idle'}`,
          `Gameplay blocked: ${input.gameplayBlocked ? 'yes' : 'no'}`,
          `Lifecycle: ${lifecycle.paused ? lifecycle.pauseReasons.join(', ') : 'running'}`,
        ];
      default:
        return [];
    }
  }
}
