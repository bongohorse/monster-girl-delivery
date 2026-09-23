import { describe, expect, it, vi } from 'vitest';
import { ViewportService } from '../../src/core/ViewportService';
import { DirectorPerformanceHud } from '../../src/devtools/DirectorPerformanceHud';
import { PerformanceSampler } from '../../src/devtools/PerformanceSampler';
import { InputService } from '../../src/input/InputService';
import { createPrototypeZapperCollisionWorkCounters } from '../../src/systems/HazardCollision';

type FakeEventHandler = (event: Event) => void;

class FakeElement {
  readonly children: FakeElement[] = [];
  readonly dataset: Record<string, string | undefined> = {};
  readonly listeners = new Map<string, Set<FakeEventHandler>>();
  readonly style: Record<string, string> = {};
  checked = false;
  className = '';
  hidden = false;
  removed = false;
  textWriteCount = 0;
  title = '';
  type = '';
  private attributes = new Map<string, string>();
  private text = '';

  constructor(readonly ownerDocument: FakeDocument) {}

  get textContent(): string {
    return this.text;
  }

  set textContent(value: string) {
    this.text = value;
    this.textWriteCount += 1;
  }

  append(...children: FakeElement[]): void {
    this.children.push(...children);
  }

  addEventListener(type: string, handler: FakeEventHandler): void {
    const handlers = this.listeners.get(type) ?? new Set<FakeEventHandler>();
    handlers.add(handler);
    this.listeners.set(type, handlers);
  }

  removeEventListener(type: string, handler: FakeEventHandler): void {
    this.listeners.get(type)?.delete(handler);
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  remove(): void {
    this.removed = true;
  }

  dispatch(type: string) {
    const event = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as Event;

    for (const handler of this.listeners.get(type) ?? []) {
      handler(event);
    }

    return event as Event & {
      preventDefault: ReturnType<typeof vi.fn>;
      stopPropagation: ReturnType<typeof vi.fn>;
    };
  }
}

class FakeDocument {
  readonly elements: FakeElement[] = [];

  createElement(): FakeElement {
    const element = new FakeElement(this);
    this.elements.push(element);
    return element;
  }
}

const createHarness = () => {
  const ownerDocument = new FakeDocument();
  const container = new FakeElement(ownerDocument);
  const input = new InputService();
  const sampler = new PerformanceSampler({ sampleWindowSize: 8 });
  const zapperWorkCounters = createPrototypeZapperCollisionWorkCounters();
  const setFpsLimit = vi.fn();
  const setWireframesEnabled = vi.fn();
  const setGodModeEnabled = vi.fn();
  const setAutoHazardsEnabled = vi.fn();
  const spawnMissile = vi.fn();
  const spawnZapper = vi.fn();
  const spawnZapperGroup = vi.fn();
  const spawnLaser = vi.fn();
  const clearHazards = vi.fn();
  const setSimulationFrozen = vi.fn();
  const triggerDeath = vi.fn();
  const startNormalPerformancePreset = vi.fn();
  const startZapperPerformancePreset = vi.fn();
  const startMemoryEvidenceBenchmark = vi.fn();
  const readMemoryEvidenceProgress = vi.fn<() => number | null>(() => null);
  const resetWorkCounters = vi.fn();
  const readRuntimeMetrics = vi.fn(() => ({
    activeCollectibleCount: 5,
    activeHazardCount: 7,
    broadphaseWork: {
      collectibleCandidateCount: 8,
      collectibleCollisionEvaluationCount: 6,
      collectibleContactResolutionCount: 4,
      collectibleRetainedCount: 50,
      hazardCandidateCount: 10,
      hazardCollisionEvaluationCount: 12,
      hazardRetainedCount: 70,
    },
    laserPresentationCount: 1,
    presentedCollectibleCount: 5,
    presentedHazardCount: 7,
    primitiveHazardPresentationCount: 2,
    sceneGameObjectCount: 12,
    zapperPresentationCount: 4,
  }));
  const exportPerformanceEvidence = vi.fn();
  const hud = new DirectorPerformanceHud(
    container as unknown as HTMLElement,
    input,
    sampler,
    {
      setFpsLimit,
      setWireframesEnabled,
      setGodModeEnabled,
      setAutoHazardsEnabled,
      spawnMissile,
      spawnZapper,
      spawnZapperGroup,
      spawnLaser,
      clearHazards,
      setSimulationFrozen,
      triggerDeath,
      startNormalPerformancePreset,
      startZapperPerformancePreset,
      startMemoryEvidenceBenchmark,
      readMemoryEvidenceProgress,
      readRuntimeMetrics,
      resetWorkCounters,
      exportPerformanceEvidence,
    },
    zapperWorkCounters,
  );
  const root = container.children[0];
  const visibilityButton = root?.children[0];
  const fixedControls = root?.children[1];
  const values = root?.children[2];
  const fpsButton = fixedControls?.children[0];
  const wireframeLabel = fixedControls?.children[1];
  const playgroundControls = fixedControls?.children[2];
  const resetButton = fixedControls?.children[3];
  const evidenceButton = fixedControls?.children[4];
  const zapperWorkValue = values?.children[2];
  const runtimeValue = values?.children[3];
  const benchmarkStatusValue = values?.children[4];
  const wireframeCheckbox = wireframeLabel?.children[0];
  const godModeButton = playgroundControls?.children[0];
  const autoHazardsButton = playgroundControls?.children[1];
  const missileButton = playgroundControls?.children[2];
  const zapperButton = playgroundControls?.children[3];
  const zapperGroupButton = playgroundControls?.children[4];
  const laserButton = playgroundControls?.children[5];
  const clearButton = playgroundControls?.children[6];
  const freezeButton = playgroundControls?.children[7];
  const deathButton = playgroundControls?.children[8];
  const normalPerformanceButton = playgroundControls?.children[9];
  const zapperPerformanceButton = playgroundControls?.children[10];
  const memoryEvidenceButton = playgroundControls?.children[11];

  if (
    !root ||
    !visibilityButton ||
    !fixedControls ||
    !values ||
    !wireframeLabel ||
    !playgroundControls ||
    !resetButton ||
    !evidenceButton ||
    !fpsButton ||
    !zapperWorkValue ||
    !runtimeValue ||
    !benchmarkStatusValue ||
    !wireframeCheckbox ||
    !godModeButton ||
    !autoHazardsButton ||
    !missileButton ||
    !zapperButton ||
    !zapperGroupButton ||
    !laserButton ||
    !clearButton ||
    !freezeButton ||
    !deathButton ||
    !normalPerformanceButton ||
    !zapperPerformanceButton ||
    !memoryEvidenceButton
  ) {
    throw new Error('Expected the Director HUD structure.');
  }

  return {
    autoHazardsButton,
    benchmarkStatusValue,
    clearButton,
    clearHazards,
    container,
    deathButton,
    evidenceButton,
    exportPerformanceEvidence,
    fixedControls,
    fpsButton,
    freezeButton,
    godModeButton,
    hud,
    input,
    laserButton,
    missileButton,
    normalPerformanceButton,
    playgroundControls,
    readMemoryEvidenceProgress,
    readRuntimeMetrics,
    resetButton,
    resetWorkCounters,
    root,
    startMemoryEvidenceBenchmark,
    runtimeValue,
    sampler,
    setAutoHazardsEnabled,
    setFpsLimit,
    setGodModeEnabled,
    setSimulationFrozen,
    setWireframesEnabled,
    spawnLaser,
    spawnMissile,
    spawnZapper,
    spawnZapperGroup,
    startNormalPerformancePreset,
    startZapperPerformancePreset,
    triggerDeath,
    values,
    visibilityButton,
    wireframeCheckbox,
    wireframeLabel,
    zapperButton,
    zapperGroupButton,
    zapperPerformanceButton,
    memoryEvidenceButton,
    zapperWorkCounters,
    zapperWorkValue,
  };
};

const gameStepTimestampByHud = new WeakMap<DirectorPerformanceHud, number>();

const updateHud = (
  hud: DirectorPerformanceHud,
  elapsedMilliseconds: number,
  lifecyclePaused = false,
  discardCurrentSample = false,
): void => {
  if (!gameStepTimestampByHud.has(hud)) {
    gameStepTimestampByHud.set(hud, 0);
    hud.update(0, false);
  }

  const timestamp = (gameStepTimestampByHud.get(hud) ?? 0) + elapsedMilliseconds;
  gameStepTimestampByHud.set(hud, timestamp);
  hud.update(timestamp, lifecyclePaused, discardCurrentSample);
};

describe('DirectorPerformanceHud', () => {
  it('creates one compact DOM row and lays it out inside safe-area bounds', () => {
    const { container, fixedControls, hud, playgroundControls, root, values, wireframeLabel } =
      createHarness();
    const viewport = new ViewportService(844, 390, {
      top: 12,
      right: 44,
      bottom: 0,
      left: 44,
    }).getSnapshot();

    hud.layout(viewport);

    expect(container.children).toHaveLength(1);
    expect(root.className).toBe('director-performance-hud');
    expect(root.style).toMatchObject({ left: '52px', top: '20px', maxWidth: '740px' });
    expect(fixedControls.children).toHaveLength(5);
    expect(values.children).toHaveLength(5);
    expect(wireframeLabel.children).toHaveLength(2);
    expect(playgroundControls.children).toHaveLength(12);
  });

  it('samples every frame but refreshes formatted values at most every 250 ms', () => {
    const { fpsButton, hud, sampler, values } = createHarness();
    const createSnapshot = vi.spyOn(sampler, 'createSnapshot');

    updateHud(hud, 16, false);
    for (let frame = 0; frame < 16; frame += 1) {
      updateHud(hud, 16, false);
    }

    expect(sampler.createSnapshot().sampleCount).toBe(8);
    expect(createSnapshot).toHaveBeenCalledTimes(3);
    expect(fpsButton.textContent).toBe('63 FPS [∞]');
    expect(values.children[0]?.textContent).toBe(' | 16.0 ms');
    expect(values.children[1]?.textContent).toContain('P95 16.0 | P99 16.0');
    expect(fpsButton.dataset.health).toBe('good');
    expect(values.children[0]?.dataset.health).toBe('good');
  });

  it('refreshes authoritative Zapper work only on the existing HUD cadence', () => {
    const { hud, zapperWorkCounters, zapperWorkValue } = createHarness();
    zapperWorkCounters.collisionCallCount = 2;
    zapperWorkCounters.broadphaseRejectedCallCount = 1;
    zapperWorkCounters.candidateSampleCount = 40;
    zapperWorkCounters.evaluatedSampleCount = 30;
    zapperWorkCounters.geometryResolutionCount = 30;
    zapperWorkCounters.primaryNarrowphaseCheckCount = 30;
    zapperWorkCounters.secondaryNarrowphaseCheckCount = 12;

    updateHud(hud, 16, false);
    expect(zapperWorkValue.textContent).toBe(' | Z C 2 B 1 Sm 30/40 G 30 N 30/12');
    const writesAfterRefresh = zapperWorkValue.textWriteCount;

    zapperWorkCounters.evaluatedSampleCount = 99;
    for (let frame = 0; frame < 15; frame += 1) {
      updateHud(hud, 16, false);
    }
    expect(zapperWorkValue.textWriteCount).toBe(writesAfterRefresh);
    expect(zapperWorkValue.textContent).toContain('Sm 30/40');

    updateHud(hud, 16, false);
    expect(zapperWorkValue.textContent).toContain('Sm 99/40');
    expect(zapperWorkValue.textWriteCount).toBe(writesAfterRefresh + 1);
  });

  it('reads and formats runtime counts only on the existing HUD cadence', () => {
    const { hud, readRuntimeMetrics, runtimeValue } = createHarness();
    expect(readRuntimeMetrics).toHaveBeenCalledTimes(1);

    updateHud(hud, 16, false);
    expect(readRuntimeMetrics).toHaveBeenCalledTimes(2);
    expect(runtimeValue.textContent).toBe(
      ' | R H 7/7 C 5/5 P 2 L 1 Z 4 GO 12 | BP H 10/70 E 12 C 8/50 E 6 T 4',
    );

    for (let frame = 0; frame < 15; frame += 1) {
      updateHud(hud, 16, false);
    }
    expect(readRuntimeMetrics).toHaveBeenCalledTimes(2);

    updateHud(hud, 16, false);
    expect(readRuntimeMetrics).toHaveBeenCalledTimes(3);
  });

  it('cycles runtime FPS limits from unlimited through all requested presets', () => {
    const { fpsButton, hud, setFpsLimit } = createHarness();
    updateHud(hud, 16, false);

    for (const expected of [30, 60, 90, 120, 144, 0]) {
      fpsButton.dispatch('click');
      expect(setFpsLimit).toHaveBeenLastCalledWith(expected);
    }

    expect(setFpsLimit.mock.calls.map(([limit]) => limit)).toEqual([30, 60, 90, 120, 144, 0]);
    expect(fpsButton.textContent).toBe('-- FPS [∞]');
  });

  it('derives measured FPS from actual game-step wall-clock intervals', () => {
    const { evidenceButton, exportPerformanceEvidence, hud } = createHarness();

    for (let frame = 0; frame < 8; frame += 1) {
      updateHud(hud, 1000 / 60);
    }
    evidenceButton.dispatch('click');

    expect(exportPerformanceEvidence).toHaveBeenCalledOnce();
    expect(exportPerformanceEvidence.mock.calls[0]?.[1]).toBeCloseTo(60, 9);
  });

  it('uses the specified frame-time and FPS health bands', () => {
    const { fpsButton, hud, values } = createHarness();

    updateHud(hud, 20, false);
    expect(fpsButton.dataset.health).toBe('mild');
    expect(values.children[0]?.dataset.health).toBe('mild');

    for (let frame = 0; frame < 13; frame += 1) {
      updateHud(hud, 30, false);
    }
    expect(fpsButton.dataset.health).toBe('noticeable');
    expect(values.children[0]?.dataset.health).toBe('noticeable');

    for (let frame = 0; frame < 9; frame += 1) {
      updateHud(hud, 60, false);
    }
    expect(fpsButton.dataset.health).toBe('severe');
    expect(values.children[0]?.dataset.health).toBe('severe');
  });

  it('hides values and playground controls together while sampling continues', () => {
    const {
      fixedControls,
      hud,
      playgroundControls,
      resetButton,
      evidenceButton,
      sampler,
      values,
      visibilityButton,
      wireframeLabel,
    } = createHarness();
    updateHud(hud, 16, false);
    const writesBeforeHide = values.children.reduce(
      (total, child) => total + child.textWriteCount,
      0,
    );

    visibilityButton.dispatch('click');
    for (let frame = 0; frame < 20; frame += 1) {
      updateHud(hud, 30, false);
    }

    expect(fixedControls.hidden).toBe(true);
    expect(fixedControls.style.display).toBe('none');
    expect(values.hidden).toBe(true);
    expect(values.style.display).toBe('none');
    expect(wireframeLabel.hidden).toBe(false);
    expect(playgroundControls.hidden).toBe(false);
    expect(resetButton.hidden).toBe(false);
    expect(evidenceButton.hidden).toBe(false);
    expect(sampler.createSnapshot().sampleCount).toBe(8);
    expect(values.children.reduce((total, child) => total + child.textWriteCount, 0)).toBe(
      writesBeforeHide,
    );

    visibilityButton.dispatch('click');
    expect(fixedControls.hidden).toBe(false);
    expect(fixedControls.style.display).toBe('');
    expect(values.hidden).toBe(false);
    expect(values.style.display).toBe('');
    expect(wireframeLabel.hidden).toBe(false);
    expect(playgroundControls.hidden).toBe(false);
    expect(resetButton.hidden).toBe(false);
    expect(evidenceButton.hidden).toBe(false);
    expect(values.children[0]?.textContent).toBe(' | 30.0 ms');
    expect(values.children[1]?.textContent).toContain('S 20');
  });

  it('toggles authoritative wireframe rendering from the compact HB control', () => {
    const { setWireframesEnabled, wireframeCheckbox } = createHarness();

    wireframeCheckbox.checked = true;
    wireframeCheckbox.dispatch('change');
    expect(setWireframesEnabled).toHaveBeenLastCalledWith(true);

    wireframeCheckbox.checked = false;
    wireframeCheckbox.dispatch('change');
    expect(setWireframesEnabled).toHaveBeenLastCalledWith(false);
  });

  it('dispatches compact playground toggles and hazard actions', () => {
    const {
      autoHazardsButton,
      clearButton,
      clearHazards,
      deathButton,
      freezeButton,
      godModeButton,
      laserButton,
      missileButton,
      setAutoHazardsEnabled,
      setGodModeEnabled,
      setSimulationFrozen,
      spawnLaser,
      spawnMissile,
      spawnZapper,
      spawnZapperGroup,
      triggerDeath,
      zapperButton,
      zapperGroupButton,
    } = createHarness();

    expect(autoHazardsButton.getAttribute('aria-pressed')).toBe('true');
    expect(autoHazardsButton.dataset.active).toBe('true');

    godModeButton.dispatch('click');
    expect(setGodModeEnabled).toHaveBeenLastCalledWith(true);
    expect(godModeButton.getAttribute('aria-pressed')).toBe('true');

    autoHazardsButton.dispatch('click');
    expect(setAutoHazardsEnabled).toHaveBeenLastCalledWith(false);
    expect(autoHazardsButton.getAttribute('aria-pressed')).toBe('false');

    missileButton.dispatch('click');
    zapperButton.dispatch('click');
    zapperGroupButton.dispatch('click');
    laserButton.dispatch('click');
    clearButton.dispatch('click');
    expect(spawnMissile).toHaveBeenCalledOnce();
    expect(spawnZapper).toHaveBeenCalledOnce();
    expect(spawnZapperGroup).toHaveBeenCalledOnce();
    expect(spawnLaser).toHaveBeenCalledOnce();
    expect(clearHazards).toHaveBeenCalledOnce();

    freezeButton.dispatch('click');
    expect(setSimulationFrozen).toHaveBeenLastCalledWith(true);
    expect(freezeButton.textContent).toBe('▶');
    freezeButton.dispatch('click');
    expect(setSimulationFrozen).toHaveBeenLastCalledWith(false);
    expect(freezeButton.textContent).toBe('⏸');

    deathButton.dispatch('click');
    expect(triggerDeath).toHaveBeenCalledOnce();
  });

  it('runs the normal preset at 60 FPS and auto-captures the first full sample window', () => {
    const {
      autoHazardsButton,
      benchmarkStatusValue,
      exportPerformanceEvidence,
      freezeButton,
      godModeButton,
      hud,
      normalPerformanceButton,
      sampler,
      setAutoHazardsEnabled,
      setFpsLimit,
      setGodModeEnabled,
      setSimulationFrozen,
      setWireframesEnabled,
      startNormalPerformancePreset,
      wireframeCheckbox,
      zapperWorkCounters,
    } = createHarness();

    updateHud(hud, 30, false);
    zapperWorkCounters.candidateSampleCount = 50;
    autoHazardsButton.dispatch('click');
    wireframeCheckbox.checked = true;
    wireframeCheckbox.dispatch('change');
    freezeButton.dispatch('click');

    normalPerformanceButton.dispatch('click');

    expect(setFpsLimit).toHaveBeenLastCalledWith(60);
    expect(setGodModeEnabled).toHaveBeenLastCalledWith(true);
    expect(setAutoHazardsEnabled).toHaveBeenLastCalledWith(true);
    expect(setSimulationFrozen).toHaveBeenLastCalledWith(false);
    expect(setWireframesEnabled).toHaveBeenLastCalledWith(false);
    expect(startNormalPerformancePreset).toHaveBeenCalledOnce();
    expect(godModeButton.dataset.active).toBe('true');
    expect(autoHazardsButton.dataset.active).toBe('true');
    expect(normalPerformanceButton.dataset.benchmarkState).toBe('running');
    expect(benchmarkStatusValue.textContent).toBe(' | BENCH NP 0/8');
    expect(freezeButton.dataset.active).toBe('false');
    expect(freezeButton.textContent).toBe('⏸');
    expect(wireframeCheckbox.checked).toBe(false);
    expect(sampler.getSampleCount()).toBe(0);
    expect(zapperWorkCounters.candidateSampleCount).toBe(0);

    updateHud(hud, 16, false);
    expect(sampler.getSampleCount()).toBe(0);
    for (let sample = 0; sample < 8; sample += 1) {
      updateHud(hud, 16, false);
    }

    expect(sampler.getSampleCount()).toBe(8);
    expect(normalPerformanceButton.dataset.benchmarkState).toBe('captured');
    expect(benchmarkStatusValue.textContent).toBe(' | BENCH NP 8/8 ✓');
    expect(exportPerformanceEvidence).toHaveBeenCalledOnce();
    expect(exportPerformanceEvidence).toHaveBeenCalledWith(
      expect.objectContaining({ sampleCount: 8, windowCapacity: 8 }),
      62.5,
      60,
      expect.any(Object),
      expect.any(Object),
      { targetSampleCount: 8, trigger: 'auto-window-full' },
    );
  });

  it('runs the Zapper preset at 60 FPS and auto-captures the first full sample window', () => {
    const {
      autoHazardsButton,
      benchmarkStatusValue,
      exportPerformanceEvidence,
      freezeButton,
      godModeButton,
      hud,
      sampler,
      setAutoHazardsEnabled,
      setFpsLimit,
      setGodModeEnabled,
      setSimulationFrozen,
      setWireframesEnabled,
      startZapperPerformancePreset,
      wireframeCheckbox,
      zapperPerformanceButton,
      zapperWorkCounters,
    } = createHarness();

    updateHud(hud, 30, false);
    zapperWorkCounters.candidateSampleCount = 50;
    wireframeCheckbox.checked = true;
    wireframeCheckbox.dispatch('change');
    freezeButton.dispatch('click');

    zapperPerformanceButton.dispatch('click');

    expect(setFpsLimit).toHaveBeenLastCalledWith(60);
    expect(setGodModeEnabled).toHaveBeenLastCalledWith(true);
    expect(setAutoHazardsEnabled).toHaveBeenLastCalledWith(false);
    expect(setSimulationFrozen).toHaveBeenLastCalledWith(false);
    expect(setWireframesEnabled).toHaveBeenLastCalledWith(false);
    expect(startZapperPerformancePreset).toHaveBeenCalledOnce();
    expect(godModeButton.dataset.active).toBe('true');
    expect(autoHazardsButton.dataset.active).toBe('false');
    expect(zapperPerformanceButton.dataset.benchmarkState).toBe('running');
    expect(benchmarkStatusValue.textContent).toBe(' | BENCH ZP 0/8');
    expect(freezeButton.dataset.active).toBe('false');
    expect(freezeButton.textContent).toBe('⏸');
    expect(wireframeCheckbox.checked).toBe(false);
    expect(sampler.getSampleCount()).toBe(0);
    expect(zapperWorkCounters.candidateSampleCount).toBe(0);

    updateHud(hud, 16, false);
    for (let sample = 0; sample < 8; sample += 1) {
      updateHud(hud, 16, false);
    }

    expect(zapperPerformanceButton.dataset.benchmarkState).toBe('captured');
    expect(benchmarkStatusValue.textContent).toBe(' | BENCH ZP 8/8 ✓');
    expect(exportPerformanceEvidence).toHaveBeenCalledOnce();
    expect(exportPerformanceEvidence.mock.calls[0]?.[5]).toEqual({
      targetSampleCount: 8,
      trigger: 'auto-window-full',
    });
  });

  it('starts the 60-second memory evidence preset and reflects progress', () => {
    const {
      autoHazardsButton,
      hud,
      memoryEvidenceButton,
      readMemoryEvidenceProgress,
      setAutoHazardsEnabled,
      setFpsLimit,
      setGodModeEnabled,
      startMemoryEvidenceBenchmark,
    } = createHarness();

    autoHazardsButton.dispatch('click');
    expect(autoHazardsButton.dataset.active).toBe('false');

    readMemoryEvidenceProgress.mockReturnValue(0);
    memoryEvidenceButton.dispatch('click');

    expect(setFpsLimit).toHaveBeenLastCalledWith(60);
    expect(setGodModeEnabled).toHaveBeenLastCalledWith(true);
    expect(setAutoHazardsEnabled).toHaveBeenLastCalledWith(true);
    expect(startMemoryEvidenceBenchmark).toHaveBeenCalledOnce();
    expect(memoryEvidenceButton.dataset.benchmarkState).toBe('running');
    expect(memoryEvidenceButton.textContent).toBe('MEM 0s');

    readMemoryEvidenceProgress.mockReturnValue(0.5);
    for (let frame = 0; frame < 16; frame += 1) {
      updateHud(hud, 16, false);
    }
    expect(memoryEvidenceButton.textContent).toBe('MEM 30s');

    readMemoryEvidenceProgress.mockReturnValue(1);
    for (let frame = 0; frame < 16; frame += 1) {
      updateHud(hud, 16, false);
    }
    expect(memoryEvidenceButton.textContent).toBe('MEM✓');
    expect(memoryEvidenceButton.dataset.benchmarkState).toBe('captured');
  });

  it('cancels automated capture when a manual workload control changes the run', () => {
    const {
      benchmarkStatusValue,
      exportPerformanceEvidence,
      hud,
      missileButton,
      normalPerformanceButton,
      sampler,
    } = createHarness();

    normalPerformanceButton.dispatch('click');
    expect(normalPerformanceButton.dataset.benchmarkState).toBe('running');
    expect(benchmarkStatusValue.hidden).toBe(false);

    missileButton.dispatch('click');

    expect(normalPerformanceButton.dataset.benchmarkState).toBeUndefined();
    expect(benchmarkStatusValue.hidden).toBe(true);

    updateHud(hud, 16, false);
    for (let sample = 0; sample < sampler.getWindowCapacity(); sample += 1) {
      updateHud(hud, 16, false);
    }

    expect(exportPerformanceEvidence).not.toHaveBeenCalled();
  });

  it('blocks gameplay and suppresses DOM control events without queuing thrust', () => {
    const { godModeButton, input, visibilityButton, wireframeLabel } = createHarness();
    input.pressPointer(7, 'touch');

    const down = visibilityButton.dispatch('pointerdown');

    expect(down.preventDefault).toHaveBeenCalledOnce();
    expect(down.stopPropagation).toHaveBeenCalledOnce();
    expect(input.getSnapshot()).toMatchObject({
      activePointerId: null,
      gameplayBlocked: true,
      pointerHeld: false,
      thrustHeld: false,
    });

    const up = visibilityButton.dispatch('pointerup');
    expect(up.preventDefault).toHaveBeenCalledOnce();
    expect(up.stopPropagation).toHaveBeenCalledOnce();
    expect(input.getSnapshot().gameplayBlocked).toBe(false);
    expect(input.consumePrimaryActionPress()).toBe(false);

    wireframeLabel.dispatch('pointerdown');
    expect(input.getSnapshot().gameplayBlocked).toBe(true);
    wireframeLabel.dispatch('pointerup');
    expect(input.getSnapshot().gameplayBlocked).toBe(false);

    godModeButton.dispatch('pointerdown');
    expect(input.getSnapshot().gameplayBlocked).toBe(true);
    godModeButton.dispatch('pointerup');
    expect(input.getSnapshot().gameplayBlocked).toBe(false);
  });

  it('exports one structured snapshot on demand without retaining live counter references', () => {
    const { evidenceButton, exportPerformanceEvidence, hud, zapperWorkCounters } = createHarness();
    updateHud(hud, 16, false);
    zapperWorkCounters.collisionCallCount = 3;
    zapperWorkCounters.candidateSampleCount = 40;
    zapperWorkCounters.evaluatedSampleCount = 12;

    evidenceButton.dispatch('click');

    expect(exportPerformanceEvidence).toHaveBeenCalledOnce();
    expect(exportPerformanceEvidence).toHaveBeenCalledWith(
      expect.objectContaining({
        currentFrameTimeMilliseconds: 16,
        sampleCount: 1,
      }),
      62.5,
      0,
      expect.objectContaining({
        candidateSampleCount: 40,
        collisionCallCount: 3,
        evaluatedSampleCount: 12,
      }),
      expect.objectContaining({
        activeCollectibleCount: 5,
        activeHazardCount: 7,
        broadphaseWork: expect.objectContaining({
          collectibleCandidateCount: 8,
          hazardCandidateCount: 10,
        }),
        sceneGameObjectCount: 12,
      }),
      { targetSampleCount: null, trigger: 'manual' },
    );

    const exportedCounters = exportPerformanceEvidence.mock.calls[0]?.[3] as
      | { evaluatedSampleCount: number }
      | undefined;
    zapperWorkCounters.evaluatedSampleCount = 99;
    expect(exportedCounters?.evaluatedSampleCount).toBe(12);
  });

  it('resets frame metrics and collision work without replacing either owner', () => {
    const {
      hud,
      resetButton,
      resetWorkCounters,
      sampler,
      values,
      zapperWorkCounters,
      zapperWorkValue,
    } = createHarness();
    updateHud(hud, 30, false);
    zapperWorkCounters.collisionCallCount = 4;
    zapperWorkCounters.candidateSampleCount = 80;
    zapperWorkCounters.evaluatedSampleCount = 60;
    zapperWorkCounters.geometryResolutionCount = 60;
    zapperWorkCounters.primaryNarrowphaseCheckCount = 60;
    zapperWorkCounters.secondaryNarrowphaseCheckCount = 20;

    resetButton.dispatch('click');

    expect(sampler.createSnapshot().sampleCount).toBe(0);
    expect(resetWorkCounters).toHaveBeenCalledOnce();
    expect(zapperWorkCounters).toEqual({
      broadphaseRejectedCallCount: 0,
      candidateSampleCount: 0,
      collisionCallCount: 0,
      evaluatedSampleCount: 0,
      geometryResolutionCount: 0,
      primaryNarrowphaseCheckCount: 0,
      secondaryNarrowphaseCheckCount: 0,
    });
    expect(values.children[0]?.textContent).toBe(' | -- ms');
    expect(values.children[1]?.textContent).toContain('M -- | S 0');
    expect(zapperWorkValue.textContent).toBe(' | Z C 0 B 0 Sm 0/0 G 0 N 0/0');
  });

  it('removes its DOM and listeners idempotently on shutdown', () => {
    const harness = createHarness();
    harness.visibilityButton.dispatch('pointerdown');

    harness.hud.destroy();
    harness.hud.destroy();

    expect(harness.root.removed).toBe(true);
    expect(harness.input.getSnapshot().gameplayBlocked).toBe(false);
    for (const element of [
      harness.visibilityButton,
      harness.fpsButton,
      harness.resetButton,
      harness.evidenceButton,
      harness.wireframeLabel,
      harness.wireframeCheckbox,
      harness.godModeButton,
      harness.autoHazardsButton,
      harness.missileButton,
      harness.zapperButton,
      harness.zapperGroupButton,
      harness.laserButton,
      harness.clearButton,
      harness.freezeButton,
      harness.deathButton,
      harness.normalPerformanceButton,
      harness.zapperPerformanceButton,
      harness.memoryEvidenceButton,
    ]) {
      expect([...element.listeners.values()].every((listeners) => listeners.size === 0)).toBe(true);
    }
  });
});
