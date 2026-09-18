# Monster Girl Delivery — Documentation Hub

This is the canonical map for MGD documentation. Use it to answer two questions quickly:

1. **Where does this information belong?**
2. **Which source wins when documents discuss related topics?**

The hub is intentionally a navigation/ownership document, not another specification.

## Project status and planning

- **Live phase/progress:** [GitHub Milestones](https://github.com/bongohorse/monster-girl-delivery/milestones)
- **Approved milestone sequence/scope:** [`ROADMAP.md`](ROADMAP.md)
- **Completed milestone history/evidence:** [`milestones/README.md`](milestones/README.md)
- **Product/game specification:** [`../MASTER_SPEC.md`](../MASTER_SPEC.md)

GitHub Milestones and focused Issues/PRs are the live execution trail. Completed milestone reports are historical evidence, not current planning.

---

## Fast paths

### Game Director / human

| I want to… | Go to |
|---|---|
| Start or preview the game | [`../README.md`](../README.md) |
| See what is being built now | [GitHub Milestones](https://github.com/bongohorse/monster-girl-delivery/milestones) |
| See milestone order and future milestone scope | [`ROADMAP.md`](ROADMAP.md) |
| Check an approved game/product rule | [`../MASTER_SPEC.md`](../MASTER_SPEC.md) |
| Browse unapproved future ideas | [`BACKLOG.md`](BACKLOG.md) |
| Review Endless Runner / Jetpack Joyride lessons | [`ENDLESS_RUNNER_BLUEPRINT.md`](ENDLESS_RUNNER_BLUEPRINT.md) |
| Review the detailed Jetpack Joyride wiki research pass | [`JETPACK_JOYRIDE_WIKI_RESEARCH.md`](JETPACK_JOYRIDE_WIKI_RESEARCH.md) |
| Review the deeper Jetpack Joyride systems/content-grammar analysis | [`JETPACK_JOYRIDE_WIKI_DEEP_DIVE.md`](JETPACK_JOYRIDE_WIKI_DEEP_DIVE.md) |
| Understand technical boundaries | [`../ARCHITECTURE.md`](../ARCHITECTURE.md) |
| See commands, CI, testing, Codespaces, or closeout workflow | [`../DEVELOPMENT.md`](../DEVELOPMENT.md) |
| See human ↔ AI orchestration | [`AI_WORKFLOW.md`](AI_WORKFLOW.md) |
| Use Jules as a GitHub-native assistant safely | [`JULES_WORKFLOW.md`](JULES_WORKFLOW.md) |
| Review AI GitHub authentication/permissions | [`GITHUB_AI_ACCESS.md`](GITHUB_AI_ACCESS.md) |
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

Jules-specific dispatch/review/environment rules live in [`JULES_WORKFLOW.md`](JULES_WORKFLOW.md). They supplement rather than replace `AGENTS.md`.

Do not load the entire backlog/reference library as implementation requirements.

---

## Source ownership

A **current explicit Game Director decision** controls product intent. Living documents should then be updated so that durable decisions are recorded in the correct source of truth rather than relying on chat/history indefinitely.

| Source | Owns | Does not own |
|---|---|---|
| [`../MASTER_SPEC.md`](../MASTER_SPEC.md) | durable product/game decisions, decision states, platform/game constraints | milestone sequence, development commands, AI workflow |
| [`ROADMAP.md`](ROADMAP.md) | M0–M10 order, milestone versions, and milestone-level future scope | focused implementation details, product decisions outside sequencing |
| Native GitHub Milestone | numbered roadmap-phase membership/progress and explicitly approved non-numbered cross-cutting/tooling initiative membership/progress | roadmap sequencing, detailed dependency planning, historical closeout evidence |
| Milestone umbrella Issue | detailed live planning, ordering, dependencies, Director decisions, and acceptance trail for one milestone | replacing the native milestone progress view or the roadmap |
| Focused GitHub Issue / PR | concrete live scope, acceptance criteria, implementation/review trail | silent overrides of `DECIDED` product rules or architecture boundaries |
| [`../ARCHITECTURE.md`](../ARCHITECTURE.md) | technical ownership, service/system boundaries, current vs. planned architecture | product scope, milestone scheduling |
| [`../DEVELOPMENT.md`](../DEVELOPMENT.md) | commands, verification, Codespaces, CI, PR mechanics, milestone closeout process | product/game design |
| [`../AGENTS.md`](../AGENTS.md) | mandatory coding-agent behavior and scope discipline | product design |
| [`AI_WORKFLOW.md`](AI_WORKFLOW.md) | human/AI coordination and role orchestration | authentication setup, product scope |
| [`JULES_WORKFLOW.md`](JULES_WORKFLOW.md) | Jules-specific dispatch, planning/review, evidence/trust, concurrency, scheduled-task, and environment rules | product scope, general agent rules |
| [`GITHUB_AI_ACCESS.md`](GITHUB_AI_ACCESS.md) | GitHub/Codespaces/Jules authentication and repository permissions | merge approval policy or product decisions |
| [`BACKLOG.md`](BACKLOG.md) | preserved future gameplay/art/content/tooling ideas and open questions | approved current scope |
| [`ENDLESS_RUNNER_BLUEPRINT.md`](ENDLESS_RUNNER_BLUEPRINT.md) | external design lessons/reference material | MGD requirements |
| [`JETPACK_JOYRIDE_WIKI_RESEARCH.md`](JETPACK_JOYRIDE_WIKI_RESEARCH.md) | detailed source-backed Jetpack Joyride wiki research and MGD design deductions | approved requirements, milestone scope, final balance/content decisions |
| [`JETPACK_JOYRIDE_WIKI_DEEP_DIVE.md`](JETPACK_JOYRIDE_WIKI_DEEP_DIVE.md) | deeper Jetpack Joyride system interactions, content grammar, consequence semantics and future design deductions | approved requirements, automatic implementation scope, final balance/content decisions |
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

- the approved M0–M10 sequence and milestone/version mapping;
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

Mandatory rules for implementation agents: task entry, scope discipline, evidence/realism, architecture/product boundaries, testing, and merge behavior.

### `AI_WORKFLOW.md` — orchestration

Describes how the Game Director, AI coordinator/reviewer, coding agents, Jules research/review, GitHub Actions, and Renovate interact.

### `JULES_WORKFLOW.md` — Jules operating policy

Owns Jules research/scoping/review use, the paused coding status and capability gate, retained native `jules` dispatch and `@Jules` feedback, evidence checks, scheduled tasks, and environment setup.

### `GITHUB_AI_ACCESS.md` — permissions/authentication

Describes the repository-scoped PAT/Codespaces model, the Jules GitHub App model, and what repository operations an authenticated agent can technically perform. Operational approval rules still come from `AGENTS.md` / the assigned task.

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

### `JETPACK_JOYRIDE_WIKI_RESEARCH.md` — detailed reference supplement

Source-backed notes from a focused Jetpack Joyride Wiki research pass. It records reusable hazard, temporary-mode, collectible-path, mission, loadout, fail-state, event, and progression-layering lessons and maps them onto existing/future MGD Issues. It remains reference material rather than automatic implementation scope.

### `JETPACK_JOYRIDE_WIKI_DEEP_DIVE.md` — deeper systems research

Second-pass research that focuses on interactions between systems rather than feature inventory: global complexity budgeting, hazard-family grammar, movement-mode-specific encounter geometry, consequence classes, chase/set-piece structures, Gear sidegrades, objective taxonomy, achievements, event capability matrices, and historical prototype/deletion lessons. It remains future-design reference material and cannot promote work into the current milestone by itself.

### `milestones/` — completed history

[`milestones/README.md`](milestones/README.md) indexes factual closeout reports and supporting evidence.

Current completed reports:

- [`milestones/M0-foundation.md`](milestones/M0-foundation.md)
- [`milestones/M1-flight-prototype.md`](milestones/M1-flight-prototype.md)
- [`milestones/M2-horizontal-run-first-hazard.md`](milestones/M2-horizontal-run-first-hazard.md)
- [`milestones/M3-seeded-generation-fairness.md`](milestones/M3-seeded-generation-fairness.md)
- [`milestones/M4-run-pacing-hazard-language.md`](milestones/M4-run-pacing-hazard-language.md)
- supporting M1 evidence: [`milestones/M1-device-report.md`](milestones/M1-device-report.md)
- supporting M3 evidence: [`milestones/M3-seeded-run-validation.md`](milestones/M3-seeded-run-validation.md)
- supporting M4 evidence: [`milestones/M4-run-pacing-validation.md`](milestones/M4-run-pacing-validation.md)

M4 closeout is recorded in [`milestones/M4-run-pacing-hazard-language.md`](milestones/M4-run-pacing-hazard-language.md) with supporting evidence in [`milestones/M4-run-pacing-validation.md`](milestones/M4-run-pacing-validation.md).

For live milestone progress, use [GitHub Milestones](https://github.com/bongohorse/monster-girl-delivery/milestones). Historical reports should be corrected only when factual evidence is wrong, not rewritten to match later plans.

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
- Use native GitHub Milestones for numbered phase membership/progress and explicitly approved non-numbered cross-cutting/tooling initiatives; use umbrella Issues for detailed planning and dependency/acceptance context.
- Backfill historical native milestone assignments sequentially (M0, verify, then M1, verify, then M2, ...), never as an unaudited bulk reassignment.
- Numbered roadmap milestones still own version progression and require factual closeout reports. Non-numbered tooling/cross-cutting milestones do not alter M0–M10 sequencing or versioning; close them against their approved umbrella acceptance/evidence instead.
- At numbered milestone closeout, verify native milestone membership, merge the factual closeout report, close the native milestone, and update the milestone history index plus any genuinely changed roadmap scope.

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
├── JETPACK_JOYRIDE_WIKI_RESEARCH.md
│                                 Detailed Jetpack Joyride wiki research supplement
├── JETPACK_JOYRIDE_WIKI_DEEP_DIVE.md
│                                 Deeper systems/content-grammar research
├── AI_WORKFLOW.md                Human ↔ AI orchestration
├── JULES_WORKFLOW.md             Jules dispatch/review/trust/environment workflow
├── GITHUB_AI_ACCESS.md           GitHub/Codespaces/Jules auth + permissions
├── GAME_DESIGN_IDEAS.md          Compatibility stub → BACKLOG.md
├── ART_DIRECTION_IDEAS.md        Compatibility stub → BACKLOG.md
└── milestones/
    ├── README.md                 Milestone history index
    ├── TEMPLATE.md               Closeout template
    ├── M0-foundation.md          Completed M0 history
    ├── M1-flight-prototype.md    Completed M1 history
    ├── M2-horizontal-run-first-hazard.md
    │                             Completed M2 history
    ├── M3-seeded-run-validation.md
    │                             Supporting M3 validation evidence
    ├── M3-seeded-generation-fairness.md
    │                             Completed M3 history
    ├── M4-run-pacing-validation.md
    │                             Supporting M4 validation evidence
    ├── M4-run-pacing-hazard-language.md
    │                             Completed M4 history
    └── M1-device-report.md       Supporting M1 device evidence
```

The two `*_IDEAS.md` compatibility stubs remain only so previously shared external links continue to resolve. New documentation should link directly to `BACKLOG.md`.
