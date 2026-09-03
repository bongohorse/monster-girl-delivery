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

## AI safety rule

An AI should not infer a feature merely because it was discussed historically. Use the current specification and current Issue.

Future ideas belong in backlog/issues until explicitly scheduled.

## Autonomous GitHub workflow

Default coding-agent flow:

```text
Issue → branch → implementation → checks → PR → CI → merge → close Issue
```

Agents may self-merge after required CI passes unless the Issue explicitly requests human approval.

If useful work is discovered outside the Issue scope, create a new Issue instead of expanding the current PR.

Jules and Renovate use their own GitHub App permissions. Codespace coding agents use the repository Git credential for Git operations and `GH_TOKEN` for GitHub CLI/API operations.
