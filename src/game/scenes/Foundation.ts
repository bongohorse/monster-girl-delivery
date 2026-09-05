import { Scale, Scene, Scenes } from 'phaser';
import type { AppServices } from '../../core/AppServices';
import { PhaserLifecycleAdapter } from '../../core/PhaserLifecycleAdapter';
import { readSafeAreaInsets, ViewportService } from '../../core/ViewportService';
import { DirectorPanel } from '../../devtools/DirectorPanel';
import { DirectorPerformanceHud } from '../../devtools/DirectorPerformanceHud';
import { createDirectorResponsiveLayout } from '../../devtools/DirectorResponsiveLayout';
import { DirectorRunControls } from '../../devtools/DirectorRunControls';
import { DirectorTuningControls } from '../../devtools/DirectorTuningControls';
import { GeneratedHazardPresentation } from '../../entities/GeneratedHazardPresentation';
import { PrototypePlayerPresentation } from '../../entities/PrototypePlayerPresentation';
import { PrototypeScrollingWorldPresentation } from '../../entities/PrototypeScrollingWorldPresentation';
import { PROTOTYPE_PATTERN_REACHABILITY_CONTEXT } from '../../generation/FlightReachability';
import {
  advanceGeneratedHazardStream,
  createGeneratedHazardStream,
  type GeneratedHazardStreamState,
  PROTOTYPE_LIVE_RUN_SEED,
} from '../../generation/GeneratedHazardStream';
import { PROTOTYPE_LIVE_ENCOUNTER_POLICY_CONFIG } from '../../generation/LiveEncounterPolicy';
import { PROTOTYPE_M4_HAZARD_PATTERN_FIXTURES } from '../../generation/PrototypeHazardPatternFixtures';
import {
  createTelegraphedHazardSimulationState,
  getLethalHazardsForTelegraphedSimulation,
  stepTelegraphedHazardSimulation,
  type TelegraphedHazardSimulationState,
} from '../../hazards/TelegraphedHazardSimulation';
import { PhaserInputAdapter } from '../../input/PhaserInputAdapter';
import {
  createPrototypeRunState,
  type PrototypeRunState,
  stepPrototypeRun,
} from '../../systems/PrototypeRunSimulation';
import { constrainVerticalFlightState } from '../../systems/VerticalFlightSimulation';
import { createPrototypeFlightBounds, getPrototypePlayerX } from '../PrototypeFlightLayout';

const RUNNING_INSTRUCTIONS =
  'M4 moving, timed + target-lock hazards\nHold touch, mouse, or Space to thrust.';
const DEAD_INSTRUCTIONS = 'Delivery interrupted\nTap, click, or press Space to restart.';
const createLiveHazardStreamContext = (
  flightTuning: ReturnType<AppServices['flightTuning']['getSnapshot']>,
) =>
  Object.freeze({
    catalog: PROTOTYPE_M4_HAZARD_PATTERN_FIXTURES,
    policy: PROTOTYPE_LIVE_ENCOUNTER_POLICY_CONFIG,
    reachability: Object.freeze({
      flightState: PROTOTYPE_PATTERN_REACHABILITY_CONTEXT.flightState,
      flightTuning,
      playerExtents: PROTOTYPE_PATTERN_REACHABILITY_CONTEXT.playerExtents,
    }),
  });

export class Foundation extends Scene {
  private title?: Phaser.GameObjects.Text;
  private instructions?: Phaser.GameObjects.Text;
  private viewportService?: ViewportService;
  private directorPanel?: DirectorPanel;
  private directorPerformanceHud?: DirectorPerformanceHud;
  private directorRunControls?: DirectorRunControls;
  private directorTuningControls?: DirectorTuningControls;
  private inputAdapter?: PhaserInputAdapter;
  private lifecycleAdapter?: PhaserLifecycleAdapter;
  private generatedHazardPresentation?: GeneratedHazardPresentation;
  private hazardStream?: Readonly<GeneratedHazardStreamState>;
  private playerPresentation?: PrototypePlayerPresentation;
  private scrollingWorldPresentation?: PrototypeScrollingWorldPresentation;
  private telegraphedHazardState: Readonly<TelegraphedHazardSimulationState> =
    createTelegraphedHazardSimulationState();
  private runState: PrototypeRunState = {
    phase: 'running',
    motion: { distance: 0 },
    flight: { positionY: 0, velocityY: 0 },
  };
  private shutdownHandled = false;

  constructor(
    private readonly services: AppServices,
    private readonly directorMode: boolean,
  ) {
    super('Foundation');
  }

  create() {
    this.shutdownHandled = false;
    const safeArea = readSafeAreaInsets(document.getElementById('safe-area-probe'));

    this.viewportService = new ViewportService(this.scale.width, this.scale.height, safeArea);
    this.inputAdapter = new PhaserInputAdapter(this, this.services.input);
    this.lifecycleAdapter = new PhaserLifecycleAdapter(this.game, this.services.lifecycle);

    if (this.directorMode) {
      const gameContainer = document.getElementById('game-container');
      if (!gameContainer) {
        throw new Error('Director performance HUD requires the game container.');
      }

      this.directorPerformanceHud = new DirectorPerformanceHud(gameContainer, this.services.input);
      this.directorPanel = new DirectorPanel(this);
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
      );
    }

    const viewport = this.viewportService.getSnapshot();
    const bounds = createPrototypeFlightBounds(viewport);
    this.runState = createPrototypeRunState(bounds);
    this.hazardStream = createGeneratedHazardStream(
      PROTOTYPE_LIVE_RUN_SEED,
      createLiveHazardStreamContext(this.services.flightTuning.getSnapshot()),
      this.services.runMotion.getSnapshot(),
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
    this.services.input.releaseAll();
    this.scrollingWorldPresentation = new PrototypeScrollingWorldPresentation(this);
    this.generatedHazardPresentation = new GeneratedHazardPresentation(this);
    this.playerPresentation = new PrototypePlayerPresentation(
      this,
      getPrototypePlayerX(viewport),
      this.runState.flight.positionY,
    );

    this.cameras.main.setBackgroundColor(0x121426);
    this.title = this.add
      .text(0, 0, 'Monster Girl Delivery', {
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.instructions = this.add
      .text(0, 0, RUNNING_INSTRUCTIONS, {
        align: 'center',
        color: '#b9c8ec',
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        lineSpacing: 8,
      })
      .setOrigin(0.5);

    this.scale.on(Scale.Events.RESIZE, this.handleResize);
    this.events.once(Scenes.Events.SHUTDOWN, this.handleShutdown);
    this.layout(viewport);
  }

  update(_time: number, delta: number) {
    if (!this.viewportService || !this.playerPresentation || !this.hazardStream) {
      return;
    }

    const simulationDeltaSeconds = this.services.time.update(delta);
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
        !directorLifecycle.paused && rawFrameTimeMilliseconds > 0 && simulationDeltaSeconds === 0,
      );
    }

    if (this.runState.phase === 'dead') {
      const restartPressed = this.services.input.consumePrimaryActionPress();

      if (restartPressed && !this.services.lifecycle.isPaused()) {
        this.restartRun(viewport);
      }
    } else {
      // While running, primary presses are thrust input rather than queued restart requests.
      this.services.input.consumePrimaryActionPress();
      const requestedRunMotion = this.services.runMotion.getSnapshot();
      const flightTuning = this.services.flightTuning.getSnapshot();
      const hazardStreamContext = createLiveHazardStreamContext(flightTuning);
      this.hazardStream = advanceGeneratedHazardStream(
        this.hazardStream,
        this.runState.motion.distance,
        hazardStreamContext,
        requestedRunMotion,
        simulationDeltaSeconds,
      );
      const appliedScrollSpeed = this.hazardStream.schedulingWindow.scrollSpeed;
      const runMotionTuning = Object.freeze({ baseScrollSpeed: appliedScrollSpeed });
      this.telegraphedHazardState = stepTelegraphedHazardSimulation(
        this.telegraphedHazardState,
        this.hazardStream.spawns,
        simulationDeltaSeconds,
        {
          positionY: this.runState.flight.positionY,
          runDistance: this.runState.motion.distance,
        },
      );
      const result = stepPrototypeRun(this.runState, simulationDeltaSeconds, {
        flightBounds: createPrototypeFlightBounds(viewport),
        flightTuning,
        hazards: getLethalHazardsForTelegraphedSimulation(
          this.telegraphedHazardState,
          this.hazardStream.spawns,
        ),
        runMotionTuning,
        thrustHeld: this.services.input.isThrustHeld(),
      });
      this.runState = result.state;

      if (result.enteredDead) {
        this.services.input.releaseAll();
        this.instructions?.setText(DEAD_INSTRUCTIONS);
      } else {
        this.hazardStream = advanceGeneratedHazardStream(
          this.hazardStream,
          this.runState.motion.distance,
          hazardStreamContext,
          requestedRunMotion,
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
        this.hazardStream.generationState.seed,
      );
    }
  }

  private readonly handleResize = (gameSize: Phaser.Structs.Size): void => {
    if (!this.viewportService) {
      return;
    }

    this.cameras.resize(gameSize.width, gameSize.height);
    this.viewportService.resize(
      gameSize.width,
      gameSize.height,
      readSafeAreaInsets(document.getElementById('safe-area-probe')),
    );
    const viewport = this.viewportService.getSnapshot();
    this.runState = {
      ...this.runState,
      flight: constrainVerticalFlightState(
        this.runState.flight,
        createPrototypeFlightBounds(viewport),
      ),
    };
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
    const titleSize = Math.round(Math.max(24, Math.min(42, safeWidth * 0.065)));
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
    const titleY =
      contentHeight >= 100
        ? contentTop + contentHeight * 0.32
        : Math.max(safeTop + 24, safeBottom - 72);
    const instructionsY =
      contentHeight >= 100
        ? contentTop + contentHeight * 0.72
        : Math.max(safeTop + 56, safeBottom - 30);

    this.title?.setFontSize(titleSize).setPosition(centerX, titleY);
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

    this.restartRun(this.viewportService.getSnapshot());
  };

  private restartRun(viewport: ReturnType<ViewportService['getSnapshot']>): void {
    this.runState = createPrototypeRunState(createPrototypeFlightBounds(viewport));
    this.hazardStream = createGeneratedHazardStream(
      PROTOTYPE_LIVE_RUN_SEED,
      createLiveHazardStreamContext(this.services.flightTuning.getSnapshot()),
      this.services.runMotion.getSnapshot(),
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
    this.services.input.releaseAll();
    this.instructions?.setText(RUNNING_INSTRUCTIONS);
  }

  private renderRun(viewport: ReturnType<ViewportService['getSnapshot']>): void {
    const playerScreenX = getPrototypePlayerX(viewport);

    this.scrollingWorldPresentation?.render(this.runState.motion.distance, viewport);
    this.generatedHazardPresentation?.sync(
      this.hazardStream?.spawns ?? [],
      this.runState.motion,
      playerScreenX,
      this.telegraphedHazardState,
    );
    this.playerPresentation?.setPosition(playerScreenX, this.runState.flight.positionY);
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
    this.directorPanel = undefined;
    this.scrollingWorldPresentation?.destroy();
    this.scrollingWorldPresentation = undefined;
    this.generatedHazardPresentation?.destroy();
    this.generatedHazardPresentation = undefined;
    this.hazardStream = undefined;
    this.telegraphedHazardState = createTelegraphedHazardSimulationState();
    this.playerPresentation?.destroy();
    this.playerPresentation = undefined;
    this.inputAdapter?.destroy();
    this.inputAdapter = undefined;
    this.lifecycleAdapter?.destroy();
    this.lifecycleAdapter = undefined;
    this.services.input.releaseAll();
  };
}
