# Monster Girl Delivery — Documentation Hub

This is the canonical map for MGD documentation. Use it to answer two questions quickly:

1. **Where does this information belong?**
2. **Which source wins when documents discuss related topics?**

The hub is intentionally a navigation/ownership document, not another specification.

## Current project pointer

- **Project phase:** Pre-Production
- **Current milestone:** M3 — Seeded Generation & Fairness
- **Current milestone parent:** [GitHub Issue #57](https://github.com/bongohorse/monster-girl-delivery/issues/57)
- **Roadmap:** [`ROADMAP.md`](ROADMAP.md)
- **Product/game specification:** [`../MASTER_SPEC.md`](../MASTER_SPEC.md)

GitHub Issues/PRs are the live execution trail. Completed milestone reports are historical evidence, not current planning.

---

## Fast paths

### Game Director / human

| I want to… | Go to |
|---|---|
| Start or preview the game | [`../README.md`](../README.md) |
| See what is being built now | current GitHub milestone/Issue |
| See milestone order and future milestone scope | [`ROADMAP.md`](ROADMAP.md) |
| Check an approved game/product rule | [`../MASTER_SPEC.md`](../MASTER_SPEC.md) |
| Browse unapproved future ideas | [`BACKLOG.md`](BACKLOG.md) |
| Review Endless Runner / Jetpack Joyride lessons | [`ENDLESS_RUNNER_BLUEPRINT.md`](ENDLESS_RUNNER_BLUEPRINT.md) |
| Understand technical boundaries | [`../ARCHITECTURE.md`](../ARCHITECTURE.md) |
| See commands, CI, testing, Codespaces, or closeout workflow | [`../DEVELOPMENT.md`](../DEVELOPMENT.md) |
| Review completed milestones | [`milestones/README.md`](milestones/README.md) |
| Review M1 real-device evidence | [`milestones/M1-device-report.md`](milestones/M1-device-report.md) |

Typical planning path:

```text
README.md
   ↓
docs/README.md
   ↓
docs/ROADMAP.md
   ↓
current GitHub Issue / PR
```

Open `MASTER_SPEC.md` when the exact product/game decision matters. Open `BACKLOG.md` only for future exploration/promotion discussions.

### AI / coding agent

Start with [`../AGENTS.md`](../AGENTS.md).

Typical implementation path:

```text
AGENTS.md
   ↓
docs/README.md
   ↓
assigned Issue / PR
   ↓
relevant MASTER_SPEC.md rules
   ↓
ARCHITECTURE.md / DEVELOPMENT.md as required
   ↓
existing code + tests
```

Do not load the entire backlog/reference library as implementation requirements.

---

## Source ownership

A **current explicit Game Director decision** controls product intent. Living documents should then be updated so that durable decisions are recorded in the correct source of truth rather than relying on chat/history indefinitely.

| Source | Owns | Does not own |
|---|---|---|
| [`../MASTER_SPEC.md`](../MASTER_SPEC.md) | durable product/game decisions, decision states, platform/game constraints | milestone sequence, development commands, AI workflow |
| [`ROADMAP.md`](ROADMAP.md) | M0–M9 order and milestone-level future scope | focused implementation details, product decisions outside sequencing |
| Current GitHub Issue / PR | focused live scope, acceptance criteria, dependencies, implementation/review trail | silent overrides of `DECIDED` product rules or architecture boundaries |
| [`../ARCHITECTURE.md`](../ARCHITECTURE.md) | technical ownership, service/system boundaries, current vs. planned architecture | product scope, milestone scheduling |
| [`../DEVELOPMENT.md`](../DEVELOPMENT.md) | commands, verification, Codespaces, CI, PR mechanics, milestone closeout process | product/game design |
| [`../AGENTS.md`](../AGENTS.md) | mandatory coding-agent behavior and scope discipline | product design |
| [`AI_WORKFLOW.md`](AI_WORKFLOW.md) | human/AI coordination and role orchestration | authentication setup, product scope |
| [`GITHUB_AI_ACCESS.md`](GITHUB_AI_ACCESS.md) | GitHub/Codespaces authentication and repository permissions | merge approval policy or product decisions |
| [`BACKLOG.md`](BACKLOG.md) | preserved future gameplay/art/content/tooling ideas and open questions | approved current scope |
| [`ENDLESS_RUNNER_BLUEPRINT.md`](ENDLESS_RUNNER_BLUEPRINT.md) | external design lessons/reference material | MGD requirements |
| [`milestones/`](milestones/) | factual completed history and supporting evidence | future planning |
| Existing code/tests | currently implemented behavior | product intent by themselves |

### Conflict rule

When two sources appear to conflict on the **same kind of decision**:

1. apply any current explicit Game Director decision;
2. check whether one document explicitly supersedes the other;
3. check the ownership table above;
4. if the conflict remains real, surface it to the Game Director rather than silently resolving it.

A convenient implementation detail does not override a product decision.

---

## Document guide

### `MASTER_SPEC.md` — product/game truth

Use for:

- `DECIDED`, `PROTOTYPE`, `EXPERIMENT`, `TBD`, `FUTURE`, and `OUT OF SCOPE` states;
- current core gameplay rules;
- platform/orientation strategy;
- product-level fairness/performance/production principles.

It intentionally does **not** duplicate the full milestone roadmap anymore.

### `ROADMAP.md` — sequencing

Use for:

- the approved M0–M9 sequence;
- the purpose of each milestone;
- milestone-level boundaries;
- deciding when a promoted idea is appropriate to schedule.

A roadmap item still needs focused Issues before implementation.

### `ARCHITECTURE.md` — technical boundaries

Use for:

- authoritative service/system ownership;
- time/input/lifecycle boundaries;
- gameplay-vs-presentation separation;
- current repository structure;
- clearly marked planned architecture such as seeded generation/persistence.

### `DEVELOPMENT.md` — execution mechanics

Use for:

- Bun/Vite commands;
- verification order;
- Codespaces behavior;
- tests/CI;
- dependency handling;
- PR flow;
- milestone closeout procedure.

### `AGENTS.md` — coding-agent contract

Mandatory rules for implementation agents: task entry, scope discipline, architecture/product boundaries, testing, and merge behavior.

### `AI_WORKFLOW.md` — orchestration

Describes how the Game Director, AI coordinator/reviewer, coding agents, GitHub Actions, and Renovate interact.

### `GITHUB_AI_ACCESS.md` — permissions/authentication

Describes the repository-scoped PAT/Codespaces model and what repository operations an authenticated agent can technically perform. Operational approval rules still come from `AGENTS.md` / the assigned task.

### `BACKLOG.md` — future ideas only

Single categorized store for preserved exploration including:

- gameplay/modes/delivery systems;
- worlds/events;
- characters/cosmetics;
- progression/economy/Companions;
- HQ/cozy/minigames;
- art direction and asset-production ideas;
- tooling/platform experiments;
- reference-game lessons;
- open design questions.

Nothing in the backlog becomes implementation scope until deliberately promoted.

### `ENDLESS_RUNNER_BLUEPRINT.md` — design reference

Jetpack Joyride / Endless Runner design lessons. Useful for design research, but never automatically binding on MGD.

### `milestones/` — completed history

[`milestones/README.md`](milestones/README.md) indexes factual closeout reports and supporting evidence.

Current completed reports:

- [`milestones/M0-foundation.md`](milestones/M0-foundation.md)
- [`milestones/M1-flight-prototype.md`](milestones/M1-flight-prototype.md)
- [`milestones/M2-horizontal-run-first-hazard.md`](milestones/M2-horizontal-run-first-hazard.md)
- supporting M1 evidence: [`milestones/M1-device-report.md`](milestones/M1-device-report.md)

Historical reports should be corrected only when factual evidence is wrong, not rewritten to match later plans.

---

## Documentation maintenance rules

- Link to the source of truth instead of copying large sections into multiple files.
- Keep root-level documents for project-wide rules that agents/humans need immediately.
- Keep supporting/reference/history material under `docs/`.
- Keep completed milestone history/evidence under `docs/milestones/`.
- Keep future design/art/content exploration centralized in `BACKLOG.md` until a topic becomes an approved specification.
- Do not put future ideas into historical reports.
- Do not turn backlog/reference ideas into roadmap scope without a Game Director decision.
- Remove historical phase-specific instructions from living workflow/architecture docs once the milestone report owns that history.
- Distinguish **current implementation** from **planned architecture** explicitly.
- Update this hub when a major document is added, removed, renamed, or changes ownership.
- At milestone closeout, update the current milestone pointer and milestone history index.

---

## Directory map

```text
README.md                     Human quick start
AGENTS.md                     Mandatory coding-agent rules
MASTER_SPEC.md                Product/game source of truth
ARCHITECTURE.md               Technical architecture boundaries
DEVELOPMENT.md                Commands, validation, workflow

docs/
├── README.md                     Documentation hub / ownership map
├── ROADMAP.md                    Approved milestone sequence
├── BACKLOG.md                    Unified future ideas / exploration
├── ENDLESS_RUNNER_BLUEPRINT.md   Endless Runner design reference
├── AI_WORKFLOW.md                Human ↔ AI orchestration
├── GITHUB_AI_ACCESS.md           GitHub/Codespaces auth + permissions
├── GAME_DESIGN_IDEAS.md          Compatibility stub → BACKLOG.md
├── ART_DIRECTION_IDEAS.md        Compatibility stub → BACKLOG.md
└── milestones/
    ├── README.md                 Milestone history index
    ├── TEMPLATE.md               Closeout template
    ├── M0-foundation.md          Completed M0 history
    ├── M1-flight-prototype.md    Completed M1 history
    ├── M2-horizontal-run-first-hazard.md
    │                             Completed M2 history
    └── M1-device-report.md       Supporting M1 device evidence
```

The two `*_IDEAS.md` compatibility stubs remain only so previously shared external links continue to resolve. New documentation should link directly to `BACKLOG.md`.
