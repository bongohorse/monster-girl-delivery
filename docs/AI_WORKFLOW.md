# AI WORKFLOW

## Roles

### Game Director

Owns:
- product decisions;
- game feel;
- scope;
- priorities;
- acceptance/rejection.

### Gemini / Chat AI

Advises on:
- game design;
- architecture;
- technical strategy;
- task breakdown;
- prompts;
- reviews;
- research.

It does not modify the repository in this role.

### Claude Code / Gemini CLI

Implements focused repository tasks.

### Google Jules

Autonomous repository-aware agent. Use for clearly scoped Issues/PRs, refactors, fixes, documentation, and suggestions.

### Renovate

Dependency update automation only.

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

## AI safety rule

An AI should not infer a feature merely because it was discussed historically. Use the current specification and current Issue.

Future ideas belong in backlog/issues until explicitly scheduled.

## Autonomous GitHub workflow

Default coding-agent flow:

```text
Approved sub-issue → branch → implementation → checks → PR → stop
```

Review, CI, merge, and Issue closure follow separately. An implementation agent merges only when its assigned task explicitly includes merging.

If useful work is discovered outside the Issue scope, create a new Issue instead of expanding the current PR.

Jules and Renovate use their own GitHub App permissions. Codespace coding agents use the repository Git credential for Git operations and the `MGD_GH_TOKEN` Codespaces secret, exported by the devcontainer as `GH_TOKEN`, for GitHub CLI/API operations.
