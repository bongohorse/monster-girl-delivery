# #329 instrumented BEFORE browser baseline

Source commit: `0eb3d9c4d6ec9a0f697389fa8c8d4f444effa0e3` (`perf/329-mobile-baseline`).

This branch adds the same MEM sampler, Director button and evidence-export logic as PR #449.
It deliberately retains the pre-optimization gameplay/runtime allocation path from the source commit.
It does not backport the Android project or production diagnostics, which did not exist at
that commit.

Use a development Director build in the same mobile browser and on the same device as
the matching AFTER development Director build. Press MEM once, then do not touch gameplay
or press Space. Capture the JSON; separately record comparable allocation/GC profiler
traces on BEFORE and AFTER. Compare reported display settings, wall and simulation time,
run distance and content counts before interpreting frame or heap differences.

MEM reports a sampled heap trend, not allocation bytes or an authoritative GC timeline.
