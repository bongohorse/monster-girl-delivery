---
name: research
description: "Use when an MGD task needs a bounded external technical fact, version-specific Phaser/platform/API evidence, or reference-game evidence. Prefer primary sources, separate fact from inference, and preserve only useful durable findings."
---

# Research — MGD

Research is evidence for a decision or task; it is not independent authorization to implement, add a feature or change product direction. Routine internal code reading/review stays with the task's leading procedure.

Use the current Game Director instruction, assigned Issue/PR and [MGD source ownership](../../../docs/README.md#source-ownership) to define the question and load the relevant canonical rules before gathering sources.

## Source hierarchy

Prefer the source that actually owns the claim:

1. official documentation/specification/API contract;
2. upstream source code and tests;
3. first-party release notes/issues when behavior is version-specific;
4. direct evidence captured from the original/reference software when legitimately available;
5. high-quality secondary sources only to fill gaps or locate primary evidence.

For current/version-sensitive claims, establish the version actually used by the project/target from its manifest, lockfile, installed package or artifact as applicable, then match primary evidence to that version/revision/date. Current or unversioned documentation is a lead, not proof that the same behavior applies to an older target.

## Procedure

1. **State the decision question.** Identify what fact would change the implementation, diagnosis or design decision.
2. **Inspect MGD first.** Determine what the repo already assumes/implements so research answers the real gap rather than a generic question.
3. **Gather primary evidence.** Follow important claims back to the owning source. When multiple sources disagree, record the disagreement instead of blending them.
4. **Separate fact from inference.** Mark what the source directly proves, what is an interpretation, and what remains unknown.
5. **Map findings to MGD.** Explain the concrete implication for the current task while respecting [product decision states](../../../MASTER_SPEC.md#0-decision-states), [technical ownership](../../../ARCHITECTURE.md#3-ownership-model) and the [reference-adoption rules](../../../docs/AI_WORKFLOW.md#research-and-reference-adoption).
6. **Preserve only durable value.** Prefer useful cited findings in the existing Issue/PR. Create a repository report only when the task requires it or a justified reusable reference cannot be served by that record. For one-off lookup work, return the findings without creating documentation sediment.

If a source is missing, inaccessible or insufficient, report the access outcome and affected claim; try supported alternatives such as versioned upstream source, release notes or available captures, stating their narrower evidence scope. After correcting a retrieval/query problem, recheck the affected source; stop that search path when the same unresolved cause yields no new evidence. Complete the bounded result with answered parts, unresolved claims and the minimum missing source/observation. Do not invent source contents, visual/runtime observations or unsupported implementation recommendations.

When subagents are available, independent research streams may run in parallel. The primary agent remains responsible for reconciling evidence and producing one conclusion.

## Evidence standard

A useful research result includes:

- the exact source and relevant version/date, identifying live inspection, cached excerpts or source fixtures;
- the claim the source supports;
- uncertainty or limitations;
- the MGD implication;
- no unsupported leap from "another project does this" to "MGD should implement this".

For reverse-engineering/reference-game work, preserve observations and technical evidence without copying proprietary source/assets into MGD unless licensing explicitly permits it.

Adapted for MGD from Matt Pocock's `research` skill (`mattpocock/skills`, MIT).