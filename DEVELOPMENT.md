# Development — Monster Girl Delivery

This document owns **development commands, validation, environment setup, PR workflow, and milestone closeout mechanics**.

For product/game rules see [`MASTER_SPEC.md`](MASTER_SPEC.md). For architecture boundaries see [`ARCHITECTURE.md`](ARCHITECTURE.md). Coding agents must also follow [`AGENTS.md`](AGENTS.md).

## 1. Environment

Primary remote environment: **GitHub Codespaces**.

Local development requires:

- Git;
- Bun.

The repository's `.devcontainer/` defines the shared environment for Codespaces and local VS Code Dev Containers, including Windows 11 with WSL Containers (WSLC). Both use the same configuration; the container runtime path is a local VS Code user setting.

## 2. Standard commands

```bash
bun install
bun run dev
bun run build
bun run preview
bun run check
bun run ci:check
bun run typecheck
bun run test
```

Current package scripts:

| Command | Purpose |
|---|---|
| `bun run dev` | Start the Vite development server and development-only Director tooling |
| `bun run build` | Create the production build |
| `bun run preview` | Serve the production build locally |
| `bun run check` | Run Biome with local fixes |
| `bun run ci:check` | Run non-modifying Biome CI validation |
| `bun run typecheck` | Run `tsc --noEmit` |
| `bun run test` | Run Vitest once |

The project standard is **Vitest**; do not substitute `bun test` for the documented test command.

## 3. Required verification

Before reporting a code/configuration task complete, run:

```bash
bun run ci:check
bun run typecheck
bun run test
bun run build
```

For documentation-only changes that cannot affect runtime/build behavior, run applicable documentation checks and the assigned Issue's validation; compilation and game tests are not required.

If a check cannot be run, report exactly which check and why.

A green build/check suite is engineering evidence. It does not replace Game Director acceptance or required manual/device testing.

## 4. Development and production preview

Normal development:

```bash
bun run dev
```

The configured Vite server listens on the network and uses port `8080`, enabling Codespaces preview and real-device browser testing.

Production preview:

```bash
bun run build
bun run preview
```

Director/dev tools are development-only and should not be treated as production gameplay.

## 5. Shared devcontainer: Codespaces and local Windows

The repository contains `.devcontainer/devcontainer.json`, `post-create.sh`, and `post-start.sh`.

Creating the environment:

1. starts from the Ubuntu 24.04 devcontainer base;
2. provides Git and GitHub CLI;
3. provides the Ubuntu-supported Python runtime through the official devcontainer Python feature without installing its Python/Pylance/autopep8 VS Code extensions;
4. trusts only the actual mounted workspace via Git `safe.directory`;
5. installs the Bun version from `.bun-version` and project dependencies with `bun install --frozen-lockfile`;
6. installs the latest Codex CLI and Google Antigravity CLI as optional coding-agent tools;
7. runs a production build before reporting the development environment ready;
8. forwards port `8080` for Vite preview/testing.

The post-create script reports six numbered setup steps with elapsed time. In an interactive terminal it also displays a spinner. Required failures print the last captured output and stop setup; optional coding-agent tool failures warn and continue. Per-step logs are retained under `${TMPDIR:-/tmp}/mgd-devcontainer-setup` (normally `/tmp/mgd-devcontainer-setup`). The start hook configures the workspace trust and shell profiles on creation and subsequent starts; repeated execution does not add duplicate trust entries or profile lines.

The only project-requested VS Code extension is Biome. Codespaces and VS Code may still provide platform/built-in extensions or the selected display-language pack. Antigravity can be launched with `agy` after successful installation. Tool authentication remains user-specific and is not stored in the repository.

Graphify is installed only on demand; see the [Graphify skill](.agents/skills/graphify/SKILL.md) for installation and the normal repository-search fallback. It is not a prerequisite for container setup or repository work.

### Codespaces

Create a Codespace from the desired repository branch and allow post-create setup to finish. Use the forwarded port `8080` after starting `bun run dev`.

For reproducible project isolation, keep Codespaces **Settings Sync** and automatic **dotfiles** disabled for this workflow. Settings Sync can otherwise inject extensions and UI state from unrelated projects into a fresh Codespace.

### Local Windows 11 with WSLC and VS Code Dev Containers

Microsoft documents `wslc.exe` as the WSL container CLI and requires WSL 2.9.3 or newer; check with `wsl --version` and `wslc version` in PowerShell. Follow the current [Microsoft WSL container instructions](https://learn.microsoft.com/en-us/windows/wsl/tutorials/wsl-containers) for installation/update requirements.

Microsoft's [WSLC announcement](https://devblogs.microsoft.com/commandline/wsl-container-is-now-available-for-public-preview/#vs-code-dev-containers) documents Dev Containers support introduced in `0.462.0-pre-release` and selecting WSLC through **Docker Path**. Use a Dev Containers extension version with that support. This documents the integration entry point, not a claim that every Docker workflow is supported.

For the established local MGD setup:

1. Keep the working VS Code **user** setting unchanged:

   ```json
   "dev.containers.dockerPath": "C:\\Program Files\\WSL\\wslc.exe"
   ```

   Do not put this Windows host path into the shared `devcontainer.json`.
2. Open the local repository folder in Windows VS Code. For a new clone, `git clone --config core.autocrlf=false https://github.com/bongohorse/monster-girl-delivery.git` keeps the Linux tooling checkout in LF form. Existing Windows checkouts may contain CRLF in file types without explicit `eol=lf` attributes; Biome can report those as formatting errors even when Git reports a clean tree.
3. Run **Dev Containers: Reopen in Container**, then wait for setup to finish. The container workspace path is chosen by Dev Containers; setup derives it from the script location rather than assuming `/workspaces/monster-girl-delivery`.
4. Authenticate inside the container as described below, then start `bun run dev` and open the forwarded port `8080`.

### GitHub CLI authentication

The optional Codespaces secret `MGD_GH_TOKEN` is mapped to `GH_TOKEN` in Bash startup profiles **only when non-empty**. When absent or empty, setup preserves any existing `GH_TOKEN` and otherwise leaves it unset. The hook also removes the old unconditional MGD export from those profiles when upgrading an existing container.

Locally, without an environment token, run `gh auth login` and then `gh auth status` in a new container terminal; no preceding `unset GH_TOKEN` is required by this configuration. An intentionally supplied `GH_TOKEN` or `GITHUB_TOKEN` still takes precedence over stored credentials, as documented by [GitHub CLI](https://cli.github.com/manual/gh_help_environment). [Interactive login](https://cli.github.com/manual/gh_auth_login) stores authentication for subsequent commands.

Do not store tokens in repository files or `devcontainer.json` values. See [`docs/GITHUB_AI_ACCESS.md`](docs/GITHUB_AI_ACCESS.md) for the Codespaces permission/authentication model.

### Feature lockfile

The committed `.devcontainer/devcontainer-lock.json` pins the configured GitHub CLI feature (`1.1.3`) and Python feature (`1.8.0`) to their OCI SHA-256 digests. Its entries were checked against registry manifests and feature metadata and contain no credentials or host paths. This follows the [Dev Containers feature-lockfile specification](https://github.com/devcontainers/spec/blob/main/docs/specs/devcontainer-lockfile.md). It locks feature packages, not the base-image tag, installed CLI binaries, or OS packages.

### Rebuild acceptance checklist

A real Windows/WSLC rebuild must be performed on the Windows host; shell/configuration checks inside an existing container cannot prove it. On the PR branch:

1. Confirm the working Docker Path above, then run **Dev Containers: Rebuild Container** and inspect **Dev Containers: Show Container Log**. This restarts the development environment; run it when ready.
2. Confirm all six setup steps finish, Codex/Antigravity either install or report their optional failure clearly, and no Graphify installation is attempted. Inspect `/tmp/mgd-devcontainer-setup` if needed.
3. In a new terminal, run `git status` and `git config --global --get-all safe.directory`; confirm the actual workspace is trusted and setup did not add `*`. Run `bun --version`, `codex --version`, and `agy --version` (if their optional installation succeeded).
4. Without `MGD_GH_TOKEN` and without an intentionally supplied environment token, verify that `GH_TOKEN` is unset without printing credentials: `test "${GH_TOKEN+x}" != x`. Run `gh auth login` without `unset`, then `gh auth status`.
5. Run the four [required verification commands](#3-required-verification), start `bun run dev`, and open forwarded port `8080` from Windows.
6. Restart/reopen the container and confirm `git status` and `gh auth status` still work, with no duplicate workspace trust or profile entries. For Codespaces acceptance, also create/rebuild a Codespace from the branch with non-empty `MGD_GH_TOKEN` and verify `gh auth status` uses the environment token without exposing it.

## 6. Manual and real-device testing

Manual testing requirements come from the **current focused Issue/milestone**, not from stale historical instructions in this file.

General principles:

- test the actual target interaction on real mobile hardware when required;
- record device/browser/viewport details when they matter to reproducibility;
- distinguish observed manual evidence from automated tests;
- verify resize/lifecycle/input interruption when the changed system touches those paths;
- do not claim a device/configuration was tested when it was not.

Completed milestone evidence belongs under [`docs/milestones/`](docs/milestones/).

## 7. Tests

Tests should be fast, deterministic, and focused on application/game rules.

High-value examples:

- math and physics calculations;
- state transitions;
- deterministic generation;
- collision/fairness rules;
- persistence migrations;
- pure layout calculations where behavior matters.

Avoid browser/rendering tests for rules that can be expressed as pure TypeScript. Do not test framework internals merely to increase test count.

Detailed evidence selection for gameplay-authority PRs—including independent oracles, coverage, mutation testing, frame-partition evidence, browser smoke, stability audits, performance evidence, and manual/device boundaries—is defined in [`docs/TEST_QUALITY.md`](docs/TEST_QUALITY.md). Use that policy to choose the smallest evidence set that supports the actual claim.

## 8. CI

Pull-request validation follows the repository's configured GitHub Actions workflows. The normal core sequence is:

```text
install
→ Biome CI
→ typecheck
→ Vitest
→ production build
```

Additional path-filtered or manual evidence workflows are not part of every PR by default. In particular, the browser-runtime smoke runs for browser/runtime-relevant paths, while coverage, mutation and stability audits remain targeted diagnostics under [`docs/TEST_QUALITY.md`](docs/TEST_QUALITY.md).

`main` may additionally deploy the validated web build to GitHub Pages.

## 9. Dependencies

Renovate owns routine dependency-update PRs.

Rules:

- keep the Bun lockfile committed;
- require CI for dependency updates;
- do not assume minor/patch means risk-free;
- do not duplicate Renovate with recurring manual dependency churn unless a specific task requires it;
- major toolchain changes require explicit justification/approval under the architecture/product rules.

## 10. Git and PR workflow

Preferred implementation flow:

```text
focused Issue
    ↓
branch
    ↓
implementation
    ↓
local verification
    ↓
Pull Request
    ↓
GitHub Actions
    ↓
review / acceptance
    ↓
merge when authorized
```

Keep changes focused and reviewable. A passing CI run does not automatically authorize merge.

Coding-agent scope/merge rules, including continued execution under an existing explicit merge authorization, are defined in [`AGENTS.md` §17](AGENTS.md#17-github--pr-discipline). Cross-agent coordination is documented in [`docs/AI_WORKFLOW.md`](docs/AI_WORKFLOW.md).

## 11. Asset commands

Static-image candidates are available after `bun install --frozen-lockfile`:

```bash
bun run assets:prepare --id molten-spike-trial
bun run assets:validate --id molten-spike-trial
bun run assets:preview --id molten-spike-trial
```

`prepare` builds a checked isolated candidate; `validate` and `preview` check existing current output. The JSON result prints the browser comparison and report paths. New imports and explicit updates use the flags in [ASSET_WORKFLOW.md](docs/ASSET_WORKFLOW.md#prepare-and-inspect); that document owns recipes, limits, identity, locking and evidence.

These commands leave live game exports unchanged. A full runtime builder (`assets:build`), generated registry and build-entrypoint integration are not implemented yet; current game assets retain their existing loader paths.

## 12. Deployment and packaging targets

Product platform priority is owned by [MASTER_SPEC §2](MASTER_SPEC.md#2-platform-strategy). Browser tooling remains available for development/preview; its checks do not replace app/device acceptance.

Current build/distribution instructions:

- [Web preview/Pages](docs/PWA_ANDROID.md#hosted-test-build).
- [Android local packaging](docs/ANDROID_CAPACITOR.md#local-workflow) and [CI/tester distribution](docs/ANDROID_DISTRIBUTION.md).

Later platform/channel work (including iOS and Play/AAB preparation) requires its assigned roadmap gate and focused scope. This document lists available tools, not authorization for an additional product platform or publication.

Do not add Cloudflare/backend infrastructure without a concrete approved requirement.

## 13. Security and secrets

- Never commit API keys, PATs, or other secrets.
- Use GitHub/Codespaces secrets for external credentials.
- Do not print secrets in logs, documentation, Issues, or PRs.
- Do not weaken repository protections to make automation easier.

## 14. Milestone tracking and closeout

MGD uses GitHub's native **Milestones** feature as the execution/progress layer for numbered roadmap milestones and explicitly approved non-numbered cross-cutting/tooling initiatives.

The responsibilities are deliberately separate:

- **GitHub Milestone** — either one numbered development phase (M0, M1, ...) or one explicitly approved non-numbered cross-cutting/tooling initiative, plus its assigned Issues/PRs and GitHub progress view;
- **`docs/ROADMAP.md`** — milestone sequence, purpose, proof question, entry/exit gates, version mapping, and milestone-level scope;
- **milestone umbrella Issue** — detailed planning, ordering, dependencies, Director decisions, and acceptance trail;
- **focused Issue / PR** — one concrete delivery unit;
- **labels** — classification such as work type, discipline, or priority; labels are not a substitute for native milestone assignment;
- **`docs/milestones/`** — factual completed history and evidence after closeout.

Historical numbered native-milestone backfill is performed **sequentially**, not as one bulk edit: audit M0 and verify it before M1, then verify M1 before M2, and so on. For each numbered milestone, compare the roadmap, its umbrella Issue, and its factual closeout report; assign only work that actually belonged to that milestone. Maintenance, FUTURE work, and unrelated backlog work must not be pulled into a milestone merely because it happened during the same period.

A non-numbered milestone may be created only after explicit Game Director promotion of a cross-cutting/tooling initiative with a real umbrella/acceptance contract. Such a milestone does **not** create a product version, does not alter the M0–M10 roadmap sequence, and should not absorb merely related prerequisites or neighboring work.

Every completed milestone receives a factual report under `docs/milestones/` before, or as part of, advancing the documented current milestone.

Use [`docs/milestones/TEMPLATE.md`](docs/milestones/TEMPLATE.md).

A closeout report must distinguish:

1. planned scope;
2. what actually landed;
3. architecture/product decisions established;
4. automated validation;
5. manual/device evidence actually observed;
6. deferred/open work;
7. supporting maintenance outside milestone product scope;
8. main Issues/PRs;
9. exit decision;
10. what the next milestone may safely inherit.

Accuracy rules:

- never turn planned scope into historical fact;
- never claim unperformed manual/device checks;
- automated coverage does not substitute for manual evidence;
- keep `PROTOTYPE`, `EXPERIMENT`, `TBD`, `FUTURE`, and deferred states explicit;
- historical reports must not be rewritten simply because later plans changed.

Before closing a native GitHub milestone:

- its governing exit/acceptance gate must have passed (roadmap exit gate for numbered phases; umbrella acceptance for approved non-numbered initiatives);
- required Game Director acceptance must be recorded;
- focused milestone work must be closed or explicitly deferred/routed elsewhere;
- numbered roadmap milestones must have their factual closeout report merged; non-numbered initiatives must record closure evidence in the umbrella Issue and update any durable documentation they own;
- native milestone assignments must be checked so unrelated work does not distort progress;
- numbered roadmap milestone history/version documentation must be updated consistently when applicable.

Apply [required verification](#3-required-verification) to closeout/documentation transitions as well.
