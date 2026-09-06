import { AUTO, Game, Scale } from 'phaser';
import { createAppServices } from '../core/AppServices';
import { Boot } from './scenes/Boot';
import { Foundation } from './scenes/Foundation';
import { Preloader } from './scenes/Preloader';

export interface StartGameOptions {
  directorMode: boolean;
}

export const createGameConfig = (
  parent: string,
  options: StartGameOptions,
): Phaser.Types.Core.GameConfig => {
  const services = createAppServices();
  return {
    type: AUTO,
    backgroundColor: '#121426',
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
      mode: Scale.RESIZE,
      width: '100%',
      height: '100%',
    },
    scene: [Boot, Preloader, new Foundation(services, options.directorMode)],
  };
};

const StartGame = (parent: string, options: StartGameOptions) => {
  return new Game(createGameConfig(parent, options));
};

export default StartGame;
