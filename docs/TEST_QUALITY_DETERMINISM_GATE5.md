# Test Quality Gate 5D — frame-partition determinism contract

Umbrella: #371

Gate 5D extends the existing simulation-time frame-partition harness to Collectibles. It does not claim that matching schedules prove physical correctness; Gate 5A–5C provide independent collision/contact references for that purpose.

## Determinism contract

Cross-schedule comparisons use:

- the same explicit initial state;
- the same Collectible occurrences and hazard geometry;
- the same total simulation horizon;
- the same inputs at the same **simulation times**, not frame numbers;
- the standard 30/60/90/120/144 Hz schedules plus deterministic jitter.

Discrete authority values are compared exactly:

- collected occurrence identities;
- collected count;
- collected value;
- earned reward;
- terminal result totals.

Continuous state is compared only under the existing numerical tolerance where it is part of the contract.

## Terminal run-end limit

Collision authority detects contact continuously inside a step, but the current run-end contract stores the **enclosing step endpoint**. Therefore Gate 5D deliberately does not require these values to be equal across frame partitions:

- `deathRecordedAtTime`;
- `finalDistance`;
- `score`.

For the terminal fixture, the analytical lethal onset is still used as a lower bound, and the recorded endpoint must fall no more than one 30 Hz frame after it.

This preserves the documented M5 authority boundary instead of accidentally redefining the engine to expose time-of-impact.

## Evidence scenarios

### Multiple non-terminal pickups

Three static Collectibles with values 1, 2 and 3 are crossed during one second of pinned-Y flight.

Every standard schedule must end with exactly:

- 3 collected occurrences;
- value 6;
- reward 6;
- the same sorted stable occurrence identities.

### Simulation-time input transitions

The existing non-frame-aligned input script uses transitions at:

- 0.150 s;
- 0.425 s;
- 0.550 s.

A Collectible reached after the 0.425 s transition must produce the same identity/value/reward across every schedule. Final continuous flight/motion state is compared with the existing `1e-9` tolerance.

### Terminal pickup ordering

A static lethal hazard begins positive horizontal overlap at:

`(240 - 18) / 350 = 222 / 350 ~= 0.634285714 s`.

Collectibles at X=100 and X=200 begin pickup before lethal contact; a Collectible at X=280 begins afterward.

Every frame schedule must therefore preserve exactly the first two pickup occurrences and terminal totals, even though the enclosing death-step endpoint may differ by schedule.

## Claim boundary

Gate 5D proves the stated discrete frame-partition contract for these deterministic scenarios. It does not claim:

- partition-invariant time-of-impact;
- partition-invariant terminal distance or score;
- general collision correctness from frame-rate agreement;
- browser/device timing equivalence.

Those boundaries remain explicit.
