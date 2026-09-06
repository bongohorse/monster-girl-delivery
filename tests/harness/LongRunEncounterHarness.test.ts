import { describe, expect, it } from 'vitest';
import { PROTOTYPE_ENCOUNTER_READABILITY_BUDGET_CONFIG } from '../../src/generation/EncounterReadabilityBudget';
import { PROTOTYPE_ENCOUNTER_VARIETY_POLICY } from '../../src/generation/EncounterVarietyPolicy';
import { createHazardPattern } from '../../src/generation/HazardPattern';
import { PROTOTYPE_PACING_CONFIG } from '../../src/pacing/PacingSystem';
import {
  type EncounterTraceEntry,
  LongRunEncounterHarness,
} from '../support/LongRunEncounterHarness';
import { TEST_ENCOUNTER_PROFILE } from '../support/TestEncounterProfile';

describe('LongRunEncounterHarness', () => {
  it('produces exact same trace for the same seed', () => {
    const harness1 = new LongRunEncounterHarness();
    const { trace: trace1 } = harness1.run(42, 5000);

    const harness2 = new LongRunEncounterHarness();
    const { trace: trace2 } = harness2.run(42, 5000);

    expect(trace1).toEqual(trace2);
    expect(trace1.length).toBeGreaterThan(0);
  });

  it('produces different traces for different seeds but preserves invariants', () => {
    const harness1 = new LongRunEncounterHarness();
    const { trace: trace1 } = harness1.run(100, 10000);

    const harness2 = new LongRunEncounterHarness();
    const { trace: trace2 } = harness2.run(200, 10000);

    // They diverge
    expect(trace1).not.toEqual(trace2);

    // Both preserve invariants
    const assertInvariants = (trace: ReadonlyArray<Readonly<EncounterTraceEntry>>) => {
      // Must not exhaust scheduler
      expect(trace.length).toBeGreaterThan(0);

      // Breathers must appear under default pacing
      const hasBreathers = trace.some((t) => t.pacingIntensity === 'breather');
      expect(hasBreathers).toBe(true);

      const reserved = trace.filter((t) => t.type === 'reserved');

      // Every accepted encounter must carry transition-fairness evidence proving it passed
      // the active sequence policy; acceptance without a valid transition is a policy bypass.
      expect(reserved.length).toBeGreaterThan(0);
      for (const entry of reserved) {
        expect(entry.transitionValidation).not.toBeNull();
        expect(entry.transitionValidation?.valid).toBe(true);
        expect(entry.transitionValidation?.failureReason).toBeNull();
      }

      // The recent-history variety guard defers recent families to the fallback catalog, so a
      // non-fallback acceptance must never repeat a family inside the configured window. The
      // window holds only accepted families because rejected candidates never enter history.
      const recentFamilies: string[] = [];
      for (const entry of reserved) {
        expect(entry.varietyFamilyId).toBeDefined();
        expect(entry.fallbackUsed).toBeDefined();
        const familyId = entry.varietyFamilyId as string;
        if (entry.fallbackUsed === false) {
          expect(recentFamilies).not.toContain(familyId);
        }
        recentFamilies.push(familyId);
        while (recentFamilies.length > PROTOTYPE_ENCOUNTER_VARIETY_POLICY.recentFamilyWindowSize) {
          recentFamilies.shift();
        }
      }

      // Deadlock guard (separate from transition fairness above): scheduling must keep making
      // progress instead of looping on endless unbroken rejection runs.
      let consecutiveRejections = 0;
      let maxConsecutiveRejections = 0;
      for (const entry of trace) {
        if (entry.type === 'rejected') {
          consecutiveRejections++;
          maxConsecutiveRejections = Math.max(maxConsecutiveRejections, consecutiveRejections);
        } else {
          consecutiveRejections = 0;
        }
      }
      expect(maxConsecutiveRejections).toBeLessThan(10);
    };

    assertInvariants(trace1);
    assertInvariants(trace2);
  });

  it('completes bounded long run successfully', () => {
    const harness = new LongRunEncounterHarness();
    const maxDistance = 50000;
    const {
      trace,
      finalState,
      maxRetainedSpawns,
      maxReservations,
      maxRecentFamilies,
      maxConcurrentWarnings,
      maxConcurrentLethalWindows,
      maxActivePressureCost,
      maxActiveReadabilityCost,
    } = harness.run(300, maxDistance); // long run

    expect(trace.length).toBeGreaterThan(10);

    // In policy mode the stream status stays 'active' even when scheduling repeatedly fails
    // (only the legacy non-policy path reports 'exhausted'), so a status check cannot prove
    // liveness. Instead: the run must actually reach its requested logical distance (the
    // fixed-timestep advance overshoots fractionally, hence greater-than-or-equal) ...
    expect(finalState.runDistance).toBeGreaterThanOrEqual(maxDistance);

    // ... and scheduling must still admit content at the end of the run rather than silently
    // starve: the final full pacing cycle necessarily contains non-breather phases, so it
    // must contain at least one accepted encounter.
    const pacingCycleLength = PROTOTYPE_PACING_CONFIG.phases.reduce(
      (total, phase) => total + phase.distanceLength,
      0,
    );
    const lateReserved = trace.filter(
      (t) => t.type === 'reserved' && t.runDistance > maxDistance - pacingCycleLength,
    );
    expect(lateReserved.length).toBeGreaterThan(0);

    // Bounded growth is asserted against the configured policy authorities, using maxima
    // tracked throughout the run rather than only the drained final state.
    expect(maxReservations).toBeLessThanOrEqual(
      PROTOTYPE_ENCOUNTER_READABILITY_BUDGET_CONFIG.maximumTrackedEncounters,
    );
    expect(maxRecentFamilies).toBeLessThanOrEqual(
      PROTOTYPE_ENCOUNTER_VARIETY_POLICY.recentFamilyWindowSize,
    );

    // Accepted concurrency usage must respect the configured hard readability limits.
    expect(maxConcurrentWarnings).toBeLessThanOrEqual(
      PROTOTYPE_ENCOUNTER_READABILITY_BUDGET_CONFIG.hardLimits.maximumConcurrentWarnings,
    );
    expect(maxConcurrentLethalWindows).toBeLessThanOrEqual(
      PROTOTYPE_ENCOUNTER_READABILITY_BUDGET_CONFIG.hardLimits.maximumConcurrentLethalWindows,
    );
    expect(maxActivePressureCost).toBeLessThanOrEqual(
      PROTOTYPE_ENCOUNTER_READABILITY_BUDGET_CONFIG.hardLimits.maximumActivePressureCost,
    );
    expect(maxActiveReadabilityCost).toBeLessThanOrEqual(
      PROTOTYPE_ENCOUNTER_READABILITY_BUDGET_CONFIG.hardLimits.maximumActiveReadabilityCost,
    );

    // Retained logical spawns have no single configured cap; this generous regression tripwire
    // (far above the observed steady state of a handful of spawns) catches retention/cleanup
    // regressions without pinning an exact count.
    expect(maxRetainedSpawns).toBeLessThan(50);

    // Spawns should be drained over distance
    expect(finalState.spawns.length).toBeLessThan(50);
    if (finalState.policy) {
      expect(finalState.policy.readability.reservations.length).toBeLessThanOrEqual(
        PROTOTYPE_ENCOUNTER_READABILITY_BUDGET_CONFIG.maximumTrackedEncounters,
      );
      expect(finalState.policy.variety.recentFamilyIds.length).toBeLessThanOrEqual(
        PROTOTYPE_ENCOUNTER_VARIETY_POLICY.recentFamilyWindowSize,
      );
    }
  });

  it('preserves boundary conditions and rejects properly on deliberate invalid fixture', () => {
    // Two entries over runLength 1000 keeps hazard density (2 per 1000) inside the difficulty
    // and pacing eligibility limits, so this fixture reaches the scheduler on non-breather
    // phases and fails there on its blocked geometry instead of being filtered earlier as
    // no-content. (Breather phases still defer it as no-content because 2 entries exceed the
    // breather allowance; that is correct policy behavior, not the asserted failure path.)
    const BLOCKED_PATTERN = createHazardPattern({
      id: 'blocked-validation-pattern',
      runLength: 1000,
      profile: TEST_ENCOUNTER_PROFILE,
      entries: [
        {
          id: 'blocked-top',
          type: 'placeholder-barrier',
          hitbox: { left: 100, right: 148, top: 48, bottom: 220 },
        },
        {
          id: 'blocked-bottom',
          type: 'placeholder-barrier',
          hitbox: { left: 100, right: 148, top: 200, bottom: 342 },
        },
      ],
    });

    const harness = new LongRunEncounterHarness([BLOCKED_PATTERN]);
    const { trace } = harness.run(400, 5000);

    // The blocked geometry must never spawn.
    const hasReserved = trace.some((t) => t.type === 'reserved');
    expect(hasReserved).toBe(false);

    // The failure must be the specific scheduler geometry rejection for the blocked pattern,
    // not a generic no-content defer: every candidate attempt fails pattern validation with
    // no passable vertical corridor.
    const geometryRejections = trace.filter(
      (t) =>
        t.type === 'rejected' &&
        t.reason === 'scheduler-rejected' &&
        t.patternId === 'blocked-validation-pattern' &&
        t.rejectionReason === 'pattern',
    );
    expect(geometryRejections.length).toBeGreaterThan(0);
    for (const rejection of geometryRejections) {
      expect(rejection.rejectionIssueCodes).toContain('vertical-route-blocked');
    }
  });
});
