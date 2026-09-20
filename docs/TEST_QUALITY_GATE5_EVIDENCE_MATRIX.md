# Test Quality Gate 5E — evidence matrix and stability audit

Umbrella: #371

Gate 5E closes the remaining evidence-management gap in Gate 5. It does not duplicate subsystem tests that already carry an independent analytical rule or a deterministic counterexample.

## Gate 5 evidence matrix

| Area | Existing evidence | Claim |
| --- | --- | --- |
| Collectible collision/contact | `TEST_QUALITY_COLLISION_REFERENCE_GATE5.md`, Gate 5A–5C | Analytical single/multi-segment references plus a 294-case independent piecewise-linear interval oracle |
| Collectible frame partition | `CollectibleFramePartitionEvidence.test.ts`, `TEST_QUALITY_DETERMINISM_GATE5.md` | Exact discrete IDs/count/value/reward across 30/60/90/120/144 Hz + deterministic jitter |
| Graze | `PrototypeGraze.test.ts`, `PrototypeZapperGraze.test.ts` | Explicit positive-area outer/core boundaries, occurrence dedupe/order, relative motion, fixed-rate + jitter partition evidence |
| Flight motion | `FramePartitionSimulation.test.ts`, `VerticalFlightSimulation.test.ts` | Analytical acceleration/cap/boundary behavior and numerical-tolerance partition equivalence |
| Hazard lifecycle | `TimedLaserLifecycle.test.ts`, `SystemPartitionEvidence.test.ts` | Exact lifecycle phase boundaries and simulation-time target locking across standard partitions |
| Generation / fairness | `FlightReachability.test.ts`, `PatternValidator.test.ts`, `SystemPartitionEvidence.test.ts` | Analytical reachable envelopes/boundaries plus fixed-seed PRNG/pattern/geometry equivalence across partitions |
| Rotating Zapper sampling | `PrototypeZapperRotationSamplingEvidence.test.ts`, `ZAPPER_ROTATION_SAMPLING_EVIDENCE.md` | Permanent 1/360 vs 1/720 and 1/720 vs 1/1440 counterexamples; fixed lattice explicitly treated as tolerance, not truth |

This matrix is intentionally descriptive. A subsystem is not considered correct merely because multiple schedules agree.

## Randomized/seeded evidence rule

When a randomized or PRNG-backed test fails:

1. preserve the exact seed in the regression;
2. reduce the failing scenario while retaining the seed/counterexample identity where practical;
3. prefer a minimized deterministic fixture for the permanent regression;
4. never replace a reproducible counterexample with a broad “try many random seeds” test alone.

Existing generation/system partition evidence already pins named seeds and compares exact PRNG state, pattern identity and geometry.

## Test-order and isolation audit

The manual **Test stability audit** workflow exercises the full Node suite under deterministic ordering changes.

Required isolated runs:

- forks + isolated files + shuffled files/tests, seed `37101`;
- forks + isolated files + shuffled files/tests, seed `37102`.

A third diagnostic run uses the same seed `37101` with:

- forks;
- `--no-isolate`;
- no file parallelism;
- shuffled files/tests.

The shared-context run is diagnostic rather than a product-authority gate. If it fails while isolated runs pass, the result identifies hidden cross-file/global-state coupling or a legitimate dependency on Vitest's default isolation. The failure must be investigated before using `--no-isolate` as a performance optimization.

## Why this is separate from normal CI

Normal CI should remain fast and deterministic. Shuffle/isolation variation is an audit tool used after suspicious flakes, test-infrastructure changes, or before deliberately changing Vitest pool/isolation settings.

The workflow is manual-only after Gate 5E validation and retains its logs plus exact commit/run metadata as an artifact.
