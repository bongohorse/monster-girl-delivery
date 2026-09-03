# DEVELOPMENT — MONSTER GIRL DELIVERY

## 1. Environment

Primary remote development environment: GitHub Codespaces.

Recommended local environment: Bun + Git.

The repository should reproduce the same environment through `.devcontainer/`.

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

For real-device LAN testing, Vite must be reachable from the local network. The project may configure `vite --host` in the `dev` script.

## 3. Required package scripts

The repository should provide these scripts:

```text
dev         → Vite development server
build       → production build
preview     → preview production build
check       → Biome auto-fix/check for local development
ci:check    → Biome CI check without modifying files
typecheck   → tsc --noEmit
test        → vitest run
```

Do not use `bun test` as the project's test command because the project standard is Vitest.

## 4. Verification order

Before reporting a task complete:

```bash
bun run ci:check
bun run typecheck
bun run test
bun run build
```

## 5. Codespaces

The repository contains `.devcontainer/devcontainer.json`.

A new Codespace should:

1. start from a predictable base environment;
2. have Git available;
3. have Bun installed;
4. install project dependencies;
5. make the Vite development port available.

Do not store secrets in `devcontainer.json`.

## 6. Browser testing

Default development:

```bash
bun run dev -- --host
```

or, if the package script includes `--host`:

```bash
bun run dev
```

On a real device connected to the same network, use the Vite Network URL.

Test at minimum during M1:

- phone portrait;
- phone landscape;
- tablet;
- narrow/wide browser window;
- real resize/orientation changes.

## 7. Asset commands

These commands are planned and may remain unavailable until the asset pipeline is implemented:

```bash
bun run assets:validate
bun run assets:build
```

Do not invent asset tooling without a concrete task.

## 8. Tests

Tests should be fast and deterministic.

Good tests cover:
- math;
- state transitions;
- deterministic generation;
- persistence migrations;
- fairness constraints.

Do not require a browser for tests that can run as pure TypeScript.

## 9. CI

Pull requests:

```text
install
→ biome ci
→ typecheck
→ vitest
→ production build
```

`main` may additionally deploy the validated web build to GitHub Pages.

## 10. Dependency updates

Renovate creates dependency update PRs.

Never assume a dependency update is safe just because it is semver-minor/patch. CI is required, and breaking behavior still needs review.

The Bun lockfile must be committed.

## 11. AI-agent workflow

For a new task:

1. Read `AGENTS.md`.
2. Read the relevant sections of `MASTER_SPEC.md`.
3. Inspect existing code.
4. Make the smallest coherent change.
5. Run validation.
6. Report what changed and what was tested.

For product ambiguity:
- do not invent permanent rules;
- choose a reversible implementation;
- record the unresolved decision as TBD/Experiment if needed.

## 12. Git / PR workflow

Preferred flow:

```text
Issue
  ↓
AI plan
  ↓
small implementation
  ↓
local checks
  ↓
PR
  ↓
GitHub Actions
  ↓
human review
  ↓
merge
```

Do not merge an AI PR solely because automation is green.

## 13. Jules

Google Jules can work from repository Issues and inspect the codebase autonomously.

Give Jules small, concrete tasks with acceptance criteria.

Jules automatically looks for root `AGENTS.md`; keep that file current.

Avoid asking Jules to "improve the project" without a defined boundary.

## 14. Renovate

Renovate is responsible for dependency update PRs.

Do not duplicate Renovate's dependency work with manual recurring update tasks unless needed.

## 15. Release targets

Current web target:
- GitHub Pages.

Alternative later:
- itch.io.

Future:
- Capacitor for Android/iOS evaluation.
- Desktop wrapper for Steam evaluation.

Do not add Cloudflare infrastructure unless a real product requirement appears.
