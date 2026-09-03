# INITIAL AGENT TASK — M0 FOUNDATION

You are entering the repository for the first time.

## First understand the project

Read:

- `MASTER_SPEC.md`
- `AGENTS.md`
- `ARCHITECTURE.md`
- `DEVELOPMENT.md`

Then inspect the existing Phaser starter files.

Do not implement gameplay yet.

## Goal

Prepare the repository so future AI agents can implement the game safely.

## Implement only M0

1. Preserve the official Phaser/Vite starter structure unless a change is required.
2. Configure Bun scripts.
3. Configure Biome.
4. Configure Vitest.
5. Configure TypeScript checking.
6. Add `TimeService` with explicit pause/resume behavior and a safe simulation delta.
7. Add `InputService` with touch/pointer identity tracking, mouse/Space support, pointer cancellation, and gameplay blocking.
8. Add responsive viewport/lifecycle foundations suitable for real-device testing.
9. Add a minimal Director diagnostic panel showing FPS, viewport size, orientation, input state, and pause state.
10. Add/verify GitHub Actions CI.
11. Make the Codespaces environment reproducible.

## Do not implement

- player gameplay physics;
- hazards;
- Graze;
- score;
- procedural generation;
- economy;
- gacha;
- characters;
- save system;
- backend;
- analytics.

## Verification

Run:

```bash
bun run ci:check
bun run typecheck
bun run test
bun run build
```

Report:
- what changed;
- what was verified;
- any remaining issue;
- any architecture decision that could not be resolved without the Game Director.
