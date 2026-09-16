import type { Scene } from 'phaser';
import type { PrototypeVerticalOffsetOrProjection } from '../game/PrototypeFlightLayout';
import {
  getLogicalHazardSpawnIdentity,
  type LogicalHazardSpawnInstance,
} from '../generation/PatternSpawnScheduler';
import { isPrototypeZapperHazard } from '../hazards/PrototypeZapperHazard';
import {
  getPrototypeMissileLaunchRelativeLeft,
  getTelegraphedHazardLifecycle,
  type TelegraphedHazardSimulationState,
} from '../hazards/TelegraphedHazardSimulation';
import type { RunMotionState } from '../systems/RunMotionSimulation';
import { PrototypeHazardPresentation } from './PrototypeHazardPresentation';
import {
  PrototypeZapperPresentation,
  type PrototypeZapperPresentationStateSources,
} from './PrototypeZapperPresentation';

interface ActiveHazardPresentation {
  readonly presentation: PrototypeHazardPresentation;
}

/** Synchronizes temporary Phaser graphics to the authoritative logical generated-spawn window. */
export class GeneratedHazardPresentation {
  private readonly active = new Map<string, ActiveHazardPresentation>();
  private readonly zapperPresentation: PrototypeZapperPresentation;
  private readonly zapperSpawns: LogicalHazardSpawnInstance[] = [];
  private destroyed = false;

  constructor(private readonly scene: Scene) {
    this.zapperPresentation = new PrototypeZapperPresentation(scene);
  }

  sync(
    spawns: ReadonlyArray<Readonly<LogicalHazardSpawnInstance>>,
    runState: Readonly<RunMotionState>,
    playerScreenX: number,
    telegraphedHazards: Readonly<TelegraphedHazardSimulationState>,
    verticalProjection: PrototypeVerticalOffsetOrProjection = 0,
    zapperStateSources?: Readonly<PrototypeZapperPresentationStateSources>,
  ): void {
    if (this.destroyed) {
      return;
    }

    const retainedIdentities = new Set<string>();
    this.zapperSpawns.length = 0;

    for (const spawn of spawns) {
      if (isPrototypeZapperHazard(spawn)) {
        this.zapperSpawns.push(spawn);
        continue;
      }

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
        verticalProjection,
        getPrototypeMissileLaunchRelativeLeft(telegraphedHazards, spawn),
      );
    }

    this.zapperPresentation.render(
      this.zapperSpawns,
      runState,
      playerScreenX,
      verticalProjection,
      zapperStateSources,
    );

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
    this.zapperSpawns.length = 0;
    this.zapperPresentation.destroy();
  }
}
