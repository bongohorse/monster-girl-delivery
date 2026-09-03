import { AUTO, Game, Scale } from 'phaser';
import { createAppServices } from '../core/AppServices';
import { Boot } from './scenes/Boot';
import { Foundation } from './scenes/Foundation';
import { Preloader } from './scenes/Preloader';

const StartGame = (parent: string) => {
  const services = createAppServices();
  const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    backgroundColor: '#121426',
    disableContextMenu: true,
    input: {
      activePointers: 2,
      keyboard: true,
      mouse: true,
      touch: true,
      windowEvents: true,
    },
    scale: {
      parent,
      mode: Scale.RESIZE,
      width: '100%',
      height: '100%',
    },
    scene: [Boot, Preloader, new Foundation(services)],
  };

  return new Game(config);
};

export default StartGame;
