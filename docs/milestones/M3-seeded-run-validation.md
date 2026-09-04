# M3 Seeded-Run Reproducibility & Fairness-Pipeline Validation

**Date:** 2026-09-04

**Milestone:** M3 — Seeded Generation & Fairness

**Related issues:** #57, #65

## Purpose and scope

Record focused evidence that representative fixed seeds reproduce the same accepted logical hazard sequence, different seeds can vary, rejected candidates do not enter the live accepted spawn stream, and lifecycle/resize interruptions leave generation state unchanged.

This is supporting validation evidence for Issue #65, not the factual M3 completion report owned by Issue #115. Pattern content, constraints, and distances remain **PROTOTYPE** values; this report does not finalize balance or certify every possible seed.

## Automated representative-seed evidence

`tests/generation/SeededRunValidation.test.ts` drives the same `GeneratedHazardStream` used by the live Foundation scene. It starts the first pattern at logical run distance `1000`, advances exactly one accepted pattern at a time, and records six accepted patterns per seed. Each row is executed twice from fresh initial state and both observations must exactly equal the checked-in trace.

Spawn-distance groups align one-to-one with the pattern IDs. Repeated values within a group are intentional: the corridor's top and bottom entries share a leading-edge run distance.

| Seed input | Normalized seed | Accepted pattern IDs, in order | Spawn leading-edge run distances, by pattern |
|---|---:|---|---|
| `60` | `60` | `line, line, line, corridor, corridor, offset-pair` | `[1120,1276,1432]; [1720,1876,2032]; [2320,2476,2632]; [2960,2960]; [3360,3360]; [3720,3930]` |
| `61` | `61` | `corridor, offset-pair, offset-pair, offset-pair, line, line` | `[1160,1160]; [1520,1730]; [2040,2250]; [2560,2770]; [3080,3236,3392]; [3680,3836,3992]` |
| `62` | `62` | `offset-pair, line, line, corridor, line, line` | `[1120,1330]; [1640,1796,1952]; [2240,2396,2552]; [2880,2880]; [3240,3396,3552]; [3840,3996,4152]` |
| `m3-live-run` | `3433278918` | `offset-pair, line, corridor, offset-pair, corridor, corridor` | `[1120,1330]; [1640,1796,1952]; [2280,2280]; [2640,2850]; [3200,3200]; [3600,3600]` |

Full IDs in the automated assertions are `prototype-line`, `prototype-corridor`, and `prototype-offset-pair`; the table abbreviates them only for readability.

### Reproducibility result

**PASS.** All four seed inputs normalized to the recorded value, and both fresh runs for every seed produced the exact recorded logical pattern IDs/order and run-distance spawn values.

### Different-seed variation result

**PASS.** The six-pattern ID sequence is distinct for each of the four representative seeds. This demonstrates meaningful variation with the current three-pattern prototype catalog; it does not promise that every pair of different seeds must produce a unique sequence.

## Validator rejection and accepted-stream evidence

The focused rejection case uses seed `60`, pattern start distance `2000`, a catalog ordered as `blocked-validation-pattern` then `prototype-corridor`, and a four-attempt bound.

Observed deterministic result:

1. attempts 1–3 select `blocked-validation-pattern` and record validator rejections;
2. attempt 4 selects and accepts `prototype-corridor`;
3. the `GeneratedHazardStream` state exactly matches the accepted scheduler result;
4. the live accepted spawn stream contains only the two `prototype-corridor` entries, both at run distance `2160`;
5. neither rejected entry ID (`blocked-top`, `blocked-bottom`) reaches the accepted stream.

**Result: PASS.** Existing focused scheduler and stream tests additionally cover bounded all-invalid exhaustion, validation issues on every exhausted attempt, and no later retry after a stream reaches terminal exhaustion.

## Lifecycle and resize automated evidence

The existing Foundation-scene integration tests exercise the live orchestration boundary:

- `does not jump while paused or on the first frame after resume` records the hazard-stream object before lifecycle pause, then proves it remains the exact same object throughout the paused update and the discarded first update after resume;
- `recalculates resize bounds immediately without advancing simulation time` records the hazard stream before two representative resizes and proves resize keeps the exact same stream object and run distance;
- the generated-stream test `returns the same state without duplicate spawns at repeated run distance` proves a non-advancing distance consumes no generation state and emits no duplicates;
- deterministic continuation from unchanged explicit generation state is covered by the representative replays and scheduler continuation tests.

Together these assertions show that pause/resume and resize do not consume, skip, duplicate, or reorder generation state. Presentation/layout may change during resize, but the logical generation stream is viewport-independent.

## Game Director manual evidence

Issue #65 records the following manual observations supplied by the Game Director:

- `Restart same seed` works;
- the hazard/encounter sequence remains the same after a same-seed restart;
- resize produced no noticeable issue;
- tab switch / background-resume produced no noticeable issue;
- no blocking gameplay defect was reported.

The manual report did not include a device model, OS, browser/version, viewport size, or manually observed seed value/sequence. Those details are intentionally not inferred from the automated matrix or invented here.

## Defects and retest status

No reproducible blocking generation/fairness defect was found by the automated representative cases or reported in the manual playtest, so no separate M3 defect Issue or affected-case retest was required.

## Evidence limits

- Four fixed seeds and six accepted patterns per seed are a concise deterministic sample, not production-scale fuzzing.
- Finite seed sampling is evidence, not mathematical proof that every current or future seed is safe.
- The current catalog, fairness constraints, retry bound, pattern geometry, and spacing are **PROTOTYPE**, not final difficulty or balance certification.
- Automated lifecycle/resize assertions are not represented as manual device/browser evidence.
- The manual observations are not represented as having the missing environment or seed metadata.

## Repository validation

The focused report branch passed the required validation on 2026-09-04:

- `bun run ci:check` — PASS, 86 files checked;
- `bun run typecheck` — PASS;
- `bun run test` — PASS, 36 test files / 186 tests;
- `bun run build` — PASS.

## Validation conclusion

Issue #65's reproducibility/fairness-pipeline gate is supported by deterministic representative-seed traces, explicit rejected-candidate evidence, lifecycle/resize state-preservation coverage, and the separately recorded Game Director observations. No blocker was identified. Formal M3 closeout and transition remain separate work under Issue #115.
