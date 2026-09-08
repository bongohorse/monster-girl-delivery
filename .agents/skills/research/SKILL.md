---
name: research
description: "Use when an MGD task depends on external technical facts, Phaser/platform/API behavior, reference-game evidence, or source investigation. Prefer primary sources, separate fact from inference, and preserve durable findings only when they matter to future work."
---

# Research — MGD

Research is evidence for a decision or task; it is not independent authorization to add a feature or change product direction.

Use the current Game Director instruction, assigned Issue/PR and MGD canonical docs to define the question before gathering sources.

## Source hierarchy

Prefer the source that actually owns the claim:

1. official documentation/specification/API contract;
2. upstream source code and tests;
3. first-party release notes/issues when behavior is version-specific;
4. direct evidence captured from the original/reference software when legitimately available;
5. high-quality secondary sources only to fill gaps or locate primary evidence.

For current/version-sensitive claims, verify the version/date rather than relying on remembered behavior.

## Procedure

1. **State the decision question.** Identify what fact would change the implementation, diagnosis or design decision.
2. **Inspect MGD first.** Determine what the repo already assumes/implements so research answers the real gap rather than a generic question.
3. **Gather primary evidence.** Follow important claims back to the owning source. When multiple sources disagree, record the disagreement instead of blending them.
4. **Separate fact from inference.** Mark what the source directly proves, what is an interpretation, and what remains unknown.
5. **Map findings to MGD.** Explain the concrete implication for the current task while respecting `MASTER_SPEC.md`, `ARCHITECTURE.md` and scope boundaries.
6. **Preserve only durable value.** Write a cited Markdown report in the repo when the task explicitly requires durable research, when future agents need the evidence, or when the finding becomes part of a tracked decision. For one-off lookup work, return the findings without creating documentation sediment.

When subagents are available, independent research streams may run in parallel. The primary agent remains responsible for reconciling evidence and producing one conclusion.

## Evidence standard

A useful research result includes:

- the exact source and relevant version/date;
- the claim the source supports;
- uncertainty or limitations;
- the MGD implication;
- no unsupported leap from "another project does this" to "MGD should implement this".

For reverse-engineering/reference-game work, preserve observations and technical evidence without copying proprietary source/assets into MGD unless licensing explicitly permits it.

Adapted for MGD from Matt Pocock's `research` skill (`mattpocock/skills`, MIT).