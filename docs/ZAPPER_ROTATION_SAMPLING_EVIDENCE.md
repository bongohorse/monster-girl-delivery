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

## Why a naive 0.5 px relative-motion bound is not cheaper

A second tempting replacement is to derive a timestep from the existing `0.5 px` spatial tolerance and the maximum relative motion of the player and rotating Zapper.

Using the current prototype authorities:

- base run speed: `350 px/s` from `RunMotionConfig`;
- tier-3 multiplier: `1.24`, giving `434 px/s`;
- maximum vertical player speed: `700 px/s`;
- long-Zapper endpoint radius from center: `100 px`;
- maximum angular speed: `90 deg/s = pi/2 rad/s`.

A conservative translational speed magnitude is

`sqrt(434^2 + 700^2) ~= 823.5 px/s`.

The rotating endpoint contributes at most

`100 * pi/2 ~= 157.1 px/s`.

Using the triangle inequality gives a conservative relative-motion bound of roughly

`823.5 + 157.1 = 980.6 px/s`.

Keeping relative motion below `0.5 px` would therefore require approximately

`dt <= 0.5 / 980.6 ~= 0.000510 s ~= 1/1961 s`.

That is about `2.7x` denser than the existing `1/720 s` time lattice. This bound is conservative rather than exact, but it is enough to reject the simple idea that an actual-motion-derived `0.5 px` fixed step would automatically reduce work at the current gameplay envelope.

This does not rule out adaptive interval rejection or a tighter time-of-impact method. It rules out the naive fixed-step substitution as a performance win.

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
