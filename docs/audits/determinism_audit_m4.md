# Determinism Audit Report (M4)

**1. Severity: HIGH**
Transient viewport/safe-area resize permanently mutates authoritative flight state.

**2. Exact file and symbol:**
- `src/game/scenes/Foundation.ts` -> `handleResize`
- `src/systems/VerticalFlightSimulation.ts` -> `constrainVerticalFlightState` / `stepVerticalFlight`

**3. Concrete failure scenario:**
During a run, an otherwise deterministic trajectory changes because the user rotates their mobile device or temporarily resizes the browser window mid-run, shrinking the vertical safe area. This shrinks the vertical flight bounds for one or more frames. The `runState.flight.positionY` gets forcibly clamped to the new bounds, and `velocityY` is reset to `0`. If the user then rotates their device back (restoring the original viewport geometry), the original velocity and trajectory are permanently lost. The run diverges from a theoretically equivalent identical-seed run that experienced no temporary resize event, potentially altering collision/death outcomes later down the line.

**4. Evidence from current code:**
In `src/game/scenes/Foundation.ts`, `handleResize` calls:
```typescript
    this.runState = {
      ...this.runState,
      flight: constrainVerticalFlightState(
        this.runState.flight,
        createPrototypeFlightBounds(viewport),
      ),
    };
```
Furthermore, during normal gameplay, `stepPrototypeRun` receives `createPrototypeFlightBounds(viewport)` derived from the current viewport every frame, constraining the `runState.flight` against bounds that fluctuate based on transient presentation concerns.

While M1 intentionally allows viewport geometry to dictate initial gameplay bounds, no source/authority states that transient resize-event history is part of a run's deterministic identity. A temporary resize destructively mutates simulation intent.

**5. Whether existing tests catch it:**
Existing tests actually codify and expect this state mutation, but fail to test the deterministic fallout of a resize->restore sequence. `tests/game/scenes/Foundation.test.ts` expects a resize to clamp `positionY` and zero `velocityY` when the bounds become sufficiently narrow without advancing simulation time, but the tests do not prove same-seed replay equivalency or resize-restore path equivalence.

**6. Smallest reasonable correction:**
Separate the stable, logical flight bounds (and run geometry) from transient presentation/viewport changes. Either fix the logical flight bounds at run initialization so they don't dynamically shrink/grow from resize events, or handle resize events such that they preserve/reproject authoritative flight state without destructively wiping out velocity and logical trajectory.
