# GitHub AI Access

[← Documentation Hub](README.md)

This document describes **authentication and technical repository permissions** for AI/coding tools working on Monster Girl Delivery.

It does **not** grant product authority or automatic permission to merge. Operational behavior is defined by [`../AGENTS.md`](../AGENTS.md), [`AI_WORKFLOW.md`](AI_WORKFLOW.md), repository protections, and the assigned task.

## Recommended model

- **Codespace:** development environment.
- **Git:** use the Codespaces-provided repository credential for normal branch/commit pushes where available.
- **GitHub CLI:** use a repository-scoped fine-grained PAT stored as Codespaces secret `MGD_GH_TOKEN`; the devcontainer exposes it as `GH_TOKEN`.
- **Main branch:** work through branches/PRs; do not bypass repository protections.
- **CI:** required checks must pass before a merge when those checks apply.

A technically permitted action is not automatically an authorized action for every task.

## Fine-grained PAT scope

Create a token dedicated to **`bongohorse/monster-girl-delivery` only**.

Typical required repository permissions for broad Issue/PR/Actions work:

| Permission | Access |
|---|---|
| Actions | Read and write |
| Commit statuses | Read and write |
| Contents | Read and write |
| Issues | Read and write |
| Pull requests | Read and write |
| Workflows | Write |

Fine-grained PATs do not expose every classic-token permission under the same names. CI inspection should primarily use Actions/workflow-run access (`gh run …`) rather than assuming every check-annotation endpoint is available.

Possible later permissions, only if a real task needs them:

| Permission | Access |
|---|---|
| Pages | Read and write |
| Deployments | Read and write |
| Discussions | Read and write |
| Repository projects | Read and write |

Do **not** grant by default:

- Administration
- Secrets
- Codespaces secrets administration
- Webhooks
- Security-advisory administration
- access to unrelated repositories

Use the least repository/account scope that still supports the approved workflow.

## What authenticated agents may technically do

When the assigned task and repository rules authorize it, an authenticated agent may be able to:

- read/modify repository files;
- create branches and commits;
- push branches;
- create/edit/comment on/close Issues;
- create/update Pull Requests;
- inspect CI runs/logs;
- rerun failed Actions;
- edit workflow files when that is part of the task;
- create follow-up Issues for useful out-of-scope discoveries;
- merge a PR **only when the active task/policy explicitly authorizes the agent to merge and required checks pass**.

## Prohibited actions

Agents must not:

- force-push or delete `main`;
- weaken branch/ruleset protections to make a change pass;
- expose, print, or commit secrets;
- silently change repository/account administration;
- silently change product decisions in `MASTER_SPEC.md`;
- merge with failing required checks;
- treat broad PAT capability as permission to perform unrelated repository changes.

## Authentication inside Codespaces

The devcontainer declares the Codespaces secret:

```text
MGD_GH_TOKEN
```

It exposes that value to GitHub CLI as:

```text
GH_TOKEN
```

The token value itself must never be stored in repository files.

Verify access inside a Codespace with non-secret commands such as:

```bash
gh auth status
gh repo view
gh issue list --limit 5
gh pr list --limit 5
gh run list --limit 5
```

Git pushes can continue to use the Codespaces-provided Git credential for the current repository where appropriate.

## Merge-policy reminder

This file defines **capability**, not workflow authority.

For coding agents, the default repository rule is:

> Implement the focused task, validate it, open/update the PR, and stop. Merge only when the assigned task explicitly includes merging.

See [`../AGENTS.md`](../AGENTS.md) and [`AI_WORKFLOW.md`](AI_WORKFLOW.md) for the operational rules.