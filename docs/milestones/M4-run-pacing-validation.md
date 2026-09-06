# M4 Run Pacing Validation Evidence

**Date:** 2026-09-06

**Milestone:** M4 — Run Pacing & Hazard Language

**Related issues:** #116, #121, #127

## Purpose and status

Record the integrated automated and development-browser evidence available for Issue #121, separately from the Game Director observations actually reported.

All ordered M4 implementation dependencies are merged on `main` at `db08cd167b32dc4096630669b005050923296844`, including the long-run harness from PR #160 and the Director-tooling corrections from PR #165. No reproducible implementation blocker was found in the evidence performed.

Issue #121 is **not accepted by this report**. Its required manual gameplay matrix and explicit Game Director acceptance have not been reported, so #121 remains open. This is supporting validation evidence, not the M4 closeout owned by #122.

## Automated evidence

### Deterministic long-run harness

`tests/support/LongRunEncounterHarness.ts` drives the real `createGeneratedHazardStream` / `advanceGeneratedHazardStream` policy path and mirrors the live two-phase run progression. The focused tests and an evidence run on final `main` produced:

| Seed | Requested distance | Result |
|---:|---:|---|
| `42` | `5,000` | Two fresh runs produced identical traces and final states; 198 trace events and 5 accepted encounters |
| `100` | `10,000` | 10 accepted encounters; first acceptance was `prototype-offset-pair` |
| `200` | `10,000` | 11 accepted encounters and a different sequence; first acceptance was `prototype-vertical-patrol` |
| `300` | `50,000` | Reached `50,001.93`, remained active, accepted 57 encounters, and admitted 9 encounters in the final 7,100-distance tail window |

The seed-300 soak exercised all six current patterns. Its promoted M4 archetype participation was 17 geometric vertical-patrol encounters, 4 timed-pulse encounters, and 6 reactive target-lock encounters; the other 30 acceptances were the existing geometric static patterns.

The sampled runs reached all four difficulty tiers. The difficulty authority changes reaction time, spacing, corridor target, entry limit, and density limit as well as speed. The deterministic pacing authority repeats a 7,100-distance cycle containing Breather, Low, Medium, High, and Peak. Focused recovery coverage traverses the entire second breather with no readability reservations and then proves scheduling resumes.

Dedicated timing and reachability tests derive the logical reaction horizon from authoritative speed and minimum reaction seconds without viewport input, exercise structured time-to-impact decisions across speed changes, and accept or reject the same open corridor from explicit player position and velocity. Scheduler coverage keeps a geometrically open but physically unreachable candidate out of the spawn stream.

Every accepted transition in the representative harness samples carried a non-null valid transition result. The soak itself did not happen to produce a terminal scheduler transition rejection. Dedicated transition tests separately prove that two individually valid encounters can be rejected with `next-entry-unreachable-from-exit-envelope`, consume the expected generator step, produce no spawns, and later recover through the live policy path. A deliberately blocked harness fixture produced three structured `vertical-route-blocked` scheduler rejections and no accepted spawn.

Seed 300 reached these maximum retained-policy values during the 50,000-distance soak:

| State | Observed maximum | Authority / assertion |
|---|---:|---:|
| Retained logical spawns | 6 | Regression tripwire: under 50 |
| Readability reservations | 3 | 32 |
| Recent variety families | 2 | 2 |
| Concurrent warnings | 2 | 2 |
| Concurrent lethal windows | 2 | 2 |
| Active pressure cost | 4 | 6 |
| Active readability cost | 6 | 6 |

Non-fallback acceptances are also checked against the two-family recent-history window. Together these results provide bounded repetition, retention, and readability/concurrency evidence without claiming exhaustive coverage.

Automated Foundation, lifecycle, pacing, and stream tests hold run distance, generation state, pacing state, telegraphed-hazard state, and retained stream identity through pause/resume and resize paths. Archetype logic and presentation tests cover the geometric movement, timed warning/lock/active lifecycle, reactive warning-time tracking and lock, active-only collision, and distinct prototype presentation states. These tests establish deterministic behavior and state preservation; they do not prove subjective clarity in real play.

### Director tooling

Unit and scene integration coverage proves that:

- collapsing the performance HUD hides its values and reset control while sampling continues, then restores the existing measurement session;
- `New random seed` creates the stream from a new explicit normalized seed;
- `Restart same seed` repeatedly recreates the logical initial state for the currently selected seed;
- a later new-seed action can choose another seed; and
- completed, cancelled, and destroyed Director interactions release gameplay blocking without queuing thrust, while responsive-layout coverage keeps both controls usable after layout changes.

A development-browser check was repeated on final `main` using Chrome for Testing `153.0.8010.12` at `844×390`. Collapse left only the eye visible and computed both the values and reset control to `display: none`; expansion restored them. The displayed authoritative seed changed from `3433278918` to `2254397345`, same-seed restart retained `2254397345`, and a second new-seed action produced `3589412749`. Input diagnostics then reported `Pointer: none`, `Thrust intent: idle`, and `Gameplay blocked: no`. No browser JavaScript exception was observed.

This browser-driven tooling check is engineering evidence. It is not represented as Game Director gameplay evidence or as the smartphone/tablet matrix.

## Game Director manual evidence

The Game Director reported these observations during M4 validation:

- the performance HUD eye control left performance values visible; and
- practical validation needed a way to start a run with a new/random seed.

PR #165 corrected both tooling problems and was independently reviewed and accepted. Discovering and resolving those problems is valid manual validation feedback, but the fix does not establish that the remaining #121 gameplay rows were exercised.

No Game Director result is currently recorded for:

- smartphone Landscape gameplay;
- tablet Landscape gameplay;
- desktop browser development gameplay beyond the engineering tooling check;
- sustained play through difficulty and pacing changes;
- a manually observed breather;
- each promoted hazard archetype in real play;
- repetition or overlapping-warning readability;
- a manual same-seed gameplay replay;
- pause/background-resume or resize during this M4 validation; or
- acceptance of the representative M4 run as sufficiently readable and varied.

Device models, operating systems, mobile/tablet browser versions, viewports, play duration, hazard observations, and the other unreported manual metadata remain unknown and are not inferred from automated evidence or earlier milestones.

## Repository validation

The final evidence branch passed the required repository commands on 2026-09-06:

- `bun run ci:check` — PASS, 125 files checked;
- `bun run typecheck` — PASS;
- `bun run test` — PASS, 56 test files / 393 tests; and
- `bun run build` — PASS.

## Evidence limits and conclusion

Seeds `42`, `100`, `200`, and `300`, including one 50,000-distance soak, are finite representative samples. They are engineering evidence of the integrated deterministic policy and current prototype catalog, not universal proof for every seed, run length, device, or future configuration. Current content and tuning remain **PROTOTYPE**.

The automated acceptance evidence is complete enough to proceed with the requested manual gameplay evaluation, and no focused M4 defect Issue is justified by the current results. Issue #121 cannot honestly close until the missing manual matrix and explicit Game Director acceptance are actually reported.
