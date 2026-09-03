# Monster Girl Delivery

2D mobile-first endless sidescroller built with Phaser 4 and TypeScript.

**Current status:** Pre-Production / M1 — Flight Prototype

## Quick start — GitHub Codespaces

A new Codespace installs Bun and the project dependencies automatically.

To start the game:

```bash
bun run dev
```

The Vite development server runs on **port 8080**.

In GitHub Codespaces, port `8080` is forwarded automatically. Open the forwarded port from the **Ports** tab, or use the preview that Codespaces opens for you.

To stop the development server:

```text
Ctrl + C
```

If dependencies ever need to be installed manually:

```bash
bun install
bun run dev
```

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
| `bun run dev` | Start the development server |
| `bun run build` | Create a production build |
| `bun run preview` | Preview the production build |
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

M0 Foundation is complete. The current milestone is **M1 — Flight Prototype**.

The prototype focuses on validating the core mobile-first flight experience before broader game systems are built.
