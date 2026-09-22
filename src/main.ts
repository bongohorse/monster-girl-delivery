import StartGame from './game/main';
import { installRenderResolutionController } from './game/RenderResolution';
import { installPhaserInputTeardownGuard } from './input/PhaserInputTeardownGuard';

const bootScreen = document.getElementById('mgd-boot-screen');
const bootStatus = document.getElementById('mgd-boot-status');
document.documentElement.dataset.mgdBootPhase = 'module';
if (bootStatus) {
  bootStatus.textContent = 'Starting…';
}

document.addEventListener('DOMContentLoaded', () => {
  const game = StartGame('game-container', { directorMode: import.meta.env.DEV });
  installRenderResolutionController(game, 'game-container');
  installPhaserInputTeardownGuard(game);

  game.events.once('postrender', () => {
    document.documentElement.dataset.mgdBootPhase = 'ready';
    document.documentElement.dataset.mgdBootReady = 'true';
    bootScreen?.remove();
  });
});
