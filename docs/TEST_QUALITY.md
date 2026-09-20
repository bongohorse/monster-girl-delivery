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
