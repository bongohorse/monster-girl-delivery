# Monster Girl Delivery — Documentation Hub

Start here when you need to understand the project, find a specific document, or decide which source is authoritative.

This page is intentionally a **map**, not another specification. It links to the existing sources of truth instead of duplicating them.

## Project status pointer

- **Current milestone:** M2 — Horizontal Run & First Hazard
- **Current milestone parent:** [GitHub Issue #49](https://github.com/bongohorse/monster-girl-delivery/issues/49)
- **Roadmap:** [`ROADMAP.md`](ROADMAP.md)
- **Product specification:** [`../MASTER_SPEC.md`](../MASTER_SPEC.md)

The GitHub Issues/PRs are the live execution trail. Milestone closeout should update this pointer when the project advances.

---

## I am the Game Director / a human

| I want to... | Go here |
|---|---|
| Start or preview the game | [`../README.md`](../README.md) |
| See what milestone comes next | [`ROADMAP.md`](ROADMAP.md) |
| Check approved game rules and product decisions | [`../MASTER_SPEC.md`](../MASTER_SPEC.md) |
| See what is being implemented right now | the current GitHub milestone parent and its child Issues |
| Browse future gameplay, art, content, tooling, economy, and progression ideas that are **not committed scope** | [`BACKLOG.md`](BACKLOG.md) |
| Review Endless Runner / Jetpack Joyride design lessons | [`ENDLESS_RUNNER_BLUEPRINT.md`](ENDLESS_RUNNER_BLUEPRINT.md) |
| Understand the technical structure | [`../ARCHITECTURE.md`](../ARCHITECTURE.md) |
| See development commands and workflow | [`../DEVELOPMENT.md`](../DEVELOPMENT.md) |
| Review what completed milestones actually delivered | [`milestones/README.md`](milestones/README.md) |
| Review M1 real-device evidence | [`milestones/M1-device-report.md`](milestones/M1-device-report.md) |
| Understand AI/GitHub access setup | [`GITHUB_AI_ACCESS.md`](GITHUB_AI_ACCESS.md) |

### Fast human reading path

For normal project direction, you usually only need:

```text
README.md
  ↓
docs/README.md   ← you are here
  ↓
docs/ROADMAP.md
  ↓
current GitHub milestone / Issue
```

Open `MASTER_SPEC.md` when you need the exact product rule or decision state. Open `BACKLOG.md` only when discussing future ideas or design exploration.

---

## I am an AI / coding agent

Start with [`../AGENTS.md`](../AGENTS.md). Then use this hub to load only the documents relevant to the assigned task.

### Minimal implementation reading path

```text
AGENTS.md
  ↓
docs/README.md
  ↓
assigned GitHub Issue / PR
  ↓
relevant MASTER_SPEC.md sections
  ↓
ARCHITECTURE.md + DEVELOPMENT.md as needed
  ↓
existing implementation/tests
```

Do **not** treat every idea or reference document as required implementation context. In particular, `BACKLOG.md` and `ENDLESS_RUNNER_BLUEPRINT.md` contain preserved possibilities or reference lessons, not approved current scope.

### AI task routing

| Task type | Read first | Then read |
|---|---|---|
| Focused implementation / bug fix | `AGENTS.md` + assigned Issue | relevant `MASTER_SPEC.md`, `ARCHITECTURE.md`, code/tests |
| Milestone planning | `MASTER_SPEC.md` + `ROADMAP.md` | current parent Issue, `BACKLOG.md` only for explicitly promoted ideas |
| Architecture change | `ARCHITECTURE.md` + `MASTER_SPEC.md` | `DEVELOPMENT.md`, current Issue |
| Workflow / repo tooling | `DEVELOPMENT.md` + `AGENTS.md` | `AI_WORKFLOW.md`, `GITHUB_AI_ACCESS.md` |
| Historical review / closeout | `milestones/README.md` | milestone report, merged Issues/PRs, actual validation evidence |
| Art/design exploration | `BACKLOG.md` | relevant product constraints in `MASTER_SPEC.md` |
| Runner design / pacing / progression research | `ENDLESS_RUNNER_BLUEPRINT.md` | `BACKLOG.md`, relevant product constraints in `MASTER_SPEC.md` |

---

## What each document means

### Authoritative living documents

#### [`../MASTER_SPEC.md`](../MASTER_SPEC.md) — product and game truth

Use for:
- approved product decisions;
- current game rules;
- decision states such as `DECIDED`, `PROTOTYPE`, `EXPERIMENT`, `TBD`, `FUTURE`, and `OUT OF SCOPE`;
- platform and gameplay constraints.

Do not promote a future idea just because it appears elsewhere.

#### [`ROADMAP.md`](ROADMAP.md) — milestone sequence and future scope

Use for:
- M0–M9 milestone order;
- the purpose and broad scope of upcoming milestones;
- deciding which large ideas belong in which phase.

`ROADMAP.md` explicitly supersedes the older forward-looking M3–M7 milestone outline in `MASTER_SPEC.md`. It does **not** replace the product decisions in `MASTER_SPEC.md`.

#### [`../ARCHITECTURE.md`](../ARCHITECTURE.md) — technical boundaries

Use for:
- system ownership;
- timing/input/lifecycle boundaries;
- deterministic simulation rules;
- technical structure that implementation should preserve.

### Live execution state

#### GitHub Issues and Pull Requests

Use for:
- the currently approved implementation unit;
- dependencies and blockers;
- acceptance criteria;
- review discussion;
- exact implementation/merge history.

A focused Issue narrows what to build now. It must not silently override a `DECIDED` product rule or an approved architectural boundary. If it appears to do so, surface the conflict instead of guessing.

### Process and AI rules

#### [`../DEVELOPMENT.md`](../DEVELOPMENT.md)

Commands, validation, development workflow, PR discipline, and milestone-closeout process.

#### [`../AGENTS.md`](../AGENTS.md)

Mandatory repository rules for coding agents.

#### [`AI_WORKFLOW.md`](AI_WORKFLOW.md)

How human direction, AI coordination, coding agents, PRs, Issues, and automation fit together.

#### [`GITHUB_AI_ACCESS.md`](GITHUB_AI_ACCESS.md)

GitHub/Codespaces AI authentication and permissions reference.

### Preserved ideas and design references — not current requirements

#### [`BACKLOG.md`](BACKLOG.md)

The single categorized future-ideas store for MGD. It contains preserved exploration covering:

- product/gameplay ideas;
- delivery systems and modes;
- worlds and events;
- characters and cosmetics;
- Companions, progression, economy, and collection;
- HQ/cozy/minigame concepts;
- art direction and visual language;
- modular asset and technical-art pipeline ideas;
- tooling/testing/platform backlog;
- reference-game lessons;
- open design questions.

The former `GAME_DESIGN_IDEAS.md` and `ART_DIRECTION_IDEAS.md` were merged into this file on 2026-09-04. Their old paths remain only as compatibility redirects.

#### [`ENDLESS_RUNNER_BLUEPRINT.md`](ENDLESS_RUNNER_BLUEPRINT.md)

Design-reference document based on lessons from *Jetpack Joyride* and Luke Muscat's Endless Runner design process. Use it when discussing core controls, game feel, pacing waves, gameplay mutators/vehicles, fail states, missions, progression, economy, audio, performance, and Mobile Runner anti-patterns.

Nothing in these files becomes current scope until the Game Director promotes it into the specification, roadmap, or an approved Issue.

### Historical evidence

#### [`milestones/README.md`](milestones/README.md)

Index of factual milestone closeout reports. These answer **what actually shipped**, not what is planned now.

Current historical reports:
- [`milestones/M0-foundation.md`](milestones/M0-foundation.md)
- [`milestones/M1-flight-prototype.md`](milestones/M1-flight-prototype.md)

Supporting evidence lives next to the relevant reports, for example [`milestones/M1-device-report.md`](milestones/M1-device-report.md).

Historical reports should not be rewritten merely because later plans changed.

---

## Source-of-truth rules

Different documents own different kinds of truth. Do not flatten them into one giant priority list.

1. **Explicit current Game Director decision** controls product intent.
2. **`MASTER_SPEC.md`** controls durable product/game decisions.
3. **`ROADMAP.md`** controls approved milestone sequencing and the newer forward-looking milestone structure where it explicitly supersedes older planning.
4. **Current approved GitHub Issue** controls the focused implementation scope, within the product and architecture boundaries above.
5. **`ARCHITECTURE.md`** controls established technical boundaries unless an approved task intentionally changes them.
6. **`DEVELOPMENT.md`, `AGENTS.md`, and `AI_WORKFLOW.md`** control repository/process behavior.
7. **`BACKLOG.md` and `ENDLESS_RUNNER_BLUEPRINT.md`** are idea/reference stores only.
8. **Milestone closeout reports** are authoritative historical records for what actually happened, but are not forward planning documents.

When two sources appear to contradict each other on the **same kind of decision**, do not silently choose the convenient one. Check whether one explicitly supersedes the other; otherwise flag the conflict for the Game Director.

---

## Documentation maintenance rules

To keep this repo readable as it grows:

- Prefer linking to an existing source of truth instead of duplicating its content.
- Keep root-level documents for project-wide rules that agents/tools need to find immediately.
- Put supporting/reference material under `docs/`.
- Put completed milestone history under `docs/milestones/`.
- Keep future gameplay/art/design exploration centralized in `BACKLOG.md` unless a topic becomes stable enough to deserve a formal production specification.
- Do not mix future ideas into historical closeout reports.
- Do not turn backlog/reference ideas into roadmap scope without an explicit Director decision.
- Update this hub when a new major documentation category is introduced.
- At milestone closeout, update the current milestone pointer and milestone history index.
- Avoid moving established files unless the navigation benefit clearly outweighs broken-link/churn risk.

## Directory map

```text
README.md                     Human quick start / run the project
AGENTS.md                     Mandatory AI agent rules
MASTER_SPEC.md                Product/game source of truth
ARCHITECTURE.md               Technical boundaries
DEVELOPMENT.md                Development and validation workflow

docs/
├── README.md                     Documentation hub / navigation map
├── ROADMAP.md                    Approved milestone sequence
├── BACKLOG.md                    Unified categorized future ideas / design exploration
├── GAME_DESIGN_IDEAS.md          Legacy redirect → BACKLOG.md
├── ART_DIRECTION_IDEAS.md        Legacy redirect → BACKLOG.md
├── ENDLESS_RUNNER_BLUEPRINT.md   Endless Runner / Jetpack Joyride design reference
├── AI_WORKFLOW.md                Human ↔ AI workflow
├── GITHUB_AI_ACCESS.md           GitHub/Codespaces AI access reference
└── milestones/
    ├── README.md                 Milestone history index
    ├── TEMPLATE.md               Closeout template
    ├── M0-foundation.md          Completed M0 history
    ├── M1-flight-prototype.md    Completed M1 history
    └── M1-device-report.md       Supporting M1 real-device evidence
```
