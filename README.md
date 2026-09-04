# Monster Girl Delivery

2D mobile-first endless sidescroller built with Phaser 4 and TypeScript.

**Current status:** Pre-Production / M2 — Horizontal Run & First Hazard

> **Looking for project documentation?** Start with the [`Documentation Hub`](docs/README.md). It explains where product decisions, roadmap, current Issues, future ideas, architecture, AI rules, and milestone history live.

## Quick start — GitHub Codespaces

A new Codespace installs Bun and the project dependencies automatically.

To start the game for normal development:

```bash
bun run dev
```

The Vite development server runs on **port 8080**.

In GitHub Codespaces, port `8080` is forwarded automatically. The project is configured to open a Codespaces preview for this port. You can also open it manually from the **Ports** tab by finding port `8080` and choosing **Open in Browser** or **Open Preview**.

To stop the server:

```text
Ctrl + C
```

If dependencies ever need to be installed manually:

```bash
bun install
bun run dev
```

## Development server vs. production preview

For everyday development, use:

```bash
bun run dev
```

This runs Vite in development mode with fast reloads while editing the game. **Director/dev tuning panels are available only in this development mode.**

To test the built production version locally, first build the game and then start Vite's production preview server:

```bash
bun run build
bun run preview
```

`bun run preview` also runs on **port 8080**, so in Codespaces open the same forwarded port from the **Ports** tab.

> **Use `bun run dev` while developing.** Use `bun run build` + `bun run preview` when you specifically want to verify the production build. The production preview intentionally does not construct Director tools.

## Local development

Requirements:

- Git
- Bun

Clone the repository and start the development server:

```bash
git clone https://github.com/bongohorse/monster-girl-delivery.git
cd monster-girl-delivery
bun install
bun run dev
```

Then open the URL shown by Vite in your browser. The development server listens on port `8080` and is exposed on the network for real-device testing.

## Useful commands

| Command | Purpose |
|---|---|
| `bun run dev` | Start the development server on port 8080 with Director/dev tools |
| `bun run build` | Create a production build |
| `bun run preview` | Serve the already-built production version on port 8080 |
| `bun run check` | Run Biome and apply fixes |
| `bun run ci:check` | Run the non-modifying Biome CI check |
| `bun run typecheck` | Run TypeScript type checking |
| `bun run test` | Run Vitest tests |

## Before committing

Run the same core validation used by CI:

```bash
bun run ci:check
bun run typecheck
bun run test
bun run build
```

## Project stack

- Phaser 4
- TypeScript
- Bun
- Vite 8
- Biome
- Vitest
- GitHub Actions
- Renovate
- Google Jules

## Project workflow

- **Human:** Game Director / Product Owner
- **AI coding agents:** implementation and engineering
- **CI:** automated validation
- **GitHub Issues/PRs:** live execution trail

## Documentation — where to start

The central index is [`docs/README.md`](docs/README.md).

### For the Game Director / human

1. [`docs/README.md`](docs/README.md) — choose the right document quickly
2. [`docs/ROADMAP.md`](docs/ROADMAP.md) — milestone sequence and future scope
3. current GitHub milestone/Issue — what is actually being worked on now
4. [`MASTER_SPEC.md`](MASTER_SPEC.md) — exact product/game decisions when needed

### For AI / coding agents

1. [`AGENTS.md`](AGENTS.md) — mandatory repository rules
2. [`docs/README.md`](docs/README.md) — document authority and task routing
3. assigned GitHub Issue / PR — focused current scope
4. relevant sections of [`MASTER_SPEC.md`](MASTER_SPEC.md), [`ARCHITECTURE.md`](ARCHITECTURE.md), and [`DEVELOPMENT.md`](DEVELOPMENT.md)

### Main document categories

| Need | Document |
|---|---|
| Product/game truth | [`MASTER_SPEC.md`](MASTER_SPEC.md) |
| Milestone sequence | [`docs/ROADMAP.md`](docs/ROADMAP.md) |
| Technical boundaries | [`ARCHITECTURE.md`](ARCHITECTURE.md) |
| Development workflow | [`DEVELOPMENT.md`](DEVELOPMENT.md) |
| AI agent rules | [`AGENTS.md`](AGENTS.md) |
| Future ideas / experiments | [`docs/BACKLOG.md`](docs/BACKLOG.md) |
| Art/visual ideas | [`docs/ART_DIRECTION_IDEAS.md`](docs/ART_DIRECTION_IDEAS.md) |
| Completed milestone history | [`docs/milestones/README.md`](docs/milestones/README.md) |

## Current milestone

M0 Foundation and M1 Flight Prototype are complete. The current milestone is **M2 — Horizontal Run & First Hazard**.

Landscape is the decided target orientation for the current core game, based on the Director-accepted smartphone/tablet results in the [`M1 real-device report`](docs/m1-device-report.md). Portrait remains a future possibility for a separate mode or variant.

M2 focuses on deterministic horizontal world motion, configurable prototype scroll speed, one deterministic lethal hazard, collision, run death/restart, and Landscape device validation. Graze and scoring remain future work.
