# Test Quality Gate 6 — browser/runtime smoke

Umbrella: #371

Node/Vitest remains the deterministic authority for simulation, generation, collision, rewards and exact frame-partition contracts. Gate 6 adds a separate real-browser layer for behavior Node tests cannot establish.

## Runtime seam

Gate 6 uses two browser passes through the repository's existing Vite development configuration.

The first opens the real root `index.html`. That executes `src/main.ts` through its browser `DOMContentLoaded` bootstrap and must create a real Phaser canvas carrying render-resolution metadata.

The second, deeper fixture boots the Phaser runtime through:

`Boot -> Preloader -> Foundation`

Director mode is disabled in the deep fixture so its assertions exercise the normal gameplay scene rather than Director-only controls.

The workflow uses the Chrome/Chromium binary provided by GitHub's Ubuntu runner. It does not add Playwright, Puppeteer, jsdom, or another browser-test dependency to the game.

## Automated browser assertions

The root-app pass must establish:

- the actual `index.html -> src/main.ts` bootstrap creates a Phaser canvas;
- the installed render-resolution controller publishes logical and backing-size metadata on that canvas.

The deeper browser fixture must establish all of the following before it reports PASS:

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
- pull requests touching browser/runtime-relevant paths, including the root `src/main.ts` entrypoint;
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


## Gate 6 accepted evidence

Validated browser-smoke head:

`a6ed36cc1b87cefaeddd739341d75b5fba727486`

Browser runtime smoke #7 / run `35534998835` passed on GitHub Ubuntu 24.04 with:

- Google Chrome **152.0.7977.82**;
- Bun **1.4.2**;
- the repository's Vite development configuration;
- Phaser's concrete renderer type **2** (WebGL in this run).

Observed browser evidence:

- initial logical canvas: **640x360**;
- active scene: **Foundation** after Boot/Preloader;
- DOM Space input reached gameplay input: **true**;
- DOM primary-mouse input reached gameplay input: **true**;
- browser lifecycle pagehide/pageshow path: **true**;
- portrait resize metadata: **360x640**;
- landscape resize metadata: **800x450**;
- `Game.destroy(true)` teardown: **true**;
- captured runtime errors / unhandled rejections: **0**.

Evidence artifact:

- artifact ID: `10612635070`;
- artifact digest: `sha256:227f3a9e8fbbd8501601f13c57f9f7536f22d24351d6e9da04ab910401197bfe`.

The matching normal CI #1025 passed Biome, TypeScript, **115 test files / 832 tests**, and the production build.

### Validation corrections retained as evidence

The first Gate 6 attempts exposed two test-harness assumptions rather than product regressions:

1. a nested smoke page resolved Phaser's relative `assets/bg.png` below `/tests/browser/`; the fixture now sets the same root base used by the application;
2. Chrome's `--virtual-time-budget` DOM-dump mode did not reliably deliver the layout `ResizeObserver` callback; the automated smoke therefore drives the product's registered browser `resize` event path, while focused tests continue to cover the observer callback itself.

Those corrections narrow what the automated smoke claims instead of hiding failed attempts.
