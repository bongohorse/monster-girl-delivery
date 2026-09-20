# Test Quality Gate 5A — analytical Collectibles contact references

Umbrella: #371

This first Gate 5 slice targets the two Gate 4 survivors around the defensive `contactSeconds === null` guard. It does not assume either internal implementation is correct. Instead it adds independently solved AABB contact-time cases and observes pickup/death ordering around those known boundaries.

## Independent reference rules

The prototype player extents are 18 horizontally and 24 vertically. The Collectible pickup half-size is 14.

Therefore, for a point-like player center and a static Collectible center:

- horizontal positive-overlap threshold: `18 + 14 = 32`;
- vertical positive-overlap threshold: `24 + 14 = 38`;
- equality is edge-only and does not count;
- first 2D pickup contact is the earliest time when both open axis-overlap intervals intersect.

The tests use lifecycle-controlled lethal hazards that already overlap spatially. Their `collisionInterval.startSeconds` is placed just before, exactly at, or just after the analytically solved pickup onset. This brackets the private production contact solver without importing or reproducing it.

## Reference cases

### Horizontal-only

Coin X = 100, player X starts at 0, scroll speed = 100.

Edge contact:

`(100 - 32) / 100 = 0.68 s`

Expected ordering:

- lethal start `0.68 - 1e-6`: pickup blocked;
- lethal start `0.68`: exact onset tie, pickup wins;
- lethal start `0.68 + 1e-6`: pickup wins.

### Vertical-only linear

Player Y starts at 195 and moves downward at 20 units/s. Coin Y = 250.

The first vertical edge is player center Y = `250 - 38 = 212`.

`(212 - 195) / 20 = 0.85 s`

The same before/tie/after lifecycle bracket is asserted.

### Vertical-only quadratic

Player starts Y = 195, v = 0, acceleration = 40. The same edge is Y = 212.

`17 = 0.5 * 40 * t^2`

so:

`t = sqrt(17 / 20)`

The test brackets that independently solved root.

### Disjoint axis windows

Coin X = 100 creates horizontal positive overlap only between 0.68 s and 1.32 s.

With player Y starting at 195 and moving downward at 10 units/s toward coin Y = 250, vertical positive overlap starts after:

`(212 - 195) / 10 = 1.7 s`

Each axis overlaps at some point during a 2 s step, but the intervals never overlap each other. The reference result is therefore no pickup.

## Claim boundary

These tests establish consistency for the stated static-Collectible AABB cases:

- horizontal linear motion;
- vertical linear motion;
- one quadratic vertical trajectory;
- axis-window intersection;
- open-boundary tie semantics.

They do **not** prove arbitrary polynomial trajectories, malformed trajectories, every flight-bound transition, or general hazard geometry. A surviving defensive guard is not reclassified globally from this finite set alone.

This slice intentionally keeps “finer sampling” out of the oracle.


## Accepted Gate 5A evidence

Validated PR head:

`03c9751b9948975ccc204909fd5aaf3b8af300b3`

Normal CI #1000 / run `35529867137` passed:

- Biome;
- TypeScript;
- **113 test files / 824 tests**;
- production build.

Mutation audit #19 / run `35529867155` passed twice with a focused baseline of **28 tests**:

| State | Run 1 | Run 2 |
| --- | ---: | ---: |
| Killed | 49 | 49 |
| Survived | 16 | 16 |
| NoCoverage | 0 | 0 |
| Timeout | 0 | 0 |
| CompileError | 0 | 0 |
| RuntimeError | 0 | 0 |
| Ignored | 0 | 0 |

- mutant count: 65 per run;
- verdict changes: **0**;
- Stryker runtime: **1 min 12 s / 1 min 12 s**;
- merge-ref/report commit: `f2ca5acdbf2e8e8722adc26bda85f7d4c663e4c4`;
- artifact ID: `10610708012`;
- artifact digest: `sha256:3a6c0da634c2b36e2ae5216744cd1032aeca0fd81a3b42f37b3ed58390472095`.

The survivor set is unchanged from Gate 4:

`17, 19, 21, 22, 23, 24, 26, 27, 29, 34, 37, 40, 41, 43, 54, 56`

Most importantly, the defensive contact-null mutants **54 and 56 still survive**.

This is useful negative evidence rather than a failed gate: the independently solved horizontal-linear, vertical-linear, vertical-quadratic and disjoint-axis reference cases found no disagreement between the exact pickup precheck and the first-contact solver.

The valid claim is therefore narrow:

> Within the analytical Gate 5A reference set, the exact collision precheck and first-contact solver agree on pickup existence and ordering.

Gate 5A does **not** prove the `contactSeconds === null` guard unreachable for every valid trajectory. Mutants 54/56 remain deferred until the reference domain is widened across flight-bound transitions, multi-segment trajectories and other independently solvable collision cases.
