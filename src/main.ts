import StartGame from './game/main';

document.addEventListener('DOMContentLoaded', () => {
  StartGame('game-container', { directorMode: import.meta.env.DEV });
});
