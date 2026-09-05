import { describe, expect, it } from 'vitest';
import { ViewportService } from '../../src/core/ViewportService';
import {
  type DirectorDiagnosticSource,
  DirectorEncounterDiagnostics,
} from '../../src/devtools/DirectorEncounterDiagnostics';
import { createGeneratedHazardStream } from '../../src/generation/GeneratedHazardStream';
import { createHazardPattern } from '../../src/generation/HazardPattern';
import {
  type LiveEncounterPolicyConfig,
  PROTOTYPE_LIVE_ENCOUNTER_POLICY_CONFIG,
} from '../../src/generation/LiveEncounterPolicy';
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
        distanceLength: 100_000,
        maximumPatternEntries: 6,
        maximumHazardsPer1000Distance: 10,
      },
      {
        intensity: 'breather',
        distanceLength: 1_000,
        maximumPatternEntries: 1,
        maximumHazardsPer1000Distance: 1,
      },
    ],
  },
};
const pattern = createHazardPattern({
  id: 'fairness-evidence-pattern',
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

describe('Director fairness evidence isolation', () => {
  it('keeps schedule evidence separate from later budget events and retains its reaction floor', () => {
    const diagnostics = new DirectorEncounterDiagnostics();
    const context = { catalog: [pattern], policy, observeEncounter: diagnostics.observe };
    const stream = createGeneratedHazardStream('fairness-evidence', context, motion);
    const fairness = diagnostics.fairness;

    expect(fairness?.kind).toBe('accepted');
    expect(fairness?.selection).toBeDefined();
    const historicalFloor = fairness?.selection?.difficulty.minimumReactionTimeSeconds;
    expect(historicalFloor).toBeTypeOf('number');

    diagnostics.observe({
      kind: 'readability-deferred',
      runDistance: stream.runDistance + 10,
      patternStartDistance: stream.nextPatternStartDistance,
    });

    const currentStream = {
      ...stream,
      schedulingWindow: {
        ...stream.schedulingWindow,
        minimumReactionTimeSeconds: 9,
      },
    };
    const lines = diagnostics.lines(2, source(currentStream));

    expect(diagnostics.latest?.kind).toBe('readability-deferred');
    expect(diagnostics.fairness).toBe(fairness);
    expect(lines).toContain('Fairness event: accepted');
    expect(lines).toContain(`Reaction floor: ${historicalFloor?.toFixed(2)}s`);
    expect(lines).not.toContain('Reaction floor: 9.00s');
  });
});
