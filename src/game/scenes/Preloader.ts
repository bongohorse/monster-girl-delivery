import { Loader, Scale, Scene, Scenes } from 'phaser';
import { createPreloaderLayout, type PreloaderLayout } from '../PreloaderLayout';
import { getLogicalViewportFromBacking } from '../RenderResolution';

export class Preloader extends Scene {
  private background?: Phaser.GameObjects.Image;
  private loadingBarFrame?: Phaser.GameObjects.Rectangle;
  private loadingBarFill?: Phaser.GameObjects.Rectangle;
  private loadProgress = 0;
  private shutdownHandled = false;

  constructor() {
    super('Preloader');
  }

  init() {
    this.loadProgress = 0;
    this.shutdownHandled = false;

    const viewport = getLogicalViewportFromBacking(
      this.scale.width,
      this.scale.height,
      this.scale.zoom,
    );
    this.cameras.main.setOrigin(0, 0).setZoom(viewport.renderScale);
    const layout = createPreloaderLayout(viewport.width, viewport.height, this.loadProgress);
    this.background = this.add
      .image(layout.background.x, layout.background.y, 'background')
      .setDisplaySize(layout.background.width, layout.background.height);
    this.loadingBarFrame = this.add
      .rectangle(layout.frame.x, layout.frame.y, layout.frame.width, layout.frame.height)
      .setStrokeStyle(1, 0xffffff);
    this.loadingBarFill = this.add
      .rectangle(layout.fill.x, layout.fill.y, layout.fill.width, layout.fill.height, 0xffffff)
      .setOrigin(0, 0.5);

    this.load.on(Loader.Events.PROGRESS, this.handleProgress);
    this.scale.on(Scale.Events.RESIZE, this.handleResize);
    this.events.once(Scenes.Events.SHUTDOWN, this.handleShutdown);
  }

  create() {
    //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
    //  For example, you can define global animations here, so we can use them in other scenes.

    //  Enter the M0 foundation diagnostics after starter assets are ready.
    this.scene.start('Foundation');
  }

  private readonly handleProgress = (progress: number): void => {
    const viewport = getLogicalViewportFromBacking(
      this.scale.width,
      this.scale.height,
      this.scale.zoom,
    );
    const layout = createPreloaderLayout(viewport.width, viewport.height, progress);
    this.loadProgress = layout.progress;
    this.applyLayout(layout);
  };

  private readonly handleResize = (gameSize: Phaser.Structs.Size): void => {
    const viewport = getLogicalViewportFromBacking(
      gameSize.width,
      gameSize.height,
      this.scale.zoom,
    );
    this.cameras.resize(gameSize.width, gameSize.height);
    this.cameras.main.setOrigin(0, 0).setZoom(viewport.renderScale);
    this.applyLayout(createPreloaderLayout(viewport.width, viewport.height, this.loadProgress));
  };

  private applyLayout(layout: PreloaderLayout): void {
    this.background
      ?.setPosition(layout.background.x, layout.background.y)
      .setDisplaySize(layout.background.width, layout.background.height);
    this.loadingBarFrame
      ?.setPosition(layout.frame.x, layout.frame.y)
      .setSize(layout.frame.width, layout.frame.height);
    this.loadingBarFill
      ?.setPosition(layout.fill.x, layout.fill.y)
      .setSize(layout.fill.width, layout.fill.height);
  }

  private readonly handleShutdown = (): void => {
    if (this.shutdownHandled) {
      return;
    }

    this.shutdownHandled = true;
    this.load.off(Loader.Events.PROGRESS, this.handleProgress);
    this.scale.off(Scale.Events.RESIZE, this.handleResize);
    this.background = undefined;
    this.loadingBarFrame = undefined;
    this.loadingBarFill = undefined;
  };
}
