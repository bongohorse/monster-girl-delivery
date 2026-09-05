# Jules Workflow

[← Documentation Hub](README.md)

This document defines the **Jules-specific operating workflow** for Monster Girl Delivery (MGD).

Mandatory behavior for every coding agent still comes from [`../AGENTS.md`](../AGENTS.md). Human/AI orchestration is owned by [`AI_WORKFLOW.md`](AI_WORKFLOW.md). GitHub authentication and permission boundaries are owned by [`GITHUB_AI_ACCESS.md`](GITHUB_AI_ACCESS.md).

Jules is a **supporting implementation/review agent**, not a product authority and not a source of truth. Its output must be treated as a proposal backed by code, tests, CI, and review—not as fact merely because the agent sounds confident.

## 1. Role in MGD

Use Jules to increase throughput and provide an independent implementation/review perspective.

Good Jules work includes:

- implementing one approved focused GitHub Issue;
- fixing verified defects on its own PR;
- independently reviewing a bounded system or PR;
- running deterministic/test-oriented engineering work;
- narrow recurring maintenance where the trigger and success condition are objective.

Do not use Jules as an autonomous product designer, backlog generator, or general "make the repo better" bot.

Jules must not promote `FUTURE`, `EXPERIMENT`, `TBD`, backlog, reference, or research material into implementation scope.

## 2. Trust model: verify, do not assume

Jules can produce useful code quickly, but it can also:

- state repository facts that are not true;
- invent APIs/files/behavior that do not exist;
- propose defensive code for states the application cannot actually reach;
- construct synthetic tests around absurd or impossible scenarios;
- add helpers/abstractions/tests that technically work but do not advance the task;
- mistake a passing isolated test for real runtime integration.

Therefore every Jules finding and PR passes two gates.

### Reality gate

A reported defect should normally be reachable from the current production/test contract.

Before treating a Jules finding as actionable, verify:

1. **Entry point** — what real public/runtime path reaches the code?
2. **State origin** — how can the problematic state be produced through supported inputs/configuration/lifecycle?
3. **Failure** — what observable invariant or acceptance criterion is violated?
4. **Evidence** — exact code path, deterministic reproduction, failing test, trace, or other concrete evidence.

A scenario that requires mutating private fields, bypassing existing validators, fabricating impossible configuration, or calling an internal method in an order the application never can is **not automatically a product bug**.

Such synthetic cases are useful only when the task explicitly concerns defensive validation or the supposedly impossible state can cross a real external boundary.

### Value gate

Even a real observation does not automatically justify code.

A change should materially satisfy an acceptance criterion, fix a reachable defect, protect a meaningful invariant, complete required integration, or address a demonstrated performance/reliability/maintenance problem.

Do not accept a Jules change merely because it:

- adds another test;
- extracts a helper;
- introduces a wrapper or interface;
- handles a theoretical state;
- raises coverage;
- follows a generic "best practice";
- makes code look more architecturally elaborate.

If removing the change would not meaningfully affect the approved outcome, it probably does not belong in the PR.

## 3. Preferred GitHub-native dispatch

For approved implementation work, prefer GitHub as the handoff layer instead of copying prompts between tools.

### Existing focused Issue

Preferred flow:

```text
approved focused Issue
→ verify dependencies / status
→ add GitHub label `jules`
→ Jules starts from the Issue
→ Jules comments on the Issue
→ Jules implements + validates
→ Jules opens/links a Pull Request
→ review exact PR diff + CI
→ feedback via PR comments
→ merge only when explicitly authorized
```

The `jules` label is a **dispatch trigger**, not product approval by itself. Only apply it to work that is already approved and ready.

Keep `ai:coder` as the general "coding-agent suitable" classification where useful; use `jules` to actually dispatch the Issue to Jules.

Do not apply `jules` to:

- blocked Issues;
- parent/umbrella Issues that are not implementation units;
- `FUTURE`/`EXPERIMENT` work that has not been promoted;
- vague cleanup ideas;
- an Issue another coding agent is already implementing.

### Manual Jules task

Use a manual Jules task when there is no useful GitHub implementation unit, for example:

- a one-off read-only investigation;
- comparing two implementation approaches before an Issue is ready;
- an independent adversarial review;
- checking Jules environment/setup behavior.

If a manual task results in code that should land, publish it through a focused branch/PR so GitHub remains the durable review trail.

## 4. Planning approach selection

Every normal Jules coding task generates a plan. Use the standard task flow for clear work and **Interactive Plan** when ambiguity or risk benefits from an explicit planning conversation. When a material implementation plan is awaiting approval, inspect it before execution when practical; Jules may auto-approve a standard plan after its approval window.

| Work | Preferred approach |
|---|---|
| Read-only status/inspection | Standard task |
| Small, explicit, low-risk implementation | Standard plan |
| Normal focused implementation Issue | Standard plan; review before execution when practical |
| Architecture-sensitive, ambiguous, or high-risk implementation | Interactive Plan |
| Narrow recurring maintenance | Scheduled task |

For non-trivial implementation, plan review is valuable because it can catch invented scope, parallel abstractions, and irrelevant work before code is written.

A good Jules plan should identify:

- the real runtime/integration path;
- existing abstractions to reuse;
- acceptance criteria → implementation/test mapping;
- files/systems that actually need change;
- concrete validation;
- explicit non-goals when nearby scope is tempting.

Reject plans whose deliverable is mainly scaffolding, speculative architecture, or synthetic edge-case handling unrelated to reachable behavior.

## 5. PR review standard for Jules code

Jules-authored code receives the same review standard as any other agent code. Do not auto-merge it because CI is green.

Review in this order:

1. **Issue scope** — does the diff implement the assigned outcome and only that outcome?
2. **Runtime integration** — is the new behavior actually connected to the production path when required?
3. **Reality** — do tests and fixes model states reachable through supported application boundaries?
4. **Authority** — are timing, input, randomness, generation, collision, persistence, and Director boundaries preserved?
5. **Value** — did Jules add low-value wrappers, tests, abstractions, comments, or defensive code unrelated to the outcome?
6. **Regression evidence** — do tests protect behavior/invariants rather than mirror implementation details?
7. **Validation** — required local checks and exact-head CI are green where applicable?
8. **Manual evidence** — if the criterion concerns feel, device behavior, presentation, or lifecycle, has real manual evidence been supplied instead of simulated claims?

A large diff is not proof of thoroughness. Prefer the smallest coherent change that fully satisfies the Issue.

## 6. PR feedback loop

Jules can respond to GitHub PR feedback. For MGD, prefer **Reactive Mode** in Jules settings so the agent only acts when explicitly mentioned.

Recommended feedback flow:

```text
review finding
→ leave focused PR comment
→ mention `@Jules`
→ Jules acknowledges / fixes
→ new commit
→ CI
→ re-review exact head
```

A useful comment describes the concrete failing behavior and desired invariant, not an open-ended request to "improve" the code.

Example:

```text
@Jules this path advances policy state during a zero-delta update.
Preserve the existing pause invariant and add the smallest deterministic regression test.
Keep the fix scoped to this finding and rerun the required validation.
```

Do not scatter optional style suggestions that cause unnecessary agent churn.

### Coordinator ↔ Jules communication contract

GitHub is the durable handoff channel between the coordinator/reviewer and Jules. The Game Director should not have to relay routine implementation or review text manually between agents.

- Put approved implementation scope, dependencies, and acceptance criteria in the Issue.
- Put concrete code-review findings on the PR that owns the change.
- In Reactive Mode, a coordinator/reviewer that wants Jules to act on a finding should mention `@Jules` in that PR comment instead of only reporting the finding in chat.
- Each actionable comment should identify the affected behavior or location, the evidence/failure, the desired invariant/outcome, and any validation that matters.
- Keep discussion on the owning Issue/PR so Jules, reviewers, CI, and the Game Director share one durable execution trail.
- After Jules pushes a fix, re-read the response, inspect the new exact head, and verify the finding is actually resolved; do not treat an acknowledgement or green CI as proof by itself.
- If Jules disputes a finding, resolve the disagreement from repository/runtime evidence rather than agent authority.
- Do not ask the Game Director to copy/paste messages between ChatGPT/Codex/Jules when the GitHub-native comment path is available.

Use top-level PR comments for cross-cutting findings and inline review comments when a precise diff location materially improves the handoff. Consolidate closely related observations so Jules receives a coherent fix request rather than a noisy stream of micro-comments.

## 7. CI fixer is not approval

Jules may automatically react to CI failures on PRs it creates.

That loop is useful for mechanical failures, but it does not authorize Jules to:

- change product behavior to make a test pass;
- weaken tests, lint rules, type safety, or CI protections;
- broaden scope;
- replace an acceptance criterion with an easier assertion.

After any automatic CI fix, review the new exact head—not only the original diff.

## 8. Concurrency policy

Jules can run many tasks in parallel, but available concurrency is not a reason to create more work.

Rules:

- one active implementation owner per focused Issue;
- do not have Jules and Codex independently edit the same task at the same time;
- avoid parallel writers in the same tightly coupled subsystem unless the branches are intentionally independent;
- use high parallelism mainly for independent read-only investigation/review or unrelated Issues;
- reconcile independent audit findings before creating follow-up implementation work.

Ten independent agents repeating the same weak hypothesis do not make the hypothesis true. Verify against code/runtime evidence.

## 9. Scheduled tasks

Scheduled Jules tasks are appropriate only when the recurring trigger and useful outcome are clear.

Good categories:

- material regression watch;
- determinism/fairness regression watch;
- lifecycle/unbounded-growth watch;
- measured performance regression watch;
- narrow toolchain/compatibility maintenance.

Avoid schedules such as:

```text
Improve the codebase.
Optimize performance.
Increase test coverage.
Refactor messy code.
Find useful features.
```

Those prompts reward activity instead of value and tend to produce low-value churn.

For MGD, a scheduled maintenance task should normally behave like:

```text
verified material regression found
→ smallest justified fix
→ meaningful regression test when appropriate
→ required validation
→ focused PR

no material regression
→ NO ACTION
```

Do not use a read-only scheduled Jules report as the sole durable project evidence if the result exists only in the Jules UI. Important findings should be promoted into GitHub through a real Issue/PR/review trail before they influence project scope.

## 10. Suggested tasks

Treat Jules Suggested Tasks as **untrusted proposals**, not backlog items.

Before accepting one, require:

- a concrete current problem;
- a meaningful outcome;
- evidence that the scenario exists in MGD;
- no duplication of an existing Issue/system;
- appropriate milestone timing.

Reject suggested TODO cleanup, abstractions, generic hardening, or micro-optimization when no current MGD outcome justifies it.

## 11. Environment policy

Jules environment setup should reproduce the repository toolchain rather than accepting stale preinstalled versions.

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
- use Jules' GitHub App integration for its native Issue/PR workflow;
- network access may remain enabled for documentation/package/research access;
- never expose credentials in task prompts, logs, code, or comments.

## 12. Failure handling

If Jules cannot complete a task:

- distinguish environment/tooling failure from implementation failure;
- fix the environment rather than weakening repository invariants;
- if a manual task cannot retrieve an Issue, prefer the native GitHub Issue + `jules` label path rather than repeatedly copying scope text;
- if prerequisites are genuinely missing, stop as blocked instead of inventing substitutes;
- if Jules claims a blocker, verify it against GitHub/repository state before changing scope.

A task that correctly reports "no justified change" or a genuine blocker can be more valuable than a PR that manufactures work.

## 13. External Jules references

Jules product behavior changes over time. Re-check current documentation when changing the integration itself:

- Running tasks: https://jules.google/docs/running-tasks/
- Reviewing plans: https://jules.google/docs/review-plan/
- Reviewing code: https://jules.google/docs/code/
- Scheduled tasks: https://jules.google/docs/scheduled-tasks/
- Managing tasks/repos: https://jules.google/docs/tasks-repos/
- Errors/failures: https://jules.google/docs/errors/
- FAQ: https://jules.google/docs/faq/
- Changelog: https://jules.google/docs/changelog/

Do not encode temporary Jules UI behavior as an MGD product/architecture requirement.