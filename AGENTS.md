# AI Agent Rules — Monster Girl Delivery

You are a coding agent working on Monster Girl Delivery (MGD).

The human is the **Game Director / Product Owner**. The Game Director decides what the game should become. Coding agents implement approved work safely, keep changes reviewable, and validate what they change.

## 1. Start here

For a new repository session:

1. Read this `AGENTS.md`.
2. Read [`docs/README.md`](docs/README.md) for document ownership and navigation.
3. Read the assigned GitHub Issue or PR before deciding implementation scope.
4. Read only the relevant sections of [`MASTER_SPEC.md`](MASTER_SPEC.md) for product/game rules.
5. Read [`ARCHITECTURE.md`](ARCHITECTURE.md) and [`DEVELOPMENT.md`](DEVELOPMENT.md) when the task touches their concerns.
6. Inspect the existing implementation and tests before writing code.
7. Confirm which roadmap milestone the assigned Issue belongs to.

Do **not** implement a milestone, backlog idea, reference lesson, or old discussion merely because it exists in the repository.

## 2. Source ownership

[`docs/README.md`](docs/README.md) is the canonical documentation map.

| Source | Owns |
|---|---|
| `MASTER_SPEC.md` | Durable product/game decisions and decision states |
| `docs/ROADMAP.md` | Approved milestone sequence and milestone-level scope |
| Current GitHub Issue / PR | Focused live implementation scope |
| `ARCHITECTURE.md` | Technical ownership and architecture boundaries |
| `DEVELOPMENT.md` | Commands, validation, development/PR workflow, milestone closeout process |
| `docs/AI_WORKFLOW.md` | Human ↔ AI coordination model |
| `docs/GITHUB_AI_ACCESS.md` | GitHub/Codespaces authentication and permission setup |
| `docs/BACKLOG.md` | Preserved future ideas and experiments only |
| `docs/ENDLESS_RUNNER_BLUEPRINT.md` | Design reference only |
| `docs/milestones/` | Factual completed milestone history and evidence |
| Existing code/tests | Current implemented behavior |

Never promote `PROTOTYPE`, `EXPERIMENT`, `TBD`, or `FUTURE` into a permanent decision without Game Director approval.

If two sources conflict on the **same kind of decision** and neither explicitly supersedes the other, surface the conflict instead of silently choosing one.

## 3. Scope discipline

- One focused task should produce one coherent, reviewable change.
- Do not modify unrelated files.
- Do not expand scope because a nearby improvement looks useful.
- Record useful out-of-scope discoveries as separate Issues/backlog items.
- Milestones and parent Issues are planning containers, not implementation units.
- Split independently reviewable systems before coding unless the Director explicitly asks for a combined task.

Default implementation unit:

```text
one focused Issue → one branch → one pull request
```

After completing the assigned implementation unit and its PR, stop unless the task explicitly asks for further work.

## 4. Product and architecture boundaries

You may make routine implementation decisions already covered by the architecture.

Do not silently change:

- product scope;
- game rules;
- platform strategy;
- monetization;
- major architecture;
- dependency/toolchain strategy;
- decision states in `MASTER_SPEC.md`.

When a task exposes a missing product decision, use the least-committal reversible implementation and surface the unresolved decision.

## 5. General engineering rules

- Use strict TypeScript.
- Avoid `any`; document an unavoidable external-typing exception.
- Keep modules cohesive.
- Do not create giant monolithic files.
- Do not split files solely to satisfy an arbitrary line count.
- Separate gameplay rules, input, rendering, UI, persistence, audio, and developer tools where practical.
- Reuse existing abstractions before creating parallel systems.
- Do not introduce a framework or dependency without a concrete reason.
- Do not rewrite working systems without a clear task-driven reason.

## 6. Build/tooling boundaries

- Keep the Phaser 4 + TypeScript + Vite + Bun foundation unless an approved task changes it.
- Do not create a separate Rolldown configuration; use Vite's build pipeline.
- Do not replace Phaser, Vite, Bun, Biome, or Vitest without explicit approval/technical justification.

## 7. Time and physics

- Gameplay must be frame-rate independent.
- Use `TimeService` as the authoritative simulation-time source.
- Do not use arbitrary per-frame movement such as `position += speed`.
- Prevent inactive/background time from producing giant simulation steps.

## 8. Input

- Gameplay code must consume high-level intent from `InputService`.
- Do not read raw keyboard/touch/mouse state directly inside gameplay entities.
- Track active pointer identity where required.
- Respect gameplay blocking for UI/debug interactions.
- Handle pointer cancellation and lifecycle interruptions.

## 9. Randomness and procedural generation

- Never use `Math.random()` for gameplay decisions.
- Use the project seeded PRNG once the approved seeded-generation system exists.
- Keep gameplay randomness reproducible.

For generated hazards/patterns:

```text
Generate → Validate → Spawn
```

Fairness constraints must be explicit and testable. Never rely on unconstrained random hazard placement.

## 10. Director tools

Director/debug tools are development infrastructure, not gameplay logic.

- Keep them isolated from production gameplay.
- Keep them easy to disable/exclude in production builds.
- Prefer live tuning/diagnostics over requiring source edits for routine playtesting.

## 11. Assets

The planned production flow is:

```text
raw → source → processed → public/assets
```

Do not create or assume asset-pipeline folders/tools until the assigned work requires them. Do not scatter source artwork through gameplay code directories.

## 12. Persistence

When persistence is implemented:

- use the centralized `SaveManager` boundary;
- version the save schema;
- provide migrations;
- keep browser/platform storage access out of gameplay systems.

## 13. Testing and verification

Use Vitest for deterministic application/gameplay logic. Prefer testing rules and calculations over framework internals.

Before reporting a task complete, run:

```bash
bun run ci:check
bun run typecheck
bun run test
bun run build
```

Fix failures before claiming completion. If a check cannot be run, state exactly which check and why.

## 14. GitHub / PR discipline

A green CI run is validation evidence, not automatic product approval.

- Keep PRs focused.
- Do not generate unrelated refactors.
- Do not weaken repository protections to make a change pass.
- Do not force-push or delete `main`.
- Never expose secrets.
- An implementation agent merges only when the assigned task explicitly includes merging and required checks pass.

See [`docs/AI_WORKFLOW.md`](docs/AI_WORKFLOW.md) for role-level orchestration and [`docs/GITHUB_AI_ACCESS.md`](docs/GITHUB_AI_ACCESS.md) for authentication/permission setup.

## 15. Current milestone handling

Do not hardcode assumptions from an old milestone into new work.

To determine current scope:

1. check [`docs/README.md`](docs/README.md) for the current milestone pointer;
2. check [`docs/ROADMAP.md`](docs/ROADMAP.md) for sequencing;
3. inspect the current milestone parent Issue and the assigned child Issue;
4. use completed reports in `docs/milestones/` only for historical facts and inherited capabilities.

A completed milestone report never authorizes future work by itself.