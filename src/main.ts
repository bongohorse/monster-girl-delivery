import StartGame from './game/main';
import { installRenderResolutionController } from './game/RenderResolution';

document.addEventListener('DOMContentLoaded', () => {
  const game = StartGame('game-container', { directorMode: import.meta.env.DEV });
  installRenderResolutionController(game, 'game-container');
});
