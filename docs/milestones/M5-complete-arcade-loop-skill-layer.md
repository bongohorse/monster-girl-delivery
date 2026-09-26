# M5 — Complete Arcade Loop & Skill Layer — Completion Report

**Status:** COMPLETE  
**Completed:** 2026-09-26  
**Primary planning issue:** #197  
**Purpose:** Turn the deterministic procedural runner into a coherent arcade loop with visible skill/risk, readable route guidance, low-friction retry, and gameplay strong enough to justify production-quality presentation work.

## 1. Planned goal

M5 was approved to answer one product question:

> Is the core game itself compelling enough that a player would voluntarily start another run even before deep progression, collection, or live-service systems exist?

The planned scope centered on the complete run lifecycle, authoritative score/result data, Graze as an optional skill layer, collectible paths as movement language, entertaining but bounded failure/retry flow, integrated deterministic lifecycle tests, and Director acceptance of pacing/replayability.

M5 explicitly did **not** approve production-scale art/audio, deep progression/economy, vehicles/alternate movement modes, Delivery Contracts, gacha/live-service systems, or final balance values.

## 2. What actually delivered

### Complete arcade loop and result authority

M5 completed the authoritative run outcome foundation and integrated death/results/retry flow.

- final run results are captured from authoritative run state rather than post-death presentation;
- score/distance/skill/collection feedback survive into the result state;
- ordinary retry is available without a required menu round-trip;
- post-death presentation does not continue gameplay authority;
- integrated lifecycle tests cover repeated run/retry behavior.

Primary owners include #198, #85, and #223.

### Graze and collision skill layer

Issue #90 and the related implementation work established separate lethal and Graze geometry.

- lethal collision remains authoritative and independent of visual sprite bounds;
- Graze is optional risk/reward rather than a required survival path;
- continuous/swept collision work preserves deterministic hit/Graze behavior across frame partitions;
- later optimization work kept exact hazard geometry shared between core and Graze checks.

The major implementation/review trail includes PR #216 and later focused collision work.

### Collectibles as movement language

M5 promoted collectibles from decoration into deterministic route data and visible pickups.

- authored paths can teach the useful flight arc;
- safe-route, optional-risk, and recovery intents are represented;
- pickup totals are authoritative run data;
- late M5 playtesting showed dense bitmap/grid reward formations were too visually noisy, so Gate 2 replaced normal-live heart/star/COINS!/3×10 formations with sparse route-focused paths.

Relevant owners include #84, #227, #275, #471 / PR #472.

### Hazard identities and authored encounter composition

M5 established production-facing gameplay identities for the existing hazard families instead of adding unrestricted random overlap.

- Missile uses a warning/bait/lock/dodge interaction contract;
- Zappers provide static, diagonal, vertical, rotating, and timed spatial-navigation vocabulary;
- Lasers provide telegraphed lane/timing decisions;
- M5 authored twelve explicit encounter segments in Gates 4A/4B;
- eleven pacing-compatible authored segments became the normal AUTO catalog in #481 / PR #482;
- the authored Missile segment remains intentionally outside AUTO because its current lifecycle crosses mandatory breather boundaries under the existing pacing/readability contract.

The older generic line/corridor/offset demos, collectible showcase variants, and early Phase-2 combination prototypes remain reference/test content rather than normal AUTO selection.

### Gameplay-feel recovery pass

Late Director playtesting found that the technically valid game still felt weaker than the reference-quality target: flight became too aggressive, collectible art was cluttered, encounter ideas repeated too quickly, and the run still felt generator-driven.

M5 addressed this in small, independently validated gates:

- #462 / PR #463: stronger bounded world-speed progression, calmer pressure, and initial speed-coupled flight authority;
- #469 / PR #470: softened flight coupling so gravity/thrust receive 40% of world-speed increase and vertical caps receive 50%, avoiding late-run twitchiness;
- #471 / PR #472: reduced live collectible clutter to sparse route language;
- #473 / PR #474: expanded recent-family memory from two to four and added least-recent deterministic fallback;
- #475 / PR #476: authored seven single-decision encounter segments;
- #477 / PR #478: authored five tier-2+ High/Peak pressure segments;
- #479 / PR #480: made single-segment pacing metadata match real readability windows;
- #481 / PR #482: switched AUTO and the integrated long-run harness to the authored M5 catalog.

This final catalog keeps Low/Medium simple, admits richer pressure vocabulary only later, preserves explicit breathers, and does not weaken fairness/readability merely to force content live.

### Android edge-to-edge gameplay presentation

Issue #467 / PR #468 fixed Android landscape cutout letterboxing at the native window layer.

- the game now renders to the physical landscape edges;
- safe-area handling remains separate from gameplay/viewport authority;
- same-size 180° landscape rotation refreshes left/right safe-area values;
- real-device Director evidence confirmed the former black side strip was removed.

This was supporting mobile correctness/presentation work during M5, not a change to gameplay geometry.

## 3. Architecture/product decisions established

M5 established or reinforced these constraints:

- The release-core gameplay remains a deterministic one-button Landscape runner unless a later Product Gate explicitly changes that product decision.
- Run end, result snapshot, score/reward feedback, collision, Graze, generation, pacing, and presentation keep separate authorities.
- Difficulty speed remains bounded; challenge should increasingly come from authored decisions and route/timing complexity rather than unbounded velocity.
- Faster world movement may receive more vertical flight authority, but the coupling is intentionally softened rather than scaling acceleration with the square of world speed.
- Collectibles in normal play primarily communicate routes/risk/recovery; dense decorative reward art is not the default gameplay language.
- Encounter variety uses bounded recent-family memory and deterministic least-recent fallback without extra PRNG draws.
- Normal AUTO content is an explicit authored catalog rather than an unrestricted mix of prototype fixtures.
- Mandatory breathers/readability budgets remain stronger than a desire to force every authored hazard combination into live play.
- Fine tuning remains **PROTOTYPE** work. Director acceptance of M5 does not make current speed, physics, density, costs, or art final values.

## 4. Validation evidence

### Automated validation

The accepted M5 gameplay candidate on main is:

`e694627821ae4afd5c74a42ff7118f58fc1d052c`

On that integrated candidate:

- repository CI passed;
- formatting/lint passed;
- TypeScript typecheck passed;
- Vitest passed **931 tests**;
- production Vite build passed;
- Pages deployment passed;
- Android CI passed, including unit tests and debug/release assembly;
- the integrated long-run harness defaults to the real M5 authored live catalog and remained deterministic/live through representative 50,000-distance evidence;
- transition fairness, bounded variety history, readability reservations, concurrency/cost bounds, and breather behavior remained green after the AUTO catalog switch.

### Android build evidence

Final Gate #483 records the commit-addressed Android artifact:

- application ID: `com.bongohorse.monstergirldelivery`;
- signing mode: `stable-test`;
- APK Signature Scheme v2: verified;
- APK size: 4,974,873 bytes;
- SHA-256: `6988c2cceb0b0ff7f04c61c5aaa9a4532fbb050430448ce3bc57e5018025c540`.

### Game Director manual evidence

The Game Director played the final integrated Android candidate and accepted the current gameplay state as sufficient for M5, explicitly stating that further changes can be treated as later fine tuning rather than continued M5 rescue work.

This acceptance followed an earlier rejected/insufficient-feel pass and the staged Gates 1–4, so it represents a real gameplay decision rather than automated tests being used as a substitute for fun/readability judgment.

### Evidence limits

- Current balance and visual presentation remain prototype quality.
- The accepted device playtest does not certify every Android/browser/device combination.
- #459's earlier Firefox Android freeze/input-lock observation was not reproduced to a confirmed root cause; it was closed by Director decision without claiming a fix.
- #460's long-horizontal Zapper visual issue was not separately re-accepted in the final closeout and therefore remains routed to M6 rather than silently declared fixed.

## 5. Main Issues / PRs

| Work | Issue | PR | Result |
|---|---:|---:|---|
| M5 umbrella / exit contract | #197 | — | Approved scope, dependencies, acceptance and closeout |
| Score/result/basic rewards | #198 | — | Authoritative run outcome/result foundation |
| Graze skill layer | #90 | #216 | Separate lethal/Graze gameplay geometry |
| Collectible movement language | #84 / #227 / #275 | multiple | Deterministic visible route/pickup layer |
| Death/results/retry integration | #85 / #223 | multiple | Complete low-friction arcade lifecycle |
| Gameplay recovery gate | #270 | — | Final integrated gameplay-quality acceptance |
| Final broad feel pass | #462 | #463 | Speed ramp, calmer pressure, initial flight coupling |
| Android edge-to-edge | #467 | #468 | Native cutout/edge-to-edge presentation fixed |
| Flight scaling Gate 1 | #469 | #470 | Softened late-run vertical authority |
| Coin clutter Gate 2 | #471 | #472 | Sparse route-focused live collectibles |
| Variety Gate 3 | #473 | #474 | Four-family history + least-recent fallback |
| Authored segments Gate 4A | #475 | #476 | Seven single-decision segments |
| Authored segments Gate 4B | #477 | #478 | Five later pressure segments |
| Pacing metadata Gate 4C1 | #479 | #480 | Truthful Laser/Missile phase eligibility |
| AUTO integration Gate 4C2 | #481 | #482 | Eleven authored segments become normal AUTO |
| Final Android gameplay gate | #483 | — | Director accepted current feel for M5 |

## 6. Supporting maintenance completed during the milestone

Meaningful supporting work during M5 included:

- Android/Capacitor build and release workflows with commit-addressed APK evidence;
- native Android edge-to-edge/cutout handling;
- Director diagnostics and mobile performance capture tooling;
- test-quality gates and mutation-testing investigation;
- Zapper presentation simplification from the shared shader/fallback split to one Graphics rendering path;
- performance broadphase/collision work and Android/mobile debugging infrastructure.

These changes supported reliable M5 development but do not expand the M5 product scope.

## 7. What deliberately did not deliver

M5 did not deliver:

- production-quality final character/environment/hazard art;
- final animation, VFX, SFX, or music;
- production-scale districts/content;
- final economy, shop, gacha, battle pass, dailies, or live-service systems;
- deep character progression or collection meta;
- vehicles, mounts, transformations, or alternate movement modes;
- Delivery Contracts or a separately approved finishable Delivery Mode;
- final tuning/balance;
- the authored Missile encounter in normal AUTO;
- release/store hardening.

## 8. Deferred/open work at exit

The following work is explicitly not an M5 blocker:

- #304 — collectible rendering/reconciliation performance, moved to M6;
- #329 — live-run allocation/snapshot churn audit, moved to M6;
- #460 — long-horizontal Zapper Android visual verification, moved to M6 presentation follow-up;
- #459 — intermittent Firefox Android freeze/input-lock investigation, closed as not planned after no reproducible confirmed defect and Director decision.

Future gameplay ideas such as temporary movement modes/vehicles (#87), themed districts (#93), forward-look-ahead composition (#464), visual hierarchy (#465), and ambient world life (#466) remain future/gated work rather than inherited M5 commitments.

## 9. Exit decision

M5 exits because:

1. the complete start → run → crash → results → retry loop is integrated;
2. score, Graze, and collectibles create a visible skill/risk/route layer;
3. the run retains deterministic fairness, reachability, readability, transition, pacing, and bounded-speed authorities;
4. late M5 Director feedback that the run still felt too twitchy, cluttered, repetitive, and generator-driven was addressed through separately tested Gates 1–4;
5. the final authored AUTO catalog and real M5 long-run harness are green;
6. repository and Android CI are green on the accepted candidate;
7. the Game Director played the final Android build and accepted the current gameplay as sufficient to advance, with additional feel changes explicitly treated as later fine tuning;
8. unfinished technical/presentation work has been routed rather than hidden inside the milestone.

The next project work is therefore the Product Gate A and Art Gate. M6 production implementation does not become current merely because M5 is complete; those gates must first define the release-core structure and production visual direction.

## 10. What the next phase inherits

Product/Art gate work and later M6 may safely assume:

- a deterministic, playable, Director-accepted one-button endless-run core;
- complete death/results/retry lifecycle;
- authoritative score/result/basic reward data;
- separate lethal and Graze skill geometry;
- route-focused visible collectibles;
- bounded speed progression and softened speed-coupled flight authority;
- explicit breathers and readability/fairness enforcement;
- an authored live encounter catalog with six single-decision and five later pressure patterns;
- deterministic long-run regression tooling against the actual live M5 catalog;
- Android packaging and edge-to-edge Landscape presentation sufficient for continued device evaluation.

They may **not** assume that final art direction, final balance, Delivery Mode, vehicles, meta progression, district content volume, or production performance budgets are already decided or complete.

---

## Closeout checklist

- [x] Planned scope and actual delivery are clearly separated.
- [x] Main implementation Issues/PRs are linked.
- [x] Automated validation is recorded accurately.
- [x] Manual/device evidence is recorded only when actually performed.
- [x] Deferred work is explicit and linked where practical.
- [x] Supporting maintenance is separated from milestone product scope.
- [x] Product/architecture decision states are accurate.
- [x] Exit decision is explicit.
- [x] Next-phase inheritance is explicit.
- [x] Native GitHub Milestone membership has been audited; #304/#329/#460 were routed to M6 and #459 was closed by Director decision.
- [x] Unfinished work is explicitly deferred/routed before milestone closeout.
- [x] Required Game Director acceptance is recorded in #483.
- [ ] Native GitHub Milestone closed after this factual closeout merges.
- [ ] `bun run ci:check` passes on the closeout PR.
- [ ] `bun run typecheck` passes on the closeout PR.
- [ ] `bun run test` passes on the closeout PR.
- [ ] `bun run build` passes on the closeout PR.
