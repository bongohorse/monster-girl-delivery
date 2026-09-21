# Test quality workflow

Umbrella: #371

Passing tests prove that the current expectations agree with the current implementation. They do not by themselves prove that the expectations are correct or that plausible regressions would be detected. MGD therefore treats test quality as a combination of independent expected results, behavioral coverage, deterministic evidence, mutation evidence, and browser/device smoke coverage.

## Core rule: define the expected result independently

Before adding a high-value gameplay-authority test, state why the expected result is correct.

Preferred sources of truth, in order:

1. an analytically solvable reference case;
2. an explicit gameplay rule that can be evaluated independently of the implementation;
3. a previously observed concrete regression/counterexample;
4. a deliberately simpler independent reference implementation, where practical.

Avoid deriving the assertion from the same formula or helper that the production code uses. Product code and test code can otherwise agree on the same mistake.

## Permanent PR evidence policy

This section is the canonical MGD policy for selecting and reviewing test-quality evidence. It supplements the repository-wide completion commands in `AGENTS.md` / `DEVELOPMENT.md`; it does not replace the focused Issue's acceptance criteria or Game Director approval.

### Baseline for code and configuration changes

Every code/configuration PR still completes the normal repository checks:

```text
Biome
→ TypeScript
→ Vitest
→ production build
```

A green baseline proves that the repository's current checks accept the change. It is not, by itself, proof that a changed gameplay rule is correct.

For a deterministic gameplay-authority change, the PR should also make the following visible in its tests, PR evidence, or owning Issue:

1. **Rule** — what observable gameplay invariant or outcome is intended?
2. **Expected-result source** — why is the expected value/result correct independently of the implementation under test?
3. **Regression seam** — which focused test would fail if that rule were plausibly violated?
4. **Evidence boundary** — what is *not* established by that test or workflow?

Gameplay authority includes logic that can change simulation outcomes such as time/physics, collision/contact, hazard lifecycle, generation/fairness, scoring/rewards, persistence migrations, or other deterministic rules. Presentation-only code is not promoted into this category merely because it is important.

Simple explicit rules do not need an elaborate second implementation. A hand-computable constant, boundary, state transition, or previously reproduced regression can be the independent expected-result source.

### Evidence-selection matrix

Use the smallest evidence set that can actually support the claim.

| Evidence | Required when | Not required merely because |
| --- | --- | --- |
| Focused behavioral/regression test | A deterministic project-owned rule changes, a reproduced deterministic bug is fixed, or an invariant needs protection | code was refactored without behavior change |
| Independent analytical/reference case or oracle | A critical algorithm can be self-consistently wrong and the expected result would otherwise reuse the same production formula/helper; especially collision/contact, reachability/fairness, ordering or numerical authority | a simple rule already has an independently obvious expected value |
| Boundary triplet / neighboring cases | Correctness depends on an inequality, threshold, interval edge, tie, lifecycle boundary or geometry contact | the behavior has no meaningful boundary |
| Frame-partition evidence | A change can alter time/physics/collision/discrete-event outcomes across different simulation partitions | ordinary non-time-dependent state logic changes |
| Fixed-seed/replay evidence | Gameplay randomness/generation changes or a randomized failure is investigated | deterministic logic contains no seeded behavior |
| Coverage audit | The task is explicitly auditing blind spots, a critical area is poorly understood after structural change, or review needs to locate unexercised source paths | every PR, or to satisfy an arbitrary percentage |
| Mutation/fault-injection audit | The task claims to prove that critical tests detect plausible regressions, or review identifies credible test/implementation coupling that ordinary behavioral evidence does not resolve | every feature/fix PR, or to chase a mutation score |
| Browser runtime smoke | Browser/Phaser/DOM/canvas/input/resize/lifecycle integration changes, including paths covered by the browser-smoke workflow; manually dispatch it when an integration-relevant change falls outside those path filters | pure simulation/generation/math logic changes |
| Test-order/isolation stability audit | Investigating flakes/global-state coupling, changing Vitest isolation/pool behavior, or changing shared test infrastructure in a way that could create order dependence | every normal PR |
| Performance/work-counter/device profiling | The PR makes a performance/work-cost claim or changes a hot path whose acceptance requires cost evidence | a behavior-only mutation survives while output remains equivalent |
| Manual/real-device evidence | Acceptance concerns game feel, visual quality, real touch ergonomics, browser chrome/safe areas, real device lifecycle, thermal/GPU behavior, or other hardware-dependent outcomes | deterministic Node or headless-browser behavior is already sufficient |

If an assigned Issue explicitly requires stronger evidence, the Issue wins. If a row is triggered but the evidence cannot be obtained, the PR must state the missing evidence and must not silently claim the corresponding result.

### Coverage policy

Coverage is a **blind-spot map**.

- Do not add or raise a global percentage target simply to make the number larger.
- Prioritize uncovered branches using gameplay consequence, complexity, prior regressions and realistic reachability.
- A high percentage does not remove the need for independent expected results.
- An uncovered defensive/impossible-state branch is not automatically a product gap.
- Normal PR CI does not run the coverage audit unless a focused task deliberately changes that policy.

### Independent-oracle policy

Use an independent oracle when the production algorithm and a naive test could reproduce the same mistake.

Good oracle sources include:

- closed-form math for a bounded case;
- a simpler algorithm with different structure;
- an explicit game rule evaluated from fixed inputs;
- a retained real regression/counterexample.

Do not call a copied production formula, production helper, finer numerical sampler, or another frame partition an independent oracle.

An oracle must state its valid domain. Agreement inside that domain cannot be generalized to arbitrary geometry, trajectories, seeds or runtime environments.

### Mutation and fault-injection policy

Mutation testing asks whether tests notice a changed program; it does not decide the correct program.

For a focused mutation/fault-injection audit:

- keep the mutated scope bounded;
- retain the independent gameplay rule used to judge an important mutant;
- distinguish assertion kills from timeout, compile error and runtime error;
- inspect important kills so an unrelated crash is not credited as rule detection;
- classify survivors before adding tests;
- use work counters/profiling for performance-only survivors;
- document equivalent-in-domain and invalid/out-of-domain survivors rather than writing artificial tests to kill them;
- remove temporary faults before merge.

There is no repository-wide target mutation score.

### Browser, visual and device policy

Node/Vitest is the deterministic authority for pure gameplay rules. The browser smoke owns integration that only a browser can establish, not simulation truth.

The browser-smoke workflow should be green when its path filters apply. Manually dispatch it when a change has browser-integration risk that the path filter does not capture.

Headless browser success does not establish:

- visual correctness or sharpness;
- real touch hardware behavior;
- mobile browser chrome/safe-area behavior;
- subjective feel;
- mobile GPU/thermal performance.

Those require the focused manual/device evidence named by the Issue or milestone.

### Test review checklist

Review tests as production evidence, not as an automatic benefit because more assertions exist.

For each material new/changed test, ask:

1. **Independent expectation** — Is the expected result justified without asking the implementation under test to calculate it?
2. **Observable contract** — Does the assertion protect behavior/invariant rather than a private implementation shape?
3. **Realistic path** — Can the tested state occur through a supported runtime/configuration boundary, or is defensive synthetic-state coverage explicitly the purpose?
4. **Failure quality** — Would the test fail for the intended rule violation rather than an incidental crash, timeout or unrelated assertion?
5. **Boundary quality** — Where thresholds/ties/intervals matter, are just-outside / exact-boundary / just-inside cases represented?
6. **Determinism** — Are seed, initial state, simulation time and comparison horizon explicit where they matter?
7. **Coupling** — Is the test importing/reusing production helpers in a way that can make code and test agree on the same bug?
8. **Assertion strength** — Could the test pass vacuously because it only checks existence, broad ranges, snapshots of implementation output, or a result unrelated to the claimed rule?
9. **Evidence range** — Are tolerances and valid domains stated without upgrading sampled evidence into a universal claim?
10. **Maintenance value** — Would a plausible regression be easier to diagnose because this test exists, or is it mostly test-count/coverage churn?

A white-box read seam is acceptable when external stimulus travels through the real supported path but the test needs internal state only to observe the result. Mutating private state to manufacture a failure is not evidence of a product defect unless the task explicitly concerns defensive validation or that state can cross a real external boundary.

### PR evidence summary

A gameplay-authority PR does not need a ceremonial template, but its review trail should make the material evidence discoverable. State, as applicable:

- the gameplay rule/invariant changed;
- the independent source of the expected result;
- focused regression/boundary/partition/seed evidence;
- any coverage/mutation/browser/stability/performance/manual evidence actually required;
- the exact final-head CI result;
- known limits, deferred device checks or justified survivor classifications.

Do not list tools that were run if they do not support a material claim.

## Gate 1: coverage baseline

Run:

```bash
bun run test:coverage
```

`@vitest/coverage-istanbul@5.0.1` is a pinned devDependency and is recorded in `bun.lock`. The command itself only runs coverage; it does not install or mutate dependencies.

The coverage command explicitly invokes Vitest with Node:

```text
node ./node_modules/vitest/vitest.mjs run --coverage.enabled
```

A clean GitHub-runner probe in PR #373 / CI #956 confirmed the existing Vitest CLI also executed under Node 22.23.2 in that environment: `process.release.name === "node"` and `process.versions.bun === undefined`. This matters because `bun run` is a package-script launcher and respects a CLI's Node shebang unless Bun runtime execution is explicitly forced.

Istanbul remains the selected provider because it is runtime-independent and produces the branch-level instrumentation needed by the audit. The choice is not based on the false assumption that invoking the package script with Bun necessarily means Vitest itself runs in Bun.

## Coverage output

Gate 1 measures `src/**/*.ts` and excludes declaration-only `src/**/*.d.ts` files.

Reports:

- terminal text;
- `coverage/coverage-summary.json`;
- full `coverage/coverage-final.json`;
- browsable HTML under `coverage/`.

Explicit `include` is intentional: files that are never reached by the current Node test suite remain visible as blind spots instead of disappearing from the report.

Coverage is a **map**, not a correctness score. A covered line can still have a weak assertion, and a covered branch can still implement the wrong rule. Gate 1 therefore adds no arbitrary percentage threshold.

## Coverage CI

Normal PR CI remains:

1. Biome;
2. TypeScript;
3. Vitest;
4. production build.

Coverage is available separately through the manually triggered **Coverage audit** GitHub Actions workflow. It uses the locked dependency graph, runs coverage on an explicitly configured Node runtime, and uploads the full `coverage/` directory as an artifact.

The artifact includes:

- HTML/JSON coverage reports;
- commit SHA through `run-metadata.json`;
- Node runtime metadata;
- Bun version;
- the Vitest CLI shebang.

This keeps the coverage command continuously executable without imposing its extra cost on every PR.

## Gate 1 baseline

Clean GitHub runner evidence from PR #372 / CI #952:

| Scope | Statements | Branches | Functions | Lines |
| --- | ---: | ---: | ---: | ---: |
| All `src/**/*.ts` | 91.29% | 83.12% | 95.03% | 91.43% |
| `src/systems` | 88.43% | 86.34% | 94.56% | 88.54% |
| `src/hazards` | 90.81% | 85.97% | 97.58% | 90.75% |
| `src/generation` | 93.37% | 86.90% | 99.23% | 93.50% |
| `src/game/scenes` | 85.11% | 64.06% | 72.58% | 85.24% |

The same coverage run kept all **112 test files / 809 tests** green.

Normal Vitest on that runner took about **22.95 s**. The Istanbul coverage run took about **36.57 s**, before setup/build overhead. Coverage therefore remains a deliberate audit workflow rather than a default PR gate.

### First audit candidates

These are priorities for inspection, not proof that a bug or missing test exists:

| File | Statements | Branches | Functions | Lines | Why inspect |
| --- | ---: | ---: | ---: | ---: | --- |
| `src/systems/PrototypeCollectibles.ts` | 66.87% | 58.33% | 68.75% | 67.29% | pickup/death ordering and collectible broadphase are gameplay authority |
| `src/game/scenes/Foundation.ts` | 84.73% | 63.77% | 75.00% | integration/orchestration contains many runtime branches |
| `src/generation/CollectibleFormationGenerator.ts` | 85.84% | 67.85% | 100% | generated collectible behavior and formation validation |
| `src/hazards/PrototypeLaserHazard.ts` | 80.64% | 67.56% | 100% | hazard geometry/lifecycle boundaries |
| `src/generation/PrototypeLaserLaneCatalog.ts` | 80.82% | 64.44% | 94.44% | lane/catalog boundary cases |
| `src/systems/HazardCollision.ts` | 89.90% | 85.84% | 100% | high-risk collision authority despite relatively strong coverage |

Coverage alone does not determine priority. Gate work also considers gameplay impact, prior regressions, complexity, and assertion quality.

Useful stronger-coverage examples:

- `PrototypeRunSimulation.ts`: 100% statements/branches/functions/lines;
- `PrototypeGraze.ts`: 95.30% statements and 92.30% branches;
- `VerticalFlightSimulation.ts`: 94.90% statements and 93.23% branches.

Those values do not remove the need for independent reference cases or mutation testing.

Entry/browser wiring such as `src/main.ts` and `Boot.ts` appears at 0% under the Node suite. The browser/runtime-smoke gate owns that gap rather than padding it with low-value Node mocks.

## Sampling evidence limits

Gate 5's cross-subsystem evidence matrix, seed-preservation rule, and test-order/isolation audit are documented in [`TEST_QUALITY_GATE5_EVIDENCE_MATRIX.md`](TEST_QUALITY_GATE5_EVIDENCE_MATRIX.md).

A finer numerical sampler is not automatically a correctness oracle.

For rotating or otherwise numerically sampled collision:

- prefer exact analytical reference cases when they exist;
- retain known counterexamples permanently;
- state the time/geometry range a sampling comparison actually covers;
- do not claim general “no false negatives” from agreement with a finer sampler;
- do not treat agreement across 30/60/90/120/144 Hz as proof that all variants found every real contact.

Frame-partition evidence proves a defined determinism contract, not absolute physical correctness.

## Determinism contract

Gate 5 deterministic Collectibles evidence and the explicit terminal endpoint limitation are documented in [`TEST_QUALITY_DETERMINISM_GATE5.md`](TEST_QUALITY_DETERMINISM_GATE5.md).

Cross-frame-rate comparisons must specify:

- identical seed and initial state;
- equivalent inputs at the same **simulation times**, not merely the same frame numbers;
- the same comparison time/horizon;
- exact equality for discrete events, IDs, counts and rewards where the model promises exactness;
- documented numerical tolerances for continuous quantities where exact equality is not the contract.

Randomized failures must preserve the failing seed. Where practical, minimize/shrink the counterexample. Flake investigations should vary ordering and process/isolation conditions instead of relying only on repeated identical runs.

## Browser/runtime smoke

Gate 6's automated real-Chrome coverage is documented in [`TEST_QUALITY_BROWSER_RUNTIME_GATE6.md`](TEST_QUALITY_BROWSER_RUNTIME_GATE6.md).

This layer covers DOM, Phaser, canvas, browser input, resize and lifecycle integration that Node tests cannot establish. It remains separate from deterministic simulation authority, visual approval, real-device touch validation and performance profiling.

## Mutation-testing interpretation

The bounded Collectibles pilot, exact mutation ranges, reproducibility check, result classification and evidence are documented in [`TEST_QUALITY_STRYKER_GATE3.md`](TEST_QUALITY_STRYKER_GATE3.md).

Gate 4 survivor hardening, performance-work evidence and the remaining justified survivor set are documented in [`TEST_QUALITY_STRYKER_GATE4.md`](TEST_QUALITY_STRYKER_GATE4.md).

Gate 5 begins with independently solved Collectibles contact-time references documented in [`TEST_QUALITY_COLLISION_REFERENCE_GATE5.md`](TEST_QUALITY_COLLISION_REFERENCE_GATE5.md).

Mutation testing measures whether tests detect changes; it does not prove that the expected behavior is correct.

Every pilot report records separate counts for:

- killed by an assertion/test failure;
- survived;
- no coverage;
- timeout;
- compile error;
- runtime error;
- ignored/excluded with justification.

Timeouts are not interpreted the same way as assertion kills even if a mutation tool counts them as detected. Compile/runtime errors are reported separately rather than hidden behind a single score.

A surviving mutant is not automatically a missing test. Classify it first:

- **meaningful behavioral survivor** — likely test gap;
- **performance-only survivor** — validate with work counters/performance evidence;
- **equivalent within the valid domain** — document why behavior is unchanged;
- **invalid/out-of-domain mutation** — document or exclude narrowly.

For important killed mutants, confirm that the test failed for the expected gameplay rule rather than for an unrelated crash or incidental assertion.

## Collectibles audit procedure

Detailed Gate 2 contract, executed fault-injection evidence, exact commits and remaining limits are recorded in [`TEST_QUALITY_COLLECTIBLES_GATE2.md`](TEST_QUALITY_COLLECTIBLES_GATE2.md).

The first Gate 2 slice is intentionally small. Audit these rules before expanding scope:

1. **pickup boundary** — define analytically what counts as outside, exactly on the boundary, and inside;
2. **single award** — one collectible occurrence can increase reward/count at most once;
3. **death ordering** — when lethal contact precedes or coincides with pickup according to the game rule, state the expected outcome independently.

For each rule:

1. write the rule/oracle in the test or supporting documentation;
2. add the smallest focused behavioral test;
3. introduce a targeted temporary fault/mutation known to violate that rule;
4. verify the intended test fails for the intended reason;
5. remove the fault;
6. preserve any useful counterexample as a permanent regression case.

Each gate closes with the exact commit SHA, findings, test evidence, and remaining limitations.
