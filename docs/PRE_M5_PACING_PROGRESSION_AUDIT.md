# Pre-M5 pacing, progression, and timing audit

Issue: #183  
Decision: **DEFER**

This audit challenges the current M4 prototype progression against the recovered Jetpack reference structure without treating reference values as requirements. It does not certify production balance and makes no gameplay/config changes.

## Authority reviewed

MGD authority:

- `src/config/RunMotionConfig.ts`
- `src/difficulty/DifficultySystem.ts`
- `src/pacing/PacingSystem.ts`
- `src/pacing/PacingPatternSelection.ts`
- `src/generation/EncounterProfile.ts`
- `src/generation/EncounterVarietyPolicy.ts`
- `src/generation/LiveEncounterPolicy.ts`
- `src/generation/GeneratedHazardStream.ts`
- `src/generation/PrototypeHazardPatternFixtures.ts`
- `src/generation/PatternGenerator.ts`
- `src/hazards/TelegraphedHazardLifecycle.ts`
- `ARCHITECTURE.md`

Reference evidence:

- `bongohorse/apk#5` and its canonical `docs/gameplay-time-units.md`
- recovered pacing findings already preserved in `bongohorse/apk/docs/`

The reference is used only to ask whether progression axes are intentional and independently owned. Its exact intervals, probabilities, coordinates, and mixed-unit values are not copied.

## Current progression timeline

The default horizontal speed is 350 logical pixels/second. Difficulty multiplies that speed and independently tightens reaction time, reaction spacing, vertical corridor targets, entry count, and density limits. Pacing is a separate deterministic 7,100-distance repeating cycle:

`breather 1400 → low 1800 → medium 1800 → high 1400 → peak 700`

Representative snapshots:

| Run distance | Difficulty | Effective speed | Reaction time | Reaction horizon | Pacing | Pacing entry/density ceiling | Representative eligible live content before hard fairness/readability |
|---:|---|---:|---:|---:|---|---|---|
| 0 | tier-0 | 350 | 2.0 s | 700 | breather | 1 / 2 per 1000 | none; no current profile permits breather |
| 1,400 | tier-0 | 350 | 2.0 s | 700 | low | 2 / 4 | none at tier-0; line requires medium+ |
| 3,200 | tier-1 | 378 | 1.9 s | 718.2 | medium | 3 / 5 | line, corridor, offset pair, vertical patrol, timed pulse, target-lock strike |
| 5,000 | tier-1 | 378 | 1.9 s | 718.2 | high | 5 / 7 | same six-pattern live catalog, subject to policy/fairness |
| 6,000 | tier-2 | 406 | 1.8 s | 730.8 | high | 5 / 7 | same six-pattern live catalog, subject to policy/fairness |
| 6,400 | tier-2 | 406 | 1.8 s | 730.8 | peak | 6 / 8 | same six-pattern live catalog, subject to policy/fairness |
| 7,100 | tier-2 | 406 | 1.8 s | 730.8 | breather | 1 / 2 | none; explicit recovery window repeats intact |
| 10,000 | tier-3 | 434 | 1.7 s | 737.8 | low | 2 / 4 | offset pair, vertical patrol, timed pulse, target-lock strike; line/corridor exceed low density ceiling |
| 13,500 | tier-3 | 434 | 1.7 s | 737.8 | peak | 6 / 8 | same six-pattern live catalog, subject to policy/fairness |

`Reaction horizon` above is speed × minimum reaction time and is included to show that the shorter time window is not accompanied by a shorter scheduling distance. The player receives progressively less time, while the generator schedules farther ahead because speed rises.

The difficulty tier constraints progress as follows:

| Tier | Start | Speed multiplier | Min reaction | Min spacing | Min vertical corridor | Max entries | Max density / 1000 |
|---|---:|---:|---:|---:|---:|---:|---:|
| 0 | 0 | 1.00 | 2.0 s | 96 | 96 | 3 | 5 |
| 1 | 2,500 | 1.08 | 1.9 s | 88 | 90 | 4 | 6 |
| 2 | 6,000 | 1.16 | 1.8 s | 80 | 84 | 5 | 7 |
| 3 | 10,000 | 1.24 | 1.7 s | 72 | 78 | 6 | 8 |

## Progression-axis findings

### Encounter frequency / cadence

MGD does not own cadence as a single opaque spawn timer. The live stream derives a reaction-distance scheduling horizon from authoritative run speed and minimum reaction seconds, advances a deterministic logical pattern-start cursor, and lets pacing/difficulty/readability/fairness admit or defer content. This is a stronger unit/authority boundary than copying the reference's recovered spawn interval values, whose stored unit remains unresolved in the reference audit.

The practical cadence nevertheless becomes denser at higher difficulty because maximum pattern-entry and hazard-density ceilings rise while speed also rises. This is intentional in structure, but the current numerical combination is prototype tuning rather than certified balance.

### Family availability and pattern complexity

The current live catalog contains six patterns across five variety families. Tier 0 exposes only the simple line pattern, and tier 1 introduces the remaining families. No later tier introduces another family or complexity step.

This makes the current progression **front-loaded**: most catalog expansion happens once at tier 1, while tiers 2 and 3 mainly tighten global constraints. That is sufficient for an M4 architecture prototype but not evidence of a production progression curve.

### Easy-pattern retirement / late-pool triviality

No current live pattern has a finite `maximumTierIndex`; once introduced, every pattern remains difficulty-eligible forever. Pacing can still exclude simple dense patterns during `low`, and recent-family suppression reduces immediate repeats, but there is no true late-run retirement authority in the current catalog.

This differs structurally from the recovered reference, where some easy patterns leave eligibility as later patterns enter. It is a real observation, not yet a demonstrated MGD defect: the current six-pattern catalog is explicitly prototype content and is too small to justify adding a retirement framework or retuning ranges without gameplay/content evidence.

### Family frequency versus pattern difficulty

MGD correctly separates eligibility from deterministic selection, but it does **not** currently have an independent family-frequency curve. After difficulty, pacing, variety, and hard policy filters, `PatternGenerator` selects uniformly by candidate array index. Therefore authored pattern count can influence effective family frequency: `static-sequence` currently has two patterns while the other live families have one each. The variety policy partially counteracts repetition with a two-family recent-history window, but it is not a family probability authority.

Do not add family weights solely to imitate the reference. If future content or playtests show family-frequency control is needed, that should be a focused task with explicit desired behavior.

### Compound escalation

Difficulty tiers currently change several levers at the same distance boundary:

- speed increases;
- available reaction seconds decrease;
- minimum spacing decreases;
- minimum corridor width decreases;
- maximum entries increase;
- maximum density increases.

Pacing remains a separate repeating axis, so a tier boundary can land in any pressure phase. This means a player can cross a difficulty threshold while already in `high` or `peak`, producing a legitimate compound step rather than a gradual single-axis escalation.

The architecture handles this coherently and deterministically, and the reaction-distance horizon remains conservative as speed rises. What is **not** established is whether the prototype numbers feel too coarse or whether simultaneous changes are too aggressive. That is a tuning/playtest question, so this audit does not change the tiers.

### Breathers at late difficulty

Breathers remain structurally strong at every difficulty tier because no current encounter profile permits the `breather` intensity. The pacing system therefore produces a deterministic no-pressure content window every 7,100 logical distance units rather than allowing difficulty to erase recovery.

This is a good M4 invariant. Whether 1,400 distance units is the right late-run breather length is not certifiable from architecture or reference data alone.

### Recent-history diversity

The variety authority retains exactly two recently accepted family IDs, records only accepted encounters, consumes no RNG, and falls back deterministically when fresh content is unavailable. Difficulty escalation does not shrink this window. This preserves the intended separation between progression and repetition control.

## Timing-unit audit

MGD's relevant gameplay-time contracts are explicit at their owners:

| Authority | Unit contract |
|---|---|
| `RunMotionConfig.baseScrollSpeed` | logical pixels per second |
| difficulty `minimumReactionTimeSeconds` | seconds |
| difficulty/pacing tier and phase boundaries | logical run-distance units |
| pacing `distanceLength` | positive whole logical distance units |
| hazard lifecycle `warningSeconds` / `lockSeconds` / `activeSeconds` | normalized simulation seconds |
| vertical patrol `cycleDistance` | logical run distance |
| generated-hazard retention/reaction spacing | logical distance |
| live readability reservations | normalized simulation-time windows |

No material ambiguous elapsed-time contract was found in the reviewed MGD authority. In particular, MGD should **not** rename or reinterpret values to match the reference build's mixed conventions. The APK time-unit audit explicitly found seconds, milliseconds, 60 Hz-derived values, counts, distance domains, and unresolved pacing interval fields in different consumers.

## Answers to the issue questions

- **Are difficulty bands too coarse?** Unproven. They make multi-lever steps at 2,500 / 6,000 / 10,000, but judging coarseness requires representative gameplay evidence.
- **Do easy patterns leave eligibility?** No. The late pool only grows; pacing can temporarily exclude some simple dense patterns, but no difficulty profile retires them.
- **Are family frequencies independent from pattern difficulty?** Only partially. Eligibility and variety are separate, but there is no independent family weighting/frequency curve; final selection is uniform across the surviving pattern array.
- **Can escalation compound?** Yes. Speed, reaction seconds, spacing, corridor size, entry ceiling, and density ceiling move together at tier boundaries while pacing continues independently.
- **Are breathers meaningful late?** Structurally yes: current breather phases admit no live pressure patterns even at tier 3.
- **Are timing units explicit?** Yes for the reviewed MGD authorities; no MGD timing-unit correction is justified by current evidence.
- **Is prototype tuning becoming de facto production tuning?** It would if carried forward without playtesting. The code correctly labels the relevant configs and content as `PROTOTYPE`; this audit does not promote them.

## Comparison with recovered reference structure

Useful structural lessons supported by the reference are already represented in MGD where they matter most: distance-gated eligibility, eligibility before RNG, explicit repetition suppression, distinct pacing versus difficulty ownership, and subsystem-specific time semantics.

Two reference characteristics are not currently represented: deliberate retirement of easy patterns and independent top-level family probability curves. They are **not automatically missing requirements**. With only six prototype patterns, adding either mechanism now would be speculative architecture/content tuning rather than a demonstrated correction.

## Decision: DEFER

Keep the M4 architecture and current prototype configuration unchanged for now.

The audit found no correctness or unit-contract defect requiring a production-code fix. It did find two design/tuning questions that must not silently become production assumptions: the late pool never retires easy content, and family frequency is an emergent result of the surviving pattern array rather than its own progression axis. Compound tier escalation also needs gameplay evidence before numerical changes are justified.

A future adjustment is warranted only when representative long-run playtests and/or a larger approved hazard catalog provide evidence that one of those observations creates a player-visible pacing problem. At that point, prefer the smallest focused change to the owning eligibility/profile/config authority rather than replacing M4 or copying reference values.

## Validation

Documentation-only audit. No runtime/config/test behavior changed, so the repository's code compilation and gameplay suite are not required by `AGENTS.md` for this change. The audit preserves all existing deterministic M4 guarantees by making no production change.
