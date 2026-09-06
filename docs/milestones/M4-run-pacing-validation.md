# M4 Run Pacing Validation Evidence

**Date:** 2026-09-06

**Milestone:** M4 — Run Pacing & Hazard Language

**Related issues:** #116, #121, #127

## Purpose and status

Record the integrated automated, development-browser, and Game Director evidence for Issue #121 while keeping those evidence classes separate.

All ordered M4 implementation dependencies are merged on `main` at `db08cd167b32dc4096630669b005050923296844`, including the long-run harness from PR #160 and the Director-tooling corrections from PR #165. No reproducible implementation blocker was found in the evidence performed.

Issue #121 is **accepted by the Game Director**. After the remaining #121 gameplay matrix was requested, the Game Director reported that the playtest passed. Missing device/browser/viewport/play-duration metadata remains explicitly unknown rather than inferred. This is the focused validation evidence for #121, not the M4 closeout owned by #122.

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

During the first M4 validation pass, the Game Director reported two concrete tooling problems:

- the performance HUD eye control left performance values visible; and
- practical validation needed a way to start a run with a new/random seed.

PR #165 corrected both tooling problems and was independently reviewed and accepted.

After those fixes merged, the Game Director was asked to perform the remaining #121 manual gameplay matrix covering smartphone Landscape, tablet Landscape, desktop browser development view, sustained difficulty/pacing changes, a breather, promoted hazard archetypes, repetition/overlap readability, same-seed restart, pause/background-resume, resize where applicable, and the overall readability/variety acceptance decision.

The Game Director subsequently reported that the **playtest passed**. That is recorded as a PASS for the requested #121 manual gameplay evaluation and as explicit acceptance of the representative M4 run as sufficiently readable and varied to proceed.

No finer-grained manual metadata was reported. Device models, operating systems, mobile/tablet browser versions, exact viewports, play duration, seed values, and per-row qualitative notes therefore remain unknown and are not invented here. The earlier Chrome tooling check remains engineering evidence rather than a substitute for the Director's gameplay report.

## Repository validation

The evidence branch passed the required repository commands on 2026-09-06 before the final documentation-only acceptance update:

- `bun run ci:check` — PASS, 125 files checked;
- `bun run typecheck` — PASS;
- `bun run test` — PASS, 56 test files / 393 tests; and
- `bun run build` — PASS.

GitHub Actions CI also passed on the evidence PR before the final documentation-only acceptance update. The final PR head must remain green before merge.

## Evidence limits and conclusion

Seeds `42`, `100`, `200`, and `300`, including one 50,000-distance soak, are finite representative samples. They are engineering evidence of the integrated deterministic policy and current prototype catalog, not universal proof for every seed, run length, device, or future configuration. Current content and tuning remain **PROTOTYPE**.

Automated evidence, Director-tooling verification, and the Game Director's final manual playtest acceptance now satisfy Issue #121. No reproducible M4 blocker remains from this validation pass. The next milestone task is the separate M4 closeout owned by #122.
