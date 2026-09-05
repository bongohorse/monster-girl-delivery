import { createHazardPattern } from './src/generation/HazardPattern';
import { LongRunEncounterHarness } from './tests/support/LongRunEncounterHarness';
import { TEST_ENCOUNTER_PROFILE } from './tests/support/TestEncounterProfile';

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
console.log(trace);
