---
name: code-review
description: "Review an MGD diff, PR or branch, or a non-trivial code/config implementation before completion. Keep engineering standards and spec/runtime/evidence review separate, with supported-path checks."
---

# Code Review — MGD

Review the actual diff against a fixed baseline and the task that authorized it. [AGENTS.md](../../../AGENTS.md) and MGD's owning docs are authoritative; this skill supplies review procedure only.

Own engineering, spec/runtime and evidence review of the diff here; do not require an additional acceptance handoff. [mgd-acceptance](../mgd-acceptance/SKILL.md) leads acceptance-criteria assessment or evidence reconciliation when that is the requested outcome rather than a diff review.

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
3. the relevant durable product source such as [MASTER_SPEC.md](../../../MASTER_SPEC.md) or [docs/ROADMAP.md](../../../docs/ROADMAP.md).

### Engineering standards

Use the relevant parts of:

- [AGENTS.md](../../../AGENTS.md);
- [ARCHITECTURE.md](../../../ARCHITECTURE.md);
- [DEVELOPMENT's required verification](../../../DEVELOPMENT.md#3-required-verification);
- owning technical docs linked from [docs/README.md](../../../docs/README.md#source-ownership);
- [TEST_QUALITY's evidence matrix](../../../docs/TEST_QUALITY.md#evidence-selection-matrix) and [test-review checklist](../../../docs/TEST_QUALITY.md#test-review-checklist) when evaluating test evidence;
- existing code/tests as evidence of current patterns.

Skip style findings already enforced by Biome/typechecking unless the diff reveals a substantive design/correctness problem.

## 3. Review on two independent axes

When subagents are available, run the two axes independently/parallel so one conclusion does not bias the other. Otherwise keep them separate in the review.

### Axis A — Standards / engineering quality

Check every changed area for material issues involving:

- architecture ownership and seams;
- unnecessary abstraction, duplication or scope creep, including custom code where an existing capability meets the reuse criteria in `AGENTS.md` §7;
- deterministic time/randomness requirements;
- hot-path allocations or per-frame work;
- input/lifecycle handling;
- maintainability and integration quality;
- tests coupled to implementation details;
- obsolete/dead paths left behind by the change.

Use [codebase-design](../codebase-design/SKILL.md) when a finding depends on interface/seam quality.

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

Include reviewed head/base, actual checks/results and material unverified criteria with their reasons. Distinguish source inspection, executed behavior and explicit Director decisions.

## 5. Completion / re-review

After fixes, review the **new exact head**, not the old diff mentally. Re-check affected acceptance criteria and relevant CI/check results.

For missing refs/inputs, tool failures or failed checks, name the affected conclusion and cause. Correct only a supported cause within existing task authorization, then repeat affected checks. If no supported correction exists or the same cause persists without new evidence, stop that dependent path and continue independent review. A review-only request reports findings and correction directions; it does not itself authorize implementation fixes.

This skill never authorizes merging. Merge only when the current task explicitly grants that action under `AGENTS.md`.

Adapted for MGD from Matt Pocock's `code-review` skill (`mattpocock/skills`, MIT).