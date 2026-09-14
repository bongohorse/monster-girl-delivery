import type { ViewportSnapshot } from '../core/ViewportService';
import type { InputService } from '../input/InputService';
import { createDirectorResponsiveLayout } from './DirectorResponsiveLayout';
import { PerformanceSampler, type PerformanceSnapshot } from './PerformanceSampler';

export const DIRECTOR_PERFORMANCE_HUD_REFRESH_MILLISECONDS = 250;
export const DIRECTOR_FPS_LIMIT_OPTIONS = Object.freeze([0, 30, 60, 90, 120, 144] as const);

export interface DirectorPerformanceHudControls {
  readonly setFpsLimit: (limit: number) => void;
  readonly setWireframesEnabled: (enabled: boolean) => void;
}

type PerformanceHealth = 'good' | 'mild' | 'noticeable' | 'severe' | 'unknown';

const formatMilliseconds = (value: number | null): string =>
  value === null ? '--' : value.toFixed(1);

const formatFpsLimit = (limit: number): string => (limit === 0 ? '∞' : String(limit));

const getFrameTimeHealth = (frameTimeMilliseconds: number | null): PerformanceHealth => {
  if (frameTimeMilliseconds === null || !Number.isFinite(frameTimeMilliseconds)) {
    return 'unknown';
  }
  if (frameTimeMilliseconds <= 16.67) {
    return 'good';
  }
  if (frameTimeMilliseconds <= 25) {
    return 'mild';
  }
  if (frameTimeMilliseconds <= 50) {
    return 'noticeable';
  }
  return 'severe';
};

const getFpsHealth = (framesPerSecond: number): PerformanceHealth => {
  if (!Number.isFinite(framesPerSecond) || framesPerSecond <= 0) {
    return 'unknown';
  }
  if (framesPerSecond >= 59) {
    return 'good';
  }
  if (framesPerSecond >= 40) {
    return 'mild';
  }
  if (framesPerSecond >= 20) {
    return 'noticeable';
  }
  return 'severe';
};

const setTextIfChanged = (element: HTMLElement, value: string): void => {
  if (element.textContent !== value) {
    element.textContent = value;
  }
};

const setHealthIfChanged = (element: HTMLElement, health: PerformanceHealth): void => {
  if (element.dataset.health !== health) {
    element.dataset.health = health;
  }
};

/** Low-frequency DOM presentation for the pure raw frame-time sampler. */
export class DirectorPerformanceHud {
  private readonly root: HTMLDivElement;
  private readonly visibilityButton: HTMLButtonElement;
  private readonly values: HTMLSpanElement;
  private readonly fpsValue: HTMLButtonElement;
  private readonly frameTimeValue: HTMLSpanElement;
  private readonly statisticsValue: HTMLSpanElement;
  private readonly wireframeLabel: HTMLLabelElement;
  private readonly wireframeCheckbox: HTMLInputElement;
  private readonly resetButton: HTMLButtonElement;
  private destroyed = false;
  private elapsedSinceRefreshMilliseconds = Number.POSITIVE_INFINITY;
  private fpsLimitIndex = 0;
  private hidden = false;
  private latestFramesPerSecond = 0;

  constructor(
    container: HTMLElement,
    private readonly inputService: InputService,
    private readonly sampler: PerformanceSampler = new PerformanceSampler(),
    private readonly controls?: Readonly<DirectorPerformanceHudControls>,
  ) {
    const ownerDocument = container.ownerDocument;
    this.root = ownerDocument.createElement('div');
    this.root.className = 'director-performance-hud';
    this.root.setAttribute('role', 'group');
    this.root.setAttribute('aria-label', 'Director performance monitor');

    this.visibilityButton = ownerDocument.createElement('button');
    this.visibilityButton.className = 'director-performance-hud__button';
    this.visibilityButton.type = 'button';
    this.visibilityButton.textContent = '👁';
    this.visibilityButton.title = 'Hide performance values';
    this.visibilityButton.setAttribute('aria-label', 'Hide performance values');
    this.visibilityButton.setAttribute('aria-pressed', 'false');

    this.values = ownerDocument.createElement('span');
    this.values.className = 'director-performance-hud__values';
    this.fpsValue = ownerDocument.createElement('button');
    this.fpsValue.className = 'director-performance-hud__button director-performance-hud__fps';
    this.fpsValue.type = 'button';
    this.frameTimeValue = ownerDocument.createElement('span');
    this.statisticsValue = ownerDocument.createElement('span');
    this.values.append(this.fpsValue, this.frameTimeValue, this.statisticsValue);

    this.wireframeLabel = ownerDocument.createElement('label');
    this.wireframeLabel.className = 'director-performance-hud__toggle';
    this.wireframeCheckbox = ownerDocument.createElement('input');
    this.wireframeCheckbox.type = 'checkbox';
    this.wireframeCheckbox.setAttribute('aria-label', 'Show collision and gameplay wireframes');
    const wireframeText = ownerDocument.createElement('span');
    wireframeText.textContent = 'Hitboxes';
    this.wireframeLabel.append(this.wireframeCheckbox, wireframeText);

    this.resetButton = ownerDocument.createElement('button');
    this.resetButton.className = 'director-performance-hud__button';
    this.resetButton.type = 'button';
    this.resetButton.textContent = '↻';
    this.resetButton.title = 'Reset performance statistics';
    this.resetButton.setAttribute('aria-label', 'Reset performance statistics');

    this.root.append(
      this.visibilityButton,
      this.values,
      this.wireframeLabel,
      this.resetButton,
    );
    container.append(this.root);

    this.addControlListeners(this.visibilityButton, this.handleVisibilityClick);
    this.addControlListeners(this.fpsValue, this.handleFpsLimitClick);
    this.addControlListeners(this.resetButton, this.handleResetClick);
    this.addTogglePointerListeners(this.wireframeLabel);
    this.wireframeCheckbox.addEventListener('change', this.handleWireframeChange);
    this.refreshFpsLimitTitle();
    this.refreshVisibleValues();
  }

  update(
    rawFrameTimeMilliseconds: number,
    framesPerSecond: number,
    lifecyclePaused: boolean,
    discardCurrentSample = false,
  ): void {
    if (this.destroyed) {
      return;
    }

    this.latestFramesPerSecond = framesPerSecond;
    const accepted = this.sampler.sample(
      rawFrameTimeMilliseconds,
      lifecyclePaused,
      discardCurrentSample,
    );

    if (!accepted || this.hidden) {
      return;
    }

    this.elapsedSinceRefreshMilliseconds += rawFrameTimeMilliseconds;
    if (this.elapsedSinceRefreshMilliseconds < DIRECTOR_PERFORMANCE_HUD_REFRESH_MILLISECONDS) {
      return;
    }

    this.elapsedSinceRefreshMilliseconds = 0;
    this.refreshVisibleValues();
  }

  layout(viewport: Readonly<ViewportSnapshot>): void {
    if (this.destroyed) {
      return;
    }

    const { performanceHud } = createDirectorResponsiveLayout(viewport);

    this.root.style.left = `${performanceHud.x}px`;
    this.root.style.top = `${performanceHud.y}px`;
    this.root.style.maxWidth = `${performanceHud.width}px`;
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.inputService.setGameplayBlocked(false);
    this.removeControlListeners(this.visibilityButton, this.handleVisibilityClick);
    this.removeControlListeners(this.fpsValue, this.handleFpsLimitClick);
    this.removeControlListeners(this.resetButton, this.handleResetClick);
    this.removeTogglePointerListeners(this.wireframeLabel);
    this.wireframeCheckbox.removeEventListener('change', this.handleWireframeChange);
    this.root.remove();
  }

  private readonly handlePointerDown = (event: Event): void => {
    this.stopControlEvent(event);
    this.inputService.setGameplayBlocked(true);
  };

  private readonly handlePointerRelease = (event: Event): void => {
    this.stopControlEvent(event);
    this.inputService.setGameplayBlocked(false);
  };

  private readonly handleTogglePointerDown = (event: Event): void => {
    event.stopPropagation();
    this.inputService.setGameplayBlocked(true);
  };

  private readonly handleTogglePointerRelease = (event: Event): void => {
    event.stopPropagation();
    this.inputService.setGameplayBlocked(false);
  };

  private readonly handleVisibilityClick = (event: Event): void => {
    this.stopControlEvent(event);
    this.hidden = !this.hidden;
    this.values.hidden = this.hidden;
    this.values.style.display = this.hidden ? 'none' : '';
    this.resetButton.hidden = this.hidden;
    this.visibilityButton.title = this.hidden
      ? 'Show performance values'
      : 'Hide performance values';
    this.visibilityButton.setAttribute('aria-label', this.visibilityButton.title);
    this.visibilityButton.setAttribute('aria-pressed', String(this.hidden));
    this.root.dataset.collapsed = String(this.hidden);

    if (!this.hidden) {
      this.elapsedSinceRefreshMilliseconds = 0;
      this.refreshVisibleValues();
    }
  };

  private readonly handleFpsLimitClick = (event: Event): void => {
    this.stopControlEvent(event);
    this.fpsLimitIndex = (this.fpsLimitIndex + 1) % DIRECTOR_FPS_LIMIT_OPTIONS.length;
    const limit = DIRECTOR_FPS_LIMIT_OPTIONS[this.fpsLimitIndex] ?? 0;
    this.controls?.setFpsLimit(limit);
    this.refreshFpsLimitTitle();
    this.refreshVisibleValues();
  };

  private readonly handleWireframeChange = (event: Event): void => {
    event.stopPropagation();
    this.controls?.setWireframesEnabled(this.wireframeCheckbox.checked);
  };

  private readonly handleResetClick = (event: Event): void => {
    this.stopControlEvent(event);
    this.sampler.reset();
    this.elapsedSinceRefreshMilliseconds = 0;
    this.refreshVisibleValues();
  };

  private addControlListeners(
    element: HTMLElement,
    clickHandler: (event: Event) => void,
  ): void {
    element.addEventListener('pointerdown', this.handlePointerDown);
    element.addEventListener('pointerup', this.handlePointerRelease);
    element.addEventListener('pointercancel', this.handlePointerRelease);
    element.addEventListener('pointerleave', this.handlePointerRelease);
    element.addEventListener('click', clickHandler);
  }

  private removeControlListeners(
    element: HTMLElement,
    clickHandler: (event: Event) => void,
  ): void {
    element.removeEventListener('pointerdown', this.handlePointerDown);
    element.removeEventListener('pointerup', this.handlePointerRelease);
    element.removeEventListener('pointercancel', this.handlePointerRelease);
    element.removeEventListener('pointerleave', this.handlePointerRelease);
    element.removeEventListener('click', clickHandler);
  }

  private addTogglePointerListeners(element: HTMLElement): void {
    element.addEventListener('pointerdown', this.handleTogglePointerDown);
    element.addEventListener('pointerup', this.handleTogglePointerRelease);
    element.addEventListener('pointercancel', this.handleTogglePointerRelease);
    element.addEventListener('pointerleave', this.handleTogglePointerRelease);
  }

  private removeTogglePointerListeners(element: HTMLElement): void {
    element.removeEventListener('pointerdown', this.handleTogglePointerDown);
    element.removeEventListener('pointerup', this.handleTogglePointerRelease);
    element.removeEventListener('pointercancel', this.handleTogglePointerRelease);
    element.removeEventListener('pointerleave', this.handleTogglePointerRelease);
  }

  private stopControlEvent(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
  }

  private refreshFpsLimitTitle(): void {
    const currentLimit = DIRECTOR_FPS_LIMIT_OPTIONS[this.fpsLimitIndex] ?? 0;
    const nextLimit =
      DIRECTOR_FPS_LIMIT_OPTIONS[(this.fpsLimitIndex + 1) % DIRECTOR_FPS_LIMIT_OPTIONS.length] ?? 0;
    this.fpsValue.title = `FPS limit ${formatFpsLimit(currentLimit)}; click for ${formatFpsLimit(nextLimit)}`;
    this.fpsValue.setAttribute('aria-label', this.fpsValue.title);
  }

  private refreshVisibleValues(): void {
    const snapshot = this.sampler.createSnapshot();
    const measuredFps =
      Number.isFinite(this.latestFramesPerSecond) && this.latestFramesPerSecond > 0
        ? `${Math.round(this.latestFramesPerSecond)} FPS`
        : '-- FPS';
    const limit = DIRECTOR_FPS_LIMIT_OPTIONS[this.fpsLimitIndex] ?? 0;

    setTextIfChanged(this.fpsValue, `${measuredFps} [${formatFpsLimit(limit)}]`);
    setTextIfChanged(
      this.frameTimeValue,
      ` | ${formatMilliseconds(snapshot.currentFrameTimeMilliseconds)} ms`,
    );
    setTextIfChanged(this.statisticsValue, this.formatStatistics(snapshot));
    setHealthIfChanged(this.fpsValue, getFpsHealth(this.latestFramesPerSecond));
    setHealthIfChanged(
      this.frameTimeValue,
      getFrameTimeHealth(snapshot.currentFrameTimeMilliseconds),
    );
  }

  private formatStatistics(snapshot: Readonly<PerformanceSnapshot>): string {
    return (
      ` | A ${formatMilliseconds(snapshot.averageFrameTimeMilliseconds)}` +
      ` | P95 ${formatMilliseconds(snapshot.p95FrameTimeMilliseconds)}` +
      ` | P99 ${formatMilliseconds(snapshot.p99FrameTimeMilliseconds)}` +
      ` | M ${formatMilliseconds(snapshot.worstFrameTimeMilliseconds)}` +
      ` | S ${snapshot.slowFrameCount}`
    );
  }
}
