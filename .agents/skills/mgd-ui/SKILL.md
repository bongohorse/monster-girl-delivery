---
name: mgd-ui
description: "Create or change MGD HUD, menus, buttons, results or Director interfaces using existing UI, input and layout ownership. Use for presentation and interaction, not artwork creation or changed game rules."
---

# MGD UI

Implement the requested flow using existing components and styling. [AGENTS.md](../../../AGENTS.md) and the assigned task control scope and authorization. Choose routine layout, test and input details autonomously.

## Find the existing path

Inspect the affected screen/control, its state source and supported inputs. Read the relevant owning sections only: [MASTER_SPEC](../../../MASTER_SPEC.md) for UI/platform/product rules and [ARCHITECTURE](../../../ARCHITECTURE.md) for input, lifecycle, viewport and Director boundaries.

| Surface | Existing entry points |
|---|---|
| Gameplay/results | [Foundation](../../../src/game/scenes/Foundation.ts), [PrototypeRunResult](../../../src/systems/PrototypeRunResult.ts), [PrototypeDeathRetryFlow](../../../src/systems/PrototypeDeathRetryFlow.ts) |
| Director Phaser controls | [DirectorPanel](../../../src/devtools/DirectorPanel.ts), [DirectorTuningControls](../../../src/devtools/DirectorTuningControls.ts), [DirectorRunControls](../../../src/devtools/DirectorRunControls.ts) |
| DOM diagnostics | [DirectorPerformanceHud](../../../src/devtools/DirectorPerformanceHud.ts); inspect browser propagation/focus separately from Phaser hit areas |
| Layout/input | [ViewportService](../../../src/core/ViewportService.ts), [DirectorResponsiveLayout](../../../src/devtools/DirectorResponsiveLayout.ts), [InputService](../../../src/input/InputService.ts), [LifecycleService](../../../src/core/LifecycleService.ts) |

Load [scale-and-responsive](../scale-and-responsive/SKILL.md), [input-keyboard-mouse-touch](../input-keyboard-mouse-touch/SKILL.md) or [text-and-bitmaptext](../text-and-bitmaptext/SKILL.md) only for the affected Phaser concern. Route artwork, asset preparation or changed gameplay rules to their owning workflow when that work is part of the request; a UI task does not require traversing every skill.

## Implement and verify the affected flow

- Reuse authoritative values/snapshots and existing callbacks. The HUD displays score/rewards; it does not calculate parallel gameplay totals. Director controls retain their current validation and mode gating.
- Use current layout/safe-area ownership and maintain readable text and usable touch targets. Check representative sizes and text ranges affected by the change; a label correction needs only its affected layout. Preserve the existing visual style.
- For interactive changes, prevent UI input leaking into gameplay, duplicate activation and hidden/disabled actions. Check pointer release/cancellation, keyboard conflicts and focus only for the inputs the surface supports. Keep ownership of blocking state and listeners clear; clean them up when the control's lifetime ends.
- For pause/restart/lifecycle changes, use existing lifecycle/time services. Releasing a UI block must respect other pause reasons and must not leave thrust held. Do not add a parallel pause flag.
- Protect deterministic UI/state/input contracts with focused tests when useful, observe affected live interactions when tools are available, and follow [DEVELOPMENT required verification](../../../DEVELOPMENT.md#3-required-verification) and the applicable [TEST_QUALITY](../../../docs/TEST_QUALITY.md#evidence-selection-matrix) evidence. Screenshots show layout, not touch ergonomics or correct interaction.

Finish the authorized change and its PR with a short report of the flow changed, checks and relevant viewports/inputs tested. Missing browser/device access limits the evidence claimed; provide a concrete playtest for that gap and continue other work. Additional review or acceptance uses existing repository rules, without another approval chain.

## Request examples

| Request | Practical route |
|---|---|
| Change the pause button | Locate the actual control; if absent, implement it when the task authorizes a new button. Reuse lifecycle/time owners and check input leakage, cancellation and resume with other pause reasons. Ask only for a genuinely missing product decision. |
| Extend the result display | Consume the existing run-end snapshot; check longer labels/values and run-end-to-retry interaction. A new gameplay reward needs its owning logic, rather than arithmetic in the display. |
| Add a Director control | Reuse its Phaser or DOM surface, callbacks, responsive placement and mode gating; check the new action and relevant input/cleanup. No new framework or diagnostics audit. |
