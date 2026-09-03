import { Scale, Scene, Scenes } from 'phaser';
import type { AppServices } from '../../core/AppServices';
import { PhaserLifecycleAdapter } from '../../core/PhaserLifecycleAdapter';
import { readSafeAreaInsets, ViewportService } from '../../core/ViewportService';
import { DirectorPanel } from '../../devtools/DirectorPanel';
import { PhaserInputAdapter } from '../../input/PhaserInputAdapter';

export class Foundation extends Scene {
  private title?: Phaser.GameObjects.Text;
  private instructions?: Phaser.GameObjects.Text;
  private viewportService?: ViewportService;
  private directorPanel?: DirectorPanel;
  private inputAdapter?: PhaserInputAdapter;
  private lifecycleAdapter?: PhaserLifecycleAdapter;

  constructor(private readonly services: AppServices) {
    super('Foundation');
  }

  create() {
    const safeArea = readSafeAreaInsets(document.getElementById('safe-area-probe'));

    this.viewportService = new ViewportService(this.scale.width, this.scale.height, safeArea);
    this.inputAdapter = new PhaserInputAdapter(this, this.services.input);
    this.lifecycleAdapter = new PhaserLifecycleAdapter(this.game, this.services.lifecycle);
    this.directorPanel = new DirectorPanel(this);

    this.cameras.main.setBackgroundColor(0x121426);
    this.title = this.add
      .text(0, 0, 'Monster Girl Delivery', {
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.instructions = this.add
      .text(0, 0, 'M0 foundation\nHold touch, mouse, or Space to inspect input state.', {
        align: 'center',
        color: '#b9c8ec',
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        lineSpacing: 8,
      })
      .setOrigin(0.5);

    this.scale.on(Scale.Events.RESIZE, this.handleResize);
    this.events.once(Scenes.Events.SHUTDOWN, this.handleShutdown);
    this.layout(this.viewportService.getSnapshot());
  }

  update(_time: number, delta: number) {
    if (!this.viewportService || !this.directorPanel) {
      return;
    }

    this.services.time.update(delta);
    this.directorPanel.update(
      delta,
      this.game.loop.actualFps,
      this.viewportService.getSnapshot(),
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
    this.directorPanel?.layout(viewport);
  }

  private readonly handleShutdown = (): void => {
    this.scale.off(Scale.Events.RESIZE, this.handleResize);
    this.inputAdapter?.destroy();
    this.lifecycleAdapter?.destroy();
    this.services.input.releaseAll();
    this.services.time.pause();
  };
}
