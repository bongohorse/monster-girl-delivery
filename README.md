# Monster Girl Delivery

2D mobile-first endless sidescroller built with Phaser 4 and TypeScript.

## Project role model

- **Human:** Game Director / Product Owner
- **AI coding agents:** implementation and engineering
- **CI:** automated validation
- **GitHub:** source of truth

## Read first

1. `MASTER_SPEC.md`
2. `AGENTS.md`
3. `ARCHITECTURE.md`
4. `DEVELOPMENT.md`

## Current status

**Pre-Production / M0 Foundation**

The first coding milestone is intentionally about project foundation, not gameplay.

## Current stack

- Phaser 4
- TypeScript
- Bun
- Vite 8
- Biome
- Vitest
- GitHub Actions
- Renovate
- Google Jules

## Web development

```bash
bun install
bun run dev
```

The development server listens on port 8080 and advertises its LAN URL for real-device testing.

## Quality checks

```bash
bun run ci:check
bun run typecheck
bun run test
bun run build
```
