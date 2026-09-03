# ARCHITECTURE — MONSTER GIRL DELIVERY

## 1. Architecture goals

The codebase is designed for:

- AI-first development;
- small, reviewable changes;
- mobile-first runtime behavior;
- deterministic gameplay where practical;
- headless testing of game rules;
- one shared gameplay codebase across platforms.

Avoid enterprise architecture and unnecessary abstraction.

## 2. Layering

```text
Presentation
├── scenes/
└── ui/

Gameplay
├── entities/
├── hazards/
└── systems/

Core
├── TimeService
├── state
├── PRNG
└── persistence

Platform / input
└── input/

Developer tools
└── devtools/

Configuration
└── config/
```

## 3. Directory structure

```text
src/
├── config/
├── core/
├── devtools/
├── entities/
├── hazards/
├── input/
├── scenes/
├── systems/
└── ui/
```

Supporting project directories:

```text
assets/
├── raw/
├── source/
├── processed/
└── manifests/

public/assets/

tests/
tools/
docs/
```

## 4. TimeService

`TimeService` is the shared authority for simulation time.

Responsibilities:

- accept Phaser's frame timing;
- expose a normalized delta in seconds;
- clamp unreasonable simulation steps;
- represent active/paused state;
- handle explicit pause/resume transitions;
- prevent post-background physics jumps.

Do not duplicate time-clamping logic throughout individual gameplay classes.

## 5. InputService

`InputService` converts device input into game actions.

Supported sources:

- touch/pointer;
- mouse;
- Space key.

Core concept:

```text
Device input
    ↓
InputService
    ↓
Game action: thrustHeld
    ↓
Gameplay
```

Requirements:

- track active pointer identity;
- handle down/up/cancel;
- support gameplay blocking;
- isolate UI interactions;
- handle lifecycle interruptions.

## 6. Viewport / Scaling

Viewport handling is an application-level concern.

Requirements:

- dynamic resizing;
- no hardcoded physical screen width;
- safe UI anchoring;
- gameplay fairness across aspect ratios;
- real-device testing.

Do not tie gameplay rules directly to a specific phone resolution.

Landscape is the decided target orientation for the current core game. Viewport systems must still handle dynamic resize and varied landscape aspect ratios; orientation locking requires a separate implementation decision.

## 7. Gameplay separation

Gameplay rules should be independent of rendering where practical.

Examples of preferred pure/testable logic:

```text
calculateScore()
calculateDifficulty()
canPatternSpawn()
checkGraze()
validatePattern()
```

Phaser objects can call these systems, but the mathematical rules should not require a Canvas to be tested.

## 8. Procedural generation

Future architecture:

```text
RunState
   ↓
PRNGService
   ↓
PatternGenerator
   ↓
PatternValidator
   ↓
Spawner
```

The PRNG owns gameplay randomness.

`PatternValidator` checks explicit constraints such as reaction time and reachable corridors.

## 9. Director tools

Director tools are separate from production gameplay.

Expected future modules:

```text
devtools/
├── DirectorPanel
├── DebugOverlay
└── RuntimeConfig
```

The system should support live tuning and deterministic test workflows without requiring source edits for every adjustment.

## 10. Assets

Production asset flow:

```text
assets/raw
    ↓
assets/source
    ↓
assets/processed
    ↓
asset validation / atlas build
    ↓
public/assets
```

Future asset tooling should be deterministic and CI-friendly.

## 11. Persistence

Future architecture:

```text
Gameplay
   ↓
SaveManager
   ↓
Storage adapter
   ↓
localStorage / later platform storage
```

No gameplay class directly uses `localStorage`.

## 12. Platform abstraction

Avoid spreading browser/mobile/desktop checks through gameplay.

Platform-specific behavior should live behind small services/adapters where needed.

The gameplay layer should remain platform-agnostic.

## 13. State ownership

Keep ownership explicit:

```text
Scene → coordinates high-level game flow
Entity → owns entity state
System → owns reusable rules/processes
Service → owns cross-cutting infrastructure
UI → displays and requests actions
```

Do not hide game state in UI objects.

## 14. M0 boundaries

M0 may establish:

- project/tooling;
- TimeService;
- InputService;
- lifecycle handling;
- viewport foundation;
- Director diagnostics.

M0 must not implement:

- player gameplay;
- hazards;
- Graze;
- procedural generation;
- economy;
- gacha;
- SaveManager.
