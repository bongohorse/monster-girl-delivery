---
name: code-review
description: "Use to review an MGD PR, branch or implementation before declaring it complete. Review the diff separately for engineering standards and for spec/runtime correctness, with evidence and reachability checks."
---

# Code Review — MGD

Review the actual diff against a fixed baseline and the task that authorized it. `AGENTS.md` and MGD's owning docs are authoritative; this skill supplies review procedure only.

## 1. Pin the review target

Resolve the exact head and comparison base before reviewing.

- For a PR, use its base branch / merge-base and review the exact current head.
- For a task branch without a PR, compare against the branch it is intended to merge into, normally `main`.
- If the user supplied a commit/tag/baseline, use that.

Do not ask the user for a baseline when the repository/PR already makes it unambiguous.

Inspect both the diff and commit/PR context. A green CI run is evidence, not a substitute for review.

## 2. Identify authoritative sources

### Spec / task intent

Use, in order:

1. the current explicit Game Director instruction;
2. the assigned Issue / PR acceptance criteria and discussion;
3. the relevant durable product source such as `MASTER_SPEC.md` or `docs/ROADMAP.md`.

### Engineering standards

Use the relevant parts of:

- `AGENTS.md`;
- `ARCHITECTURE.md`;
- `DEVELOPMENT.md`;
- owning technical docs linked from `docs/README.md`;
- existing code/tests as evidence of current patterns.

Skip style findings already enforced by Biome/typechecking unless the diff reveals a substantive design/correctness problem.

## 3. Review on two independent axes

When subagents are available, run the two axes independently/parallel so one conclusion does not bias the other. Otherwise keep them separate in the review.

### Axis A — Standards / engineering quality

Check every changed area for material issues involving:

- architecture ownership and seams;
- unnecessary abstraction, duplication or scope creep;
- deterministic time/randomness requirements;
- hot-path allocations or per-frame work;
- input/lifecycle handling;
- maintainability and integration quality;
- tests coupled to implementation details;
- obsolete/dead paths left behind by the change.

Use `codebase-design` when a finding depends on interface/seam quality.

Treat generic code smells as heuristics, not automatic blockers. MGD's documented architecture and concrete runtime needs win over abstract style preferences.

### Axis B — Spec / runtime / evidence

Check whether the change actually delivers the authorized outcome:

- every acceptance criterion is complete;
- required behavior is wired into the real runtime path, not only represented by a helper/test/scaffold;
- the diff does not add behavior that was not authorized;
- claimed bug scenarios are reachable through supported inputs/contracts;
- tests model realistic behavior and would fail for the regression they claim to protect;
- automated evidence is not being used to claim subjective game feel or visual/device correctness;
- manual/device validation requirements are stated honestly when automation cannot prove them.

For AI-generated findings, demand an exact call path, reproduction, failing test, trace, or other concrete evidence before treating speculative hardening as a blocker.

## 4. Severity and output

Prioritize findings that can materially affect:

1. correctness / acceptance criteria;
2. gameplay behavior or fairness;
3. determinism / performance / lifecycle reliability;
4. architecture ownership and maintainability;
5. meaningful test quality.

Do not block a PR on personal taste, naming preference, optional cleanup, or hypothetical future needs.

Report findings with:

- severity;
- file/area;
- concrete evidence;
- why it violates a task/standard/runtime invariant;
- the smallest useful corrective direction.

Keep the Standards and Spec/Runtime conclusions distinct. If there are no material findings, say so rather than inventing review work.

## 5. Completion / re-review

After fixes, review the **new exact head**, not the old diff mentally. Re-check affected acceptance criteria and relevant CI/check results.

This skill never authorizes merging. Merge only when the current task explicitly grants that action under `AGENTS.md`.

Adapted for MGD from Matt Pocock's `code-review` skill (`mattpocock/skills`, MIT).