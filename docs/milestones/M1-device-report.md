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

## Deferred manual compatibility checks at M1 closeout

The following originally planned manual cases were not recorded at M1 closeout and were explicitly deferred to **#69**:

- narrow desktop browser;
- wide desktop browser;
- mouse thrust;
- Space thrust;
- live desktop resize while running;
- background/foreground interruption while thrust is held;
- stuck-input check after resume;
- first-frame movement-jump check after resume;
- detailed desktop OS/browser/viewport metadata.

These checks were non-blocking for the M1 mobile-first orientation decision and M2 start. They were later executed in the post-M1 browser follow-up recorded below.

## M1 device-test conclusion

- Smartphone: **PASS (reported)**
- Tablet: **PASS (reported)**
- Blocking mobile/tablet defects: **none reported**
- Desktop/browser manual compatibility at M1 closeout: **DEFERRED to #69**
- Director acceptance to proceed: **YES**
- Orientation decision recorded separately in #22: **Landscape**

The report intentionally distinguishes reported evidence, automated coverage, and deferred checks rather than claiming a larger test matrix than was actually executed.

## Post-M1 desktop/browser follow-up — #69

**Date executed:** 2026-09-13  
**Result:** PASS for every deferred #69 case in the tested desktop/browser environment.

This is later follow-up evidence. It does not rewrite the historical fact that the desktop/browser matrix was still deferred when M1 originally closed.

### Environment and method

The current production build was exercised in a real headed Chromium browser, not inferred from unit tests. The browser ran on a Linux X11 virtual desktop so mouse, keyboard, window-resize, focus, and real Chromium tab visibility transitions could be driven through the desktop input/window system.

- Source baseline: `main` at `5ffa2780ab1a28b9d569a0cad810aa36bb95369d`.
- Browser: Chromium `144.0.7559.96`, Debian GNU/Linux 13 build.
- OS/runtime: Linux x86_64, kernel `6.18.35`.
- Display: X11 virtual desktop using Xvfb + Openbox, device-pixel ratio `1`.
- Phaser renderer observed in this environment: Canvas.
- Wide browser viewport observed: `1920×941` CSS px.
- Narrow browser viewport observed after live resize: `792×557` CSS px.
- Second wide live-resize viewport observed: `1592×757` CSS px.
- The Phaser canvas matched the browser viewport dimensions after each settled resize.
- Test-only instrumentation was injected only into the local built HTML to record browser lifecycle events and rendered player/canvas positions. No instrumentation or browser-test harness was added to production source.

### Compatibility matrix

| Case | Result | Observed evidence |
|---|---|---|
| Wide desktop browser | PASS | Game loaded and ran at `1920×941`; canvas/backing store matched `1920×941`; player remained visible. |
| Narrow desktop browser | PASS | Live resize settled at `792×557`; canvas/backing store matched `792×557`; player remained visible and gameplay continued. |
| Mouse thrust | PASS | With real X11 pointer input, player Y centroid moved from `915.25` at pointer-down to `690.77` before the tab became hidden, confirming upward thrust response. |
| Space thrust | PASS | With real X11 keyboard input, player Y centroid moved from `915.25` on Space-down to `727.34` on Space-up after about `646 ms`, confirming upward thrust response. |
| Live desktop resize while running | PASS | While the run was active and the player was airborne, the browser resized wide → narrow → wide; the canvas reconciled to `792×557` and then `1592×757` without a crash or lost player. |
| Background/foreground interruption while thrust was held | PASS | Mouse thrust was held, Chromium was switched to a new tab using its real tab shortcut, and the mouse button was released while the game tab was hidden. Chromium emitted real `blur` + `visibilitychange(hidden)` and later `visibilitychange(visible)` + `focus` transitions. |
| No stuck input after resume | PASS | The game tab received no pointer-up event while hidden, yet after return the player stopped the thrust trajectory, reversed under normal gravity, and reached the floor by about `1.4 s`; no stuck thrust remained. |
| No first-frame movement jump after resume | PASS | Player Y at hidden was `690.77`; it was still exactly `690.77` on visibility restoration and on the first resumed animation frame. Background time was not applied as a giant simulation step. |
| Desktop metadata recorded | PASS | Browser, OS/runtime, renderer, DPR, and tested viewport dimensions are recorded above. |

No reproducible defect was found, so #69 did not produce a defect follow-up issue.

### Scope of this evidence

This pass validates the deferred M1 cases in **Chromium on Linux/X11 using the Canvas renderer**. It is not evidence for physical Windows/macOS hardware, Firefox/Safari/Edge-specific behavior, WebGL/GPU paths, or a future Steam wrapper. Those target-specific checks belong to the corresponding platform/release work if and when those targets are promoted.

For the scope actually deferred by M1 and tracked by #69, the compatibility matrix is complete and **PASS**.
