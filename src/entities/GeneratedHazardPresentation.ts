import type { Scene } from 'phaser';
import {
  getLogicalHazardSpawnIdentity,
  type LogicalHazardSpawnInstance,
} from '../generation/PatternSpawnScheduler';
import {
  getTelegraphedHazardLifecycle,
  type TelegraphedHazardSimulationState,
} from '../hazards/TelegraphedHazardSimulation';
import type { RunMotionState } from '../systems/RunMotionSimulation';
import { PrototypeHazardPresentation } from './PrototypeHazardPresentation';

interface ActiveHazardPresentation {
  readonly presentation: PrototypeHazardPresentation;
}

/** Synchronizes temporary Phaser graphics to the authoritative logical generated-spawn window. */
export class GeneratedHazardPresentation {
  private readonly active = new Map<string, ActiveHazardPresentation>();
  private destroyed = false;

  constructor(private readonly scene: Scene) {}

  sync(
    spawns: ReadonlyArray<Readonly<LogicalHazardSpawnInstance>>,
    runState: Readonly<RunMotionState>,
    playerScreenX: number,
    telegraphedHazards: Readonly<TelegraphedHazardSimulationState>,
  ): void {
    if (this.destroyed) {
      return;
    }

    const retainedIdentities = new Set<string>();

    for (const spawn of spawns) {
      const identity = getLogicalHazardSpawnIdentity(spawn);
      retainedIdentities.add(identity);
      let active = this.active.get(identity);

      if (!active) {
        active = { presentation: new PrototypeHazardPresentation(this.scene, spawn) };
        this.active.set(identity, active);
      }

      active.presentation.render(
        runState,
        playerScreenX,
        getTelegraphedHazardLifecycle(telegraphedHazards, spawn),
      );
    }

    for (const [identity, active] of this.active) {
      if (retainedIdentities.has(identity)) {
        continue;
      }

      active.presentation.destroy();
      this.active.delete(identity);
    }
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;

    for (const active of this.active.values()) {
      active.presentation.destroy();
    }

    this.active.clear();
  }
}
