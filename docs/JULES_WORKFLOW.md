# Jules Workflow

[← Documentation Hub](README.md)

This document defines the **Jules-specific operating workflow** for Monster Girl Delivery (MGD).

Mandatory behavior for every coding agent still comes from [`../AGENTS.md`](../AGENTS.md). Human/AI orchestration is owned by [`AI_WORKFLOW.md`](AI_WORKFLOW.md). GitHub authentication and permission boundaries are owned by [`GITHUB_AI_ACCESS.md`](GITHUB_AI_ACCESS.md).

Jules is a **supporting research/scoping/review capability with a retained coding integration**, not a product authority and not a source of truth. Its output must be treated as a proposal backed by repository evidence—not as fact merely because the agent sounds confident.

## 1. Current operational status

**Jules coding is currently paused for MGD.**

Recent MGD evaluations found useful repository understanding and occasional strong findings, but implementation reliability was not consistently high enough to offset the review, correction, and cleanup work created by Jules-authored code. The repository therefore keeps the Jules integration and coding workflow documented for future use without treating the current Jules models as approved implementation agents.

This is a capability decision, not a permanent rejection of Jules and not a rule tied to a specific model name.

### Enabled now

Use Jules for bounded work where a wrong answer cannot silently become production code:

- repository and architecture research;
- Issue scoping and implementation-boundary analysis;
- research for an already proposed feature or feature request;
- comparing implementation approaches before an Issue is ready;
- bounded adversarial audits that are **read-only by default**;
- documentation, API, dependency, browser/platform, and toolchain research;
- browser-facing visual verification as additional evidence;
- scheduled research, monitoring, and compatibility/model-capability watches.

Important research findings should be promoted into the normal GitHub Issue/PR/review trail before they influence implementation scope.

### Paused now

Do not currently dispatch Jules to:

- implement features;
- fix production defects;
- refactor production code;
- add or rewrite tests as an implementation task;
- remove or change dependencies;
- auto-fix CI failures by changing code;
- perform autonomous cleanup, optimization, hardening, or maintenance PRs;
- act as the implementation owner of a GitHub Issue.

Keep Reactive Mode enabled where practical so Jules does not act on repository work unless deliberately invoked.

### Coding capability gate

Do not re-enable Jules coding merely because a new model name appears in the UI.

When Jules receives a materially improved model or agent revision, run a focused MGD capability re-evaluation before changing this policy. The evaluation should include at least:

1. a bounded read-only adversarial code audit with findings checked against the repository;
2. a small reproducible bug fix with a clear supported runtime path and regression criterion; and
3. a bounded integration task with explicit acceptance criteria and existing architecture constraints.

Evaluate the result on correctness, scope discipline, runtime integration, test quality, invented assumptions, and **net review/repair burden**. Coding should be re-enabled only when the new Jules capability is a clear productivity gain rather than merely capable of producing a passing PR.

A Game Director decision is required to change the current `coding paused` status.

## 2. Trust model: verify, do not assume

Jules can produce useful analysis quickly, but it can also:

- state repository facts that are not true;
- invent APIs/files/behavior that do not exist;
- propose defensive code for states the application cannot actually reach;
- construct synthetic tests around absurd or impossible scenarios;
- recommend helpers/abstractions/tests that do not advance the task;
- mistake a passing isolated test for real runtime integration.

Therefore every Jules finding passes two gates.

### Reality gate

A reported defect or risk should normally be reachable from the current production/test contract.

Before treating a Jules finding as actionable, verify:

1. **Entry point** — what real public/runtime path reaches the code?
2. **State origin** — how can the problematic state be produced through supported inputs/configuration/lifecycle?
3. **Failure** — what observable invariant or acceptance criterion is violated?
4. **Evidence** — exact code path, deterministic reproduction, failing test, trace, authoritative external source, or other concrete evidence.

A scenario that requires mutating private fields, bypassing existing validators, fabricating impossible configuration, or calling an internal method in an order the application never can is **not automatically a product bug**.

### Value gate

Even a real observation does not automatically justify implementation work.

A follow-up should materially satisfy an acceptance criterion, fix a reachable defect, protect a meaningful invariant, complete required integration, or address a demonstrated performance/reliability/maintenance problem.

Do not promote a Jules suggestion merely because it:

- proposes another test;
- extracts a helper;
- introduces a wrapper or interface;
- handles a theoretical state;
- raises coverage;
- follows a generic "best practice";
- makes code look more architecturally elaborate.

If the observation would not meaningfully affect an approved outcome, it probably does not deserve implementation work.

## 3. Active Jules task shapes

Prefer a small set of outcome-oriented task shapes over a large prompt catalog. These are starting structures, not authority to expand scope or bypass the Issue, `AGENTS.md`, or the reality/value gates.

| Task shape | Use it when | Required outcome |
|---|---|---|
| **Issue scoping** | an approved outcome is too large or ambiguous for one implementation unit | inspect authoritative sources; return goal, runtime path, smallest coherent scope, acceptance criteria, non-goals, validation, and real dependencies; do not implement |
| **Research / feature-request research** | a proposed feature, dependency, API, browser behavior, reference game, tool, or approach needs evidence before a decision | answer the bounded question with repository/external evidence, tradeoffs, applicability to MGD, and unresolved decisions; do not silently promote the subject into approved scope |
| **Adversarial audit** | an independent review of a bounded system/invariant is useful | read-only; actively try to disprove suspected findings; report only findings with a real entry point, reachable state origin, violated invariant, concrete evidence, current coverage, and smallest reasonable follow-up |
| **Visual verification** | a browser-facing state needs additional rendered evidence | render the relevant state when practical; report exactly what the screenshot demonstrates and what it cannot prove |
| **Scheduled research/watch** | a recurring external or repository condition can change and the result would inform a later decision | inspect and report material changes; no code changes or autonomous PRs while coding is paused |

Do not copy generic prompts such as "improve the codebase", "add more tests", "find tech debt", "optimize everything", or "generate useful features" into MGD tasks. They reward activity rather than approved outcomes.

### Dormant coding task shapes

The following shapes remain documented conceptually so the integration can be restored quickly after the coding capability gate passes, but they are **not currently authorized Jules tasks**:

- verified bug fix;
- invariant/property-test implementation;
- dependency cleanup;
- focused feature implementation;
- CI-fix code changes.

If coding is re-enabled later, these tasks must still use the same reality/value gates, focused Issue ownership, exact-head review, and required repository validation.

## 4. GitHub-native coordination

GitHub remains the durable handoff layer between the Game Director, coordinator/reviewer, Jules research, and any implementation agent.

### Current rule while coding is paused

Do **not** use the `jules` label to dispatch implementation Issues while the coding gate is closed.

Keep `ai:coder` as the general coding-agent-suitable classification where useful. A future reactivation of Jules coding may reuse the existing `jules` label dispatch model without redesigning the workflow.

Use manual Jules tasks or other bounded Jules entry points for current research/scoping/audit work. When a result matters:

```text
bounded Jules research/audit
→ coordinator verifies evidence
→ useful finding is recorded on the owning Issue/PR or promoted into a focused Issue
→ approved implementation goes to the currently trusted implementation agent
```

Do not ask the Game Director to relay routine text manually when a durable GitHub comment or Issue can carry the result.

### Dormant implementation dispatch

If the coding capability gate is reopened, the retained implementation flow is:

```text
approved focused Issue
→ verify dependencies / status
→ add GitHub label `jules`
→ Jules starts from the Issue
→ Jules implements + validates
→ Jules opens/links a Pull Request
→ review exact PR diff + CI
→ targeted feedback through the owning PR
→ merge only when explicitly authorized
```

The `jules` label is a dispatch trigger, never product approval by itself.

## 5. Planning approach

For current Jules use:

| Work | Preferred approach |
|---|---|
| Read-only repository status/inspection | Standard task |
| Issue scoping | Standard task or Interactive Plan when ambiguity benefits from discussion |
| Bounded adversarial audit | Standard task, explicitly read-only |
| External/API/tool/reference research | Standard task |
| Recurring research/compatibility watch | Scheduled task |
| Production implementation | **Paused** |

A good research/scoping plan should identify the real question, authoritative sources, repository relevance, evidence required, and explicit non-goals. Reject plans whose deliverable is mainly speculative architecture or activity without a decision-relevant result.

## 6. Visual verification

Jules supports browser-facing visual verification. Use it as **additional evidence**, not as a substitute for the evidence class an acceptance criterion actually requires.

Good candidates include:

- Director/debug UI;
- HUD and menus;
- responsive layout and viewport behavior;
- CSS/DOM presentation;
- obvious browser rendering regressions;
- comparison of a proposed browser-facing behavior during research.

A screenshot proves only the rendered state it shows. It does **not** prove game feel, touch behavior, timing/fairness, animation quality across time, pause/background lifecycle, performance, or device-specific behavior.

Do not add screenshot artifacts to the repository merely to demonstrate that Jules rendered the page. Commit visual artifacts only when the assigned task explicitly requires them as durable project output.

## 7. Jules-authored code review standard — dormant but retained

If the coding capability gate is reopened later, Jules-authored code receives the same review standard as any other agent code. Green CI is not approval.

Review in this order:

1. **Issue scope** — does the diff implement the assigned outcome and only that outcome?
2. **Runtime integration** — is the new behavior actually connected to the production path when required?
3. **Reality** — do tests and fixes model states reachable through supported application boundaries?
4. **Authority** — are timing, input, randomness, generation, collision, persistence, and Director boundaries preserved?
5. **Value** — did Jules add low-value wrappers, tests, abstractions, comments, or defensive code unrelated to the outcome?
6. **Regression evidence** — do tests protect behavior/invariants rather than mirror implementation details?
7. **Validation** — are required local checks and exact-head CI green?
8. **Manual evidence** — if the criterion concerns feel, device behavior, presentation, or lifecycle, has real manual evidence been supplied instead of simulated claims?
9. **Repair burden** — did review require enough correction that Jules was not actually a productivity gain?

A large diff is not proof of thoroughness.

## 8. PR feedback and CI fixer — paused for Jules coding

Jules can respond to PR feedback and can automatically react to CI failures on PRs it creates. Those capabilities remain useful platform features, but **MGD does not currently use them to authorize Jules production-code changes**.

While coding is paused:

- do not mention `@Jules` with instructions to implement fixes on production PRs;
- do not rely on Jules CI auto-fixing as an implementation loop;
- use Jules comments for bounded research/analysis only when useful;
- route approved code changes to the currently trusted implementation workflow.

If coding is re-enabled later, prefer Reactive Mode and keep the retained feedback sequence:

```text
review finding
→ focused owning-PR comment
→ explicitly invoke Jules
→ fix
→ CI
→ re-review exact head
```

Automatic CI fixing must never weaken tests, lint/type safety, architecture constraints, or product behavior merely to make a check green.

## 9. Concurrency policy

Jules can run many tasks in parallel, but available concurrency is not a reason to create more work.

Current rules:

- use parallelism mainly for genuinely independent read-only research questions;
- do not run multiple agents to repeat the same weak hypothesis;
- reconcile independent audit findings before creating follow-up implementation work;
- do not have Jules research and another agent implementation race on an unsettled product/architecture decision;
- if Jules coding is re-enabled later, one active implementation owner per focused Issue remains mandatory.

## 10. Scheduled tasks

Scheduled Jules tasks are currently most valuable to MGD as **research/reporting automation**, not autonomous code maintenance.

Good current categories include:

- Phaser, Bun, Vite, TypeScript, browser, or mobile-Web compatibility/release watch relevant to the current stack;
- material upstream changes that could affect an existing MGD system;
- dependency/API documentation watch where a future migration decision may be needed;
- research on a bounded proposed feature or reference-game system;
- browser/platform behavior research relevant to current mobile targets;
- Jules product/model/capability watch to identify when another coding capability evaluation is justified;
- periodic re-checks of a known external uncertainty with a clear decision consequence.

A current scheduled task should normally behave like:

```text
inspect the bounded question
→ identify material new evidence since the previous run
→ report evidence + MGD relevance
→ recommend NO ACTION or a focused human/coordinator decision
→ do not change production code
```

Avoid schedules such as:

```text
Improve the codebase.
Optimize performance.
Increase test coverage.
Refactor messy code.
Find useful features.
Fix whatever is wrong.
```

Do not allow a scheduled Jules report that exists only in the Jules UI to become sole project authority. Important findings should be recorded in GitHub before they influence project scope.

## 11. Suggested tasks

Treat Jules Suggested Tasks as **untrusted proposals**, not backlog items.

Suggested Tasks must not bypass the current coding pause. Before accepting even a research-oriented suggestion, require:

- a concrete current question/problem;
- a meaningful outcome;
- evidence that the scenario exists in MGD;
- no duplication of an existing Issue/system;
- appropriate milestone timing.

Reject TODO cleanup, speculative abstractions, generic hardening, micro-optimization, or autonomous feature generation when no current MGD outcome justifies it.

## 12. Environment policy

Keep the Jules repository environment ready so future research, visual verification, and capability re-evaluation can run reproducibly without rebuilding the integration from scratch.

Current working setup pattern:

```bash
set -euo pipefail

cd /app

BUN_VERSION="$(tr -d '[:space:]' < .bun-version)"

export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

if [ "$(bun --version 2>/dev/null || true)" != "$BUN_VERSION" ]; then
  mkdir -p "$BUN_INSTALL"
  curl -fsSL https://bun.sh/install \
    | BUN_INSTALL="$BUN_INSTALL" bash -s -- "bun-v${BUN_VERSION}"
  hash -r
fi

bun --version
bun install --frozen-lockfile
bun run ci:check
bun run typecheck
bun run test
bun run build
```

The setup intentionally:

- reads the repository-owned `.bun-version`;
- installs Bun under the Jules user's home when the platform default differs;
- preserves `bun.lock` with `--frozen-lockfile`;
- validates the environment before snapshotting it.

Do not modify/regenerate the lockfile merely to accommodate an outdated Jules preinstalled Bun.

Default Jules repository environment policy:

- no extra environment variables unless a concrete task requires them;
- no repository PAT/`MGD_GH_TOKEN` in Jules by default;
- use Jules' GitHub App integration for native repository access;
- network access may remain enabled for documentation/package/research access;
- never expose credentials in task prompts, logs, code, or comments.

## 13. Failure handling

If Jules cannot complete a research/scoping/audit task:

- distinguish environment/tooling failure from an evidence gap;
- fix the environment rather than weakening repository invariants;
- if prerequisites are genuinely missing, stop as blocked instead of inventing substitutes;
- if Jules claims a blocker, verify it against GitHub/repository state before changing scope;
- a correct `NO JUSTIFIED FINDING`, `NO MATERIAL CHANGE`, or genuine blocker is preferable to manufactured work.

If a future coding capability evaluation fails, leave Jules coding paused and record the concrete failure mode rather than loosening the gate to force adoption.

## 14. External Jules references

Jules product behavior changes over time. Re-check current documentation when changing this integration or evaluating a new capability:

- Running tasks: https://jules.google/docs/running-tasks/
- Reviewing plans: https://jules.google/docs/review-plan/
- Reviewing code: https://jules.google/docs/code/
- Scheduled tasks: https://jules.google/docs/scheduled-tasks/
- Managing tasks/repos: https://jules.google/docs/tasks-repos/
- Errors/failures: https://jules.google/docs/errors/
- FAQ: https://jules.google/docs/faq/
- Changelog: https://jules.google/docs/changelog/

Do not encode a temporary Jules UI model name or feature state as an MGD product/architecture requirement. Current coding eligibility is owned by the capability gate above, not by marketing/version naming.
