# Monster Girl Delivery

2D mobile-first sidescroller built with Phaser 4 and TypeScript.

**Current project phase:** Pre-Production  
**Current milestone:** M2 — Horizontal Run & First Hazard ([Issue #49](https://github.com/bongohorse/monster-girl-delivery/issues/49))

> Start with the [`Documentation Hub`](docs/README.md) for product decisions, roadmap ownership, architecture, future ideas, AI workflow, and milestone history.

## Quick start — GitHub Codespaces

A new Codespace installs the development environment and project dependencies through the repository's devcontainer setup.

Start normal development:

```bash
bun run dev
```

The Vite development server uses **port 8080**. In Codespaces, port `8080` is forwarded automatically and configured to open as a preview. You can also open it manually from the **Ports** tab.

Stop the server with:

```text
Ctrl + C
```

If dependencies need to be installed manually:

```bash
bun install
bun run dev
```

## Development vs. production preview

Use development mode while building/tuning the game:

```bash
bun run dev
```

Development-only Director tooling is available in this mode.

To verify the production build locally:

```bash
bun run build
bun run preview
```

The production preview also uses port `8080` and intentionally excludes development-only Director tooling.

## Local development

Requirements:

- Git
- Bun

```bash
git clone https://github.com/bongohorse/monster-girl-delivery.git
cd monster-girl-delivery
bun install
bun run dev
```

The development server is exposed on the network so real-device browser testing can use the Vite Network URL where networking permits it.

## Useful commands

| Command | Purpose |
|---|---|
| `bun run dev` | Start Vite development server + dev-only Director tools |
| `bun run build` | Create production build |
| `bun run preview` | Serve the built production version |
| `bun run check` | Run Biome and apply fixes |
| `bun run ci:check` | Run non-modifying Biome CI check |
| `bun run typecheck` | Run TypeScript type checking |
| `bun run test` | Run Vitest |

Before reporting repository work complete, run:

```bash
bun run ci:check
bun run typecheck
bun run test
bun run build
```

See [`DEVELOPMENT.md`](DEVELOPMENT.md) for the full development/validation workflow.

## Project stack

- Phaser 4
- TypeScript
- Bun
- Vite
- Biome
- Vitest
- GitHub Actions
- Renovate

Exact installed versions are defined by `package.json` and `bun.lock`.

## Documentation

[`docs/README.md`](docs/README.md) is the canonical navigation and source-of-truth map.

| Need | Source |
|---|---|
| Product/game decisions | [`MASTER_SPEC.md`](MASTER_SPEC.md) |
| Milestone sequence | [`docs/ROADMAP.md`](docs/ROADMAP.md) |
| Current implementation scope | current GitHub Issue / PR |
| Technical boundaries | [`ARCHITECTURE.md`](ARCHITECTURE.md) |
| Development/validation workflow | [`DEVELOPMENT.md`](DEVELOPMENT.md) |
| Mandatory coding-agent rules | [`AGENTS.md`](AGENTS.md) |
| Future ideas / experiments | [`docs/BACKLOG.md`](docs/BACKLOG.md) |
| Endless Runner design reference | [`docs/ENDLESS_RUNNER_BLUEPRINT.md`](docs/ENDLESS_RUNNER_BLUEPRINT.md) |
| Completed milestone history | [`docs/milestones/README.md`](docs/milestones/README.md) |

## Current product direction

The current core game is **Landscape**, left-to-right, with one-button flight. The Director accepted the M1 smartphone/tablet evidence recorded in [`docs/milestones/M1-device-report.md`](docs/milestones/M1-device-report.md).

Portrait remains a **FUTURE** separate-mode/variant possibility, not current core gameplay.

For exact current M2 scope, use [Issue #49](https://github.com/bongohorse/monster-girl-delivery/issues/49) rather than copying the full milestone specification into this README.