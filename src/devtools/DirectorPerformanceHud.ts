import type { ViewportSnapshot } from '../core/ViewportService';
import type { InputService } from '../input/InputService';
import {
  type PrototypeZapperCollisionWorkCounters,
  resetPrototypeZapperCollisionWorkCounters,
} from '../systems/HazardCollision';
import { createDirectorResponsiveLayout } from './DirectorResponsiveLayout';
import { PerformanceSampler, type PerformanceSnapshot } from './PerformanceSampler';

export const DIRECTOR_PERFORMANCE_HUD_REFRESH_MILLISECONDS = 250;
export const DIRECTOR_FPS_LIMIT_OPTIONS = Object.freeze([0, 30, 60, 90, 120, 144] as const);

export interface DirectorPerformanceHudControls {
  readonly setFpsLimit: (limit: number) => void;
  readonly setWireframesEnabled: (enabled: boolean) => void;
  readonly setGodModeEnabled?: (enabled: boolean) => void;
  readonly setAutoHazardsEnabled?: (enabled: boolean) => void;
  readonly spawnMissile?: () => void;
  readonly spawnZapper?: () => void;
  readonly spawnZapperGroup?: () => void;
  readonly spawnLaser?: () => void;
  readonly clearHazards?: () => void;
  readonly setSimulationFrozen?: (frozen: boolean) => void;
  readonly triggerDeath?: () => void;
  readonly exportPerformanceEvidence?: (
    snapshot: Readonly<PerformanceSnapshot>,
    framesPerSecond: number,
    fpsLimit: number,
    zapperWork?: Readonly<PrototypeZapperCollisionWorkCounters>,
  ) => void;
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

/** Low-frequency DOM presentation for the pure raw frame-time sampler and Director playground. */
export class DirectorPerformanceHud {
  private readonly root: HTMLDivElement;
  private readonly visibilityButton: HTMLButtonElement;
  private readonly values: HTMLSpanElement;
  private readonly fpsValue: HTMLButtonElement;
  private readonly frameTimeValue: HTMLSpanElement;
  private readonly statisticsValue: HTMLSpanElement;
  private readonly zapperWorkValue: HTMLSpanElement;
  private readonly wireframeLabel: HTMLLabelElement;
  private readonly wireframeCheckbox: HTMLInputElement;
  private readonly playgroundControls: HTMLSpanElement;
  private readonly godModeButton: HTMLButtonElement;
  private readonly autoHazardsButton: HTMLButtonElement;
  private readonly missileButton: HTMLButtonElement;
  private readonly zapperButton: HTMLButtonElement;
  private readonly zapperGroupButton: HTMLButtonElement;
  private readonly laserButton: HTMLButtonElement;
  private readonly clearButton: HTMLButtonElement;
  private readonly freezeButton: HTMLButtonElement;
  private readonly deathButton: HTMLButtonElement;
  private readonly resetButton: HTMLButtonElement;
  private readonly evidenceButton: HTMLButtonElement;
  private destroyed = false;
  private elapsedSinceRefreshMilliseconds = Number.POSITIVE_INFINITY;
  private fpsLimitIndex = 0;
  private hidden = false;
  private latestFramesPerSecond = 0;
  private godModeEnabled = false;
  private autoHazardsEnabled = true;
  private simulationFrozen = false;

  constructor(
    container: HTMLElement,
    private readonly inputService: InputService,
    private readonly sampler: PerformanceSampler = new PerformanceSampler(),
    private readonly controls?: Readonly<DirectorPerformanceHudControls>,
    private readonly zapperCollisionWorkCounters?: PrototypeZapperCollisionWorkCounters,
  ) {
    const ownerDocument = container.ownerDocument;
    this.root = ownerDocument.createElement('div');
    this.root.className = 'director-performance-hud';
    this.root.setAttribute('role', 'group');
    this.root.setAttribute('aria-label', 'Director performance monitor and playground controls');

    this.visibilityButton = ownerDocument.createElement('button');
    this.visibilityButton.className = 'director-performance-hud__button';
    this.visibilityButton.type = 'button';
    this.visibilityButton.textContent = '👁';
    this.visibilityButton.title = 'Hide Director values and controls';
    this.visibilityButton.setAttribute('aria-label', 'Hide Director values and controls');
    this.visibilityButton.setAttribute('aria-pressed', 'false');

    this.values = ownerDocument.createElement('span');
    this.values.className = 'director-performance-hud__values';
    this.fpsValue = ownerDocument.createElement('button');
    this.fpsValue.className = 'director-performance-hud__button director-performance-hud__fps';
    this.fpsValue.type = 'button';
    this.frameTimeValue = ownerDocument.createElement('span');
    this.statisticsValue = ownerDocument.createElement('span');
    this.zapperWorkValue = ownerDocument.createElement('span');
    this.zapperWorkValue.hidden = this.zapperCollisionWorkCounters === undefined;
    this.zapperWorkValue.title =
      'Zapper work: calls, broadphase rejects, evaluated/candidate samples, geometry resolutions, core/Graze narrowphase checks';
    this.values.append(
      this.fpsValue,
      this.frameTimeValue,
      this.statisticsValue,
      this.zapperWorkValue,
    );

    this.wireframeLabel = ownerDocument.createElement('label');
    this.wireframeLabel.className = 'director-performance-hud__toggle';
    this.wireframeLabel.title = 'Show collision and gameplay wireframes';
    this.wireframeCheckbox = ownerDocument.createElement('input');
    this.wireframeCheckbox.type = 'checkbox';
    this.wireframeCheckbox.setAttribute('aria-label', 'Show collision and gameplay wireframes');
    const wireframeText = ownerDocument.createElement('span');
    wireframeText.textContent = 'HB';
    this.wireframeLabel.append(this.wireframeCheckbox, wireframeText);

    this.playgroundControls = ownerDocument.createElement('span');
    this.playgroundControls.className = 'director-performance-hud__playground';
    this.godModeButton = this.createButton(
      ownerDocument,
      'GOD',
      'Godmode: survive lethal hazard contact',
    );
    this.autoHazardsButton = this.createButton(
      ownerDocument,
      'AUTO',
      'Automatic encounter generation',
    );
    this.missileButton = this.createButton(ownerDocument, 'M', 'Spawn Missile');
    this.zapperButton = this.createButton(
      ownerDocument,
      'Z',
      'Spawn next deterministic Zapper variant',
    );
    this.zapperGroupButton = this.createButton(
      ownerDocument,
      'ZG',
      'Spawn next deterministic Zapper test group',
    );
    this.laserButton = this.createButton(ownerDocument, 'L', 'Spawn Timed Laser');
    this.clearButton = this.createButton(ownerDocument, 'CLR', 'Clear active test hazards');
    this.freezeButton = this.createButton(ownerDocument, '⏸', 'Freeze gameplay simulation');
    this.deathButton = this.createButton(
      ownerDocument,
      '☠',
      'Trigger normal death / fail-state flow',
    );
    this.playgroundControls.append(
      this.godModeButton,
      this.autoHazardsButton,
      this.missileButton,
      this.zapperButton,
      this.zapperGroupButton,
      this.laserButton,
      this.clearButton,
      this.freezeButton,
      this.deathButton,
    );
    this.setToggleState(this.godModeButton, false);
    this.setToggleState(this.autoHazardsButton, true);
    this.setToggleState(this.freezeButton, false);

    this.resetButton = ownerDocument.createElement('button');
    this.resetButton.className = 'director-performance-hud__button';
    this.resetButton.type = 'button';
    this.resetButton.textContent = '↻';
    this.resetButton.title = 'Reset performance statistics and Zapper work counters';
    this.resetButton.setAttribute(
      'aria-label',
      'Reset performance statistics and Zapper work counters',
    );

    this.evidenceButton = this.createButton(
      ownerDocument,
      'CP',
      'Copy structured performance evidence JSON',
    );

    this.root.append(
      this.visibilityButton,
      this.values,
      this.wireframeLabel,
      this.playgroundControls,
      this.resetButton,
      this.evidenceButton,
    );
    container.append(this.root);

    this.addControlListeners(this.visibilityButton, this.handleVisibilityClick);
    this.addControlListeners(this.fpsValue, this.handleFpsLimitClick);
    this.addControlListeners(this.godModeButton, this.handleGodModeClick);
    this.addControlListeners(this.autoHazardsButton, this.handleAutoHazardsClick);
    this.addControlListeners(this.missileButton, this.handleMissileClick);
    this.addControlListeners(this.zapperButton, this.handleZapperClick);
    this.addControlListeners(this.zapperGroupButton, this.handleZapperGroupClick);
    this.addControlListeners(this.laserButton, this.handleLaserClick);
    this.addControlListeners(this.clearButton, this.handleClearClick);
    this.addControlListeners(this.freezeButton, this.handleFreezeClick);
    this.addControlListeners(this.deathButton, this.handleDeathClick);
    this.addControlListeners(this.resetButton, this.handleResetClick);
    this.addControlListeners(this.evidenceButton, this.handleEvidenceClick);
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
    this.removeControlListeners(this.godModeButton, this.handleGodModeClick);
    this.removeControlListeners(this.autoHazardsButton, this.handleAutoHazardsClick);
    this.removeControlListeners(this.missileButton, this.handleMissileClick);
    this.removeControlListeners(this.zapperButton, this.handleZapperClick);
    this.removeControlListeners(this.zapperGroupButton, this.handleZapperGroupClick);
    this.removeControlListeners(this.laserButton, this.handleLaserClick);
    this.removeControlListeners(this.clearButton, this.handleClearClick);
    this.removeControlListeners(this.freezeButton, this.handleFreezeClick);
    this.removeControlListeners(this.deathButton, this.handleDeathClick);
    this.removeControlListeners(this.resetButton, this.handleResetClick);
    this.removeControlListeners(this.evidenceButton, this.handleEvidenceClick);
    this.removeTogglePointerListeners(this.wireframeLabel);
    this.wireframeCheckbox.removeEventListener('change', this.handleWireframeChange);
    this.root.remove();
  }

  private createButton(document: Document, label: string, title: string): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = 'director-performance-hud__button';
    button.type = 'button';
    button.textContent = label;
    button.title = title;
    button.setAttribute('aria-label', title);
    return button;
  }

  private setToggleState(button: HTMLButtonElement, active: boolean): void {
    button.dataset.active = String(active);
    button.setAttribute('aria-pressed', String(active));
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
    this.wireframeLabel.hidden = this.hidden;
    this.playgroundControls.hidden = this.hidden;
    this.resetButton.hidden = this.hidden;
    this.evidenceButton.hidden = this.hidden;
    this.visibilityButton.title = this.hidden
      ? 'Show Director values and controls'
      : 'Hide Director values and controls';
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

  private readonly handleGodModeClick = (event: Event): void => {
    this.stopControlEvent(event);
    this.godModeEnabled = !this.godModeEnabled;
    this.setToggleState(this.godModeButton, this.godModeEnabled);
    this.controls?.setGodModeEnabled?.(this.godModeEnabled);
  };

  private readonly handleAutoHazardsClick = (event: Event): void => {
    this.stopControlEvent(event);
    this.autoHazardsEnabled = !this.autoHazardsEnabled;
    this.setToggleState(this.autoHazardsButton, this.autoHazardsEnabled);
    this.controls?.setAutoHazardsEnabled?.(this.autoHazardsEnabled);
  };

  private readonly handleMissileClick = (event: Event): void => {
    this.stopControlEvent(event);
    this.controls?.spawnMissile?.();
  };

  private readonly handleZapperClick = (event: Event): void => {
    this.stopControlEvent(event);
    this.controls?.spawnZapper?.();
  };

  private readonly handleZapperGroupClick = (event: Event): void => {
    this.stopControlEvent(event);
    this.controls?.spawnZapperGroup?.();
  };

  private readonly handleLaserClick = (event: Event): void => {
    this.stopControlEvent(event);
    this.controls?.spawnLaser?.();
  };

  private readonly handleClearClick = (event: Event): void => {
    this.stopControlEvent(event);
    this.controls?.clearHazards?.();
  };

  private readonly handleFreezeClick = (event: Event): void => {
    this.stopControlEvent(event);
    this.simulationFrozen = !this.simulationFrozen;
    this.setToggleState(this.freezeButton, this.simulationFrozen);
    this.freezeButton.textContent = this.simulationFrozen ? '▶' : '⏸';
    this.freezeButton.title = this.simulationFrozen
      ? 'Resume gameplay simulation'
      : 'Freeze gameplay simulation';
    this.freezeButton.setAttribute('aria-label', this.freezeButton.title);
    this.controls?.setSimulationFrozen?.(this.simulationFrozen);
  };

  private readonly handleDeathClick = (event: Event): void => {
    this.stopControlEvent(event);
    this.controls?.triggerDeath?.();
  };

  private readonly handleResetClick = (event: Event): void => {
    this.stopControlEvent(event);
    this.sampler.reset();
    if (this.zapperCollisionWorkCounters) {
      resetPrototypeZapperCollisionWorkCounters(this.zapperCollisionWorkCounters);
    }
    this.elapsedSinceRefreshMilliseconds = 0;
    this.refreshVisibleValues();
  };

  private readonly handleEvidenceClick = (event: Event): void => {
    this.stopControlEvent(event);
    const limit = DIRECTOR_FPS_LIMIT_OPTIONS[this.fpsLimitIndex] ?? 0;
    const zapperWork = this.zapperCollisionWorkCounters
      ? Object.freeze({ ...this.zapperCollisionWorkCounters })
      : undefined;
    this.controls?.exportPerformanceEvidence?.(
      this.sampler.createSnapshot(),
      this.latestFramesPerSecond,
      limit,
      zapperWork,
    );
  };

  private addControlListeners(element: HTMLElement, clickHandler: (event: Event) => void): void {
    element.addEventListener('pointerdown', this.handlePointerDown);
    element.addEventListener('pointerup', this.handlePointerRelease);
    element.addEventListener('pointercancel', this.handlePointerRelease);
    element.addEventListener('pointerleave', this.handlePointerRelease);
    element.addEventListener('click', clickHandler);
  }

  private removeControlListeners(element: HTMLElement, clickHandler: (event: Event) => void): void {
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
    if (this.zapperCollisionWorkCounters) {
      setTextIfChanged(
        this.zapperWorkValue,
        this.formatZapperWorkCounters(this.zapperCollisionWorkCounters),
      );
    }
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

  private formatZapperWorkCounters(
    counters: Readonly<PrototypeZapperCollisionWorkCounters>,
  ): string {
    return (
      ` | Z C ${counters.collisionCallCount}` +
      ` B ${counters.broadphaseRejectedCallCount}` +
      ` Sm ${counters.evaluatedSampleCount}/${counters.candidateSampleCount}` +
      ` G ${counters.geometryResolutionCount}` +
      ` N ${counters.primaryNarrowphaseCheckCount}/${counters.secondaryNarrowphaseCheckCount}`
    );
  }
}
