# Rotating Zapper sampling safety evidence

Issue: #332

## Decision

Keep the current rotating-Zapper `1/720 s` simulation-time lattice for now.

Do **not** reduce its frequency by simply changing the fixed timestep, and do not replace it with a velocity-derived fixed step unless the replacement carries an explicit conservative collision proof.

The existing lattice remains the project's established reference tolerance. It is not an analytic proof of exact continuous collision.

## Why a coarser fixed lattice is unsafe

The long prototype Zapper has:

- beam half-length `R = 100 px`;
- endpoint radius `16 px`;
- maximum authored rotation speed `90 deg/s`.

Consider one endpoint rotating on

`p(theta) = R * (cos(theta), sin(theta))`.

Place the nearest player-AABB corner on the same radial line at

`q = (R + r) * (cos(theta0), sin(theta0))`

with `r` just below the endpoint radius. At `theta0`, the endpoint circle overlaps the player by a tiny positive amount.

For an angular offset `delta`, the endpoint-to-corner distance is

`d(delta)^2 = R^2 + (R + r)^2 - 2 R (R + r) cos(delta)`.

Therefore the overlap can be made arbitrarily shallow at `theta0` while both neighboring sampled poses are outside contact.

### Reproducible 1/360 s counterexample

At 90 deg/s:

- `1/360 s` advances `0.25 deg` per sample;
- `1/720 s` advances `0.125 deg` per sample.

Choose:

- `theta0 = 45.125 deg`, which is exactly on the `1/720 s` lattice and halfway between two `1/360 s` samples;
- `r = 15.9995 px`, i.e. `0.0005 px` endpoint penetration.

The middle pose overlaps. Both neighboring `1/360 s` poses do not. The automated evidence test pins this construction.

So changing `1/720 s` to `1/360 s` can create a real false negative without changing any gameplay geometry.

### Deterministic adversarial phase sweep

The test suite also sweeps many odd `1/720` indices from roughly 20 to 70 degrees. Every tested target is deliberately placed halfway between neighboring `1/360` samples and receives the same tiny positive endpoint penetration.

This keeps the evidence reproducible while covering many lattice phases instead of relying on one hand-picked angle. A deterministic adversarial sweep is more useful here than unconstrained random fuzzing because the failure condition is specifically phase alignment between two fixed lattices.

## Why this also matters for the current 1/720 s lattice

The same construction can be repeated between any two fixed samples.

The test suite also records a `1/1440 s` contact halfway between two `1/720 s` poses. This does **not** mean the production lattice should be doubled again. It means a fixed-frequency pose lattice is fundamentally a numerical tolerance when overlap uses strict positive-area semantics and there is no minimum guaranteed penetration depth.

Therefore:

- `1/720 s` is retained because it is the current tested reference and coarsening it is demonstrably unsafe;
- `1/720 s` must not be described as an exact mathematical continuous-collision proof;
- increasing the fixed frequency indefinitely is not a principled end state either.

## Consequence for #332

The safe remaining optimization direction is not "pick a lower sample rate".

Further work should use one of these proof-carrying approaches:

1. conservative angular interval rejection/subdivision, where an interval is discarded only when the swept Zapper geometry cannot overlap the swept player bounds;
2. an exact or conservative time-of-impact solution for rotating capsule/circle versus the player AABB;
3. another mathematically equivalent method that cannot skip a possible positive-area contact.

The broadphases already merged under #332 remain valuable because they reduce how often the dense reference path is entered at all.

Until a conservative replacement exists, the production `0.5 px / 1/720 s` lattice stays unchanged.
