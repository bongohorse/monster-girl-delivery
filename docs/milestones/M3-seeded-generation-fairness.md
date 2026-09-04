# M3 — Seeded Generation & Fairness — Completion Report

**Status:** COMPLETE

**Completed:** 2026-09-04

**Primary planning issue:** #57

**Purpose:** Establish deterministic procedural encounter generation that can be reproduced, inspected, tested, and rejected when unsafe.

## 1. Planned goal

M3 was planned as the first procedural-content milestone after the deterministic M2 runner foundation.

The intended scope was:

- a dedicated deterministic seeded gameplay PRNG and explicit run-generation state;
- a small Phaser-independent, data-driven hazard-pattern model;
- deterministic pattern selection from explicit state and catalog data;
- pure prototype fairness validation with structured rejection reasons;
- deterministic, bounded scheduling of accepted logical hazard spawns;
- live generated-hazard integration that reused M2 collision/death/restart authority;
- development-only seed visibility and same-seed restart tooling;
- focused reproducibility, rejection, lifecycle, resize, and manual playtest evidence;
- a factual milestone closeout before M4 begins.

Final difficulty and pacing, production content, Graze, scoring/economy, and final balance were explicitly outside M3.

## 2. What M3 actually delivered

### Seeded PRNG and explicit run-generation state

Issue #58 / PR #108 added a small Phaser-independent seeded gameplay PRNG and immutable run-generation state.

- Number and string seed inputs normalize deterministically to unsigned 32-bit values.
- Every step consumes and returns explicit state; no module-global RNG state is hidden from callers.
- Same-seed replay and continuation are reproducible without gameplay `Math.random()`.
- The generator is gameplay infrastructure, not cryptographic randomness.

### Typed logical hazard-pattern model

Issue #59 / PR #109 added immutable logical patterns with stable pattern/entry IDs, authored entry order, run length, typed placeholder-barrier entries, and validated finite hitbox geometry.

Three small fixtures—line, corridor, and offset pair—were added as **PROTOTYPE** example/test content. They are not a production catalog or final encounter design.

### Deterministic pattern generator

Issue #60 / PR #110 added pure seeded selection from explicit generation state and an explicit pattern catalog.

- Catalog order is intentionally sequence-significant and IDs must be unique.
- Each successful selection consumes exactly one PRNG step and returns the updated state.
- Selection owns neither fairness decisions nor Phaser presentation.

### Explicit prototype fairness validator

Issue #61 / PR #111 added a pure validator operating in logical gameplay/run-distance space.

- It evaluates minimum vertical corridor, blocked vertical route, and reaction-spacing constraints.
- Failures return deterministic structured issue codes and supporting values.
- Constraint values are centralized and remain **PROTOTYPE**.
- Validation has no RNG, Phaser, or physical-viewport dependency and does not mutate patterns.

### Bounded validated spawn scheduling

Issue #62 / PR #112 connected generation, validation, and logical spawn mapping without collapsing their responsibilities.

- Generated candidates are validated before scheduling; rejected pattern entries never enter accepted output.
- Rejection and acceptance consume generation state through explicit deterministic semantics.
- Candidate retries are bounded and all-rejected exhaustion is an explicit terminal result rather than an infinite loop.
- Accepted entries map to ordered absolute run-distance hitboxes that reuse the existing logical hazard shape.

### Live generated-hazard stream

Issue #63 / PR #113 replaced the single fixed M2 hazard presentation with a deterministic generated stream.

- The stream fills and prunes a logical run-distance window from authoritative run progress.
- Live Phaser presentation derives from accepted logical spawn instances.
- Existing M2 collision, death, run-state, and restart authorities are reused rather than duplicated.
- Repeated or zero-delta progress does not duplicate or consume generation state.
- Stream configuration, the fixed live seed, and temporary visuals remain **PROTOTYPE**.

### Development-only seed diagnostics and same-seed restart

Issue #64 / PR #114 exposed the normalized authoritative run seed in Director diagnostics and added one development-only `Restart same seed` action.

The action routes through the existing run reset, resets player/run/generation state, preserves input blocking/release behavior, and is absent when Director mode is disabled. M3 did not add arbitrary player seed entry, seed sharing, or seed-history persistence.

### Focused reproducibility and rejection evidence

Issue #65 / PR #128 added a dedicated representative-seed trace suite and [`M3-seeded-run-validation.md`](M3-seeded-run-validation.md).

- Four fixed seed inputs were each replayed twice across six accepted patterns.
- Same-seed pattern IDs/order and logical run-distance spawn values matched exactly.
- All four representative six-pattern ID sequences differed with the current catalog.
- A deterministic three-rejection-then-acceptance case proved rejected entries did not reach the live accepted stream.
- Existing live-scene tests proved pause/resume and resize preserve generation state.
- No blocking M3 defect was found or reported.

## 3. Architecture/product decisions established

M3 established or confirmed these constraints for later work:

- Gameplay generation uses dedicated seeded PRNG state; gameplay decisions do not use ambient `Math.random()`.
- Seed and current PRNG state are explicit immutable run-generation data suitable for deterministic restart and continuation.
- Pattern modeling, generation/selection, fairness validation, logical scheduling, stream management, Phaser presentation, and collision remain separate responsibilities.
- The scheduler validates candidates before mapping them into accepted spawns and uses bounded, explicit failure behavior.
- Generated hazards remain in logical run-distance/vertical space; physical viewport size is not a generation or fairness authority.
- The live stream derives from authoritative run distance and reuses the established logical collision/death/restart path.
- Director seed diagnostics and same-seed restart remain development infrastructure using authoritative gameplay state.
- Finite representative seed sampling is engineering evidence, not mathematical proof that every possible current or future seed is safe.

M3 did not make its pattern catalog, geometry, constraint values, retry bounds, stream distances, fixed live seed, visuals, difficulty, or pacing final product decisions. Those values remain **PROTOTYPE**, **TBD**, or **FUTURE** as previously classified.

## 4. Validation evidence

### Automated validation

The supporting validation report records the focused deterministic matrix in detail:

- numeric seeds `60`, `61`, and `62`, plus live seed input `m3-live-run` normalized to `3433278918`;
- six accepted pattern groups per seed, replayed twice from fresh initial state;
- exact pattern-ID/order and logical spawn-distance assertions;
- representative different-seed variation;
- deterministic rejected-candidate exclusion from the accepted live spawn stream;
- bounded all-invalid exhaustion and deterministic continuation;
- pause/resume, zero-delta, repeated-distance, and resize preservation of generation state.

PR #128 and its final `main` merge CI passed the repository checks. The recorded baseline was **36 test files / 186 tests**, with Biome, TypeScript, Vitest, and the production build successful.

The Issue #115 closeout branch also passed the required suite on 2026-09-04: Biome checked 86 files, TypeScript completed with no errors, Vitest passed **36 test files / 186 tests**, and the production Vite build completed successfully.

Automated validation is engineering evidence and is not represented as manual device/browser testing. Four fixed seeds and a finite trace length do not prove every possible current or future seed safe.

### Manual/playtest evidence

Issue #65 records only the following observations supplied by the Game Director:

- `Restart same seed` works;
- the hazard/encounter sequence remains the same after same-seed restart;
- resize produced no noticeable issue;
- tab switch / background-resume produced no noticeable issue;
- no blocking gameplay defect was reported.

No device model, OS, browser/version, viewport size, manual seed value, or manually transcribed sequence was supplied. This report does not infer or invent that missing metadata.

## 5. Main Issues / PRs

| Work | Issue | PR | Result |
|---|---:|---:|---|
| Seeded PRNG and run-generation state | #58 | #108 | Explicit deterministic immutable generation state |
| Hazard-pattern data model | #59 | #109 | Typed logical patterns and three prototype fixtures |
| Seeded pattern generator | #60 | #110 | Deterministic explicit-state catalog selection |
| Pattern fairness validator | #61 | #111 | Structured pure logical-space prototype constraints |
| Validated spawn scheduler | #62 | #112 | Bounded rejection/acceptance and absolute spawn mapping |
| Live generated-hazard integration | #63 | #113 | Run-distance-driven accepted stream using existing collision |
| Director seed and same-seed restart | #64 | #114 | Development-only authoritative seed tooling |
| Reproducibility/fairness validation | #65 | #128 | Fixed-seed traces, rejection evidence, and manual report |

## 6. Supporting maintenance completed during the milestone

No separate repository maintenance is attributed to M3 in this closeout. M4 parent/child planning was prepared in GitHub while M3 was current, but that future planning is not M3 implementation or validation evidence.

## 7. What deliberately did not deliver

M3 did not implement:

- final difficulty progression or a pacing/intensity system;
- time-to-impact or physics-aware reachability validation;
- fairness across consecutive encounter transitions;
- anti-repetition policy or active-hazard concurrency budgets;
- telegraphed, moving, timed, or reactive hazard archetype systems;
- production pattern/content volume, visuals, audio, or final balance;
- Graze, score, rewards, economy, collection, or persistence;
- arbitrary player seed entry, seed sharing, or seed-history persistence;
- production-scale fuzzing, performance certification, or proof of all seeds.

## 8. Deferred/open work at exit

No reproducible blocking M3 defect remains from the accepted validation evidence.

The M4 parent Issue #116 owns the promoted next-stage work: time-to-impact fairness, physics-aware reachability, sequence-level fairness, deterministic difficulty, separate deterministic pacing/breathers, encounter policy/variety, telegraphed and mechanically distinct hazard archetypes, active-hazard readability limits, live policy integration, expanded Director diagnostics, long-run trace evidence, real-gameplay validation, and factual closeout.

M3's three-pattern placeholder catalog, single placeholder-barrier entry type, fixed seed, validation values, retry/window values, and presentation remain **PROTOTYPE** inputs for later focused work rather than accepted final tuning.

## 9. Exit decision

M3 exits because:

- all ordered implementation Issues #58–#64 are closed with their focused PRs merged;
- the generator → validator → scheduler → live-stream pipeline is integrated while preserving explicit ownership boundaries;
- Issue #65 and PR #128 provide accepted deterministic and manual evidence for same-seed replay, representative variation, rejected-candidate exclusion, and lifecycle/resize preservation;
- the final #128 `main` CI passed;
- no blocking M3 defect or retest remains;
- Issue #115 explicitly authorizes factual M3 closeout, closure of parent Issue #57, and transition to the already prepared M4 parent Issue #116.

This closeout makes M3 complete and M4 current when its PR merges and closes Issues #115 and #57. It does not claim final fairness/balance or authorize work outside M4 parent Issue #116.

## 10. What M4 inherits

M4 can safely assume:

- the M0–M2 time, input, lifecycle, viewport, flight, run-distance, collision, death, and restart foundations;
- explicit deterministic seed/PRNG state and same-seed restart behavior;
- immutable logical pattern data and a small prototype catalog;
- separated deterministic generation, pure validation, bounded scheduling, and logical stream responsibilities;
- accepted generated hazards integrated into the live run using the existing collision authority;
- development-only seed visibility and same-seed restart tooling;
- focused representative reproducibility/rejection evidence and accepted manual lifecycle/resize observations;
- a green automated validation baseline.

M4 does **not** inherit final difficulty, pacing, hazard language, reachability, sequence fairness, variety/readability policy, production content, Graze, scoring, economy, or final balance as completed systems. Those remain limited to the focused scope and ordering approved by Issue #116.
