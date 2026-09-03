# M1 Real-Device Flight Report

**Date:** 2026-09-03  
**Milestone:** M1 — Flight Prototype  
**Related issues:** #21, #22, #69

## Purpose

Record the real-device evidence actually supplied by the Game Director for the M1 flight prototype without inventing missing metadata or unperformed checks.

## Reported real-device results

| Device class | Result | Evidence supplied |
|---|---|---|
| Smartphone | PASS | Game Director reports that the current flight prototype works well. |
| Tablet | PASS | Game Director reports that the current flight prototype works well. |

No blocking smartphone/tablet defect was reported.

The Director did not provide reproducible device model, OS/browser, viewport dimensions, or a per-sub-check breakdown for these two PASS results. Those details are therefore intentionally not fabricated here.

## Product outcome from the mobile evidence

The Game Director explicitly accepted the smartphone/tablet result as sufficient to continue the mobile-first project and selected **Landscape** as the current core gameplay orientation for #22.

The intended core spatial flow is left-to-right, Jetpack-Joyride-style. Portrait may be revisited later only as a FUTURE separate mode or variant.

This report records the evidence and acceptance decision; `MASTER_SPEC.md` is updated separately by #22.

## Automated coverage already present

The repository has deterministic automated coverage for the main M1 invariants, including:

- authoritative `TimeService` delta clamping and resume handling;
- centralized `InputService` intent and release behavior;
- lifecycle pause/resume input release;
- floor/ceiling containment;
- resize containment without advancing simulation time;
- Director tuning updates and gameplay-input blocking;
- Director-enabled and Director-disabled scene behavior;
- Preloader responsive resize/lifecycle behavior.

Automated coverage supports confidence in these invariants but is not represented as manual real-device evidence.

## Deferred manual compatibility checks

The following originally planned manual cases were not recorded and are explicitly deferred to **#69**:

- narrow desktop browser;
- wide desktop browser;
- mouse thrust;
- Space thrust;
- live desktop resize while running;
- background/foreground interruption while thrust is held;
- stuck-input check after resume;
- first-frame movement-jump check after resume;
- detailed desktop OS/browser/viewport metadata.

These checks are non-blocking for the M1 mobile-first orientation decision and M2 start, but remain required before desktop/Steam becomes a release target or earlier if desktop testing exposes a problem.

## M1 device-test conclusion

- Smartphone: **PASS (reported)**
- Tablet: **PASS (reported)**
- Blocking mobile/tablet defects: **none reported**
- Desktop/browser manual compatibility: **DEFERRED to #69**
- Director acceptance to proceed: **YES**
- Orientation decision recorded separately in #22: **Landscape**

The report intentionally distinguishes reported evidence, automated coverage, and deferred checks rather than claiming a larger test matrix than was actually executed.
