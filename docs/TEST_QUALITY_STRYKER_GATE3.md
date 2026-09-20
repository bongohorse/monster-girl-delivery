# Test Quality Gate 3 — bounded Stryker Collectibles pilot

Umbrella: #371

Gate 3 runs mutation testing only against the Collectibles authority slice already given independent rules in Gate 2. It is evidence about test sensitivity, not a correctness oracle and not a score target.

## Audited mutation scope

The pilot mutates only selected ranges in `src/systems/PrototypeCollectibles.ts`:

- pickup footprint / collectible hitbox construction;
- first-overlap/contact-boundary calculation;
- lethal-prefix ordering through the pickup boundary;
- consumed-identity guard and pickup award path.

Generation, presentation, Graze, general hazard collision, scoring, and unrelated Collectibles broadphase/lifecycle code are outside this pilot.

The exact ranges are versioned in `stryker.collectibles.config.mjs`.

## Tie semantics carried from Gate 2

The phrase “pickup wins an exact first-contact tie” refers to **equal onset boundaries for future positive-area overlap**, not to treating a flächenlose edge touch as a pickup.

For the analytical fixture:

- at exactly `t = 1.32 s`, the player/coin and player/hazard pairs only touch at their horizontal edges; positive-area overlap is still false, so there is neither pickup nor lethal collision;
- for a step extending immediately beyond that boundary, both interactions contain positive-area overlap;
- because the two positive-overlap opportunities share the same onset boundary, only a lethal overlap strictly earlier than the pickup onset blocks pickup;
- therefore the equal-onset case awards the pickup and the same enclosing simulation step still ends dead.

The permanent Gate 2 authority test now checks the boundary-only and immediately-after-boundary cases separately.

## Toolchain

Pinned project dependencies:

- `@stryker-mutator/core@10.0.0`;
- `@stryker-mutator/vitest-runner@10.0.0`;
- existing `vitest@5.0.1`.

The official Stryker Vitest runner uses per-test coverage and runs Vitest single-threaded inside Stryker workers. An upstream 2026 issue reported nondeterministic mutant verdicts in some per-test Vitest runs. The MGD pilot therefore executes the same mutation run twice and fails the audit if any mutant ID is missing or changes status between the two runs.

## Bounded execution

The permanent mutation workflow is manual-only after Gate 3 validation.

Bounds:

- exact source ranges instead of the whole repository;
- Stryker concurrency fixed at 2;
- workflow timeout: 25 minutes;
- per-mutant timeout: Stryker baseline-derived timeout with `timeoutFactor: 2` and `timeoutMS: 8000`;
- no mutation-score break threshold;
- full JSON + HTML reports retained as workflow artifacts.

Before mutation, the workflow runs the focused unchanged Collectibles suites green.

## Result policy

For the checked commit, report separately:

- Killed — killed by a test assertion/failure;
- Survived;
- NoCoverage;
- Timeout;
- CompileError;
- RuntimeError;
- Ignored/excluded with justification.

Timeouts are investigated separately and are not described as equivalent to assertion kills.

Every relevant survivor is classified as one of:

- meaningful behavioral survivor;
- performance-only survivor;
- equivalent within the valid domain;
- invalid/out-of-domain mutation.

Gate 3 has no required mutation-score percentage. It closes when the bounded pilot is reproducible and every relevant survivor has a documented classification.
