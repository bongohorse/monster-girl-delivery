import { Scale, Scene, Scenes } from 'phaser';
import type { AppServices } from '../../core/AppServices';
import { PhaserLifecycleAdapter } from '../../core/PhaserLifecycleAdapter';
import { readSafeAreaInsets, ViewportService } from '../../core/ViewportService';
import { DirectorDebugOverlay } from '../../devtools/DirectorDebugOverlay';
import { DirectorPanel } from '../../devtools/DirectorPanel';
import { DirectorPerformanceHud } from '../../devtools/DirectorPerformanceHud';
import { createDirectorResponsiveLayout } from '../../devtools/DirectorResponsiveLayout';
import { DirectorRunControls } from '../../devtools/DirectorRunControls';
import { DirectorTuningControls } from '../../devtools/DirectorTuningControls';
import { GeneratedCollectiblePresentation } from '../../entities/GeneratedCollectiblePresentation';
import { GeneratedHazardPresentation } from '../../entities/GeneratedHazardPresentation';
import { PrototypePlayerPresentation } from '../../entities/PrototypePlayerPresentation';
import { PrototypeScrollingWorldPresentation } from '../../entities/PrototypeScrollingWorldPresentation';
import type { EncounterStreamObservation } from '../../generation/EncounterStreamObservation';
import { PROTOTYPE_PATTERN_REACHABILITY_CONTEXT } from '../../generation/FlightReachability';
import {
  type LogicalCollectibleSpawnInstance,
  reconcileGeneratedCollectibles,
} from '../../generation/GeneratedCollectibles';
import {
  advanceGeneratedHazardStream,
  constrainGeneratedHazardStream,
  createGeneratedHazardStream,
  type GeneratedHazardStreamState,
  PROTOTYPE_LIVE_RUN_SEED,
} from '../../generation/GeneratedHazardStream';
import type { HazardPattern } from '../../generation/HazardPattern';
import { PROTOTYPE_LIVE_ENCOUNTER_POLICY_CONFIG } from '../../generation/LiveEncounterPolicy';
import {
  getLogicalHazardSpawnIdentity,
  type LogicalHazardSpawnInstance,
} from '../../generation/PatternSpawnScheduler';
import {
  createPrototypeHazardVerticalDomain,
  type PrototypeHazardVerticalDomain,
} from '../../generation/PrototypeHazardVerticalDomain';
import { isTelegraphedHazardBehavior } from '../../hazards/HazardArchetype';
import type { TelegraphedHazardTarget } from '../../hazards/TelegraphedHazardLifecycle';
import {
  createTelegraphedHazardSimulationState,
  getCollisionHazardsForTelegraphedSimulation,
  getTelegraphedHazardLifecycle,
  stepTelegraphedHazardSimulation,
  type TelegraphedHazardSimulationState,
} from '../../hazards/TelegraphedHazardSimulation';
import { PhaserInputAdapter } from '../../input/PhaserInputAdapter';
import {
  createPrototypePlayerHitbox,
  PROTOTYPE_PLAYER_COLLISION_EXTENTS,
} from '../../systems/HazardCollision';
import {
  createPrototypeDeathRetryState,
  enterPrototypeFailState,
  getPrototypeFailStateProgress,
  type PrototypeDeathRetryState,
  stepPrototypeDeathRetryState,
} from '../../systems/PrototypeDeathRetryFlow';
import type { PrototypeRunResultSnapshot } from '../../systems/PrototypeRunResult';
import {
  createPrototypeRunState,
  type PrototypeRunState,
  stepPrototypeRun,
} from '../../systems/PrototypeRunSimulation';
import { stepRunMotion } from '../../systems/RunMotionSimulation';
import {
  constrainVerticalFlightState,
  stepVerticalFlight,
} from '../../systems/VerticalFlightSimulation';
import {
  createPrototypeFlightBounds,
  getPrototypePlayerX,
  getPrototypeVerticalProjection,
  projectLogicalYToScreen,
} from '../PrototypeFlightLayout';
import { getLogicalViewportFromBacking } from '../RenderResolution';

const RUNNING_INSTRUCTIONS =
  'M5 in progress — hazards, Graze + collectibles\nHold touch, mouse, or Space to thrust.';
const RETRY_READY_INSTRUCTIONS = 'Tap, click, or press Space to retry.';
const DIRECTOR_ZAPPER_OFFSCREEN_PADDING = 24;
const formatDeadInstructions = (
  result: Readonly<PrototypeRunResultSnapshot>,
  retryReady: boolean,
): string =>
  [
    'Delivery interrupted',
    `Distance ${result.finalDistance.toFixed(1)} · Score ${result.score}`,
    `Grazes ${result.grazeCount}`,
    `Items ${result.collectedCount} · Value ${result.collectedValue} · Reward ${result.earnedReward}`,
    retryReady ? RETRY_READY_INSTRUCTIONS : 'Parcel recovery...',
  ].join('\n');
const selectNewRunSeed = (currentSeed: number | undefined): number => {
  const entropy = new Uint32Array(1);
  globalThis.crypto.getRandomValues(entropy);
  const selectedSeed = entropy[0];

  if (selectedSeed === undefined) {
    throw new Error('Run seed selection did not produce a seed.');
  }

  return selectedSeed === currentSeed ? (selectedSeed + 1) >>> 0 : selectedSeed;
};
const createLiveHazardStreamContext = (
  flightTuning: ReturnType<AppServices['flightTuning']['getSnapshot']>,
  verticalDomain: Readonly<PrototypeHazardVerticalDomain>,
  observeEncounter?: (observation: Readonly<EncounterStreamObservation>) => void,
) =>
  Object.freeze({
    catalog: verticalDomain.catalog,
    constraints: verticalDomain.constraints,
    observeEncounter,
    policy: PROTOTYPE_LIVE_ENCOUNTER_POLICY_CONFIG,
    reachability: Object.freeze({
      flightState: Object.freeze({
        ...PROTOTYPE_PATTERN_REACHABILITY_CONTEXT.flightState,
        positionY: verticalDomain.mapAuthoredCenterY(
          PROTOTYPE_PATTERN_REACHABILITY_CONTEXT.flightState.positionY,
        ),
      }),
      flightTuning,
      playerExtents: PROTOTYPE_PATTERN_REACHABILITY_CONTEXT.playerExtents,
    }),
  });

type DirectorHazardKind = 'laser' | 'missile' | 'zapper';

const DIRECTOR_HAZARD_PATTERN_IDS: Readonly<Record<DirectorHazardKind, string>> = Object.freeze({
  missile: 'prototype-target-lock-strike',
  zapper: 'prototype-vertical-patrol',
  laser: 'prototype-timed-pulse',
});

const createDirectorManualSpawn = (
  pattern: Readonly<HazardPattern>,
  patternStartDistance: number,
  serial: number,
): Readonly<LogicalHazardSpawnInstance> => {
  const entry = pattern.entries[0];
  if (!entry || pattern.entries.length !== 1) {
    throw new TypeError(`Director hazard pattern must contain exactly one entry: ${pattern.id}`);
  }

  const left = patternStartDistance + entry.hitbox.left;
  const right = patternStartDistance + entry.hitbox.right;
  if (!Number.isFinite(left) || !Number.isFinite(right)) {
    throw new RangeError('Director hazard spawn distance must remain finite.');
  }

  return Object.freeze({
    behavior: entry.behavior,
    entryId: entry.id,
    hitbox: Object.freeze({
      left,
      right,
      top: entry.hitbox.top,
      bottom: entry.hitbox.bottom,
    }),
    patternEntryIndex: 0,
    patternId: `${pattern.id}:director-${serial}`,
    ...(entry.reactionPolicy === undefined ? {} : { reactionPolicy: entry.reactionPolicy }),
    runDistance: left,
    type: entry.type,
  });
};

export class Foundation extends Scene {
  private instructions?: Phaser.GameObjects.Text;
  private viewportService?: ViewportService;
  private directorDebugOverlay?: DirectorDebugOverlay;
  private directorPanel?: DirectorPanel;
  private directorPerformanceHud?: DirectorPerformanceHud;
  private directorRunControls?: DirectorRunControls;
  private directorTuningControls?: DirectorTuningControls;
  private inputAdapter?: PhaserInputAdapter;
  private lifecycleAdapter?: PhaserLifecycleAdapter;
  private collectibleSpawns: ReadonlyArray<Readonly<LogicalCollectibleSpawnInstance>> =
    Object.freeze([]);
  private generatedCollectiblePresentation?: GeneratedCollectiblePresentation;
  private generatedHazardPresentation?: GeneratedHazardPresentation;
  private hazardStream?: Readonly<GeneratedHazardStreamState>;
  private hazardVerticalDomain = createPrototypeHazardVerticalDomain(createPrototypeFlightBounds());
  private playerPresentation?: PrototypePlayerPresentation;
  private scrollingWorldPresentation?: PrototypeScrollingWorldPresentation;
  private telegraphedHazardState: Readonly<TelegraphedHazardSimulationState> =
    createTelegraphedHazardSimulationState();
  private runState: PrototypeRunState = {
    phase: 'running',
    motion: { distance: 0 },
    flight: { positionY: 0, velocityY: 0 },
  };
  private deathRetryState: Readonly<PrototypeDeathRetryState> = createPrototypeDeathRetryState();
  private retainedGeneratedTelegraphedHazards: ReadonlyArray<Readonly<LogicalHazardSpawnInstance>> =
    Object.freeze([]);
  private directorManualHazards: ReadonlyArray<Readonly<LogicalHazardSpawnInstance>> =
    Object.freeze([]);
  private directorGodModeEnabled = false;
  private directorAutoHazardsEnabled = true;
  private directorSimulationFrozen = false;
  private directorHazardSerial = 0;
  private shutdownHandled = false;

  constructor(
    private readonly services: AppServices,
    private readonly directorMode: boolean,
  ) {
    super('Foundation');
  }

  create() {
    this.shutdownHandled = false;
    this.deathRetryState = createPrototypeDeathRetryState();
    this.retainedGeneratedTelegraphedHazards = Object.freeze([]);
    const safeArea = readSafeAreaInsets(document.getElementById('safe-area-probe'));
    const renderViewport = getLogicalViewportFromBacking(
      this.scale.width,
      this.scale.height,
      this.scale.zoom,
    );
    this.cameras.main.setOrigin(0, 0).setZoom(renderViewport.renderScale);

    this.viewportService = new ViewportService(
      renderViewport.width,
      renderViewport.height,
      safeArea,
    );
    this.inputAdapter = new PhaserInputAdapter(this, this.services.input);
    this.lifecycleAdapter = new PhaserLifecycleAdapter(this.game, this.services.lifecycle);

    if (import.meta.env.DEV && this.directorMode) {
      const gameContainer = document.getElementById('game-container');
      if (!gameContainer) {
        throw new Error('Director performance HUD requires the game container.');
      }

      this.directorDebugOverlay = new DirectorDebugOverlay(this);
      this.directorPerformanceHud = new DirectorPerformanceHud(
        gameContainer,
        this.services.input,
        undefined,
        {
          setFpsLimit: (limit) => this.game.loop.setFPSLimit(limit),
          setWireframesEnabled: (enabled) => this.directorDebugOverlay?.setEnabled(enabled),
          setGodModeEnabled: this.handleDirectorGodMode,
          setAutoHazardsEnabled: this.handleDirectorAutoHazards,
          spawnMissile: () => this.spawnDirectorHazard('missile'),
          spawnZapper: () => this.spawnDirectorHazard('zapper'),
          spawnLaser: () => this.spawnDirectorHazard('laser'),
          clearHazards: this.clearDirectorHazards,
          setSimulationFrozen: this.handleDirectorFreeze,
          triggerDeath: this.handleDirectorDeath,
        },
      );
      this.directorPanel = new DirectorPanel(this, this.services.input);
      this.directorTuningControls = new DirectorTuningControls(
        this,
        this.services.flightTuning,
        this.services.runMotion,
        this.services.input,
      );
      this.directorRunControls = new DirectorRunControls(
        this,
        this.services.input,
        this.handleRestartSameSeed,
        this.handleStartNewSeed,
      );
    }

    const viewport = this.viewportService.getSnapshot();
    const bounds = createPrototypeFlightBounds(viewport);
    this.hazardVerticalDomain = createPrototypeHazardVerticalDomain(bounds);
    this.runState = createPrototypeRunState(bounds);
    this.hazardStream = createGeneratedHazardStream(
      PROTOTYPE_LIVE_RUN_SEED,
      createLiveHazardStreamContext(
        this.services.flightTuning.getSnapshot(),
        this.hazardVerticalDomain,
        this.directorPanel?.observeEncounter,
      ),
      this.services.runMotion.getSnapshot(),
    );
    this.collectibleSpawns = reconcileGeneratedCollectibles(
      [],
      this.hazardStream.spawns,
      this.hazardVerticalDomain.catalog,
      this.runState.motion.distance,
    );
    this.telegraphedHazardState = stepTelegraphedHazardSimulation(
      createTelegraphedHazardSimulationState(),
      this.getActiveHazardSpawns(),
      0,
      {
        positionY: this.runState.flight.positionY,
        runDistance: this.runState.motion.distance,
      },
    );
    this.services.input.releaseAll();
    this.scrollingWorldPresentation = new PrototypeScrollingWorldPresentation(this);
    this.generatedCollectiblePresentation = new GeneratedCollectiblePresentation(this);
    this.generatedHazardPresentation = new GeneratedHazardPresentation(this);
    const initialProjection = getPrototypeVerticalProjection(viewport);
    this.playerPresentation = new PrototypePlayerPresentation(
      this,
      getPrototypePlayerX(viewport),
      projectLogicalYToScreen(this.runState.flight.positionY, initialProjection),
    );
    this.playerPresentation?.setScale?.(1, initialProjection.scaleY);

    this.cameras.main.setBackgroundColor(0x121426);
    this.instructions = this.add
      .text(0, 0, RUNNING_INSTRUCTIONS, {
        align: 'center',
        color: '#b9c8ec',
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        lineSpacing: 8,
      })
      .setResolution(renderViewport.renderScale)
      .setOrigin(0.5);

    this.scale.on(Scale.Events.RESIZE, this.handleResize);
    this.events.once(Scenes.Events.SHUTDOWN, this.handleShutdown);
    this.layout(viewport);
  }

  update(_time: number, delta: number) {
    if (!this.viewportService || !this.playerPresentation || !this.hazardStream) {
      return;
    }

    const normalizedSimulationDeltaSeconds = this.services.time.update(delta);
    const simulationDeltaSeconds = this.directorSimulationFrozen
      ? 0
      : normalizedSimulationDeltaSeconds;
    const viewport = this.viewportService.getSnapshot();
    const directorLifecycle =
      this.directorPerformanceHud || this.directorPanel
        ? this.services.lifecycle.getSnapshot()
        : undefined;

    if (this.directorPerformanceHud && directorLifecycle) {
      const rawFrameTimeMilliseconds = this.game.loop.rawDelta;
      this.directorPerformanceHud.update(
        rawFrameTimeMilliseconds,
        this.game.loop.actualFps,
        directorLifecycle.paused,
        !directorLifecycle.paused &&
          rawFrameTimeMilliseconds > 0 &&
          normalizedSimulationDeltaSeconds === 0,
      );
    }

    if (this.runState.phase === 'dead') {
      const previousRetryPhase = this.deathRetryState.phase;
      this.deathRetryState = stepPrototypeDeathRetryState(
        this.deathRetryState,
        simulationDeltaSeconds,
      );

      if (
        previousRetryPhase !== 'retry-ready' &&
        this.deathRetryState.phase === 'retry-ready' &&
        this.deathRetryState.result
      ) {
        this.instructions?.setText(formatDeadInstructions(this.deathRetryState.result, true));
      }

      const retryPressed = this.services.input.consumePrimaryActionPress();
      if (
        previousRetryPhase === 'retry-ready' &&
        retryPressed &&
        !this.services.lifecycle.isPaused()
      ) {
        this.restartRun(viewport, selectNewRunSeed(this.hazardStream.generationState.seed));
      }
    } else {
      // While running, primary presses are thrust input rather than queued restart requests.
      this.services.input.consumePrimaryActionPress();
      const requestedRunMotion = this.services.runMotion.getSnapshot();
      const flightTuning = this.services.flightTuning.getSnapshot();
      const flightBounds = createPrototypeFlightBounds(viewport);
      const hazardStreamContext = createLiveHazardStreamContext(
        flightTuning,
        this.hazardVerticalDomain,
        this.directorPanel?.observeEncounter,
      );
      // Resolve parameters before movement, without aging or admitting new content.
      const generatedBeforeMotionAdvance = this.hazardStream.spawns;
      this.hazardStream = advanceGeneratedHazardStream(
        this.hazardStream,
        this.runState.motion.distance,
        hazardStreamContext,
        requestedRunMotion,
        0,
        false,
      );
      this.reconcileRetainedGeneratedTelegraphedHazards(generatedBeforeMotionAdvance);
      const appliedScrollSpeed = this.hazardStream.schedulingWindow.scrollSpeed;
      const runMotionTuning = Object.freeze({ baseScrollSpeed: appliedScrollSpeed });
      const activeFlightTuning = this.hazardStream.policy?.flightTuning ?? flightTuning;
      const thrustHeld = this.services.input.isThrustHeld();
      const initialFlight = this.runState.flight;
      const initialMotion = this.runState.motion;
      const playerScreenX = getPrototypePlayerX(viewport);
      const resolvePlayerTargetAtDelta = (deltaSeconds: number): TelegraphedHazardTarget => {
        const subFlight = stepVerticalFlight(
          initialFlight,
          deltaSeconds,
          thrustHeld,
          activeFlightTuning,
          flightBounds,
        );
        const subMotion = stepRunMotion(initialMotion, deltaSeconds, runMotionTuning);
        return {
          positionY: subFlight.positionY,
          runDistance: subMotion.distance,
        };
      };
      const activeHazards = this.getActiveHazardSpawns();
      this.telegraphedHazardState = stepTelegraphedHazardSimulation(
        this.telegraphedHazardState,
        activeHazards,
        simulationDeltaSeconds,
        {
          positionY: this.runState.flight.positionY,
          runDistance: this.runState.motion.distance,
        },
        resolvePlayerTargetAtDelta,
        {
          playerRunDistance: initialMotion.distance,
          playerScreenX,
          viewportLeft: 0,
          viewportRight: viewport.width,
        },
      );
      const result = stepPrototypeRun(this.runState, simulationDeltaSeconds, {
        collectibles: this.collectibleSpawns,
        flightBounds,
        flightTuning: activeFlightTuning,
        hazards: getCollisionHazardsForTelegraphedSimulation(
          this.telegraphedHazardState,
          activeHazards,
          {
            playerRunDistance: initialMotion.distance,
            playerScreenX,
            scrollSpeed: appliedScrollSpeed,
            viewportLeft: 0,
            viewportRight: viewport.width,
          },
        ),
        runMotionTuning,
        thrustHeld,
      });
      const godModePreventedDeath = result.enteredDead && this.directorGodModeEnabled;
      if (godModePreventedDeath) {
        const { finalResult: _ignoredFinalResult, ...survivingState } = result.state;
        this.runState = { ...survivingState, phase: 'running' };
      } else {
        this.runState = result.state;
      }

      if (result.enteredDead && !godModePreventedDeath) {
        const finalResult = this.runState.finalResult;
        if (!finalResult) {
          throw new TypeError('Authoritative run end must provide a final result snapshot.');
        }
        this.enterRunFailState(finalResult);
      } else {
        // Age existing reservations by the completed frame, then commit new content at t=0.
        const generatedBeforeCommit = this.hazardStream.spawns;
        this.hazardStream = advanceGeneratedHazardStream(
          this.hazardStream,
          this.runState.motion.distance,
          hazardStreamContext,
          requestedRunMotion,
          simulationDeltaSeconds,
          this.directorAutoHazardsEnabled,
        );
        this.reconcileRetainedGeneratedTelegraphedHazards(generatedBeforeCommit);
        this.pruneDirectorManualHazards();
        this.collectibleSpawns = this.directorAutoHazardsEnabled
          ? reconcileGeneratedCollectibles(
              this.collectibleSpawns,
              this.hazardStream.spawns,
              this.hazardVerticalDomain.catalog,
              this.runState.motion.distance,
            )
          : Object.freeze([]);
        this.telegraphedHazardState = stepTelegraphedHazardSimulation(
          this.telegraphedHazardState,
          this.getActiveHazardSpawns(),
          0,
          { positionY: this.runState.flight.positionY, runDistance: this.runState.motion.distance },
        );
      }
    }

    this.renderRun(viewport);

    if (this.directorPanel && directorLifecycle) {
      this.directorPanel.update(
        delta,
        viewport,
        this.services.input.getSnapshot(),
        directorLifecycle,
        this.hazardStream,
        this.telegraphedHazardState,
      );
    }
  }

  private readonly handleResize = (gameSize: Phaser.Structs.Size): void => {
    if (!this.viewportService) {
      return;
    }

    const renderViewport = getLogicalViewportFromBacking(
      gameSize.width,
      gameSize.height,
      this.scale.zoom,
    );
    this.cameras.resize(gameSize.width, gameSize.height);
    this.cameras.main.setOrigin(0, 0).setZoom(renderViewport.renderScale);
    this.instructions?.setResolution(renderViewport.renderScale);
    this.viewportService.resize(
      renderViewport.width,
      renderViewport.height,
      readSafeAreaInsets(document.getElementById('safe-area-probe')),
    );
    const viewport = this.viewportService.getSnapshot();
    const flightBounds = createPrototypeFlightBounds(viewport);
    this.hazardVerticalDomain = createPrototypeHazardVerticalDomain(flightBounds);

    if (this.runState.phase === 'running') {
      if (this.hazardStream) {
        this.hazardStream = constrainGeneratedHazardStream(
          this.hazardStream,
          this.hazardVerticalDomain.constraints,
          PROTOTYPE_PATTERN_REACHABILITY_CONTEXT.playerExtents,
        );
      }
      this.runState = {
        ...this.runState,
        flight: constrainVerticalFlightState(this.runState.flight, flightBounds),
      };
    }
    this.layout(viewport);
  };

  private layout(viewport: ReturnType<ViewportService['getSnapshot']>): void {
    const safeLeft = Math.min(viewport.width, viewport.safeArea.left);
    const safeRight = Math.min(viewport.width - safeLeft, viewport.safeArea.right);
    const safeTop = Math.min(viewport.height, viewport.safeArea.top);
    const safeBottomInset = Math.min(viewport.height - safeTop, viewport.safeArea.bottom);
    const safeRightEdge = viewport.width - safeRight;
    const safeBottom = viewport.height - safeBottomInset;
    const safeWidth = Math.max(0, safeRightEdge - safeLeft);
    const centerX = safeLeft + safeWidth / 2;
    let contentTop = safeTop;

    if (this.directorPanel && this.directorTuningControls) {
      const directorLayout = createDirectorResponsiveLayout(viewport);
      const directorBottom = Math.max(
        directorLayout.diagnostics.y + directorLayout.diagnostics.height,
        directorLayout.tuningControls.y + directorLayout.tuningControls.height,
      );
      contentTop = Math.min(safeBottom, Math.max(safeTop, directorBottom + 16));
    }

    const contentHeight = Math.max(0, safeBottom - contentTop);
    const instructionsY =
      contentHeight >= 100
        ? contentTop + contentHeight * 0.72
        : Math.max(safeTop + 56, safeBottom - 30);

    this.instructions
      ?.setPosition(centerX, instructionsY)
      .setWordWrapWidth(Math.max(120, safeWidth - 32));
    this.renderRun(viewport);
    this.directorPerformanceHud?.layout(viewport);
    this.directorPanel?.layout(viewport);
    this.directorRunControls?.layout(viewport);
    this.directorTuningControls?.layout(viewport);
  }

  private readonly handleRestartSameSeed = (): void => {
    if (!this.viewportService) {
      return;
    }

    this.restartRun(
      this.viewportService.getSnapshot(),
      this.hazardStream?.generationState.seed ?? PROTOTYPE_LIVE_RUN_SEED,
    );
  };

  private readonly handleStartNewSeed = (): void => {
    if (!this.viewportService) {
      return;
    }

    const seed = selectNewRunSeed(this.hazardStream?.generationState.seed);
    this.restartRun(this.viewportService.getSnapshot(), seed);
  };

  private readonly handleDirectorGodMode = (enabled: boolean): void => {
    this.directorGodModeEnabled = enabled;
  };

  private readonly handleDirectorAutoHazards = (enabled: boolean): void => {
    this.directorAutoHazardsEnabled = enabled;
    this.clearDirectorHazards();
  };

  private readonly handleDirectorFreeze = (frozen: boolean): void => {
    this.directorSimulationFrozen = frozen;
    this.services.input.releaseAll();
  };

  private readonly clearDirectorHazards = (): void => {
    this.retainedGeneratedTelegraphedHazards = Object.freeze([]);
    this.directorManualHazards = Object.freeze([]);
    this.collectibleSpawns = Object.freeze([]);
    this.telegraphedHazardState = createTelegraphedHazardSimulationState();

    if (this.hazardStream) {
      const runDistance = this.runState.motion.distance;
      this.hazardStream = Object.freeze({
        ...this.hazardStream,
        runDistance,
        nextPatternStartDistance:
          runDistance +
          this.hazardStream.schedulingWindow.minimumReactionDistance +
          PROTOTYPE_PLAYER_COLLISION_EXTENTS.right,
        spawns: Object.freeze([]),
      });
    }

    if (this.viewportService) {
      this.renderRun(this.viewportService.getSnapshot());
    }
  };

  private spawnDirectorHazard(kind: DirectorHazardKind): void {
    if (!this.viewportService || this.runState.phase !== 'running') {
      return;
    }

    const patternId = DIRECTOR_HAZARD_PATTERN_IDS[kind];
    const pattern = this.hazardVerticalDomain.catalog.find(
      (candidate) => candidate.id === patternId,
    );
    if (!pattern) {
      throw new TypeError(`Director hazard pattern is unavailable: ${patternId}`);
    }
    const entry = pattern.entries[0];
    if (!entry) {
      throw new TypeError(`Director hazard pattern has no entry: ${pattern.id}`);
    }

    const viewport = this.viewportService.getSnapshot();
    const playerScreenX = getPrototypePlayerX(viewport);
    const safeRightEdge = viewport.width - Math.min(viewport.width, viewport.safeArea.right);
    const desiredScreenLeft =
      kind === 'zapper'
        ? viewport.width + DIRECTOR_ZAPPER_OFFSCREEN_PADDING
        : Math.max(playerScreenX + 160, safeRightEdge - 96);
    const worldLeft = this.runState.motion.distance + desiredScreenLeft - playerScreenX;
    const patternStartDistance = Math.max(0, worldLeft - entry.hitbox.left);
    this.directorHazardSerial += 1;
    const spawn = createDirectorManualSpawn(
      pattern,
      patternStartDistance,
      this.directorHazardSerial,
    );
    this.directorManualHazards = Object.freeze([...this.directorManualHazards, spawn]);
    this.telegraphedHazardState = stepTelegraphedHazardSimulation(
      this.telegraphedHazardState,
      this.getActiveHazardSpawns(),
      0,
      { positionY: this.runState.flight.positionY, runDistance: this.runState.motion.distance },
    );
    this.renderRun(viewport);
  }

  private reconcileRetainedGeneratedTelegraphedHazards(
    previousGenerated: ReadonlyArray<Readonly<LogicalHazardSpawnInstance>>,
  ): void {
    if (!this.directorAutoHazardsEnabled) {
      this.retainedGeneratedTelegraphedHazards = Object.freeze([]);
      return;
    }

    const currentGenerated = this.hazardStream?.spawns ?? [];
    const currentIdentities = new Set(currentGenerated.map(getLogicalHazardSpawnIdentity));
    const retainedByIdentity = new Map(
      this.retainedGeneratedTelegraphedHazards.map(
        (spawn) => [getLogicalHazardSpawnIdentity(spawn), spawn] as const,
      ),
    );

    for (const spawn of previousGenerated) {
      if (!isTelegraphedHazardBehavior(spawn.behavior)) {
        continue;
      }
      const identity = getLogicalHazardSpawnIdentity(spawn);
      if (!currentIdentities.has(identity)) {
        retainedByIdentity.set(identity, spawn);
      }
    }

    for (const identity of currentIdentities) {
      retainedByIdentity.delete(identity);
    }

    this.retainedGeneratedTelegraphedHazards = Object.freeze(
      [...retainedByIdentity.values()].filter((spawn) => {
        const lifecycle = getTelegraphedHazardLifecycle(this.telegraphedHazardState, spawn);
        return lifecycle !== null && lifecycle.phase !== 'expired';
      }),
    );
  }

  private pruneDirectorManualHazards(): void {
    if (this.directorManualHazards.length === 0) {
      return;
    }

    const cutoff = this.runState.motion.distance - 160;
    const retained = this.directorManualHazards.filter((spawn) => {
      const lifecycle = getTelegraphedHazardLifecycle(this.telegraphedHazardState, spawn);
      if (lifecycle && lifecycle.phase !== 'expired') {
        return true;
      }
      return spawn.hitbox.right >= cutoff;
    });
    if (retained.length !== this.directorManualHazards.length) {
      this.directorManualHazards = Object.freeze(retained);
    }
  }

  private getActiveHazardSpawns(): ReadonlyArray<Readonly<LogicalHazardSpawnInstance>> {
    const generated = this.directorAutoHazardsEnabled ? (this.hazardStream?.spawns ?? []) : [];
    const retainedGenerated = this.directorAutoHazardsEnabled
      ? this.retainedGeneratedTelegraphedHazards
      : [];
    if (retainedGenerated.length === 0 && this.directorManualHazards.length === 0) {
      return generated;
    }
    return Object.freeze([...generated, ...retainedGenerated, ...this.directorManualHazards]);
  }

  private readonly handleDirectorDeath = (): void => {
    if (!this.viewportService || this.runState.phase !== 'running') {
      return;
    }

    const viewport = this.viewportService.getSnapshot();
    const flightTuning =
      this.hazardStream?.policy?.flightTuning ?? this.services.flightTuning.getSnapshot();
    const runMotionTuning = Object.freeze({
      baseScrollSpeed:
        this.hazardStream?.schedulingWindow.scrollSpeed ??
        this.services.runMotion.getSnapshot().baseScrollSpeed,
    });
    const forcedDeath = stepPrototypeRun(this.runState, 0, {
      collectibles: this.collectibleSpawns,
      flightBounds: createPrototypeFlightBounds(viewport),
      flightTuning,
      hazards: [
        Object.freeze({
          hitbox: Object.freeze(
            createPrototypePlayerHitbox(this.runState.motion, this.runState.flight),
          ),
        }),
      ],
      runMotionTuning,
      thrustHeld: false,
    });

    if (!forcedDeath.enteredDead || !forcedDeath.state.finalResult) {
      throw new TypeError('Director death trigger must enter the authoritative fail state.');
    }

    this.runState = forcedDeath.state;
    this.enterRunFailState(forcedDeath.state.finalResult);
    this.renderRun(viewport);
  };

  private enterRunFailState(finalResult: Readonly<PrototypeRunResultSnapshot>): void {
    this.deathRetryState = enterPrototypeFailState(finalResult);
    this.services.input.releaseAll();
    this.instructions?.setText(formatDeadInstructions(finalResult, false));
  }

  private restartRun(
    viewport: ReturnType<ViewportService['getSnapshot']>,
    seed: Parameters<typeof createGeneratedHazardStream>[0] = PROTOTYPE_LIVE_RUN_SEED,
  ): void {
    this.directorPanel?.reset();
    this.retainedGeneratedTelegraphedHazards = Object.freeze([]);
    this.directorManualHazards = Object.freeze([]);
    this.directorHazardSerial = 0;
    const flightBounds = createPrototypeFlightBounds(viewport);
    this.runState = createPrototypeRunState(flightBounds);
    this.deathRetryState = createPrototypeDeathRetryState();
    this.hazardStream = createGeneratedHazardStream(
      seed,
      createLiveHazardStreamContext(
        this.services.flightTuning.getSnapshot(),
        this.hazardVerticalDomain,
        this.directorPanel?.observeEncounter,
      ),
      this.services.runMotion.getSnapshot(),
    );
    if (this.directorAutoHazardsEnabled) {
      this.collectibleSpawns = reconcileGeneratedCollectibles(
        [],
        this.hazardStream.spawns,
        this.hazardVerticalDomain.catalog,
        this.runState.motion.distance,
      );
      this.telegraphedHazardState = stepTelegraphedHazardSimulation(
        createTelegraphedHazardSimulationState(),
        this.hazardStream.spawns,
        0,
        {
          positionY: this.runState.flight.positionY,
          runDistance: this.runState.motion.distance,
        },
      );
    } else {
      this.clearDirectorHazards();
    }
    this.services.input.releaseAll();
    this.instructions?.setText(RUNNING_INSTRUCTIONS);
  }

  private renderRun(viewport: ReturnType<ViewportService['getSnapshot']>): void {
    const playerScreenX = getPrototypePlayerX(viewport);
    const projection = getPrototypeVerticalProjection(viewport);
    const activeHazards = this.getActiveHazardSpawns();

    this.scrollingWorldPresentation?.render(this.runState.motion.distance, viewport);
    this.generatedHazardPresentation?.sync(
      activeHazards,
      this.runState.motion,
      playerScreenX,
      this.telegraphedHazardState,
      projection,
    );
    this.generatedCollectiblePresentation?.sync(
      this.collectibleSpawns,
      this.runState.collectibles?.consumedCollectibleIds ?? [],
      this.runState.motion,
      playerScreenX,
      projection,
    );
    this.playerPresentation?.setPosition(
      playerScreenX,
      projectLogicalYToScreen(this.runState.flight.positionY, projection),
    );
    this.playerPresentation?.setScale?.(1, projection.scaleY);
    this.playerPresentation?.setRotation?.(
      getPrototypeFailStateProgress(this.deathRetryState) * Math.PI * 0.7,
    );
    this.directorDebugOverlay?.render({
      collectibles: this.collectibleSpawns,
      consumedCollectibleIds: this.runState.collectibles?.consumedCollectibleIds ?? [],
      flight: this.runState.flight,
      hazards: activeHazards,
      motion: this.runState.motion,
      nextPatternStartDistance: this.hazardStream?.nextPatternStartDistance ?? null,
      telegraphedHazards: this.telegraphedHazardState,
      viewport,
    });
  }

  private readonly handleShutdown = (): void => {
    if (this.shutdownHandled) {
      return;
    }

    this.shutdownHandled = true;
    this.scale.off(Scale.Events.RESIZE, this.handleResize);
    this.directorRunControls?.destroy();
    this.directorRunControls = undefined;
    this.directorTuningControls?.destroy();
    this.directorTuningControls = undefined;
    this.directorPerformanceHud?.destroy();
    this.directorPerformanceHud = undefined;
    this.directorPanel?.destroy();
    this.directorPanel = undefined;
    this.directorDebugOverlay?.destroy();
    this.directorDebugOverlay = undefined;
    this.scrollingWorldPresentation?.destroy();
    this.scrollingWorldPresentation = undefined;
    this.generatedCollectiblePresentation?.destroy();
    this.generatedCollectiblePresentation = undefined;
    this.generatedHazardPresentation?.destroy();
    this.generatedHazardPresentation = undefined;
    this.collectibleSpawns = Object.freeze([]);
    this.retainedGeneratedTelegraphedHazards = Object.freeze([]);
    this.directorManualHazards = Object.freeze([]);
    this.hazardStream = undefined;
    this.telegraphedHazardState = createTelegraphedHazardSimulationState();
    this.playerPresentation?.destroy();
    this.playerPresentation = undefined;
    this.inputAdapter?.destroy();
    this.inputAdapter = undefined;
    this.lifecycleAdapter?.destroy();
    this.lifecycleAdapter = undefined;
    this.deathRetryState = createPrototypeDeathRetryState();
    this.services.input.releaseAll();
  };
}
