import type { Scene } from 'phaser';
import type { PrototypeVerticalOffsetOrProjection } from '../game/PrototypeFlightLayout';
import {
  getLogicalHazardSpawnIdentity,
  type LogicalHazardSpawnInstance,
} from '../generation/PatternSpawnScheduler';
import { isPrototypeLaserHazard } from '../hazards/PrototypeLaserHazard';
import { isPrototypeZapperHazard } from '../hazards/PrototypeZapperHazard';
import {
  getPrototypeMissileLaunchRelativeLeft,
  getTelegraphedHazardLifecycle,
  getTimedLaserLifecycle,
  type TelegraphedHazardSimulationState,
} from '../hazards/TelegraphedHazardSimulation';
import type { RunMotionState } from '../systems/RunMotionSimulation';
import { PrototypeHazardPresentation } from './PrototypeHazardPresentation';
import { PrototypeLaserPresentation } from './PrototypeLaserPresentation';
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
  private readonly laserActive = new Map<string, PrototypeLaserPresentation>();
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
    const retainedLaserIdentities = new Set<string>();
    this.zapperSpawns.length = 0;

    for (const spawn of spawns) {
      if (isPrototypeZapperHazard(spawn)) {
        this.zapperSpawns.push(spawn);
        continue;
      }

      const identity = getLogicalHazardSpawnIdentity(spawn);
      if (isPrototypeLaserHazard(spawn)) {
        retainedLaserIdentities.add(identity);
        let presentation = this.laserActive.get(identity);
        if (!presentation) {
          presentation = new PrototypeLaserPresentation(this.scene, spawn);
          this.laserActive.set(identity, presentation);
        }
        presentation.render(
          runState,
          playerScreenX,
          getTimedLaserLifecycle(telegraphedHazards, spawn),
          verticalProjection,
        );
        continue;
      }

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

    for (const [identity, presentation] of this.laserActive) {
      if (retainedLaserIdentities.has(identity)) {
        continue;
      }
      presentation.destroy();
      this.laserActive.delete(identity);
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
    for (const presentation of this.laserActive.values()) {
      presentation.destroy();
    }

    this.active.clear();
    this.laserActive.clear();
    this.zapperSpawns.length = 0;
    this.zapperPresentation.destroy();
  }
}
