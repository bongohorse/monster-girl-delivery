import { Scale, Scene, Scenes } from 'phaser';
import type { AppServices } from '../../core/AppServices';
import { PhaserLifecycleAdapter } from '../../core/PhaserLifecycleAdapter';
import { readSafeAreaInsets, ViewportService } from '../../core/ViewportService';
import { DirectorPanel } from '../../devtools/DirectorPanel';
import { PrototypePlayerPresentation } from '../../entities/PrototypePlayerPresentation';
import { PhaserInputAdapter } from '../../input/PhaserInputAdapter';
import {
  stepVerticalFlight,
  type VerticalFlightState,
} from '../../systems/VerticalFlightSimulation';
import { createPrototypeFlightBounds, getPrototypePlayerX } from '../PrototypeFlightLayout';

export class Foundation extends Scene {
  private title?: Phaser.GameObjects.Text;
  private instructions?: Phaser.GameObjects.Text;
  private viewportService?: ViewportService;
  private directorPanel?: DirectorPanel;
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
    this.layout(this.viewportService.getSnapshot());
  };

  private layout(viewport: ReturnType<ViewportService['getSnapshot']>): void {
    const titleSize = Math.round(Math.max(26, Math.min(48, viewport.width * 0.065)));

    this.title?.setFontSize(titleSize).setPosition(viewport.width / 2, viewport.height * 0.48);
    this.instructions
      ?.setPosition(viewport.width / 2, viewport.height * 0.58)
      .setWordWrapWidth(Math.max(180, viewport.width - 48));
    this.playerPresentation?.setPosition(getPrototypePlayerX(viewport), this.flightState.positionY);
    this.directorPanel?.layout(viewport);
  }

  private readonly handleShutdown = (): void => {
    if (this.shutdownHandled) {
      return;
    }

    this.shutdownHandled = true;
    this.scale.off(Scale.Events.RESIZE, this.handleResize);
    this.playerPresentation?.destroy();
    this.playerPresentation = undefined;
    this.inputAdapter?.destroy();
    this.inputAdapter = undefined;
    this.lifecycleAdapter?.destroy();
    this.lifecycleAdapter = undefined;
    this.services.input.releaseAll();
  };
}
