import StartGame from './game/main';
import { installRenderResolutionController } from './game/RenderResolution';
import { installPhaserInputTeardownGuard } from './input/PhaserInputTeardownGuard';

document.addEventListener('DOMContentLoaded', () => {
  const game = StartGame('game-container', { directorMode: import.meta.env.DEV });
  installRenderResolutionController(game, 'game-container');
  installPhaserInputTeardownGuard(game);
});
