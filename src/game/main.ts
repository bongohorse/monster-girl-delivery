import { AUTO, Game, Scale } from 'phaser';
import { createAppServices } from '../core/AppServices';
import {
  DEFAULT_RENDER_SCALE_CAP,
  measureRenderResolution,
} from './RenderResolution';
import { Boot } from './scenes/Boot';
import { Foundation } from './scenes/Foundation';
import { Preloader } from './scenes/Preloader';

interface StartGameOptions {
  directorMode: boolean;
  renderScaleCap?: number;
}

const StartGame = (parent: string, options: StartGameOptions) => {
  const services = createAppServices();
  const renderResolution = measureRenderResolution(
    parent,
    options.renderScaleCap ?? DEFAULT_RENDER_SCALE_CAP,
  );
  const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    backgroundColor: '#121426',
    antialias: true,
    pixelArt: false,
    disableContextMenu: true,
    input: {
      activePointers: 2,
      keyboard: true,
      mouse: {
        preventDefaultWheel: true,
      },
      touch: {
        capture: true,
      },
      windowEvents: true,
    },
    scale: {
      parent,
      mode: Scale.NONE,
      width: renderResolution.backingWidth,
      height: renderResolution.backingHeight,
      zoom: 1 / renderResolution.renderScale,
    },
    scene: [Boot, Preloader, new Foundation(services, options.directorMode)],
  };

  return new Game(config);
};

export default StartGame;
