# Test Quality Gate 4 — Collectibles survivor hardening

Umbrella: #371

Gate 4 starts from the accepted Gate 3 classification instead of trying to drive the mutation score toward 100%.

## Goal

- add assertions only where a survivor has an independent behavioral or work-evidence oracle;
- use work counters for performance-only behavior;
- adopt a surviving implementation when it is simpler and measurably avoids redundant work;
- keep equivalent and out-of-oracle mutants documented rather than manufacturing implementation-coupled tests;
- verify important killed mutants fail for the intended rule.

## Changes

### Exact-miss work evidence

Gate 3 survivors 51/52 bypassed the exact pickup-collision miss guard. Gameplay still rejected the collectible later, but the implementation unnecessarily entered first-contact resolution.

Gate 4 adds a candidate that:

- passes the horizontal Collectibles broadphase;
- fails the exact pickup collision because it is vertically far away.

The independent work contract is:

- candidate count = 1;
- exact pickup collision evaluations = 1;
- first-contact resolutions = 0;
- hazard collision evaluations = 0.

In the accepted Gate 4 mutation run, both corresponding mutants are killed **only** by:

`PrototypeBroadphaseWork evidence does not resolve first-contact timing for a candidate that fails exact pickup collision`

That is the intended performance/work reason, not an incidental gameplay failure.

### Redundant standalone hazard prefilter removed

Gate 3 survivor 58 replaced the standalone fallback's full-step `hazards.filter(...)` with the original hazard list.

Review showed the survivor exposed redundant production work:

- the filter evaluated every hazard over the full simulation step;
- the subsequent `hasLethalCollisionBy(..., contactSeconds)` call still had to evaluate collision up to the pickup boundary;
- direct prefix checks are sufficient for the ordering question and can reject hazards whose active interval starts after pickup without invoking collision authority at all.

Gate 4 therefore adopts the cheaper structure deliberately:

- Graze-provided `resolvedLethalHazards` are still reused unchanged;
- standalone callers use the retained hazard list directly;
- every candidate hazard is checked only against the pickup prefix;
- the redundant full-step prefilter is gone.

A work-evidence regression case uses a pickup whose boundary occurs before a future hazard becomes active. The pickup remains valid and `hazardCollisionEvaluationCount` stays at **0**. The old prefilter would have performed a full-step hazard evaluation.

The Gate 3 counter-only survivors 61/62/63 were inside that deleted prefilter and therefore disappear instead of being preserved with artificial tests.

## Accepted Gate 4 mutation evidence

Validated PR head:

`a7ebad78234f0daf630b7fab18a5cb5948eab2f1`

Mutation workflow:

- **Collectibles mutation audit #15**
- run ID: `35529386177`
- merge-ref/report commit: `b04c5da061cc4d04f8ade1a58eab24713840c1ef`
- focused baseline: **24 assertions**
- pilot 1 runtime: **42 s**
- pilot 2 runtime: **41 s**
- artifact ID: `10610054302`
- artifact digest: `sha256:c497b8e6998dbfd581a6dd115247b3a9f7db35aa1b67d1aa3eeb8f3f34f56488`

Both mutation passes produced identical identities, locations, replacements and verdicts:

| State | Run 1 | Run 2 |
| --- | ---: | ---: |
| Killed by focused test failure | 49 | 49 |
| Survived | 16 | 16 |
| NoCoverage | 0 | 0 |
| Timeout | 0 | 0 |
| CompileError | 0 | 0 |
| RuntimeError | 0 | 0 |
| Ignored | 0 | 0 |

Verdict changes: **0**.

Compared with Gate 3, total generated mutants dropped from 71 to 65 because the redundant prefilter and its counter bookkeeping were removed. Survivors dropped from 22 to **16**.

## Remaining survivors

The remaining 16 survivors are exactly the classes Gate 4 intentionally does not force-kill.

### Equivalent within the valid audited domain — 14

Mutant IDs:

`17, 19, 21, 22, 23, 24, 26, 27, 29, 34, 37, 40, 41, 43`

They remain in the zero-scroll/horizontal-window helper area described in Gate 3. Given the valid audited call preconditions, they either:

- take a path that is unreachable after the exact positive-overlap precheck;
- widen a contact window without changing the effective trajectory interval;
- or remove/relax a rejection that cannot change the already-established positive-overlap result.

These remain documented equivalents. Gate 4 adds no implementation-shaped assertions for them.

### Outside the independent Gate 4 oracle — 2

Mutant IDs:

`54, 56`

They remove the defensive `contactSeconds === null` rejection after the independent exact collision precheck.

Changing observable gameplay would require disagreement between two collision/contact calculations. Gate 4 still has no independent reference oracle capable of declaring which calculation is correct for the full valid trajectory domain.

These remain deferred to Gate 5 collision/simulation reference expansion. They are not labeled equivalent.

## Important-kill reason check

The accepted per-mutant Vitest evidence was inspected for representative critical rules.

- Pickup hitbox arithmetic mutants 10/11/12 are killed by the independent positive-area pickup-boundary authority test.
- Consumed-identity mutants 47/48 are killed by the exactly-once authority test and duplicate-pickup regressions.
- Performance mutants 51/52 are killed only by the new exact-miss work-evidence test.
- Fallback selection mutant 57 is killed by both the future-hazard work-evidence case and standalone lethal-order authority.
- Lethal-prefix mutants 59/61/62 are killed by death-before-pickup authority tests, including the standalone fallback case.

This confirms the important kills are attributable to the intended gameplay/work contracts rather than crashes, setup failures or unrelated assertions.

## CI evidence

Normal PR CI #994 on the validated Gate 4 head passed:

- Biome;
- TypeScript;
- **113 test files / 820 tests**;
- production build.

## Permanent policy

After Gate 4 validation, the mutation workflow returns to manual-only `workflow_dispatch`.

Gate 4 does not establish correctness for the two remaining contact-solver consistency mutants. That requires Gate 5's independent collision/simulation reference work.
