# AI Workflow

[← Documentation Hub](README.md)

This document owns the **human ↔ AI orchestration model** for Monster Girl Delivery. Mandatory coding-agent behavior lives in [`../AGENTS.md`](../AGENTS.md); GitHub authentication/permissions live in [`GITHUB_AI_ACCESS.md`](GITHUB_AI_ACCESS.md). Jules-specific dispatch/review mechanics live in [`JULES_WORKFLOW.md`](JULES_WORKFLOW.md).

The workflow is designed to maximize useful completed work while preventing scope drift, speculative architecture, and low-value AI churn.

## Operating principles

### 1. Outcome over activity

AI work should move an approved game, engineering, documentation, or repository outcome forward. More files, tests, abstractions, Issues, comments, or commits do not automatically mean more value.

A proposed change should be traceable to at least one of:

- an explicit Game Director request;
- an acceptance criterion;
- a verified bug or regression risk;
- necessary integration/validation for the requested outcome;
- a meaningful architecture, performance, reliability, or maintainability problem already in scope.

Do not manufacture work to make a task look larger or more complete.

### 2. Follow through on authorized work

When the Game Director asks for implementation or repository changes, the responsible AI should carry the task through the available workflow: inspect, change, integrate, validate, and open/update the PR when repository access exists.

Do not stop after saying what could be done, writing a plan, or implementing an isolated helper if the requested outcome still requires wiring or validation.

### 3. Questions are for consequential ambiguity

Do not interrupt routine execution for choices that can be resolved from existing code, architecture, conventions, or a reversible default.

Ask the Game Director when different answers would materially change product intent, game rules, architecture, irreversible/external effects, cost, or another outcome that the repository cannot determine.

Before asking, complete all useful work that does not depend on the answer so the remaining decision is concrete.

### 4. Keep the instruction stack small

Do not duplicate the full repository rules into Issues, PRs, skills, or prompts. Link to canonical sources instead.

Skills and references support execution. They do not independently authorize product features or override `AGENTS.md`, the current task, or the owning source of truth.

### 5. Evidence before agent confidence

Treat AI output as a claim to verify, not authority.

A confident explanation, generated test, or elaborate failure scenario is not sufficient evidence by itself. For material findings, verify the real call path, how the state can actually be produced, what invariant fails, and whether the scenario is reachable under current validated/runtime behavior.

Do not create implementation work around impossible synthetic states merely because an agent can construct them in a unit test. The generic evidence/realism rules in [`../AGENTS.md`](../AGENTS.md) apply to implementation agents and reviewers alike.

---

## Roles

### Game Director / Product Owner

Owns:

- product decisions;
- game feel;
- scope and priorities;
- acceptance/rejection;
- manual playtest evidence;
- promotion of future ideas into approved scope.

The Game Director is the final authority on what the game should become.

### AI coordinator / reviewer

May help with:

- design/research;
- architecture/technical strategy;
- roadmap/task breakdown;
- GitHub Issue/PR organization;
- reviewing diffs and CI;
- documentation maintenance;
- milestone closeout/history;
- merge/repository coordination when the user's task explicitly includes that role.

The coordinator should improve the **quality of decisions and work units**, not create administrative overhead. It should challenge vague, redundant, or low-value work before creating Issues for it.

### Coding agent

Examples include Codex, Claude Code, Gemini CLI, or another repository-aware implementation agent.

A coding agent implements **one approved focused task at a time** by default and follows [`../AGENTS.md`](../AGENTS.md).

It should make routine implementation decisions autonomously inside existing product/architecture boundaries, complete the task rather than stop at partial scaffolding, and avoid silently continuing into the next independent Issue.

### Jules — supporting research/scoping/review agent

Jules currently supports bounded research, scoping, and read-only audits. Coding dispatch is paused under the [Jules operational policy and capability gate](JULES_WORKFLOW.md#1-current-operational-status); the retained coding integration is not current implementation authorization.

Use the owning [Jules workflow](JULES_WORKFLOW.md) for native dispatch, `@Jules` feedback, and evidence verification.

### Specialist / subagent

When supported by the environment, a specialist agent may take an independent bounded workstream such as research, codebase inspection, or review.

Subagents do not own product decisions and do not expand scope. Their output is input to the primary agent, which remains responsible for reconciling conflicts and delivering one coherent result.

### GitHub Actions

Automated validation. Green CI means the configured checks passed; it does not itself prove product acceptance or authorize a scope change.

### Renovate

Owns routine dependency-update PRs only.

---

## Documentation routing

Use [`README.md`](README.md) as the canonical map.

Key sources:

- `../MASTER_SPEC.md` — durable product/game decisions;
- `ROADMAP.md` — milestone sequencing;
- current GitHub Issue / PR — focused live scope;
- `../ARCHITECTURE.md` — technical boundaries;
- `../DEVELOPMENT.md` — commands, validation, CI/PR mechanics, closeout process;
- `JULES_WORKFLOW.md` — Jules-specific dispatch, review, environment, and trust model;
- `BACKLOG.md` — future ideas only;
- `ENDLESS_RUNNER_BLUEPRINT.md` — design reference only;
- `milestones/` — completed factual history.

Do not infer implementation scope from an idea/reference document.

---

## Writing high-value tasks

A focused coding task should normally state:

1. **Goal** — what changes for the game/user/developer when this is done?
2. **Context** — why this work exists now.
3. **Scope** — systems/files/behaviors expected to change when known.
4. **Acceptance criteria** — observable conditions that prove completion.
5. **Non-goals** — only where nearby work is likely to cause scope drift.
6. **Validation** — automated/manual evidence appropriate to the outcome.
7. **Dependencies** — only real ordering/blocking relationships.

Acceptance criteria should describe behavior or evidence, not implementation trivia unless a technical constraint itself matters.

Weak criterion:

```text
Create a new helper class for encounter spacing.
```

Stronger criterion:

```text
Generated encounters cannot violate the approved minimum recovery spacing,
and deterministic tests cover the boundary cases.
```

The implementation may still use a helper class, but the task is judged on the outcome.

## Issue decomposition test

Create a child Issue only when the work has a meaningful independent outcome and review boundary.

A child Issue should normally have:

- its own acceptance criteria;
- a coherent change that can be reviewed independently;
- a reason to schedule/sequence it separately;
- enough value that completing it alone visibly advances the parent outcome.

Do **not** create separate Issues merely for:

- a tiny helper extraction;
- adding one obvious test alongside an implementation;
- renaming/refactoring files needed by the same change;
- updating docs that naturally belong with the implemented behavior;
- speculative future polish with no approved need.

This keeps Jules/Codex/other agents from consuming time on administratively neat but low-value fragments.

---

## Milestone planning

Milestones and large parent Issues are planning containers, not default implementation units.

Before coding a large milestone:

- split genuinely independent responsibilities into focused child Issues;
- give each child outcome-based acceptance criteria;
- record real dependencies/order where relevant;
- avoid decomposing below a useful review boundary;
- obtain Game Director approval for the milestone plan before automatically starting implementation, unless the Director explicitly asked for planning + execution in one task.

## Default implementation unit

```text
one focused Issue
→ one branch
→ one Pull Request
→ verification
→ stop
```

Multiple independent sub-issues should not be bundled into one agent run/PR unless the Game Director explicitly asks for that combined operation.

Useful discoveries outside scope become follow-up Issues/backlog notes only when they have enough value to justify independent work. Minor observations belong in the final report rather than the backlog.

### Agent dispatch discipline

A coding-agent label or assignment is an execution mechanism, not a scope decision.

Before dispatching a focused Issue to an eligible agent:

- verify the Issue is actually unblocked;
- verify status labels and dependency text are current;
- confirm no other agent is already implementing the same Issue;
- confirm the Issue remains in the current approved workstream.

Do not run two implementation agents against the same Issue merely because parallel capacity is available.

---

## Scope safety

An AI must not infer a feature merely because it:

- appeared in an old discussion;
- exists in `BACKLOG.md`;
- appears in a design reference;
- exists in a future roadmap milestone;
- appears in an available skill;
- would make implementation easier;
- looks like a common “best practice”.

If documentation appears contradictory, apply the ownership rules in [`README.md`](README.md). Surface real conflicts rather than choosing the convenient source.

---

## Implementation flow

Default coding-agent flow:

```text
approved focused task
→ inspect authoritative sources
→ inspect existing implementation/tests
→ identify the real runtime/integration path
→ implement the smallest coherent production change
→ integrate it completely
→ run proportionate checks while iterating
→ run required completion validation
→ open/update PR
→ report evidence
→ stop
```

“Completely” means the requested behavior is connected to the real system, not merely represented by an unused module, mock, TODO, or isolated unit test.

Merge authorization, including execution under an already explicit “merge if clean” instruction, follows [`AGENTS.md` §17](../AGENTS.md#17-github--pr-discipline).

## Testing calibration

Use tests where they protect behavior, invariants, deterministic rules, or reproduced bugs.

Avoid tests that exist only to mirror internal implementation or inflate apparent completeness. Prefer the narrowest useful check during iteration, then run the repository-required completion checks for code/configuration work.

Documentation-only changes do not need game build/test runs when they cannot affect runtime behavior, unless a documentation-specific validation exists.

When a gameplay-authority change needs evidence beyond normal CI, use the canonical selection/review policy in [`TEST_QUALITY.md`](TEST_QUALITY.md) rather than automatically requesting every available test tool.

Manual playtest/device evidence is required when automated checks cannot prove the acceptance criterion, especially for game feel, touch behavior, presentation, lifecycle, and subjective tuning.

## Coordination / review flow

```text
PR
→ verify intended outcome and scope
→ inspect diff and integration path
→ verify claimed scenarios are actually reachable/relevant
→ look for dead/scaffold-only work
→ verify tests are meaningful
→ verify exact-head CI when required
→ evaluate acceptance criteria
→ request/fix blockers if needed
→ merge when explicitly authorized
→ verify main / Issue state when relevant
```

A reviewer should prioritize issues that can change correctness, user experience, determinism, performance, architecture ownership, safety, or maintainability. Do not block a PR on personal style or optional cleanup that does not matter to the task.

For an AI-generated finding, ask whether the failure can be reached through current supported behavior before treating the finding as a blocker. A complicated synthetic test is not proof that real production code can enter that state.

Human review may be required by the task/repository policy; CI never substitutes for product acceptance.

---

## Research and reference adoption

Research is useful when it changes a decision or improves a concrete task.

When studying another game, repository, framework example, article, or Phaser skill:

1. extract the principle or technique;
2. explain why it is relevant to MGD;
3. distinguish proven facts from inference;
4. map it to existing approved work if appropriate;
5. create a new Issue only when there is a concrete, valuable implementation outcome not already covered.

Do not copy architecture or create features merely because another project has them.

---

## Parallel work

Use parallel/subagent work when independent workstreams can save meaningful time or provide an independent quality check. Good examples:

- repository inspection in one stream and source/reference research in another;
- implementation in one stream and independent review in another;
- multiple unrelated evidence-gathering tasks for a planning decision.

Avoid parallel editing of tightly coupled code where coordination cost and merge conflicts outweigh the benefit.

High concurrency is primarily a throughput tool for **independent work**, not permission to multiply speculative tasks. Consolidate duplicate findings and verify them before opening follow-up Issues.

---

## Milestone closeout flow

```text
milestone implementation complete
        ↓
required manual/device validation
        ↓
blocker fixes + retest if needed
        ↓
factual milestone closeout report
        ↓
close/transition milestone planning state
        ↓
promote next milestone
```

Closeout mechanics and required report contents are defined in [`../DEVELOPMENT.md`](../DEVELOPMENT.md). Historical reports belong in `milestones/` and record what actually happened.

---

## GitHub access

Authentication mechanisms may differ by agent/environment. See [`GITHUB_AI_ACCESS.md`](GITHUB_AI_ACCESS.md).

That document describes **technical permission capability**, not automatic authorization to perform every permitted action.

For an explicitly requested repository implementation, routine branch/commit/push/PR operations are part of delivering the requested work. Merge/deploy/destructive or account-level operations remain explicit boundaries under [`../AGENTS.md`](../AGENTS.md).

For Jules, prefer its native GitHub App over injecting the Codespaces PAT. Dispatch and feedback must follow the current capability gate in [`JULES_WORKFLOW.md`](JULES_WORKFLOW.md).

Never expose tokens, weaken repository protections, or change account/repository administration merely to make automation easier.

---

## Completion report

A useful agent completion report is short and evidence-based. It should state:

- what outcome is now complete;
- important implementation/documentation changes;
- validation performed and its result;
- PR/Issue state when applicable;
- real blockers or follow-ups, if any.

Do not add generic praise, repeat the full task, list every command/file touched, or invent optional next work just to end with a recommendation.