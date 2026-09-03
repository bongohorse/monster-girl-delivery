# AI AGENT RULES — MONSTER GIRL DELIVERY

You are a coding agent working on Monster Girl Delivery.

The human is the Game Director. The human defines what the game should be. You implement the requested work safely and test it.

## Before doing anything

For a new/first repository session:

1. Read `MASTER_SPEC.md`.
2. Read `ARCHITECTURE.md`.
3. Read `DEVELOPMENT.md`.
4. Inspect the existing Phaser starter and repository files.
5. Understand the current milestone before writing gameplay code.

Do not start by building gameplay just because the repository is empty.

## Source of truth

- `MASTER_SPEC.md` — product/game truth and project status.
- `ARCHITECTURE.md` — technical boundaries.
- `DEVELOPMENT.md` — commands and workflow.
- Existing code — current implementation.

Never turn `TBD`, `PROTOTYPE`, `EXPERIMENT`, or `FUTURE` into permanent decisions without approval.

## General rules

- Use strict TypeScript.
- Avoid `any`; if an unavoidable external typing requires it, document the reason.
- Keep modules cohesive.
- Do not create giant monolithic files.
- Do not split files solely to satisfy an arbitrary line count.
- Separate gameplay, input, rendering, UI, persistence, audio, and developer tools where practical.
- Do not introduce a framework or dependency without a concrete reason.
- Reuse existing project abstractions before creating parallel ones.
- Do not rewrite working systems without a clear reason.
- Do not modify unrelated files.

## Build/tooling boundaries

- Keep the official Phaser/Vite architecture unless a task requires a change.
- Do not create a separate Rolldown configuration.
- Do not replace Phaser with another engine.
- Do not replace Vite/Bun/Biome/Vitest without explicit technical justification.

## Physics and time

- Gameplay must be frame-rate independent.
- Use the project's `TimeService` as the shared time source.
- Do not use arbitrary per-frame movement such as `position += speed`.
- Prevent large inactive/background deltas from exploding physics.

## Input

- Gameplay code must use `InputService`.
- Do not directly read keyboard/touch/mouse state from gameplay entities.
- Track active touch/pointer identity where required.
- Respect gameplay blocking for UI/menus/debug overlays.
- Handle pointer cancellation and lifecycle interruptions.

## Randomness

- Never use `Math.random()` for gameplay decisions.
- Use the project's seeded PRNG for gameplay randomness.
- Keep gameplay randomness reproducible.

## Procedural generation

When procedural hazards are implemented:

```text
Generate → Validate → Spawn
```

Never rely on unconstrained random spawning for gameplay hazards.

Fairness constraints must be explicit and testable.

## Director tools

Director/debug tools are development infrastructure, not gameplay logic.

Keep them isolated and easy to disable for production builds.

Prefer tools that let the Director tune values without editing source files.

## Assets

Respect the repository asset stages:

```text
raw → source → processed → public/assets
```

Do not place source artwork randomly in `src/`.

Do not impose a universal format when the asset type has different requirements.

## Persistence

When persistence is implemented:

- use `SaveManager`;
- version the schema;
- provide migration paths;
- do not access browser storage directly from gameplay systems.

## Testing

Use Vitest for deterministic application/gameplay logic.

Prefer tests for rules and calculations over tests of framework internals.

## Verification

Before reporting a task as complete, run the project checks:

```bash
bun run ci:check
bun run typecheck
bun run test
bun run build
```

Fix failures before claiming completion.

If a check cannot be run, say exactly which one and why.

## AI autonomy boundaries

You may make routine implementation decisions covered by the architecture.

You must not silently change:
- product scope;
- game rules;
- platform strategy;
- monetization;
- major architecture;
- dependency strategy.

When a task exposes a missing product decision, state the issue and use the least-committal implementation possible.

## GitHub/Jules/PR discipline

A passing CI does not mean a change is automatically approved.

Keep changes focused and reviewable.

Do not generate unrelated refactors in a feature/bug PR.

## First milestone

M0 is foundation only.

Do not implement player gameplay, hazards, procedural generation, gacha, economy, or save systems during M0 unless the Director explicitly changes scope.

## GitHub autonomy

When authenticated GitHub access is available, you are allowed to manage the repository work needed for your assigned task:

- create branches, commits, Issues, and Pull Requests;
- push branches and update PRs;
- comment on and close Issues when acceptance criteria are met;
- inspect and rerun GitHub Actions;
- create follow-up Issues for useful work outside current scope;
- merge your PR when required checks pass and the Issue does not explicitly require human approval.

Never bypass protection by weakening rules, force-pushing `main`, deleting `main`, exposing secrets, or changing repository/account administration.

`MASTER_SPEC.md` is product truth. Do not change `DECIDED`/`TBD`/`EXPERIMENT` states merely to make implementation easier. Product decisions require the Game Director.
