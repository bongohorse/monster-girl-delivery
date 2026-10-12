---
name: writing-for-agents
description: "Use when creating or editing AGENTS.md, agent skills, worker/automation prompts, or other instructions primarily consumed by coding agents. Keep triggers sharp, canonical sources singular, and completion criteria checkable."
---

# Writing for Agents — MGD

Use this skill for instructions whose primary reader is an AI agent: `AGENTS.md`, `.agents/skills/*/SKILL.md`, worker prompts, scheduled-agent prompts, reviewer instructions and similar control documents.

The goal is predictable agent behavior with low always-loaded context. Use [AGENTS.md source precedence](../../../AGENTS.md#3-instruction-and-source-precedence) and the [documentation ownership map](../../../docs/README.md#source-ownership) when determining which rules the instruction must preserve.

## 1. Write sharp context pointers

A pointer is a short instruction that tells an agent **what document/skill exists and exactly when to load it**.

Good pointers:

- front-load the task/trigger concept;
- name materially different trigger branches rather than repeating synonyms;
- point to one canonical source instead of duplicating its rules;
- make mandatory cases explicit enough that an agent can tell whether the pointer fires.

Keep `AGENTS.md` small enough to remain useful on every turn. Put detailed procedures in skills or owning docs and link them from a concise trigger.

## 2. Separate always-needed steps from disclosed reference

Organize agent instructions by how often they are needed:

1. **Always-needed rule/step** — keep it in the primary file.
2. **Task-specific procedure/reference** — put it behind a clear pointer in a skill/doc.
3. **Rare branch/reference** — disclose it from the skill only when that branch is reached.

Do not hide a rule every execution path needs behind several layers of links. Do not inline a long reference that only one task type needs.

## 3. Give steps checkable completion criteria

Each procedure should make it possible to tell when the step is actually complete.

Prefer observable bounds such as:

- "every changed file reviewed against the Issue";
- "the original repro no longer fails";
- "all four required repository checks passed";
- "every created Issue has an independent outcome and acceptance criteria".

Avoid vague endings such as "make sure it is good" or "understand the code" when a concrete completion condition exists.

## 4. Preserve a single source of truth

Before adding a rule, determine who already owns it.

- Product/game decisions → `MASTER_SPEC.md`.
- Technical ownership → `ARCHITECTURE.md`.
- Validation/dev workflow → [DEVELOPMENT.md](../../../DEVELOPMENT.md#3-required-verification).
- Human/AI coordination → [docs/AI_WORKFLOW.md](../../../docs/AI_WORKFLOW.md#roles).
- Focused live work → current Issue/PR.
- Universal agent contract and skill triggers → `AGENTS.md`.
- Detailed reusable procedure → one skill.

Point to the owner instead of copying large blocks into Issues, prompts or other skills. Duplication increases context load and creates stale conflicting instructions.

For contradictory or outdated instructions, apply the [canonical conflict rule](../../../docs/README.md#conflict-rule): replace superseded guidance, but keep unresolved product decisions visible rather than inventing an answer.

## 5. Prefer positive target behavior

State what the agent should do, then add prohibitions only for important failure modes that need an explicit guardrail.

Example:

- Strong target: "Choose routine test seams autonomously from the existing architecture."
- Necessary guardrail: "Ask the Game Director only when the remaining choice materially changes product behavior or architecture."

This is more reliable than filling prompts with long lists of generic "do not" rules.

## 6. Skills: trigger narrowly, compose deliberately

A skill description should identify the distinct situations that should cause automatic loading. Keep the body procedural and reusable.

When a procedure depends on another skill, name that relation explicitly rather than copying the second skill's full rules.

MGD skills never override authorization/scope. `AGENTS.md` and owning docs always win.

## 7. Worker and automation prompts

For autonomous workers:

- define one role and one outcome boundary;
- state permitted actions from the [assigned task's authority](../../../AGENTS.md#1-core-operating-contract), allowing routine in-scope work without human micro-approval; a review/monitoring prompt must not add implementation or external write permissions;
- point to `AGENTS.md` instead of restating the repository contract;
- define what evidence marks success;
- define when to stop;
- make `NO ACTION` a valid result for monitoring/audit workers when nothing valuable is found;
- avoid prompts that reward producing more Issues/PRs/files regardless of value.

For reviewer workers, explicitly separate independent review concerns when bias between them would be harmful.

## 8. Prune no-ops and sediment

For every instruction, ask whether it changes agent behavior compared with existing MGD rules or normal tool behavior. Delete redundant prose and stale process history.

When editing an agent document, prefer replacing an obsolete rule over layering a new contradictory exception beneath it.

## Completion

Before finishing an agent-instruction change:

- trigger conditions are clear;
- canonical ownership is preserved;
- routine engineering work is not blocked on unnecessary user confirmation;
- completion/stop conditions are observable;
- detailed procedures live behind pointers instead of bloating always-loaded context;
- no new instruction silently expands product scope or permissions.

When a practical trial would materially validate changed branching or permission boundaries, give a separate executing agent the task and raw sources without expected answers or previous conclusions. Use isolated fixtures within the authorized scope; inspect actual actions and outputs, and distinguish text review, observed behavior and untested assumptions. Correct a concrete instruction failure and rerun the affected case; stop an unchanged failure without new evidence and report the limit. Scale this to risk rather than requiring trials for routine wording changes.

Adapted for MGD from Matt Pocock's `writing-for-agents` skill (`mattpocock/skills`, MIT).