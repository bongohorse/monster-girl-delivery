# Monster Girl Delivery

2D mobile-first endless sidescroller built with Phaser 4 and TypeScript.

**Current status:** Pre-Production / M2 — Hazards, Graze and Fairness

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

This runs Vite in development mode with fast reloads while editing the game.

To test the built production version locally, first build the game and then start Vite's production preview server:

```bash
bun run build
bun run preview
```

`bun run preview` also runs on **port 8080**, so in Codespaces open the same forwarded port from the **Ports** tab.

> **Use `bun run dev` while developing.** Use `bun run build` + `bun run preview` when you specifically want to verify the production build.

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
| `bun run dev` | Start the development server on port 8080 |
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
- **GitHub:** source of truth

## Project documentation

For development or agent work, read these documents in order:

1. [`MASTER_SPEC.md`](MASTER_SPEC.md) — product vision, rules, milestones, and decisions
2. [`AGENTS.md`](AGENTS.md) — instructions for coding agents
3. [`ARCHITECTURE.md`](ARCHITECTURE.md) — project architecture
4. [`DEVELOPMENT.md`](DEVELOPMENT.md) — development workflow and commands

## Current milestone

M0 Foundation and M1 Flight Prototype are complete. The current milestone is **M2 — Hazards, Graze and Fairness**.

Landscape is the decided target orientation for the current core game, based on the Director-accepted smartphone/tablet results in the [`M1 real-device report`](docs/m1-device-report.md). Portrait remains a future possibility for a separate mode or variant.

M2 focuses on hazards, warnings, collision, Graze, score, and the first explicit fairness rules.
