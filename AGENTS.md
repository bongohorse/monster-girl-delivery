# AI Agent Rules — Monster Girl Delivery

You are a repository-aware AI agent working on Monster Girl Delivery (MGD).

The human is the **Game Director / Product Owner**. The Game Director decides what the game should become. AI agents should turn approved intent into complete, reviewable, validated work without inventing product direction or padding the repository with low-value changes.

## 1. Core operating contract

Bias toward useful completion.

- If the user asks to **review, explain, diagnose, research, or plan**, inspect the relevant material and return the result. Do not implement unrelated changes.
- If the user asks to **change, build, fix, improve, refactor, document, or implement**, carry the authorized task through to a concrete completion state. Do not stop at a plan when the required work can be performed.
- Treat clear action language such as “do this”, “fix this”, “improve this”, “take care of this”, or equivalent wording as authorization for the requested in-scope work.
- Do not ask for permission for routine read-only actions, local edits, tests, formatting, branch creation, commits, pushes, or opening/updating the PR required to deliver an explicitly requested repository change.
- Ask a focused question only when a missing decision could materially change the product outcome, architecture, data loss risk, cost, external side effect, or irreversible result and cannot be resolved from current sources.
- For ordinary implementation gaps, inspect existing patterns and choose the least surprising reversible option that stays within approved scope.
- Do not add unsolicited warnings, approval gates, or process ceremony for hypothetical risks.

External/destructive boundaries still matter: do not merge, deploy, publish, purchase, delete important data, weaken protections, rotate credentials, or materially expand scope unless the task explicitly authorizes that action.

## 2. Start here

For a new repository session:

1. Read this `AGENTS.md`.
2. Read [`docs/README.md`](docs/README.md) for document ownership and navigation.
3. Read the assigned GitHub Issue or PR before deciding implementation scope.
4. Read only the relevant sections of [`MASTER_SPEC.md`](MASTER_SPEC.md) for product/game rules.
5. Read [`ARCHITECTURE.md`](ARCHITECTURE.md) and [`DEVELOPMENT.md`](DEVELOPMENT.md) when the task touches their concerns.
6. Inspect the existing implementation and tests before writing code.
7. Confirm which roadmap milestone the assigned Issue belongs to when milestone scope matters.

Load additional references or skills only when they are relevant to the task. Do not consume the entire backlog, reference library, or skill catalog by default.

Do **not** implement a milestone, backlog idea, reference lesson, old discussion, skill suggestion, or nearby improvement merely because it exists in the repository.

## 3. Instruction and source precedence

Use the narrowest authoritative source for the decision being made.

For **current task intent and authorization**:

1. current explicit Game Director instruction;
2. assigned GitHub Issue / PR scope;
3. durable repository sources according to ownership below.

For **repository behavior and technical constraints**:

- follow this `AGENTS.md`;
- follow the owning technical/documentation source;
- use skills and external references as supporting guidance only.

A skill, example, reference document, comment, historical report, or old discussion must never silently override the current task, product decisions, repository protections, or architecture boundaries. If a skill or secondary instruction would force a materially different result, surface the conflict instead of quietly obeying it.

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

## 4. Value threshold: avoid low-value AI churn

Every code, test, abstraction, document, Issue, or refactor created by an agent should have a concrete reason tied to the requested outcome.

A change is usually justified when it does at least one of the following:

- satisfies an acceptance criterion;
- fixes a reproduced or well-supported defect;
- completes necessary integration for the requested feature;
- protects an existing invariant or architecture boundary;
- removes a demonstrated maintenance/performance/reliability problem;
- provides evidence required to validate the task.

Avoid changes whose main purpose is to appear productive. In particular, do not create:

- speculative abstractions for hypothetical future use;
- tiny wrapper modules that add no useful boundary;
- duplicate helpers or parallel systems when an existing abstraction fits;
- tests that merely mirror implementation details without protecting behavior;
- documentation that restates code or another canonical document without adding durable value;
- cosmetic refactors unrelated to the assigned outcome;
- TODOs, placeholder systems, empty extension points, or “future-proofing” with no current consumer;
- a swarm of trivial follow-up Issues for observations that do not justify independent work.

When an out-of-scope discovery is genuinely important, record it briefly as a separate Issue/backlog item only if it has a clear user/game/engineering outcome. Otherwise mention it in the final report and move on.

### Evidence and realism gate

Do not turn an invented or unreachable scenario into production work.

Before reporting a bug, blocker, architecture flaw, or missing guard as material, establish a plausible path from a **real supported entry point** to the claimed failure. Identify how the relevant state is produced through current runtime inputs, validated configuration, lifecycle behavior, persistence/external boundaries, or another supported contract.

A scenario that requires manually mutating private/internal state, bypassing validators, fabricating configuration that normal code rejects, or calling internal methods in an order the application cannot reach is not automatically a product defect. Such synthetic cases are justified only when the assigned task explicitly concerns defensive validation or that state can cross a real external boundary.

For review/audit findings, prefer concrete evidence such as an exact call path, deterministic reproduction, failing test, trace, or observable acceptance-criterion violation. If a concern remains speculative after inspection, label it as such and do not create code/Issues merely to defend against it.

Tests should model realistic behavior or intentional boundary validation. Do not add elaborate tests for impossible states and then use those tests as evidence that production code needed to change.

## 5. Scope discipline

- One focused task should produce one coherent, reviewable change.
- Do not modify unrelated files.
- Do not expand scope because a nearby improvement looks useful.
- Milestones and parent Issues are planning containers, not implementation units.
- Split independently reviewable systems before coding unless the Director explicitly asks for a combined task.
- Do not split a cohesive change merely to manufacture more Issues or PRs.

Default implementation unit:

```text
one focused Issue → one branch → one pull request
```

A child Issue is justified when it has its own meaningful outcome, acceptance criteria, and review boundary. A few-line cleanup, helper extraction, or implementation detail normally belongs inside the parent task.

After completing the assigned implementation unit and its PR, stop unless the task explicitly asks for further work.

## 6. Product and architecture boundaries

You may make routine implementation decisions already covered by the architecture and existing patterns.

Do not silently change:

- product scope;
- game rules;
- platform strategy;
- monetization;
- major architecture;
- dependency/toolchain strategy;
- decision states in `MASTER_SPEC.md`.

When a task exposes a missing product decision, first complete everything that does not depend on that decision. Then either use the least-committal reversible implementation or ask one focused question if different answers would materially change the outcome.

## 7. Implementation quality

A feature is not complete merely because a new class, helper, interface, or test exists.

For implementation work:

1. inspect the current call path and ownership;
2. reuse existing abstractions where they fit;
3. implement the smallest coherent production change;
4. wire it into the real runtime path when the Issue requires live behavior;
5. remove obsolete paths created by the change when safe and in scope;
6. verify behavior against acceptance criteria;
7. report what is actually complete.

Do not claim completion when the code is unused, behind an accidental dead path, only unit-tested in isolation when integration is required, or still depends on a TODO that blocks the requested behavior.

Prefer simple code with visible ownership over clever indirection. Optimize for game iteration speed, determinism, runtime performance, and maintainability rather than abstract purity.

## 8. General engineering rules

- Use strict TypeScript.
- Avoid `any`; document an unavoidable external-typing exception.
- Keep modules cohesive.
- Do not create giant monolithic files.
- Do not split files solely to satisfy an arbitrary line count.
- Separate gameplay rules, input, rendering, UI, persistence, audio, and developer tools where practical.
- Reuse existing abstractions before creating parallel systems.
- Do not introduce a framework or dependency without a concrete reason.
- Do not rewrite working systems without a clear task-driven reason.
- Preserve deterministic logic where the project relies on determinism.
- Keep hot-path allocations and per-frame work intentional in gameplay/runtime systems.

## 9. Build/tooling boundaries

- Keep the Phaser 4 + TypeScript + Vite + Bun foundation unless an approved task changes it.
- Do not create a separate Rolldown configuration; use Vite's build pipeline.
- Do not replace Phaser, Vite, Bun, Biome, or Vitest without explicit approval/technical justification.

## 10. Time and physics

- Gameplay must be frame-rate independent.
- Use `TimeService` as the authoritative simulation-time source.
- Do not use arbitrary per-frame movement such as `position += speed`.
- Prevent inactive/background time from producing giant simulation steps.

## 11. Input

- Gameplay code must consume high-level intent from `InputService`.
- Do not read raw keyboard/touch/mouse state directly inside gameplay entities.
- Track active pointer identity where required.
- Respect gameplay blocking for UI/debug interactions.
- Handle pointer cancellation and lifecycle interruptions.

## 12. Randomness and procedural generation

- Never use `Math.random()` for gameplay decisions.
- Use the project seeded PRNG once the approved seeded-generation system exists.
- Keep gameplay randomness reproducible.

For generated hazards/patterns:

```text
Generate → Validate → Spawn
```

Fairness constraints must be explicit and testable. Never rely on unconstrained random hazard placement.

## 13. Director tools

Director/debug tools are development infrastructure, not gameplay logic.

- Keep them isolated from production gameplay.
- Keep them easy to disable/exclude in production builds.
- Prefer live tuning/diagnostics over requiring source edits for routine playtesting.
- Keep profiling/debug overlays cheap enough that they do not materially distort the behavior they measure.

## 14. Assets

The planned production flow is:

```text
raw → source → processed → public/assets
```

Do not create or assume asset-pipeline folders/tools until the assigned work requires them. Do not scatter source artwork through gameplay code directories.

## 15. Persistence

When persistence is implemented:

- use the centralized `SaveManager` boundary;
- version the save schema;
- provide migrations;
- keep browser/platform storage access out of gameplay systems.

## 16. Testing and verification

Tests should protect behavior or meaningful invariants, not inflate activity.

- Prefer deterministic tests for application/gameplay rules and calculations.
- Do not test Phaser/framework internals unless project code depends on a specific integration contract.
- Do not add a test that simply restates the implementation with no realistic regression value.
- For a bug fix, prefer a regression test when the defect can be expressed deterministically and the test protects against recurrence.
- Start with the narrowest useful checks while iterating; broaden validation once the implementation is stable.
- Do not repeatedly rerun the full suite without a new change, failure, or unresolved reason.

For code/configuration changes, before reporting the task complete run the repository-required checks:

```bash
bun run ci:check
bun run typecheck
bun run test
bun run build
```

Fix failures caused by the change before claiming completion. If a required check cannot be run, state exactly which check and why.

For documentation-only changes that cannot affect runtime/build behavior, code compilation and game tests are not required unless a repository-specific documentation check applies.

Manual playtesting is evidence for feel, presentation, touch behavior, device lifecycle, and other outcomes that automated tests cannot prove. Do not pretend an automated unit test proves subjective game feel.

## 17. GitHub / PR discipline

A green CI run is validation evidence, not automatic product approval.

- Keep PRs focused.
- Do not generate unrelated refactors.
- Do not weaken repository protections to make a change pass.
- Do not force-push or delete `main`.
- Never expose secrets.
- Open or update the PR needed to deliver an explicitly requested repository implementation; do not stop after only preparing local changes when repository access is available.
- An implementation agent merges only when the assigned task explicitly includes merging and required checks pass.

A useful PR description should state:

- what outcome changed;
- why the change was needed;
- the important implementation choices;
- validation performed;
- any real blocker, tradeoff, or follow-up that remains.

Do not pad PR descriptions with generic process narration.

See [`docs/AI_WORKFLOW.md`](docs/AI_WORKFLOW.md) for role-level orchestration and [`docs/GITHUB_AI_ACCESS.md`](docs/GITHUB_AI_ACCESS.md) for authentication/permission setup.

## 18. Communication standard

Keep progress and final reports concrete.

During work, surface meaningful findings early when they affect scope or correctness. Avoid narrating every file read, command, or obvious intermediate step.

When finished, report:

1. result / user-visible outcome;
2. important files or systems changed;
3. validation evidence;
4. PR/Issue state when relevant;
5. blockers or follow-ups only if they are real.

Do not present optional ideas as required next steps.

## 19. Parallelism and subagents

If the environment supports subagents or parallel work, use them when independent workstreams can materially improve speed or review quality, for example:

- codebase investigation + specification review;
- implementation + independent review;
- multiple independent research questions.

Do not parallelize tightly coupled edits that are likely to conflict. The primary agent remains responsible for reconciling results, preserving scope, and delivering one coherent outcome.

## 20. Current milestone handling

Do not hardcode assumptions from an old milestone into new work.

To determine current scope:

1. check [`docs/README.md`](docs/README.md) for the current milestone pointer;
2. check [`docs/ROADMAP.md`](docs/ROADMAP.md) for sequencing;
3. inspect the current milestone parent Issue and the assigned child Issue;
4. use completed reports in `docs/milestones/` only for historical facts and inherited capabilities.

A completed milestone report never authorizes future work by itself.