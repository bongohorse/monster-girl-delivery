import { Core, type Game } from 'phaser';
import type { LifecycleService } from './LifecycleService';

/** Bridges browser and Phaser lifecycle events to the pure lifecycle service. */
export class PhaserLifecycleAdapter {
  private destroyed = false;

  constructor(
    private readonly game: Game,
    private readonly lifecycleService: LifecycleService,
  ) {
    game.events.on(Core.Events.BLUR, this.handleBlur);
    game.events.on(Core.Events.FOCUS, this.handleFocus);
    game.events.on(Core.Events.HIDDEN, this.handleHidden);
    game.events.on(Core.Events.VISIBLE, this.handleVisible);
    game.events.once(Core.Events.DESTROY, this.destroy);

    window.addEventListener('pagehide', this.handlePageHide);
    window.addEventListener('pageshow', this.handlePageShow);

    if (document.hidden) {
      lifecycleService.pause('hidden');
    }
  }

  destroy = (): void => {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.game.events.off(Core.Events.BLUR, this.handleBlur);
    this.game.events.off(Core.Events.FOCUS, this.handleFocus);
    this.game.events.off(Core.Events.HIDDEN, this.handleHidden);
    this.game.events.off(Core.Events.VISIBLE, this.handleVisible);
    this.game.events.off(Core.Events.DESTROY, this.destroy);

    window.removeEventListener('pagehide', this.handlePageHide);
    window.removeEventListener('pageshow', this.handlePageShow);
  };

  private readonly handleBlur = (): void => {
    this.lifecycleService.pause('blur');
  };

  private readonly handleFocus = (): void => {
    this.lifecycleService.resume('blur');
  };

  private readonly handleHidden = (): void => {
    this.lifecycleService.pause('hidden');
  };

  private readonly handleVisible = (): void => {
    this.lifecycleService.resume('hidden');
  };

  private readonly handlePageHide = (): void => {
    this.lifecycleService.pause('suspended');
  };

  private readonly handlePageShow = (): void => {
    this.lifecycleService.resume('suspended');
  };
}
