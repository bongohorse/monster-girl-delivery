---
name: diagnosing-bugs
description: "Use for hard bugs, regressions, flaky failures, collision/physics/timing defects, or performance problems that need diagnosis before a fix. Build a tight reproduction loop before forming a theory."
---

# Diagnosing Bugs — MGD

Use this skill for defects where the cause is not already obvious from a compiler error or a single local mistake. `AGENTS.md`, the assigned Issue/PR, and MGD's owning docs always take precedence over this procedure.

The core rule is: **build a tight feedback loop that can go red on the reported bug before committing to a hypothesis or production fix.**

## 1. Establish a realistic red-capable loop

Start from the user's exact symptom and the real supported runtime path. Prefer, in order:

1. a focused failing Vitest test at the narrowest meaningful public seam;
2. an integration or deterministic gameplay harness;
3. a browser-driven reproduction when rendering/input/lifecycle is involved;
4. a replay, trace, fixture, differential run, or profiler measurement;
5. a structured manual/device reproduction only when automation cannot prove the symptom.

A useful loop is:

- **red-capable** — it detects this bug, not merely a nearby failure;
- **realistic** — it reaches the state through supported inputs/contracts rather than fabricated private state;
- **tight** — fast enough to run repeatedly;
- **deterministic** where possible — pin simulation time, seeded PRNG, viewport inputs, fixtures, and other sources of variation.

For flaky bugs, raise the reproduction rate with repeated/stress runs and controlled timing until the signal is useful.

Do not turn an impossible synthetic state into production work. Apply the Evidence and realism gate from `AGENTS.md` before treating a scenario as a defect.

## 2. Reproduce and minimise

Run the loop and confirm it produces the symptom the user described. Then remove inputs, callers, setup and state one element at a time until the smallest scenario that still fails remains.

For visual/game-feel/device issues, preserve the smallest manual scenario that still demonstrates the problem and separate what automation can prove from what requires human playtest evidence.

## 3. Form ranked falsifiable hypotheses

Only after the loop exists, create 3–5 plausible causes when the problem is genuinely ambiguous. Rank them by evidence and state what observation would falsify each one.

Do not stop to ask the Game Director to approve routine engineering hypotheses. Ask only when the remaining ambiguity is a real product/architecture decision under `AGENTS.md`.

## 4. Instrument narrowly

Test one hypothesis at a time.

Prefer debugger/inspection or targeted measurements over broad logging. For performance regressions, establish a repeatable baseline and profile/measure before changing code.

Temporary instrumentation must be clearly marked and removed before completion.

## 5. Lock the bug down and fix it

When a correct deterministic seam exists:

1. turn the minimised repro into a failing regression test;
2. observe it fail for the intended reason;
3. implement the smallest coherent fix through the real runtime path;
4. observe the regression test pass;
5. rerun the original, less-minimised reproduction.

If no honest automated seam can reproduce the defect, do not add a fake-confidence test. Document the validation method that actually proves the fix.

Use the `tdd` skill for the red/green implementation slice when appropriate, and `codebase-design` if the absence of a testable seam exposes a genuine design problem.

## 6. Completion gate

Before reporting the bug fixed:

- the original symptom no longer reproduces under the same relevant conditions;
- the regression test passes when one is justified;
- temporary debug instrumentation is removed;
- the real cause and fix are explainable from evidence, not guesswork;
- required repository checks from `AGENTS.md` / `DEVELOPMENT.md` are complete;
- manual/device validation is called out separately when it is still required.

Adapted for MGD from Matt Pocock's `diagnosing-bugs` skill (`mattpocock/skills`, MIT).