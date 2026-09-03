import { Scene } from 'phaser';

export class Preloader extends Scene {
  constructor() {
    super('Preloader');
  }

  init() {
    const { width, height } = this.scale;
    const barWidth = Math.max(32, Math.min(460, width - 64));
    const centerX = width / 2;
    const centerY = height / 2;

    this.add.image(centerX, centerY, 'background').setDisplaySize(width, height);
    this.add.rectangle(centerX, centerY, barWidth + 8, 32).setStrokeStyle(1, 0xffffff);

    const bar = this.add
      .rectangle(centerX - barWidth / 2, centerY, 4, 28, 0xffffff)
      .setOrigin(0, 0.5);

    this.load.on('progress', (progress: number) => {
      bar.width = Math.max(4, barWidth * progress);
    });
  }

  preload() {
    //  Load the assets for the game - Replace with your own assets
    this.load.setPath('assets');

    this.load.image('logo', 'logo.png');
  }

  create() {
    //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
    //  For example, you can define global animations here, so we can use them in other scenes.

    //  Enter the M0 foundation diagnostics after starter assets are ready.
    this.scene.start('Foundation');
  }
}
