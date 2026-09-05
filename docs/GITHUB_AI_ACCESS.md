# GitHub AI Access

[← Documentation Hub](README.md)

This document describes **authentication and technical repository permissions** for AI/coding tools working on Monster Girl Delivery.

It does **not** grant product authority or automatic permission to merge. Operational behavior is defined by [`../AGENTS.md`](../AGENTS.md), [`AI_WORKFLOW.md`](AI_WORKFLOW.md), repository protections, and the assigned task. Jules-specific operating rules live in [`JULES_WORKFLOW.md`](JULES_WORKFLOW.md).

## Recommended model

- **Codespace:** development environment for Codex/CLI-style agents and manual repository work.
- **Git:** use the Codespaces-provided repository credential for normal branch/commit pushes where available.
- **GitHub CLI in Codespaces:** use a repository-scoped fine-grained PAT stored as Codespaces secret `MGD_GH_TOKEN`; the devcontainer exposes it as `GH_TOKEN`.
- **Jules:** use the authorized Jules GitHub App for native Issue/PR integration; do not give Jules the Codespaces PAT by default.
- **Main branch:** work through branches/PRs; do not bypass repository protections.
- **CI:** required checks must pass before a merge when those checks apply.

A technically permitted action is not automatically an authorized action for every task.

## Fine-grained PAT scope

Create a token dedicated to **`bongohorse/monster-girl-delivery` only**.

Typical required repository permissions for broad Issue/PR/Actions work in Codespaces/CLI environments:

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

## Jules GitHub App model

Jules uses its own GitHub App integration and should remain separate from the Codespaces PAT model.

Current preferred MGD flow:

```text
ready focused GitHub Issue
→ apply label `jules`
→ Jules starts the task from the Issue
→ Jules comments on the Issue
→ Jules publishes/links a Pull Request
→ review + CI
→ targeted `@Jules` PR feedback when needed
```

Important distinctions:

- `ai:coder` means an Issue is generally suitable for a coding agent.
- `jules` is the native Jules dispatch trigger and should be applied only when that Issue is actually ready for Jules.
- the Jules GitHub App must be authorized for this repository.
- broad technical access does not let Jules override Issue scope, `AGENTS.md`, product decisions, or merge policy.

For PR feedback, prefer Jules **Reactive Mode** so Jules acts only when explicitly mentioned with `@Jules`. This avoids ordinary review discussion triggering unsolicited code changes.

Do not put `MGD_GH_TOKEN`, `GH_TOKEN`, or another repository PAT into the Jules environment unless a concrete approved capability cannot be achieved through the native Jules integration and the security trade-off has been explicitly accepted.

Native Jules integration should be preferred over teaching a Jules task to script GitHub administration through `gh`.

See [`JULES_WORKFLOW.md`](JULES_WORKFLOW.md) for dispatch, review, trust, concurrency, scheduled-task, and environment rules.

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

Do not assume every agent environment exposes every GitHub API operation merely because another environment does. Prefer each agent's documented/native integration path.

## Prohibited actions

Agents must not:

- force-push or delete `main`;
- weaken branch/ruleset protections to make a change pass;
- expose, print, or commit secrets;
- silently change repository/account administration;
- silently change product decisions in `MASTER_SPEC.md`;
- merge with failing required checks;
- treat broad PAT/App capability as permission to perform unrelated repository changes.

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

## Jules environment credentials

Default MGD policy for Jules:

- no repository secrets/environment variables unless a task truly requires them;
- no Codespaces PAT by default;
- use the Jules GitHub App for Issue/PR integration;
- keep credentials out of prompts, logs, code, and review comments;
- network access may be enabled for documentation/package/research access without adding repository credentials.

The Jules environment setup itself is documented in [`JULES_WORKFLOW.md`](JULES_WORKFLOW.md) and should pin the Bun version from `.bun-version` rather than modifying `bun.lock` to match a stale preinstalled toolchain.

## Merge-policy reminder

This file defines **capability**, not workflow authority.

For coding agents, the default repository rule is:

> Implement the focused task, validate it, open/update the PR, and stop. Merge only when the assigned task explicitly includes merging.

For Jules, CI auto-fixing or successful task completion does not change that rule.

See [`../AGENTS.md`](../AGENTS.md), [`AI_WORKFLOW.md`](AI_WORKFLOW.md), and [`JULES_WORKFLOW.md`](JULES_WORKFLOW.md) for the operational rules.