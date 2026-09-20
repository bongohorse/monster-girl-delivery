# Test Quality Gate 6 — browser/runtime smoke

Umbrella: #371

Node/Vitest remains the deterministic authority for simulation, generation, collision, rewards and exact frame-partition contracts. Gate 6 adds a separate real-browser layer for behavior Node tests cannot establish.

## Runtime seam

The smoke fixture is served by the repository's existing Vite development configuration and boots the real Phaser runtime through:

`Boot -> Preloader -> Foundation`

Director mode is disabled so the smoke exercises the normal gameplay scene rather than Director-only controls.

The workflow uses the Chrome/Chromium binary provided by GitHub's Ubuntu runner. It does not add Playwright, Puppeteer, jsdom, or another browser-test dependency to the game.

## Automated browser assertions

The browser fixture must establish all of the following before it reports PASS:

1. Phaser creates exactly one connected HTML canvas with a positive backing size and concrete renderer.
2. The Boot/Preloader asset path loads the background texture and reaches the active `Foundation` scene.
3. A real DOM `keydown`/`keyup` for Space travels through Phaser's keyboard plugin and `PhaserInputAdapter` into `InputService`.
4. A real DOM mouse down/up travels through Phaser's mouse/input plugin and `PhaserInputAdapter` into `InputService`.
5. A browser `pagehide` event reaches `PhaserLifecycleAdapter`, adds the `suspended` pause reason and releases held gameplay input; `pageshow` removes that reason.
6. A live container resize from 640x360 to 360x640 followed by the browser `resize` event reaches the render-resolution controller, updates the canvas metadata and reconciles Foundation to portrait.
7. A second live resize to 800x450 follows the same browser event path and reconciles back to landscape without losing the active Foundation scene.

The render-resolution controller also owns a real `ResizeObserver` path in production. Its callback behavior remains covered by the focused render-resolution tests; the headless smoke uses the browser `resize` listener because Chrome's `--virtual-time-budget` mode does not reliably deliver layout-observer callbacks before DOM dumping.
8. `Game.destroy(true)` removes the canvas without a captured browser error or unhandled rejection.

The fixture also checks the render-resolution metadata written onto the actual canvas.

## CI placement

Browser smoke is a separate workflow from the fast Node CI.

It runs on:

- manual dispatch;
- pull requests touching browser/runtime-relevant paths;
- pushes to `main` touching those paths.

This keeps coverage/mutation/stability diagnostics separate while still preventing browser-only regressions from silently landing in runtime code.

## Evidence boundary

This smoke is intentionally **not**:

- a screenshot/visual-regression suite;
- a mobile-device certification;
- proof of touch hardware behavior;
- proof of browser performance;
- proof of collision/simulation correctness;
- a substitute for Director/manual feel testing.

Real-device checks such as perceived sharpness, touch ergonomics, viewport chrome, thermal behavior and mobile GPU performance remain separate evidence.

The smoke only claims that the exercised DOM, Phaser, canvas, input, resize and lifecycle integration path works in the recorded headless Chrome environment.
