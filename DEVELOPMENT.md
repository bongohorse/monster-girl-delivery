# Development — Monster Girl Delivery

This document owns **development commands, validation, environment setup, PR workflow, and milestone closeout mechanics**.

For product/game rules see [`MASTER_SPEC.md`](MASTER_SPEC.md). For architecture boundaries see [`ARCHITECTURE.md`](ARCHITECTURE.md). Coding agents must also follow [`AGENTS.md`](AGENTS.md).

## 1. Environment

Primary remote environment: **GitHub Codespaces**.

Local development requires:

- Git;
- Bun.

The repository's `.devcontainer/` is the reproducible Codespaces definition.

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

## 5. Codespaces

The repository contains `.devcontainer/devcontainer.json` and a post-create setup script.

A new Codespace should:

1. start from the Ubuntu 24.04 devcontainer base;
2. provide Git and GitHub CLI;
3. provide the Ubuntu-supported Python runtime through the official devcontainer Python feature;
4. install the Bun version defined by the repository setup;
5. install project dependencies;
6. install the latest Codex CLI, Google Antigravity CLI, and Graphify CLI as optional coding-agent tools;
7. run a production build before reporting the Codespace ready;
8. forward port `8080` for Vite preview/testing.

The post-create script reports numbered setup steps with elapsed time. In an interactive terminal it also displays a spinner while a step is running. Required setup failures print the last captured command output and stop setup; optional coding-agent tool failures print a warning and continue. Full per-step logs are retained under `/tmp/mgd-codespace-setup` for diagnosis.

The Antigravity installer places `agy` in the user environment, so a newly created Codespace can launch it directly with `agy` after setup completes. Authentication remains user-specific and is not stored in the repository.

### GitHub CLI authentication

The repository supports a Codespaces secret named `MGD_GH_TOKEN`. The devcontainer exposes it to GitHub CLI as `GH_TOKEN`.

Do not store tokens in repository files or `devcontainer.json` values.

See [`docs/GITHUB_AI_ACCESS.md`](docs/GITHUB_AI_ACCESS.md) for the permission/authentication model.

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

## 8. CI

Pull-request validation follows the repository's configured GitHub Actions workflow. The expected core sequence is:

```text
install
→ Biome CI
→ typecheck
→ Vitest
→ production build
```

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

The following are **planned interfaces**, not guaranteed current scripts:

```bash
bun run assets:validate
bun run assets:build
```

Do not invent or document asset tooling as implemented until an approved task adds it.

## 12. Deployment and packaging targets

Current web deployment target:

- GitHub Pages.

Possible later distribution/packaging work, only when promoted by the roadmap/product plan:

- itch.io;
- Android/iOS packaging (for example Capacitor evaluation);
- Desktop/Steam wrapper evaluation;
- gamepad/desktop UX;
- PWA evaluation.

Do not add Cloudflare/backend infrastructure without a concrete approved requirement.

## 13. Security and secrets

- Never commit API keys, PATs, or other secrets.
- Use GitHub/Codespaces secrets for external credentials.
- Do not print secrets in logs, documentation, Issues, or PRs.
- Do not weaken repository protections to make automation easier.

## 14. Milestone closeout

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

Apply [required verification](#3-required-verification) to closeout/documentation transitions as well.
