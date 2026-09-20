# Test quality workflow

Umbrella: #371

Passing tests prove that the current expectations agree with the current implementation. They do not by themselves prove that the suite would detect plausible regressions. This workflow adds evidence about test effectiveness in small gates.

## Gate 1: coverage baseline

Run:

```bash
bun run test:coverage
```

The command installs `@vitest/coverage-istanbul@5.0.1` temporarily with Bun's `--no-save` option, then runs the normal Vitest suite with coverage enabled.

Why Istanbul:

- MGD runs its test command through Bun;
- Vitest's V8 coverage provider requires a V8 runtime and does not support Bun;
- Istanbul uses source instrumentation and is supported for this runtime setup;
- the provider version is pinned to the same `5.0.1` version as Vitest.

The temporary install deliberately does not alter `package.json` or `bun.lock`. Coverage is diagnostic tooling rather than a runtime/project dependency.

## What is included

Gate 1 measures `src/**/*.ts` and excludes declaration-only `src/**/*.d.ts` files.

The report includes:

- statements;
- branches;
- functions;
- lines.

Both a terminal summary and `coverage/coverage-summary.json` are produced. The `coverage/` directory is ignored by Git.

Explicit `include` is intentional: files that are never reached by the current Node test suite should remain visible as blind spots instead of disappearing from the report.

## What coverage does not prove

A covered line can still have weak assertions. A covered branch can still allow an important mutation to survive. High percentages therefore must not be treated as proof of correctness.

Gate 1 does **not** add pass/fail coverage thresholds. The baseline is used to locate risk, especially in collision, Graze, collectible, lifecycle, generation, motion and run-authority code. Gate 2 will turn important blind spots into focused behavioral tests.

## CI policy

Normal PR CI remains:

1. Biome;
2. TypeScript;
3. Vitest;
4. production build.

During Gate 1 only, PR CI temporarily executes `bun run test:coverage` once so the baseline can be captured from a clean GitHub runner. That temporary step is removed before merge after the numbers are documented in #371.

Coverage may become a persistent CI job later only if its runtime and signal justify the cost. Arbitrary global percentage thresholds are explicitly not a goal.

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

Normal Vitest on that runner took about **22.95 s**. The Istanbul coverage run took about **36.57 s**, before setup/build overhead. That extra cost is enough that Gate 1 does not make coverage part of normal PR CI.

### First high-value blind spots

These are diagnostic priorities for Gate 2, not automatic proof that a defect exists:

| File | Statements | Branches | Functions | Lines | Why inspect |
| --- | ---: | ---: | ---: | ---: | --- |
| `src/systems/PrototypeCollectibles.ts` | 66.87% | 58.33% | 68.75% | 67.29% | pickup/death ordering and collectible broadphase are gameplay authority |
| `src/game/scenes/Foundation.ts` | 84.73% | 63.77% | 75.00% | integration/orchestration contains many runtime branches |
| `src/generation/CollectibleFormationGenerator.ts` | 85.84% | 67.85% | 100% | generated collectible behavior and formation validation |
| `src/hazards/PrototypeLaserHazard.ts` | 80.64% | 67.56% | 100% | hazard geometry/lifecycle boundaries |
| `src/generation/PrototypeLaserLaneCatalog.ts` | 80.82% | 64.44% | 94.44% | lane/catalog boundary cases |
| `src/systems/HazardCollision.ts` | 89.90% | 85.84% | 100% | high-risk collision authority despite relatively strong coverage |

Useful counterexamples:

- `PrototypeRunSimulation.ts`: 100% statements/branches/functions/lines;
- `PrototypeGraze.ts`: 95.30% statements and 92.30% branches;
- `VerticalFlightSimulation.ts`: 94.90% statements and 93.23% branches.

Those stronger percentages do **not** remove the need for mutation testing; they only mean raw coverage finds fewer obvious holes there.

Entry/browser wiring such as `src/main.ts` and `Boot.ts` appears at 0% under the Node suite. That is expected to be handled by the later browser/runtime-smoke gate rather than padded with low-value Node mocks.
