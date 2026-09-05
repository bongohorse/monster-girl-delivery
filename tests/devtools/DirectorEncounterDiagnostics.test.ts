import { describe, expect, it } from 'vitest';
import { ViewportService } from '../../src/core/ViewportService';
import {
  type DirectorDiagnosticSource,
  DirectorEncounterDiagnostics,
  formatEncounterReason,
} from '../../src/devtools/DirectorEncounterDiagnostics';
import {
  advanceGeneratedHazardStream,
  createGeneratedHazardStream,
} from '../../src/generation/GeneratedHazardStream';
import { createHazardPattern } from '../../src/generation/HazardPattern';
import {
  type LiveEncounterPolicyConfig,
  PROTOTYPE_LIVE_ENCOUNTER_POLICY_CONFIG,
} from '../../src/generation/LiveEncounterPolicy';
import { PROTOTYPE_TIMED_PULSE_PATTERN } from '../../src/generation/PrototypeHazardPatternFixtures';
import { createTelegraphedHazardSimulationState } from '../../src/hazards/TelegraphedHazardSimulation';
import { InputService } from '../../src/input/InputService';
import { TEST_ENCOUNTER_PROFILE } from '../support/TestEncounterProfile';

const motion = { baseScrollSpeed: 350 };
const policy: LiveEncounterPolicyConfig = {
  ...PROTOTYPE_LIVE_ENCOUNTER_POLICY_CONFIG,
  pacing: {
    phases: [
      {
        intensity: 'low',
        distanceLength: 100000,
        maximumPatternEntries: 6,
        maximumHazardsPer1000Distance: 10,
      },
      {
        intensity: 'breather',
        distanceLength: 1000,
        maximumPatternEntries: 1,
        maximumHazardsPer1000Distance: 1,
      },
    ],
  },
};
const pattern = createHazardPattern({
  id: 'diagnostic-pattern',
  runLength: 600,
  profile: TEST_ENCOUNTER_PROFILE,
  entries: [
    {
      id: 'wall',
      type: 'placeholder-barrier',
      hitbox: { left: 200, right: 248, top: 160, bottom: 208 },
    },
  ],
});
const source = (stream: DirectorDiagnosticSource['stream']): DirectorDiagnosticSource => ({
  stream,
  telegraphs: createTelegraphedHazardSimulationState(),
  viewport: new ViewportService(844, 390).getSnapshot(),
  input: new InputService().getSnapshot(),
  lifecycle: { paused: false, pauseReasons: [] },
});

describe('authoritative encounter diagnostics', () => {
  it('observes real decisions without changing seeded gameplay and explains single-family fallback', () => {
    const diagnostics = new DirectorEncounterDiagnostics();
    const run = (observe = false) => {
      const context = {
        catalog: [pattern],
        policy,
        observeEncounter: observe ? diagnostics.observe : undefined,
      };
      const initial = createGeneratedHazardStream('diagnostics', context, motion);
      return advanceGeneratedHazardStream(initial, 600, context, motion, 600 / 350);
    };
    const observed = run(true);
    expect(observed).toEqual(run());
    expect(diagnostics.accepted?.schedule?.status).toBe('accepted');
    expect(diagnostics.accepted?.fallbackUsed).toBe(true);
    expect(diagnostics.lines(0, source(observed))).toContain(
      `PRNG: ${observed.generationState.prngState}`,
    );
    expect(diagnostics.lines(3, source(observed))).toContain('Last accepted fallback: yes');
    expect(diagnostics.lines(3, source(observed))).toContain('Family latest: test-static');
    expect(diagnostics.lines(2, source(observed))).toContain('Transition: pass');
    diagnostics.reset();
    expect(diagnostics.latest).toBeUndefined();
    expect(diagnostics.accepted).toBeUndefined();
    expect(diagnostics.readability).toBeUndefined();
    expect(diagnostics.selection).toBeUndefined();
  });
  it('maps actual transition rejection with its historical distance and available time', () => {
    const diagnostics = new DirectorEncounterDiagnostics();
    const wall = (id: string, top: number, bottom: number) =>
      createHazardPattern({
        id,
        runLength: 300,
        profile: TEST_ENCOUNTER_PROFILE,
        entries: [
          {
            id: 'wall',
            type: 'placeholder-barrier',
            hitbox: { left: 100, right: 300, top, bottom },
          },
        ],
      });
    const initial = createGeneratedHazardStream(
      'transition',
      { catalog: [wall('low', 48, 240)], policy, observeEncounter: diagnostics.observe },
      motion,
    );
    const rejected = advanceGeneratedHazardStream(
      initial,
      300,
      { catalog: [wall('high', 150, 342)], policy, observeEncounter: diagnostics.observe },
      motion,
      300 / 350,
    );
    expect(diagnostics.rejected?.kind).toBe('scheduler-rejected');
    expect(diagnostics.lines(2, source(rejected))).toContain(
      'Transition: entry unreachable from exit',
    );
    expect(diagnostics.lines(2, source(rejected))).toContain('Evidence at: 300.00');
    expect(diagnostics.lines(2, source(rejected))).toContain('Isolated: pass');
    expect(rejected.scheduledPatternCount).toBe(1);
  });
  it('shows the finally accepted candidate instead of an earlier rejected scheduler attempt', () => {
    const diagnostics = new DirectorEncounterDiagnostics();
    const stream = createGeneratedHazardStream('accepted-evidence', { catalog: [pattern], policy }, motion);
    const schedule = Object.freeze({
      status: 'accepted' as const,
      transitionValidation: null,
      attempts: 2,
      catalogIndex: 1,
      patternId: 'accepted-pattern',
      patternStartDistance: 600,
      nextPatternStartDistance: 1200,
      rejections: Object.freeze([
        Object.freeze({
          attempt: 1,
          catalogIndex: 0,
          issues: Object.freeze([]),
          patternId: 'rejected-pattern',
          reason: 'pattern' as const,
          transitionValidation: null,
        }),
      ]),
      spawns: Object.freeze([]),
      state: Object.freeze({ seed: 1, prngState: 2 }),
    });

    diagnostics.observe({
      kind: 'accepted',
      runDistance: 100,
      patternStartDistance: 600,
      schedule,
    });

    const lines = diagnostics.lines(2, source(stream));
    expect(lines).toContain('Fairness event: accepted');
    expect(lines).toContain('Pattern: accepted-pattern');
    expect(lines).toContain('Isolated: pass');
    expect(lines).not.toContain('Pattern: rejected-pattern');
  });
  it('maps current occupancy separately from the last budget rejection and requested limits', () => {
    const diagnostics = new DirectorEncounterDiagnostics();
    const pulse = createHazardPattern({
      ...PROTOTYPE_TIMED_PULSE_PATTERN,
      profile: {
        ...PROTOTYPE_TIMED_PULSE_PATTERN.profile,
        difficultyTierRange: { minimumTierIndex: 0, maximumTierIndex: null },
        pressureCost: 2,
      },
    });
    const context = { catalog: [pulse], policy, observeEncounter: diagnostics.observe };
    const initial = createGeneratedHazardStream('budget', context, motion);
    const deferred = advanceGeneratedHazardStream(initial, 600, context, motion, 600 / 350);
    expect(diagnostics.rejected?.kind).toBe('readability-deferred');
    const readabilityEvidence = diagnostics.readability;
    expect(readabilityEvidence?.kind).toBe('readability-deferred');
    const lines = diagnostics.lines(4, source(deferred));
    expect(lines).toContain('Now pressure: 2 / 6 hard');
    expect(lines).toContain('Now warnings: 1 / 2 hard');
    expect(lines).toContain('Last request P/R: 2 / 3');
    expect(lines).toContain('Defer: pressure cap');
    expect(lines).toContain('4 > 2 at +0.00s');

    const acceptedSchedule = diagnostics.accepted?.schedule;
    if (acceptedSchedule === undefined) {
      throw new TypeError('Expected accepted schedule evidence before the budget defer.');
    }
    diagnostics.observe({
      kind: 'reaction-rejected',
      runDistance: deferred.runDistance + 1,
      patternStartDistance: deferred.nextPatternStartDistance,
      schedule: acceptedSchedule,
    });

    expect(diagnostics.rejected?.kind).toBe('reaction-rejected');
    expect(diagnostics.readability).toBe(readabilityEvidence);
    const preservedLines = diagnostics.lines(4, source(deferred));
    expect(preservedLines).toContain('Defer: pressure cap');
    expect(preservedLines).toContain('4 > 2 at +0.00s');
  });
  it('keeps distinct human-readable reasons for isolated, transition and concurrency failures', () => {
    expect(formatEncounterReason('vertical-corridor-unreachable')).toBe('corridor unreachable');
    expect(formatEncounterReason('non-positive-transition-window')).toBe('no transition time');
    expect(formatEncounterReason('warning-concurrency-exceeded')).toBe('warning cap');
    expect(formatEncounterReason('lethal-concurrency-exceeded')).toBe('lethal cap');
  });
});
