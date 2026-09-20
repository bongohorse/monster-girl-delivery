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

A finer numerical sampler is not automatically a correctness oracle.

For rotating or otherwise numerically sampled collision:

- prefer exact analytical reference cases when they exist;
- retain known counterexamples permanently;
- state the time/geometry range a sampling comparison actually covers;
- do not claim general “no false negatives” from agreement with a finer sampler;
- do not treat agreement across 30/60/90/120/144 Hz as proof that all variants found every real contact.

Frame-partition evidence proves a defined determinism contract, not absolute physical correctness.

## Determinism contract

Cross-frame-rate comparisons must specify:

- identical seed and initial state;
- equivalent inputs at the same **simulation times**, not merely the same frame numbers;
- the same comparison time/horizon;
- exact equality for discrete events, IDs, counts and rewards where the model promises exactness;
- documented numerical tolerances for continuous quantities where exact equality is not the contract.

Randomized failures must preserve the failing seed. Where practical, minimize/shrink the counterexample. Flake investigations should vary ordering and process/isolation conditions instead of relying only on repeated identical runs.

## Mutation-testing interpretation

The bounded Collectibles pilot, exact mutation ranges, reproducibility check, result classification and evidence are documented in [`TEST_QUALITY_STRYKER_GATE3.md`](TEST_QUALITY_STRYKER_GATE3.md).

Gate 4 survivor hardening, performance-work evidence and the remaining justified survivor set are documented in [`TEST_QUALITY_STRYKER_GATE4.md`](TEST_QUALITY_STRYKER_GATE4.md).

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
