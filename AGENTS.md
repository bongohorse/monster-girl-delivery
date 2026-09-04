# AI AGENT RULES — MONSTER GIRL DELIVERY

You are a coding agent working on Monster Girl Delivery.

The human is the Game Director. The human defines what the game should be. You implement the requested work safely and test it.

## Before doing anything

For a new/first repository session:

1. Read this `AGENTS.md`.
2. Read [`docs/README.md`](docs/README.md) to understand document ownership and choose only the relevant sources.
3. Read the assigned/current GitHub Issue or PR before deciding implementation scope.
4. Read the relevant sections of `MASTER_SPEC.md` for product/game rules.
5. Read `ARCHITECTURE.md` and `DEVELOPMENT.md` as required by the task.
6. Inspect the existing implementation and tests before writing code.
7. Confirm which milestone the assigned Issue belongs to.

Do not start by implementing a milestone, backlog idea, or discussed concept merely because it exists in the repository.

Do not read `docs/BACKLOG.md` or `docs/ART_DIRECTION_IDEAS.md` as current requirements unless the task explicitly involves planning, design exploration, or promotion of those ideas.

## Documentation map and source ownership

Use [`docs/README.md`](docs/README.md) as the navigation index.

The key ownership rules are:

- `MASTER_SPEC.md` — durable product/game truth and decision states.
- `docs/ROADMAP.md` — approved milestone sequence and newer forward-looking milestone structure.
- Current GitHub Issue / PR — focused live implementation scope within approved product/architecture boundaries.
- `ARCHITECTURE.md` — established technical boundaries.
- `DEVELOPMENT.md` — commands, validation, workflow, and closeout process.
- `docs/BACKLOG.md` and `docs/ART_DIRECTION_IDEAS.md` — preserved ideas only, not implementation requirements.
- `docs/milestones/` — factual historical closeout records, not forward planning.
- Existing code and tests — current implementation behavior.

`docs/ROADMAP.md` explicitly supersedes the older forward-looking M3–M7 milestone outline in `MASTER_SPEC.md`; it does not replace `MASTER_SPEC.md` product decisions.

Never turn `TBD`, `PROTOTYPE`, `EXPERIMENT`, or `FUTURE` into permanent decisions without approval.

If two sources appear to conflict on the same kind of decision and neither explicitly supersedes the other, surface the conflict instead of silently choosing one.

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
- Use the project's seeded PRNG for gameplay randomness once that system exists.
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

## Task sizing and milestone planning

- Milestones and large Issues are planning containers, not implementation tasks.
- Before implementation, split them into small sub-issues with one clear responsibility and explicit acceptance criteria.
- Prefer independently testable sub-issues and record dependencies between them where relevant.
- After creating the milestone plan, stop and wait for Game Director approval. Do not begin the first implementation task automatically.
- The default implementation unit is one sub-issue → one branch → one pull request.
- Do not implement multiple independent sub-issues in one agent run unless the Director explicitly instructs you to.
- Split any task containing multiple independently reviewable systems before coding.
- Record out-of-scope discoveries as separate backlog items or Issues instead of expanding the current task.
- After completing the assigned sub-issue and pull request, the implementation agent must stop.

## Current milestone handling

Do not hardcode assumptions from an old milestone into new work.

To determine current scope:

1. check `docs/README.md` for the current milestone pointer;
2. check `docs/ROADMAP.md` for approved sequencing;
3. inspect the current milestone parent Issue and assigned child Issue;
4. use completed reports in `docs/milestones/` only for historical facts and inherited capabilities.

A completed milestone report never authorizes future work by itself.

## GitHub autonomy

When authenticated GitHub access is available, you are allowed to manage the repository work needed for your assigned task:

- create branches, commits, Issues, and Pull Requests;
- push branches and update PRs;
- comment on and close Issues when acceptance criteria are met;
- inspect and rerun GitHub Actions;
- create follow-up Issues for useful work outside current scope;
- merge a PR only when the assigned task explicitly includes merging and required checks pass.

Never bypass protection by weakening rules, force-pushing `main`, deleting `main`, exposing secrets, or changing repository/account administration.

`MASTER_SPEC.md` is product truth. Do not change `DECIDED`/`TBD`/`EXPERIMENT` states merely to make implementation easier. Product decisions require the Game Director.
