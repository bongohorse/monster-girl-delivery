---
name: tdd
description: "Use when implementing deterministic gameplay/application behavior or a reproducible bug fix that benefits from a regression test. Work in red-green-refactor vertical slices through meaningful public seams."
---

# Test-Driven Development — MGD

Use TDD where tests can protect real behavior or invariants. Do not use it to manufacture coverage for subjective game feel, rendering details that only manual/device evidence can prove, or impossible internal states.

`AGENTS.md`, the assigned Issue/PR, and MGD's owning architecture/testing rules take precedence.

## Choose the seam autonomously

A **seam** is the public boundary through which the behavior can be exercised without coupling the test to private implementation details.

Before writing a test, identify the narrowest meaningful seam that reaches the real behavior. The coding agent chooses this engineering seam autonomously from the codebase and architecture. Do not interrupt the Game Director for routine test-placement decisions; ask only if the choice would materially change architecture or product behavior.

Prefer seams that:

- survive internal refactors;
- expose observable behavior or a meaningful invariant;
- reach the same logic path production uses;
- allow deterministic time, PRNG, viewport or input control when those are relevant.

Do not test Phaser internals unless MGD depends on a specific integration contract.

## Red → green → refactor

Work one vertical slice at a time:

1. **Red** — write one focused test whose expected result comes from the Issue/spec, a known-good example, or another independent source of truth. Run it and confirm it fails for the intended missing/broken behavior.
2. **Green** — implement only the smallest coherent production change needed to make that slice work through the real runtime/integration path.
3. **Refactor** — simplify duplication/naming/structure only when it improves the in-scope change and preserves green behavior.
4. Repeat for the next independently valuable behavior.

Do not write a large horizontal batch of speculative tests before learning from the first slice.

## Test quality rules

Good MGD tests:

- describe behavior or meaningful invariants rather than private methods;
- remain valid if the internal implementation changes;
- use deterministic time and seeded randomness where applicable;
- exercise realistic supported states;
- fail when the protected behavior is actually broken.

Avoid:

- tautological assertions that recompute the implementation;
- mocks of internal collaborators merely to make a unit test convenient;
- assertions on private call counts or incidental structure;
- elaborate synthetic states normal runtime/validation cannot produce;
- tests whose only value is increasing a test count.

Mock or fake true external seams when necessary, but prefer lightweight real collaborators for internal deterministic logic.

## Bug fixes

For a reproducible defect, combine this skill with `diagnosing-bugs`:

```text
real repro → minimise → red regression test → fix → green → rerun original repro
```

If the correct seam cannot reproduce the bug honestly, do not force a shallow regression test that creates false confidence.

## Completion

During iteration, run the narrowest useful test command. Once implementation is stable, run the repository-required completion checks from `AGENTS.md` / `DEVELOPMENT.md`.

A passing test is evidence for the behavior it actually exercises; it is not proof of subjective feel, visual quality, touch ergonomics, or device lifecycle behavior outside that seam.

Adapted for MGD from Matt Pocock's `tdd` skill (`mattpocock/skills`, MIT).