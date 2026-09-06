import { describe, expect, it } from 'vitest';
import { createHazardPattern } from '../../src/generation/HazardPattern';
import { LongRunEncounterHarness } from '../support/LongRunEncounterHarness';
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
    const assertInvariants = (trace: typeof trace1) => {
      // Must not exhaust scheduler
      expect(trace.length).toBeGreaterThan(0);

      // Breathers must appear under default pacing
      const hasBreathers = trace.some((t) => t.pacingIntensity === 'breather');
      expect(hasBreathers).toBe(true);

      // We should see reserved encounters
      const hasReserved = trace.some((t) => t.type === 'reserved');
      expect(hasReserved).toBe(true);

      // Ensure the history remains bounded and repetition guard is active
      const reserved = trace.filter((t) => t.type === 'reserved');
      let fallbackInstances = 0;
      for (let i = 1; i < reserved.length; i++) {
        if (
          reserved[i].varietyFamilyId &&
          reserved[i].varietyFamilyId === reserved[i - 1].varietyFamilyId
        ) {
          fallbackInstances++;
        }
      }

      // We expect the repetition guard to keep repeated families bounded
      // Since PROTOTYPE_M4_HAZARD_PATTERN_FIXTURES catalog is small, some fallback is expected
      // over a run of 10000 distance. The guard ensures it only falls back when no valid distinct family fits.
      expect(fallbackInstances).toBeLessThan(reserved.length / 2);

      // Verify that all 'reserved' patterns logically passed the transition policy.
      // We ensure that we do not see widespread trajectory or schedule rejections immediately
      // following an accepted item without any parameter updates or spacing.
      // There shouldn't be excessive consecutive trajectory rejections if the transition fairness handles sequencing cleanly.
      // Since it simulates multiple candidates, some rejection is natural but there shouldn't be endless unbroken rejection loops.
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
      expect(maxConsecutiveRejections).toBeLessThan(10); // Deadlock assertion / transition fairness
    };

    assertInvariants(trace1);
    assertInvariants(trace2);
  });

  it('completes bounded long run successfully', () => {
    const harness = new LongRunEncounterHarness();
    const { trace, finalState, maxRetainedSpawns, maxReservations, maxRecentFamilies } =
      harness.run(300, 50000); // long run

    expect(trace.length).toBeGreaterThan(10);

    // Check that internal states are bounded properly
    // Verify that the maximum growth at any point during the run is strictly bounded by active policy/cleanup constraints
    expect(maxRetainedSpawns).toBeLessThan(50);
    expect(maxReservations).toBeLessThan(20);
    expect(maxRecentFamilies).toBeLessThanOrEqual(2);

    // Spawns should be drained over distance
    expect(finalState.spawns.length).toBeLessThan(50);
    if (finalState.policy) {
      expect(finalState.policy.readability.reservations.length).toBeLessThan(20);
      expect(finalState.policy.variety.recentFamilyIds.length).toBeLessThanOrEqual(2);
    }
  });

  it('preserves boundary conditions and rejects properly on deliberate invalid fixture', () => {
    const BLOCKED_PATTERN = createHazardPattern({
      id: 'blocked-validation-pattern',
      runLength: 300,
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

    // The policy rejects/defers the unreadable blocks and will not spawn it
    const hasReserved = trace.some((t) => t.type === 'reserved');
    expect(hasReserved).toBe(false);

    // We should specifically see valid structured rejection records since the candidate fails bounds/deadlock validation.
    // If the tier explicitly denies `TEST_ENCOUNTER_PROFILE` it will defer out as `no-content`.
    // We expect it to at least explicitly defer or reject cleanly instead of deadlocking.
    // Because `TEST_ENCOUNTER_PROFILE` requires difficulty tier > 0 implicitly or causes a `no-content` based on budget
    // For this specific test we should verify we get at least some structured tracking of why it didn't pass (e.g., defer due to no valid content available).
    const hasDeferredOrRejection = trace.some(
      (t) => t.type === 'rejected' || t.type === 'deferred',
    );
    expect(hasDeferredOrRejection).toBe(true);

    const hasStructuredReason = trace.some(
      (t) =>
        t.reason === 'no-content' ||
        t.reason === 'scheduler-rejected' ||
        t.reason === 'trajectory-rejected',
    );
    expect(hasStructuredReason).toBe(true);
  });
});
