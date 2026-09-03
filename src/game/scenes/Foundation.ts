import { Scale, Scene, Scenes } from 'phaser';
import type { AppServices } from '../../core/AppServices';
import { PhaserLifecycleAdapter } from '../../core/PhaserLifecycleAdapter';
import { readSafeAreaInsets, ViewportService } from '../../core/ViewportService';
import { DirectorFlightControls } from '../../devtools/DirectorFlightControls';
import { DirectorPanel } from '../../devtools/DirectorPanel';
import { createDirectorResponsiveLayout } from '../../devtools/DirectorResponsiveLayout';
import { PrototypePlayerPresentation } from '../../entities/PrototypePlayerPresentation';
import { PhaserInputAdapter } from '../../input/PhaserInputAdapter';
import {
  constrainVerticalFlightState,
  stepVerticalFlight,
  type VerticalFlightState,
} from '../../systems/VerticalFlightSimulation';
import { createPrototypeFlightBounds, getPrototypePlayerX } from '../PrototypeFlightLayout';

export class Foundation extends Scene {
  private title?: Phaser.GameObjects.Text;
  private instructions?: Phaser.GameObjects.Text;
  private viewportService?: ViewportService;
  private directorPanel?: DirectorPanel;
  private directorFlightControls?: DirectorFlightControls;
  private inputAdapter?: PhaserInputAdapter;
  private lifecycleAdapter?: PhaserLifecycleAdapter;
  private playerPresentation?: PrototypePlayerPresentation;
  private flightState: VerticalFlightState = { positionY: 0, velocityY: 0 };
  private shutdownHandled = false;

  constructor(private readonly services: AppServices) {
    super('Foundation');
  }

  create() {
    this.shutdownHandled = false;
    const safeArea = readSafeAreaInsets(document.getElementById('safe-area-probe'));

    this.viewportService = new ViewportService(this.scale.width, this.scale.height, safeArea);
    this.inputAdapter = new PhaserInputAdapter(this, this.services.input);
    this.lifecycleAdapter = new PhaserLifecycleAdapter(this.game, this.services.lifecycle);
    this.directorPanel = new DirectorPanel(this);
    this.directorFlightControls = new DirectorFlightControls(
      this,
      this.services.flightTuning,
      this.services.input,
    );

    const viewport = this.viewportService.getSnapshot();
    const bounds = createPrototypeFlightBounds(viewport);
    this.flightState = {
      positionY: (bounds.ceilingY + bounds.floorY) / 2,
      velocityY: 0,
    };
    this.playerPresentation = new PrototypePlayerPresentation(
      this,
      getPrototypePlayerX(viewport),
      this.flightState.positionY,
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
      .text(0, 0, 'M1 flight prototype\nHold touch, mouse, or Space to thrust.', {
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
    if (!this.viewportService || !this.directorPanel || !this.playerPresentation) {
      return;
    }

    const simulationDeltaSeconds = this.services.time.update(delta);
    const viewport = this.viewportService.getSnapshot();
    this.flightState = stepVerticalFlight(
      this.flightState,
      simulationDeltaSeconds,
      this.services.input.isThrustHeld(),
      this.services.flightTuning.getSnapshot(),
      createPrototypeFlightBounds(viewport),
    );
    this.playerPresentation.setPosition(getPrototypePlayerX(viewport), this.flightState.positionY);

    this.directorPanel.update(
      delta,
      this.game.loop.actualFps,
      viewport,
      this.services.input.getSnapshot(),
      this.services.lifecycle.getSnapshot(),
    );
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
    this.flightState = constrainVerticalFlightState(
      this.flightState,
      createPrototypeFlightBounds(viewport),
    );
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
    const directorLayout = createDirectorResponsiveLayout(viewport);
    const directorBottom = Math.max(
      directorLayout.diagnostics.y + directorLayout.diagnostics.height,
      directorLayout.flightControls.y + directorLayout.flightControls.height,
    );
    const contentTop = Math.min(safeBottom, Math.max(safeTop, directorBottom + 16));
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
    this.playerPresentation?.setPosition(getPrototypePlayerX(viewport), this.flightState.positionY);
    this.directorPanel?.layout(viewport);
    this.directorFlightControls?.layout(viewport);
  }

  private readonly handleShutdown = (): void => {
    if (this.shutdownHandled) {
      return;
    }

    this.shutdownHandled = true;
    this.scale.off(Scale.Events.RESIZE, this.handleResize);
    this.directorFlightControls?.destroy();
    this.directorFlightControls = undefined;
    this.playerPresentation?.destroy();
    this.playerPresentation = undefined;
    this.inputAdapter?.destroy();
    this.inputAdapter = undefined;
    this.lifecycleAdapter?.destroy();
    this.lifecycleAdapter = undefined;
    this.services.input.releaseAll();
  };
}
