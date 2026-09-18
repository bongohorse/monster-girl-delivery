# Milestone History

[← Documentation Hub](../README.md)

This directory records what each project milestone **actually delivered**.

`MASTER_SPEC.md` remains the product specification. [`../ROADMAP.md`](../ROADMAP.md) owns the approved milestone sequence and forward-looking milestone structure. These milestone reports are historical closeout records: they document the implemented result, evidence, decisions, and deferred work after a milestone exits.

They are **not** a substitute for the current roadmap, the native GitHub Milestone progress view, or the active milestone umbrella Issue.

## Relationship to native GitHub Milestones

- A native **GitHub Milestone** represents one numbered development phase and its assigned Issues/PRs.
- [`../ROADMAP.md`](../ROADMAP.md) owns milestone sequencing, proof questions, entry/exit gates, version mapping, and milestone-level scope.
- The milestone umbrella Issue owns detailed live planning, ordering, dependencies, Game Director decisions, and acceptance while work is active.
- This directory records what actually shipped and why a completed milestone was allowed to close.

Historical native-milestone backfill is audited **one milestone at a time: M0 -> verify -> M1 -> verify -> M2 -> ...**. Membership must be checked against the roadmap, umbrella Issue, implementation trail, and closeout evidence rather than inferred from creation date alone. Supporting maintenance, FUTURE work, and unrelated backlog work stay outside the numbered milestone unless they genuinely contributed to its accepted scope.

## Completed milestones

| Milestone | Result | Closeout report | Supporting evidence |
|---|---|---|---|
| M0 — Foundation | Core project/tooling, timing, input, lifecycle, viewport, diagnostics, CI/Codespaces foundation | [`M0-foundation.md`](M0-foundation.md) | automated validation recorded in report |
| M1 — Flight Prototype | Playable deterministic one-button vertical flight prototype; mobile/tablet validation; Landscape selected for core play | [`M1-flight-prototype.md`](M1-flight-prototype.md) | [`M1-device-report.md`](M1-device-report.md) |
| M2 — Horizontal Run & First Hazard | Deterministic left-to-right run foundation with one lethal hazard, death/restart, and accepted Landscape validation | [`M2-horizontal-run-first-hazard.md`](M2-horizontal-run-first-hazard.md) | automated and Director-reported device/browser evidence recorded in report |
| M3 — Seeded Generation & Fairness | Deterministic seeded generator → validator → scheduler → live-stream pipeline with same-seed Director tooling | [`M3-seeded-generation-fairness.md`](M3-seeded-generation-fairness.md) | [`M3-seeded-run-validation.md`](M3-seeded-run-validation.md) |
| M4 — Run Pacing & Hazard Language | Deterministic difficulty progression, 7,100m pacing cycle with breathers, time-to-impact fairness, reachability, transition validation, 3 hazard archetypes, variety and readability budgets, and Director-accepted gameplay validation | [`M4-run-pacing-hazard-language.md`](M4-run-pacing-hazard-language.md) | [`M4-run-pacing-validation.md`](M4-run-pacing-validation.md) |

## Current / future milestones

Do not create historical reports in advance. Current and future milestone planning belongs in [`../ROADMAP.md`](../ROADMAP.md) and GitHub Issues.

A new report is added here only when the milestone has factual implementation and validation evidence to close out.

M4 — Run Pacing & Hazard Language is complete. Its factual closeout is recorded in [`M4-run-pacing-hazard-language.md`](M4-run-pacing-hazard-language.md) with supporting evidence in [`M4-run-pacing-validation.md`](M4-run-pacing-validation.md).

The current milestone is M5 — Complete Arcade Loop & Skill Layer. Its active umbrella/parent is Issue #197; the project remains on version `0.4.x` until M5 passes its exit gate and factual closeout.

## Closeout rule for M2+

Every milestone must receive a closeout report before, or as part of, formally moving the project to the next milestone.

Use [`TEMPLATE.md`](TEMPLATE.md).

A closeout report must distinguish:

1. **Planned scope** — what the milestone intended to prove or build.
2. **Actually delivered** — only behavior and infrastructure that landed.
3. **Architecture/product decisions** — decisions that became durable project constraints.
4. **Validation evidence** — CI, automated tests, manual/device evidence, and known limits of that evidence.
5. **Deferred/open work** — planned or discovered work that did not ship in the milestone.
6. **Supporting maintenance** — work completed during the milestone window that was useful but not part of the milestone's product scope.
7. **Issues and PRs** — the main implementation trail.
8. **Exit decision** — why the project is allowed to move on.
9. **Inheritance** — what the next milestone can safely assume already exists.

## Accuracy rules

- Never turn a plan into historical fact merely because it appeared in a milestone description.
- Never claim a manual/device test that was not actually performed.
- Automated coverage and manual evidence must be described separately.
- Keep `PROTOTYPE`, `TBD`, `EXPERIMENT`, `FUTURE`, and deferred decisions explicit.
- Maintenance performed during a milestone must not be rewritten as milestone gameplay scope.
- If a later correction is needed, amend the historical report transparently; do not silently rewrite the reason a milestone originally exited.
- Future roadmap changes do not rewrite completed milestone history.
- A native GitHub Milestone is closed only after its exit decision is supported, required Director acceptance is recorded, deferred work is explicitly routed, the factual closeout report is merged, and milestone membership has been checked for unrelated work.
