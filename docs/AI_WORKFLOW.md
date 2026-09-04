# AI Workflow

[← Documentation Hub](README.md)

This document owns the **human ↔ AI orchestration model** for Monster Girl Delivery. Coding-agent rules live in [`../AGENTS.md`](../AGENTS.md); GitHub authentication/permissions live in [`GITHUB_AI_ACCESS.md`](GITHUB_AI_ACCESS.md).

## Roles

### Game Director / Product Owner

Owns:

- product decisions;
- game feel;
- scope and priorities;
- acceptance/rejection;
- manual playtest evidence;
- promotion of future ideas into approved scope.

The Game Director is the final authority on what the game should become.

### AI coordinator / reviewer

May help with:

- design/research;
- architecture/technical strategy;
- roadmap/task breakdown;
- GitHub Issue/PR organization;
- reviewing diffs and CI;
- documentation maintenance;
- milestone closeout/history;
- merge/repository coordination when the user's task explicitly includes that role.

The coordinator must preserve source ownership and the Game Director's product authority.

### Coding agent

Examples include Codex, Claude Code, Gemini CLI, Jules, or another repository-aware implementation agent.

A coding agent implements **one approved focused task at a time** by default and follows [`../AGENTS.md`](../AGENTS.md).

It must not expand product scope or automatically continue into the next independent Issue.

### GitHub Actions

Automated validation. Green CI means the configured checks passed; it does not itself prove product acceptance or authorize a scope change.

### Renovate

Owns routine dependency-update PRs only.

---

## Documentation routing

Use [`README.md`](README.md) as the canonical map.

Key sources:

- `../MASTER_SPEC.md` — durable product/game decisions;
- `ROADMAP.md` — milestone sequencing;
- current GitHub Issue / PR — focused live scope;
- `../ARCHITECTURE.md` — technical boundaries;
- `../DEVELOPMENT.md` — commands, validation, CI/PR mechanics, closeout process;
- `BACKLOG.md` — future ideas only;
- `ENDLESS_RUNNER_BLUEPRINT.md` — design reference only;
- `milestones/` — completed factual history.

Do not infer implementation scope from an idea/reference document.

---

## Task format

A focused coding task should state:

1. Goal
2. Context
3. Scope
4. Acceptance criteria
5. Explicit non-goals
6. Required checks
7. Dependencies when relevant

## Milestone planning

Milestones and large parent Issues are planning containers, not default implementation units.

Before coding a large milestone:

- split independently reviewable responsibilities into focused child Issues;
- give each child explicit acceptance criteria;
- record dependencies/order where relevant;
- obtain Game Director approval for the milestone plan before automatically starting implementation, unless the Director explicitly asked for planning + execution in one task.

## Default implementation unit

```text
one focused Issue
→ one branch
→ one Pull Request
→ verification
→ stop
```

Multiple independent sub-issues should not be bundled into one agent run/PR unless the Game Director explicitly asks for that combined operation.

Useful discoveries outside scope become follow-up Issues/backlog notes rather than silent PR expansion.

---

## Scope safety

An AI must not infer a feature merely because it:

- appeared in an old discussion;
- exists in `BACKLOG.md`;
- appears in a design reference;
- exists in a future roadmap milestone;
- would make implementation easier.

If documentation appears contradictory, apply the ownership rules in [`README.md`](README.md). Surface real conflicts rather than choosing the convenient source.

---

## Implementation flow

Default coding-agent flow:

```text
approved focused Issue
→ branch
→ inspect existing implementation/tests
→ implement smallest coherent change
→ run required checks
→ open/update PR
→ stop
```

An implementation agent merges only when its assigned task **explicitly includes merging** and required checks pass.

## Coordination / review flow

```text
PR
→ verify intended scope
→ inspect diff
→ verify exact-head CI
→ evaluate acceptance criteria
→ request/fix blockers if needed
→ merge when explicitly authorized
→ verify main / Issue state when relevant
```

Human review may be required by the task/repository policy; CI never substitutes for product acceptance.

---

## Milestone closeout flow

```text
milestone implementation complete
        ↓
required manual/device validation
        ↓
blocker fixes + retest if needed
        ↓
factual milestone closeout report
        ↓
close/transition milestone planning state
        ↓
promote next milestone
```

Closeout mechanics and required report contents are defined in [`../DEVELOPMENT.md`](../DEVELOPMENT.md). Historical reports belong in `milestones/` and record what actually happened.

---

## GitHub access

Authentication mechanisms may differ by agent/environment. See [`GITHUB_AI_ACCESS.md`](GITHUB_AI_ACCESS.md).

That document describes **technical permission capability**, not automatic authorization to perform every permitted action.

Never expose tokens, weaken repository protections, or change account/repository administration merely to make automation easier.