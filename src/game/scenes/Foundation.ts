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
import {
  createPerformanceEvidenceReport,
  serializePerformanceEvidenceReport,
} from '../../devtools/PerformanceEvidence';
import type { PerformanceSnapshot } from '../../devtools/PerformanceSampler';
import { GeneratedCollectiblePresentation } from '../../entities/GeneratedCollectiblePresentation';
import { GeneratedHazardPresentation } from '../../entities/GeneratedHazardPresentation';
import { PrototypePlayerPresentation } from '../../entities/PrototypePlayerPresentation';
import { PrototypeScrollingWorldPresentation } from '../../entities/PrototypeScrollingWorldPresentation';
import { DIRECTOR_LASER_VARIANTS } from '../../generation/DirectorLaserCatalog';
import {
  DIRECTOR_ZAPPER_GROUPS,
  DIRECTOR_ZAPPER_VARIANTS,
} from '../../generation/DirectorZapperCatalog';
import type { EncounterStreamObservation } from '../../generation/EncounterStreamObservation';
import { PROTOTYPE_PATTERN_REACHABILITY_CONTEXT } from '../../generation/FlightReachability';
import {
  getNextGeneratedCollectiblePruneDistance,
  type LogicalCollectibleSpawnInstance,
  reconcileGeneratedCollectibles,
} from '../../generation/GeneratedCollectibles';
import {
  advanceGeneratedHazardStream,
  constrainGeneratedHazardStream,
  createGeneratedHazardStream,
  type GeneratedHazardStreamState,
  PROTOTYPE_LIVE_RUN_SEED,
  planGeneratedHazardMotion,
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
import {
  createTimedZapperSimulationState,
  getCollisionHazardsForTimedZapperSimulation,
  stepTimedZapperSimulation,
  type TimedZapperSimulationState,
} from '../../hazards/TimedZapperSimulation';
import { PhaserInputAdapter } from '../../input/PhaserInputAdapter';
import {
  createPrototypePlayerHitbox,
  createPrototypeZapperCollisionWorkCounters,
  PROTOTYPE_PLAYER_COLLISION_EXTENTS,
  type PrototypeZapperCollisionWorkCounters,
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

type DirectorHazardKind = 'missile';

const DIRECTOR_HAZARD_PATTERN_IDS: Readonly<Record<DirectorHazardKind, string>> = Object.freeze({
  missile: 'prototype-target-lock-strike',
});

const identityCenterMapper = (centerY: number): number => centerY;

const createDirectorManualSpawns = (
  pattern: Readonly<HazardPattern>,
  patternStartDistance: number,
  serial: number,
  mapCenterY: (centerY: number) => number = identityCenterMapper,
): ReadonlyArray<Readonly<LogicalHazardSpawnInstance>> => {
  if (pattern.entries.length === 0) {
    throw new TypeError(`Director hazard pattern must contain at least one entry: ${pattern.id}`);
  }

  return Object.freeze(
    pattern.entries.map((entry, patternEntryIndex) => {
      const left = patternStartDistance + entry.hitbox.left;
      const right = patternStartDistance + entry.hitbox.right;
      const authoredCenterY = (entry.hitbox.top + entry.hitbox.bottom) / 2;
      const halfHeight = (entry.hitbox.bottom - entry.hitbox.top) / 2;
      const mappedCenterY = mapCenterY(authoredCenterY);
      if (!Number.isFinite(left) || !Number.isFinite(right) || !Number.isFinite(mappedCenterY)) {
        throw new RangeError('Director hazard spawn coordinates must remain finite.');
      }

      return Object.freeze({
        behavior: entry.behavior,
        entryId: entry.id,
        hitbox: Object.freeze({
          left,
          right,
          top: mappedCenterY - halfHeight,
          bottom: mappedCenterY + halfHeight,
        }),
        patternEntryIndex,
        patternId: `${pattern.id}:director-${serial}`,
        ...(entry.reactionPolicy === undefined ? {} : { reactionPolicy: entry.reactionPolicy }),
        runDistance: left,
        type: entry.type,
      });
    }),
  );
};

export class Foundation extends Scene {
  private instructions?: Phaser.GameObjects.Text;
  private viewportService?: ViewportService;
  private directorDebugOverlay?: DirectorDebugOverlay;
  private directorPanel?: DirectorPanel;
  private directorPerformanceHud?: DirectorPerformanceHud;
  private directorZapperCollisionWorkCounters?: PrototypeZapperCollisionWorkCounters;
  private directorRunControls?: DirectorRunControls;
  private directorTuningControls?: DirectorTuningControls;
  private inputAdapter?: PhaserInputAdapter;
  private lifecycleAdapter?: PhaserLifecycleAdapter;
  private collectibleSpawns: ReadonlyArray<Readonly<LogicalCollectibleSpawnInstance>> =
    Object.freeze([]);
  private collectibleScheduledPatternCount = -1;
  private nextCollectiblePruneDistance: number | null = null;
  private generatedCollectiblePresentation?: GeneratedCollectiblePresentation;
  private generatedHazardPresentation?: GeneratedHazardPresentation;
  private hazardStream?: Readonly<GeneratedHazardStreamState>;
  private hazardVerticalDomain = createPrototypeHazardVerticalDomain(createPrototypeFlightBounds());
  private cachedFlightBoundsViewport?: ReturnType<ViewportService['getSnapshot']>;
  private cachedFlightBounds?: Readonly<ReturnType<typeof createPrototypeFlightBounds>>;
  private cachedHazardStreamContext?: ReturnType<typeof createLiveHazardStreamContext>;
  private cachedHazardStreamContextFlightTuning?: ReturnType<
    AppServices['flightTuning']['getSnapshot']
  >;
  private cachedHazardStreamContextVerticalDomain?: Readonly<PrototypeHazardVerticalDomain>;
  private cachedHazardStreamContextObserver?: (
    observation: Readonly<EncounterStreamObservation>,
  ) => void;
  private cachedRunMotionTuning?: Readonly<{ baseScrollSpeed: number }>;
  private playerPresentation?: PrototypePlayerPresentation;
  private scrollingWorldPresentation?: PrototypeScrollingWorldPresentation;
  private telegraphedHazardState: Readonly<TelegraphedHazardSimulationState> =
    createTelegraphedHazardSimulationState();
  private timedZapperState: Readonly<TimedZapperSimulationState> =
    createTimedZapperSimulationState();
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
  private directorLaserVariantIndex = 0;
  private directorZapperVariantIndex = 0;
  private directorZapperGroupIndex = 0;
  private shutdownHandled = false;

  constructor(
    private readonly services: AppServices,
    private readonly directorMode: boolean,
  ) {
    super('Foundation');
  }

  create() {
    this.shutdownHandled = false;
    this.directorZapperCollisionWorkCounters = undefined;
    this.clearRuntimeCaches();
    this.deathRetryState = createPrototypeDeathRetryState();
    this.retainedGeneratedTelegraphedHazards = Object.freeze([]);
    this.timedZapperState = createTimedZapperSimulationState();
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

      this.directorZapperCollisionWorkCounters = createPrototypeZapperCollisionWorkCounters();
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
          spawnZapper: this.spawnDirectorZapperVariant,
          spawnZapperGroup: this.spawnDirectorZapperGroup,
          spawnLaser: this.spawnDirectorLaserVariant,
          clearHazards: this.clearDirectorHazards,
          setSimulationFrozen: this.handleDirectorFreeze,
          triggerDeath: this.handleDirectorDeath,
          exportPerformanceEvidence: this.handleDirectorPerformanceEvidenceExport,
        },
        this.directorZapperCollisionWorkCounters,
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
    const bounds = this.getCachedFlightBounds(viewport);
    this.hazardVerticalDomain = createPrototypeHazardVerticalDomain(bounds);
    this.runState = createPrototypeRunState(bounds);
    this.hazardStream = createGeneratedHazardStream(
      PROTOTYPE_LIVE_RUN_SEED,
      this.getCachedLiveHazardStreamContext(this.services.flightTuning.getSnapshot()),
      this.services.runMotion.getSnapshot(),
    );
    this.collectibleSpawns = Object.freeze([]);
    this.collectibleScheduledPatternCount = -1;
    this.nextCollectiblePruneDistance = null;
    this.reconcileCollectiblesIfNeeded(true);
    const initialHazards = this.getActiveHazardSpawns();
    this.telegraphedHazardState = stepTelegraphedHazardSimulation(
      createTelegraphedHazardSimulationState(),
      initialHazards,
      0,
      {
        positionY: this.runState.flight.positionY,
        runDistance: this.runState.motion.distance,
      },
    );
    this.timedZapperState = stepTimedZapperSimulation(
      createTimedZapperSimulationState(),
      initialHazards,
      0,
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
      const flightBounds = this.getCachedFlightBounds(viewport);
      const hazardStreamContext = this.getCachedLiveHazardStreamContext(flightTuning);
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
      const activeFlightTuning = this.hazardStream.policy?.flightTuning ?? flightTuning;
      const thrustHeld = this.services.input.isThrustHeld();
      const playerScreenX = getPrototypePlayerX(viewport);
      const motionPlan = planGeneratedHazardMotion(
        this.hazardStream,
        hazardStreamContext,
        requestedRunMotion,
        simulationDeltaSeconds,
      );
      let enteredDead = false;

      // Run each constant-speed slice through the existing authoritative simulation. This preserves
      // continuous collision/Graze/collectible math while making difficulty/safety speed boundaries
      // independent of how the renderer partitions the same simulation time.
      for (const motionSegment of motionPlan.segments) {
        const initialFlight = this.runState.flight;
        const initialMotion = this.runState.motion;
        const runMotionTuning = this.getCachedRunMotionTuning(motionSegment.scrollSpeed);
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
          motionSegment.durationSeconds,
          {
            positionY: initialFlight.positionY,
            runDistance: initialMotion.distance,
          },
          resolvePlayerTargetAtDelta,
          {
            playerRunDistance: initialMotion.distance,
            playerScreenX,
            viewportLeft: 0,
            viewportRight: viewport.width,
          },
        );
        this.timedZapperState = stepTimedZapperSimulation(
          this.timedZapperState,
          activeHazards,
          motionSegment.durationSeconds,
        );
        const telegraphedCollisionHazards = getCollisionHazardsForTelegraphedSimulation(
          this.telegraphedHazardState,
          activeHazards,
          {
            playerRunDistance: initialMotion.distance,
            playerScreenX,
            scrollSpeed: motionSegment.scrollSpeed,
            viewportLeft: 0,
            viewportRight: viewport.width,
          },
        );
        const result = stepPrototypeRun(this.runState, motionSegment.durationSeconds, {
          collectibles: this.collectibleSpawns,
          flightBounds,
          flightTuning: activeFlightTuning,
          hazards: getCollisionHazardsForTimedZapperSimulation(
            this.timedZapperState,
            telegraphedCollisionHazards,
          ),
          runMotionTuning,
          thrustHeld,
          zapperCollisionWorkCounters: this.directorZapperCollisionWorkCounters,
        });
        const godModePreventedDeath = result.enteredDead && this.directorGodModeEnabled;
        if (godModePreventedDeath) {
          const { finalResult: _ignoredFinalResult, ...survivingState } = result.state;
          this.runState = { ...survivingState, phase: 'running' };
        } else {
          this.runState = result.state;
        }

        if (this.runState.phase === 'running') {
          this.runState = {
            ...this.runState,
            motion: {
              ...this.runState.motion,
              distance: motionSegment.endRunDistance,
            },
          };
        }

        if (result.enteredDead && !godModePreventedDeath) {
          enteredDead = true;
          const finalResult = this.runState.finalResult;
          if (!finalResult) {
            throw new TypeError('Authoritative run end must provide a final result snapshot.');
          }
          this.enterRunFailState(finalResult);
          break;
        }
      }

      if (!enteredDead) {
        // The planner already aged policy/readability through the completed frame without admitting
        // encounters. Adopt that state, then perform one real end-of-frame scheduling commit at t=0.
        const generatedBeforeCommit = this.hazardStream.spawns;
        this.hazardStream = motionPlan.stream;
        this.hazardStream = advanceGeneratedHazardStream(
          this.hazardStream,
          this.runState.motion.distance,
          hazardStreamContext,
          requestedRunMotion,
          0,
          this.directorAutoHazardsEnabled,
        );
        this.reconcileRetainedGeneratedTelegraphedHazards(generatedBeforeCommit);
        this.pruneDirectorManualHazards();
        this.reconcileCollectiblesIfNeeded();
        const committedHazards = this.getActiveHazardSpawns();
        this.telegraphedHazardState = stepTelegraphedHazardSimulation(
          this.telegraphedHazardState,
          committedHazards,
          0,
          { positionY: this.runState.flight.positionY, runDistance: this.runState.motion.distance },
        );
        this.timedZapperState = stepTimedZapperSimulation(
          this.timedZapperState,
          committedHazards,
          0,
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
    const flightBounds = this.getCachedFlightBounds(viewport);
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

  private readonly handleDirectorPerformanceEvidenceExport = (
    snapshot: Readonly<PerformanceSnapshot>,
    framesPerSecond: number,
    fpsLimit: number,
    zapperWork?: Readonly<PrototypeZapperCollisionWorkCounters>,
  ): void => {
    if (!this.viewportService) {
      return;
    }

    const viewport = this.viewportService.getSnapshot();
    const report = createPerformanceEvidenceReport(
      {
        buildCommit: __MGD_BUILD_COMMIT__,
        buildMode: import.meta.env.DEV ? 'development' : 'production',
        canvasBackingHeight: this.game.canvas.height,
        canvasBackingWidth: this.game.canvas.width,
        capturedAtIso: new Date().toISOString(),
        devicePixelRatio: typeof window === 'undefined' ? 1 : window.devicePixelRatio,
        directorAutoHazardsEnabled: this.directorAutoHazardsEnabled,
        directorGodModeEnabled: this.directorGodModeEnabled,
        renderScale: this.cameras.main.zoom,
        runDistance: this.runState.motion.distance,
        runSeed: this.hazardStream?.generationState.seed ?? null,
        userAgent: typeof navigator === 'undefined' ? 'unknown' : navigator.userAgent,
        viewportHeight: viewport.height,
        viewportWidth: viewport.width,
      },
      snapshot,
      framesPerSecond,
      fpsLimit,
      zapperWork,
    );
    const serialized = serializePerformanceEvidenceReport(report);
    const clipboard = typeof navigator === 'undefined' ? undefined : navigator.clipboard;

    if (clipboard?.writeText) {
      void clipboard.writeText(serialized).catch(() => {
        console.info('MGD performance evidence', serialized);
      });
      return;
    }

    console.info('MGD performance evidence', serialized);
  };

  private readonly clearDirectorHazards = (): void => {
    this.retainedGeneratedTelegraphedHazards = Object.freeze([]);
    this.directorManualHazards = Object.freeze([]);
    this.collectibleSpawns = Object.freeze([]);
    this.collectibleScheduledPatternCount = this.hazardStream?.scheduledPatternCount ?? -1;
    this.nextCollectiblePruneDistance = null;
    this.telegraphedHazardState = createTelegraphedHazardSimulationState();
    this.timedZapperState = createTimedZapperSimulationState();
    this.directorLaserVariantIndex = 0;
    this.directorZapperVariantIndex = 0;
    this.directorZapperGroupIndex = 0;

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

  private readonly spawnDirectorLaserVariant = (): void => {
    if (!this.viewportService || this.runState.phase !== 'running') {
      return;
    }
    const selection = DIRECTOR_LASER_VARIANTS[this.directorLaserVariantIndex];
    if (!selection) {
      throw new RangeError('Director Laser variant cycle is empty or out of range.');
    }
    this.spawnDirectorPattern(
      selection.pattern,
      false,
      this.hazardVerticalDomain.mapAuthoredCenterY,
    );
    this.directorLaserVariantIndex =
      (this.directorLaserVariantIndex + 1) % DIRECTOR_LASER_VARIANTS.length;
  };

  private readonly spawnDirectorZapperVariant = (): void => {
    if (!this.viewportService || this.runState.phase !== 'running') {
      return;
    }
    const selection = DIRECTOR_ZAPPER_VARIANTS[this.directorZapperVariantIndex];
    if (!selection) {
      throw new RangeError('Director Zapper variant cycle is empty or out of range.');
    }
    this.spawnDirectorPattern(
      selection.pattern,
      true,
      this.hazardVerticalDomain.mapAuthoredCenterY,
    );
    this.directorZapperVariantIndex =
      (this.directorZapperVariantIndex + 1) % DIRECTOR_ZAPPER_VARIANTS.length;
  };

  private readonly spawnDirectorZapperGroup = (): void => {
    if (!this.viewportService || this.runState.phase !== 'running') {
      return;
    }
    const selection = DIRECTOR_ZAPPER_GROUPS[this.directorZapperGroupIndex];
    if (!selection) {
      throw new RangeError('Director Zapper group cycle is empty or out of range.');
    }
    this.spawnDirectorPattern(
      selection.pattern,
      true,
      this.hazardVerticalDomain.mapAuthoredCenterY,
    );
    this.directorZapperGroupIndex =
      (this.directorZapperGroupIndex + 1) % DIRECTOR_ZAPPER_GROUPS.length;
  };

  private spawnDirectorHazard(kind: DirectorHazardKind): void {
    const patternId = DIRECTOR_HAZARD_PATTERN_IDS[kind];
    const pattern = this.hazardVerticalDomain.catalog.find(
      (candidate) => candidate.id === patternId,
    );
    if (!pattern) {
      throw new TypeError(`Director hazard pattern is unavailable: ${patternId}`);
    }
    this.spawnDirectorPattern(pattern, false);
  }

  private spawnDirectorPattern(
    pattern: Readonly<HazardPattern>,
    fullyOffscreen: boolean,
    mapCenterY: (centerY: number) => number = identityCenterMapper,
  ): void {
    if (!this.viewportService || this.runState.phase !== 'running') {
      return;
    }
    if (pattern.entries.length === 0) {
      throw new TypeError(`Director hazard pattern has no entries: ${pattern.id}`);
    }

    const viewport = this.viewportService.getSnapshot();
    const playerScreenX = getPrototypePlayerX(viewport);
    const safeRightEdge = viewport.width - Math.min(viewport.width, viewport.safeArea.right);
    const desiredScreenLeft = fullyOffscreen
      ? viewport.width + DIRECTOR_ZAPPER_OFFSCREEN_PADDING
      : Math.max(playerScreenX + 160, safeRightEdge - 96);
    const worldLeft = this.runState.motion.distance + desiredScreenLeft - playerScreenX;
    const patternLeft = Math.min(...pattern.entries.map((entry) => entry.hitbox.left));
    const patternStartDistance = Math.max(0, worldLeft - patternLeft);
    this.directorHazardSerial += 1;
    const spawns = createDirectorManualSpawns(
      pattern,
      patternStartDistance,
      this.directorHazardSerial,
      mapCenterY,
    );
    this.directorManualHazards = Object.freeze([...this.directorManualHazards, ...spawns]);
    const activeHazards = this.getActiveHazardSpawns();
    this.telegraphedHazardState = stepTelegraphedHazardSimulation(
      this.telegraphedHazardState,
      activeHazards,
      0,
      { positionY: this.runState.flight.positionY, runDistance: this.runState.motion.distance },
    );
    this.timedZapperState = stepTimedZapperSimulation(this.timedZapperState, activeHazards, 0);
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
    const runMotionTuning = this.getCachedRunMotionTuning(
      this.hazardStream?.schedulingWindow.scrollSpeed ??
        this.services.runMotion.getSnapshot().baseScrollSpeed,
    );
    const forcedDeath = stepPrototypeRun(this.runState, 0, {
      collectibles: this.collectibleSpawns,
      flightBounds: this.getCachedFlightBounds(viewport),
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
    this.directorLaserVariantIndex = 0;
    this.directorZapperVariantIndex = 0;
    this.directorZapperGroupIndex = 0;
    const flightBounds = this.getCachedFlightBounds(viewport);
    this.runState = createPrototypeRunState(flightBounds);
    this.deathRetryState = createPrototypeDeathRetryState();
    this.hazardStream = createGeneratedHazardStream(
      seed,
      this.getCachedLiveHazardStreamContext(this.services.flightTuning.getSnapshot()),
      this.services.runMotion.getSnapshot(),
    );
    if (this.directorAutoHazardsEnabled) {
      this.collectibleSpawns = Object.freeze([]);
      this.collectibleScheduledPatternCount = -1;
      this.nextCollectiblePruneDistance = null;
      this.reconcileCollectiblesIfNeeded(true);
      this.telegraphedHazardState = stepTelegraphedHazardSimulation(
        createTelegraphedHazardSimulationState(),
        this.hazardStream.spawns,
        0,
        {
          positionY: this.runState.flight.positionY,
          runDistance: this.runState.motion.distance,
        },
      );
      this.timedZapperState = stepTimedZapperSimulation(
        createTimedZapperSimulationState(),
        this.hazardStream.spawns,
        0,
      );
    } else {
      this.clearDirectorHazards();
    }
    this.services.input.releaseAll();
    this.instructions?.setText(RUNNING_INSTRUCTIONS);
  }

  private getCachedFlightBounds(
    viewport: ReturnType<ViewportService['getSnapshot']>,
  ): Readonly<ReturnType<typeof createPrototypeFlightBounds>> {
    if (this.cachedFlightBounds && this.cachedFlightBoundsViewport === viewport) {
      return this.cachedFlightBounds;
    }

    const bounds = Object.freeze(createPrototypeFlightBounds(viewport));
    this.cachedFlightBoundsViewport = viewport;
    this.cachedFlightBounds = bounds;
    return bounds;
  }

  private getCachedLiveHazardStreamContext(
    flightTuning: ReturnType<AppServices['flightTuning']['getSnapshot']>,
  ): ReturnType<typeof createLiveHazardStreamContext> {
    const observeEncounter = this.directorPanel?.observeEncounter;
    if (
      this.cachedHazardStreamContext &&
      this.cachedHazardStreamContextFlightTuning === flightTuning &&
      this.cachedHazardStreamContextVerticalDomain === this.hazardVerticalDomain &&
      this.cachedHazardStreamContextObserver === observeEncounter
    ) {
      return this.cachedHazardStreamContext;
    }

    const context = createLiveHazardStreamContext(
      flightTuning,
      this.hazardVerticalDomain,
      observeEncounter,
    );
    this.cachedHazardStreamContext = context;
    this.cachedHazardStreamContextFlightTuning = flightTuning;
    this.cachedHazardStreamContextVerticalDomain = this.hazardVerticalDomain;
    this.cachedHazardStreamContextObserver = observeEncounter;
    return context;
  }

  private getCachedRunMotionTuning(baseScrollSpeed: number): Readonly<{ baseScrollSpeed: number }> {
    if (
      this.cachedRunMotionTuning &&
      Object.is(this.cachedRunMotionTuning.baseScrollSpeed, baseScrollSpeed)
    ) {
      return this.cachedRunMotionTuning;
    }

    const tuning = Object.freeze({ baseScrollSpeed });
    this.cachedRunMotionTuning = tuning;
    return tuning;
  }

  private clearRuntimeCaches(): void {
    this.cachedFlightBoundsViewport = undefined;
    this.cachedFlightBounds = undefined;
    this.cachedHazardStreamContext = undefined;
    this.cachedHazardStreamContextFlightTuning = undefined;
    this.cachedHazardStreamContextVerticalDomain = undefined;
    this.cachedHazardStreamContextObserver = undefined;
    this.cachedRunMotionTuning = undefined;
  }

  private reconcileCollectiblesIfNeeded(force = false): void {
    if (!this.hazardStream) {
      return;
    }

    if (!this.directorAutoHazardsEnabled) {
      if (this.collectibleSpawns.length > 0) {
        this.collectibleSpawns = Object.freeze([]);
      }
      this.collectibleScheduledPatternCount = this.hazardStream.scheduledPatternCount;
      this.nextCollectiblePruneDistance = null;
      return;
    }

    const runDistance = this.runState.motion.distance;
    const scheduledPatternCountChanged =
      this.collectibleScheduledPatternCount !== this.hazardStream.scheduledPatternCount;
    const pruningDue =
      this.nextCollectiblePruneDistance !== null && runDistance > this.nextCollectiblePruneDistance;

    if (!force && !scheduledPatternCountChanged && !pruningDue) {
      return;
    }

    this.collectibleSpawns = reconcileGeneratedCollectibles(
      this.collectibleSpawns,
      this.hazardStream.spawns,
      this.hazardVerticalDomain.catalog,
      runDistance,
    );
    this.collectibleScheduledPatternCount = this.hazardStream.scheduledPatternCount;
    this.nextCollectiblePruneDistance = getNextGeneratedCollectiblePruneDistance(
      this.collectibleSpawns,
    );
  }

  private renderRun(viewport: ReturnType<ViewportService['getSnapshot']>): void {
    const playerScreenX = getPrototypePlayerX(viewport);
    const projection = getPrototypeVerticalProjection(viewport);
    const activeHazards = this.getActiveHazardSpawns();

    this.scrollingWorldPresentation?.render(this.runState.motion.distance, viewport);
    if (this.timedZapperState.instances.length > 0) {
      this.generatedHazardPresentation?.sync(
        activeHazards,
        this.runState.motion,
        playerScreenX,
        this.telegraphedHazardState,
        projection,
        { timedZappers: this.timedZapperState },
      );
    } else {
      this.generatedHazardPresentation?.sync(
        activeHazards,
        this.runState.motion,
        playerScreenX,
        this.telegraphedHazardState,
        projection,
      );
    }
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
      timedZappers: this.timedZapperState,
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
    this.directorZapperCollisionWorkCounters = undefined;
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
    this.collectibleScheduledPatternCount = -1;
    this.nextCollectiblePruneDistance = null;
    this.retainedGeneratedTelegraphedHazards = Object.freeze([]);
    this.directorManualHazards = Object.freeze([]);
    this.hazardStream = undefined;
    this.clearRuntimeCaches();
    this.telegraphedHazardState = createTelegraphedHazardSimulationState();
    this.timedZapperState = createTimedZapperSimulationState();
    this.directorLaserVariantIndex = 0;
    this.directorZapperVariantIndex = 0;
    this.directorZapperGroupIndex = 0;
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
