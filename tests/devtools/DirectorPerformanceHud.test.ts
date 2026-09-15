import { describe, expect, it, vi } from 'vitest';
import { ViewportService } from '../../src/core/ViewportService';
import { DirectorPerformanceHud } from '../../src/devtools/DirectorPerformanceHud';
import { PerformanceSampler } from '../../src/devtools/PerformanceSampler';
import { InputService } from '../../src/input/InputService';

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
  const setFpsLimit = vi.fn();
  const setWireframesEnabled = vi.fn();
  const setGodModeEnabled = vi.fn();
  const setAutoHazardsEnabled = vi.fn();
  const spawnMissile = vi.fn();
  const spawnZapper = vi.fn();
  const spawnLaser = vi.fn();
  const clearHazards = vi.fn();
  const setSimulationFrozen = vi.fn();
  const triggerDeath = vi.fn();
  const hud = new DirectorPerformanceHud(container as unknown as HTMLElement, input, sampler, {
    setFpsLimit,
    setWireframesEnabled,
    setGodModeEnabled,
    setAutoHazardsEnabled,
    spawnMissile,
    spawnZapper,
    spawnLaser,
    clearHazards,
    setSimulationFrozen,
    triggerDeath,
  });
  const root = container.children[0];
  const visibilityButton = root?.children[0];
  const values = root?.children[1];
  const wireframeLabel = root?.children[2];
  const playgroundControls = root?.children[3];
  const resetButton = root?.children[4];
  const fpsButton = values?.children[0];
  const wireframeCheckbox = wireframeLabel?.children[0];
  const godModeButton = playgroundControls?.children[0];
  const autoHazardsButton = playgroundControls?.children[1];
  const missileButton = playgroundControls?.children[2];
  const zapperButton = playgroundControls?.children[3];
  const laserButton = playgroundControls?.children[4];
  const clearButton = playgroundControls?.children[5];
  const freezeButton = playgroundControls?.children[6];
  const deathButton = playgroundControls?.children[7];

  if (
    !root ||
    !visibilityButton ||
    !values ||
    !wireframeLabel ||
    !playgroundControls ||
    !resetButton ||
    !fpsButton ||
    !wireframeCheckbox ||
    !godModeButton ||
    !autoHazardsButton ||
    !missileButton ||
    !zapperButton ||
    !laserButton ||
    !clearButton ||
    !freezeButton ||
    !deathButton
  ) {
    throw new Error('Expected the Director HUD structure.');
  }

  return {
    autoHazardsButton,
    clearButton,
    clearHazards,
    container,
    deathButton,
    fpsButton,
    freezeButton,
    godModeButton,
    hud,
    input,
    laserButton,
    missileButton,
    playgroundControls,
    resetButton,
    root,
    sampler,
    setAutoHazardsEnabled,
    setFpsLimit,
    setGodModeEnabled,
    setSimulationFrozen,
    setWireframesEnabled,
    spawnLaser,
    spawnMissile,
    spawnZapper,
    triggerDeath,
    values,
    visibilityButton,
    wireframeCheckbox,
    wireframeLabel,
    zapperButton,
  };
};

describe('DirectorPerformanceHud', () => {
  it('creates one compact DOM row and lays it out inside safe-area bounds', () => {
    const { container, hud, playgroundControls, root, values, wireframeLabel } = createHarness();
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
    expect(values.children).toHaveLength(3);
    expect(wireframeLabel.children).toHaveLength(2);
    expect(playgroundControls.children).toHaveLength(8);
  });

  it('samples every frame but refreshes formatted values at most every 250 ms', () => {
    const { hud, sampler, values } = createHarness();
    const createSnapshot = vi.spyOn(sampler, 'createSnapshot');

    hud.update(16, 59.6, false);
    for (let frame = 0; frame < 16; frame += 1) {
      hud.update(16, 59.6, false);
    }

    expect(sampler.createSnapshot().sampleCount).toBe(8);
    expect(createSnapshot).toHaveBeenCalledTimes(3);
    expect(values.children[0]?.textContent).toBe('60 FPS [∞]');
    expect(values.children[1]?.textContent).toBe(' | 16.0 ms');
    expect(values.children[2]?.textContent).toContain('P95 16.0 | P99 16.0');
    expect(values.children[0]?.dataset.health).toBe('good');
    expect(values.children[1]?.dataset.health).toBe('good');
  });

  it('cycles runtime FPS limits from unlimited through all requested presets', () => {
    const { fpsButton, hud, setFpsLimit } = createHarness();
    hud.update(16, 58.7, false);

    for (const expected of [30, 60, 90, 120, 144, 0]) {
      fpsButton.dispatch('click');
      expect(setFpsLimit).toHaveBeenLastCalledWith(expected);
    }

    expect(setFpsLimit.mock.calls.map(([limit]) => limit)).toEqual([30, 60, 90, 120, 144, 0]);
    expect(fpsButton.textContent).toBe('59 FPS [∞]');
  });

  it('uses the specified frame-time and FPS health bands', () => {
    const { hud, values } = createHarness();

    hud.update(20, 50, false);
    expect(values.children[0]?.dataset.health).toBe('mild');
    expect(values.children[1]?.dataset.health).toBe('mild');

    for (let frame = 0; frame < 13; frame += 1) {
      hud.update(30, 30, false);
    }
    expect(values.children[0]?.dataset.health).toBe('noticeable');
    expect(values.children[1]?.dataset.health).toBe('noticeable');

    for (let frame = 0; frame < 9; frame += 1) {
      hud.update(60, 10, false);
    }
    expect(values.children[0]?.dataset.health).toBe('severe');
    expect(values.children[1]?.dataset.health).toBe('severe');
  });

  it('hides values and playground controls together while sampling continues', () => {
    const {
      hud,
      playgroundControls,
      resetButton,
      sampler,
      values,
      visibilityButton,
      wireframeLabel,
    } = createHarness();
    hud.update(16, 60, false);
    const writesBeforeHide = values.children.reduce(
      (total, child) => total + child.textWriteCount,
      0,
    );

    visibilityButton.dispatch('click');
    for (let frame = 0; frame < 20; frame += 1) {
      hud.update(30, 30, false);
    }

    expect(values.hidden).toBe(true);
    expect(values.style.display).toBe('none');
    expect(wireframeLabel.hidden).toBe(true);
    expect(playgroundControls.hidden).toBe(true);
    expect(resetButton.hidden).toBe(true);
    expect(sampler.createSnapshot().sampleCount).toBe(8);
    expect(values.children.reduce((total, child) => total + child.textWriteCount, 0)).toBe(
      writesBeforeHide,
    );

    visibilityButton.dispatch('click');
    expect(values.hidden).toBe(false);
    expect(values.style.display).toBe('');
    expect(wireframeLabel.hidden).toBe(false);
    expect(playgroundControls.hidden).toBe(false);
    expect(resetButton.hidden).toBe(false);
    expect(values.children[1]?.textContent).toBe(' | 30.0 ms');
    expect(values.children[2]?.textContent).toContain('S 20');
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
      triggerDeath,
      zapperButton,
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
    laserButton.dispatch('click');
    clearButton.dispatch('click');
    expect(spawnMissile).toHaveBeenCalledOnce();
    expect(spawnZapper).toHaveBeenCalledOnce();
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

  it('resets visible metrics without restarting or replacing the sampler', () => {
    const { hud, resetButton, sampler, values } = createHarness();
    hud.update(30, 45, false);

    resetButton.dispatch('click');

    expect(sampler.createSnapshot().sampleCount).toBe(0);
    expect(values.children[1]?.textContent).toBe(' | -- ms');
    expect(values.children[2]?.textContent).toContain('M -- | S 0');
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
      harness.wireframeLabel,
      harness.wireframeCheckbox,
      harness.godModeButton,
      harness.autoHazardsButton,
      harness.missileButton,
      harness.zapperButton,
      harness.laserButton,
      harness.clearButton,
      harness.freezeButton,
      harness.deathButton,
    ]) {
      expect([...element.listeners.values()].every((listeners) => listeners.size === 0)).toBe(true);
    }
  });
});
