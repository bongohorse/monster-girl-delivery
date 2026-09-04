# AI WORKFLOW

[← Documentation Hub](README.md)

This document describes how human direction, AI coordination/review, coding agents, GitHub, and automation fit together.

## Roles

### Game Director / Product Owner

Owns:
- product decisions;
- game feel;
- scope;
- priorities;
- acceptance/rejection;
- manual playtest evidence.

The Game Director is the final authority on what the game should become.

### AI coordinator / reviewer

May help with:
- game design and research;
- architecture and technical strategy;
- roadmap and task breakdown;
- GitHub Issue/PR organization;
- reviewing diffs and CI;
- documenting decisions and milestone history;
- merging reviewed work when explicitly acting in that role and the required checks pass.

When connected GitHub tools are available, this role may modify repository metadata or documentation as requested. It must still preserve the Game Director's product authority and the focused Issue/PR workflow.

### Coding agent

Examples include Codex, Claude Code, Gemini CLI, Jules, or another repository-aware implementation agent.

The coding agent implements **one approved focused task at a time**. It should not expand product scope or start the next Issue automatically.

### Renovate

Dependency update automation only.

### GitHub Actions

Automated validation. A green workflow proves configured checks passed; it does not replace product review or manual playtesting.

## Documentation routing

Before deciding scope, use [`README.md`](README.md) to identify the correct source:

- `../MASTER_SPEC.md` — product/game decisions;
- `ROADMAP.md` — milestone sequencing;
- current GitHub Issue — focused implementation scope;
- `../ARCHITECTURE.md` — technical boundaries;
- `../DEVELOPMENT.md` — commands and workflow;
- `BACKLOG.md` / `ART_DIRECTION_IDEAS.md` — preserved future ideas only;
- `milestones/` — factual completed history.

## Task format

Every coding task should state:

1. Goal
2. Context
3. Scope
4. Acceptance criteria
5. Explicit non-goals
6. Required checks

## Milestone planning

Milestones and large Issues are planning containers, not implementation tasks. Before coding, split them into small GitHub sub-issues. Each sub-issue should have one clear responsibility, explicit acceptance criteria, and preferably an independently testable result. Record dependencies between sub-issues where relevant.

If a task contains multiple independently reviewable systems, split it before implementation. After creating a milestone plan, stop and wait for Game Director approval; do not begin the first sub-issue automatically.

## Implementation unit

The default unit of work is:

```text
one sub-issue → one branch → one pull request
```

Do not implement multiple independent sub-issues in one agent run unless the Director explicitly instructs you to. Put out-of-scope discoveries in separate backlog items or Issues rather than expanding the current task. After completing the assigned sub-issue and pull request, the implementation agent stops.

## AI scope safety rule

An AI should not infer a feature merely because it was discussed historically or preserved in an idea file.

Future ideas belong in backlog/issues until explicitly promoted by the Game Director into approved scope.

If documentation appears contradictory, use the ownership rules in [`README.md`](README.md). Do not silently resolve a real product conflict by choosing the convenient source.

## Autonomous GitHub workflow

Default coding-agent flow:

```text
Approved sub-issue → branch → implementation → checks → PR → stop
```

Default coordination/review flow:

```text
PR → inspect scope/diff → verify exact-head CI → review decision → merge when appropriate → verify main CI → verify Issue state
```

An implementation agent merges only when its assigned task explicitly includes merging.

If useful work is discovered outside the Issue scope, create or propose a new Issue instead of expanding the current PR.

## Milestone closeout flow

Before moving to the next milestone:

```text
implementation complete
  ↓
required manual/device validation
  ↓
blocker fixes + retest if needed
  ↓
factual milestone closeout report
  ↓
close milestone parent
  ↓
unblock/promote next milestone
```

Historical reports belong in `milestones/` and must record what actually happened, not what the plan originally hoped would happen.

## GitHub access

Jules, Codex, and other agents may use different authentication mechanisms. See [`GITHUB_AI_ACCESS.md`](GITHUB_AI_ACCESS.md) for the repository's Codespaces/GitHub access setup.

Never expose tokens or weaken repository protections simply to make automation easier.
