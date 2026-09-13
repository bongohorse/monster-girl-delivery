# Issue #140 — Browser/WebView input validation matrix

This document records the remaining manual/device checks for browser and WebView input behavior. Automated coverage protects the Phaser configuration, Space-only keyboard capture, pointer/lifecycle cleanup, and the Phaser 4.2.1 wheel-listener teardown workaround. It does not substitute for physical browser/device testing.

## Automated coverage

- Phaser mouse wheel capture is explicitly configured with `preventDefaultWheel: true`.
- Phaser touch capture is explicitly configured with `capture: true`.
- Context-menu suppression remains Phaser-scoped to the game surface.
- Only Space is captured for gameplay keyboard input; arrow keys remain uncaptured.
- Pointer cancellation, outside release, scene teardown, and lifecycle interruption release held gameplay input.
- Overlapping blur/hidden/page-suspension reasons cannot incorrectly resume simulation early.
- A hidden document starts paused.
- The game canvas owns `touch-action: none`, selection suppression, and WebKit touch-callout suppression; Director DOM controls are not covered by those canvas-only rules.
- A scoped app-side guard removes Phaser 4.2.1's retained canvas `wheel` listener during game teardown while upstream issue [phaserjs/phaser#7340](https://github.com/phaserjs/phaser/issues/7340) remains unresolved.

## Manual browser/device matrix

Record each row as PASS / FAIL plus browser version, OS/device, and any reproduction notes.

| Environment | Wheel / precision touchpad | Touch hold / drag / pull-to-refresh | Right-click / context menu | Space / non-game keys | Tab/app background + resume | Director DOM controls |
| --- | --- | --- | --- | --- | --- | --- |
| Desktop Chrome | Pending | N/A | Pending | Pending | Pending | Pending |
| Desktop Edge | Pending | N/A | Pending | Pending | Pending | Pending |
| Android Chrome | N/A | Pending | Pending where applicable | Pending with keyboard if available | Pending | Pending |
| Samsung Internet | N/A | Pending | Pending where applicable | Pending with keyboard if available | Pending | Pending |
| Samsung Android WebView / packaged shell | N/A | Pending | Pending where applicable | Pending with keyboard if available | Pending | Pending |

## Required observations

For wheel/trackpad, confirm the page does not scroll or bounce while the pointer is over the game canvas. For touch, confirm gameplay hold/drag does not pan the page, trigger pull-to-refresh, select text, or show a touch callout. Right-click on the game surface must not open the browser context menu. Space must remain gameplay input without scrolling the document, while unrelated keys such as ArrowUp and ArrowDown remain available to browser/DOM tooling unless they later become gameplay controls.

For lifecycle checks, background and restore the tab/app repeatedly and confirm input is released on suspension, simulation does not accumulate inactive time, and resume does not become stuck or fire an early resume while another pause reason remains active. Samsung Internet/WebView should receive special attention because visibility/focus event ordering can differ from desktop browsers.

Director Mode checks should exercise its DOM controls directly and confirm the canvas-specific touch policy does not prevent intended pointer or keyboard interaction outside the canvas.
