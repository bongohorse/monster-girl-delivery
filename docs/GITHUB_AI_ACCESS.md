# GitHub AI Access

This project intentionally gives coding agents broad repository autonomy while keeping account-level secrets and administration outside normal agent access.

## Recommended model

- Codespace: development VM.
- Git: push branches/commits with the Codespaces repository token.
- `gh` CLI: use a repo-scoped fine-grained PAT stored as the Codespaces secret `MGD_GH_TOKEN`; the devcontainer exports it as `GH_TOKEN`.
- `main`: protected by a GitHub Ruleset. Agents work through PRs.
- CI: must pass before merge.
- Human review: optional, not required by default.

## Fine-grained PAT permissions

Create one token dedicated to this repository only.

Required:

| Permission | Access |
|---|---|
| Actions | Read and write |
| Commit statuses | Read and write |
| Contents | Read and write |
| Issues | Read and write |
| Pull requests | Read and write |
| Workflows | Write |

Fine-grained PATs do not provide a separate `Checks` permission. Use Actions access and `gh run` for CI status and logs. Commands that request check annotations or status rollups may return `403` even when workflow run and job results are readable.

Useful later:

| Permission | Access |
|---|---|
| Pages | Read and write |
| Deployments | Read and write |
| Discussions | Read and write |
| Repository projects | Read and write |

Do not grant by default:

- Administration
- Secrets
- Codespaces secrets
- Webhooks
- Security-advisory administration

The token should have access to **Monster Girl Delivery only**, not every repository on the account.

## What agents may do

Agents may, when relevant to an assigned task:

- read and modify repository files;
- create branches and commits;
- push branches;
- create, edit, label, comment on, and close Issues;
- create and update Pull Requests;
- inspect CI runs and logs;
- rerun failed Actions;
- edit workflow files when required by the task;
- merge their own PR after required checks pass, unless the Issue says human approval is required;
- create follow-up Issues for discovered work that is outside the current task.

Agents must not:

- force-push or delete `main`;
- weaken branch/ruleset protections to make a PR pass;
- expose or print secrets;
- change repository/account administration;
- silently change product decisions in `MASTER_SPEC.md`;
- merge a PR with failing required checks.

## Authentication inside Codespaces

Configure the fine-grained PAT as the Codespaces secret `MGD_GH_TOKEN`. The devcontainer adds `export GH_TOKEN="$MGD_GH_TOKEN"` to the shell environment, and GitHub CLI automatically uses `GH_TOKEN` when present.

Verify:

```bash
gh auth status
gh repo view
gh issue list --limit 5
gh pr list --limit 5
gh run list --limit 5
```

Git pushes can continue to use the Codespaces-provided Git credential for the current repository.
