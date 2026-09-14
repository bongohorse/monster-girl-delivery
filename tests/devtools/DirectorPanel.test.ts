import type { Scene } from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import { ViewportService } from '../../src/core/ViewportService';
import { DirectorEncounterDiagnostics } from '../../src/devtools/DirectorEncounterDiagnostics';
import { DirectorPanel, fitDirectorDiagnosticLines } from '../../src/devtools/DirectorPanel';
import { createGeneratedHazardStream } from '../../src/generation/GeneratedHazardStream';
import { PROTOTYPE_LIVE_ENCOUNTER_POLICY_CONFIG } from '../../src/generation/LiveEncounterPolicy';
import { PROTOTYPE_M4_HAZARD_PATTERN_FIXTURES } from '../../src/generation/PrototypeHazardPatternFixtures';
import { createTelegraphedHazardSimulationState } from '../../src/hazards/TelegraphedHazardSimulation';
import { InputService } from '../../src/input/InputService';

type Handler = (...args: unknown[]) => void;
const objectFake = () => {
  const handlers = new Map<string, Handler>();
  const object = {
    handlers,
    destroy: vi.fn(),
    on: vi.fn((name: string, handler: Handler) => {
      handlers.set(name, handler);
      return object;
    }),
    setDepth: vi.fn(),
    setOrigin: vi.fn(),
    setPosition: vi.fn(),
    setScrollFactor: vi.fn(),
    setSize: vi.fn(),
    setText: vi.fn(),
    setFixedSize: vi.fn(),
    setInteractive: vi.fn(),
  };
  for (const method of [
    object.setDepth,
    object.setOrigin,
    object.setPosition,
    object.setScrollFactor,
    object.setSize,
    object.setText,
    object.setFixedSize,
    object.setInteractive,
  ])
    method.mockReturnValue(object);
  return object;
};
const setup = () => {
  const background = objectFake(),
    text = objectFake(),
    button = objectFake();
  const canvas = new EventTarget();
  const pageLifecycle = new EventTarget();
  const events = { on: vi.fn(), off: vi.fn() };
  const scene = {
    add: {
      rectangle: () => background,
      text: vi.fn().mockReturnValueOnce(text).mockReturnValueOnce(button),
    },
    game: { canvas, events },
  } as unknown as Scene;
  const input = new InputService();
  const panel = new DirectorPanel(scene, input, pageLifecycle);
  const stream = createGeneratedHazardStream(
    3433278918,
    {
      catalog: PROTOTYPE_M4_HAZARD_PATTERN_FIXTURES,
      policy: PROTOTYPE_LIVE_ENCOUNTER_POLICY_CONFIG,
    },
    { baseScrollSpeed: 350 },
  );
  const viewport = new ViewportService(844, 390).getSnapshot();
  const refresh = (delta = 16) =>
    panel.update(
      delta,
      viewport,
      input.getSnapshot(),
      { paused: false, pauseReasons: [] },
      stream,
      createTelegraphedHazardSimulationState(),
    );
  const click = (id = 1) => {
    button.handlers.get('pointerdown')?.({ id }, 0, 0, { stopPropagation: vi.fn() });
    button.handlers.get('pointerup')?.({ id }, 0, 0, { stopPropagation: vi.fn() });
  };
  return {
    panel,
    input,
    canvas,
    pageLifecycle,
    events,
    background,
    text,
    button,
    refresh,
    click,
    viewport,
  };
};
describe('DirectorPanel', () => {
  it('displays authoritative values and gates formatting to 4 Hz and visible pages', () => {
    const { panel, text, button, refresh, click, viewport } = setup();
    const format = vi.spyOn(DirectorEncounterDiagnostics.prototype, 'lines');
    panel.layout(viewport);
    refresh();
    expect(text.setText).toHaveBeenCalledWith(
      expect.arrayContaining(['Seed: 3433278918', 'Applied speed: 350.00', 'Pacing: breather / 0']),
    );
    expect(button.setText).toHaveBeenLastCalledWith('M5 Run 1/8 ›');
    refresh(100);
    expect(format).toHaveBeenCalledTimes(1);
    refresh(150);
    expect(format).toHaveBeenCalledTimes(2);
    for (let i = 0; i < 7; i++) click();
    refresh(1000);
    expect(format).toHaveBeenCalledTimes(2);
    click();
    refresh();
    expect(format).toHaveBeenCalledTimes(3);
    format.mockRestore();
    panel.destroy();
  });
  it('blocks thrust and changes pages only for a completed matching pointer', () => {
    const { panel, input, button, click } = setup();
    input.pressPointer(9, 'touch');
    input.setSpaceHeld(true);
    const stop = vi.fn();
    button.handlers.get('pointerdown')?.({ id: 1 }, 0, 0, { stopPropagation: stop });
    expect(input.isThrustHeld()).toBe(false);
    expect(input.getSnapshot().gameplayBlocked).toBe(true);
    button.handlers.get('pointerup')?.({ id: 2 }, 0, 0, { stopPropagation: stop });
    expect(input.getSnapshot().gameplayBlocked).toBe(true);
    button.handlers.get('pointerup')?.({ id: 1 }, 0, 0, { stopPropagation: stop });
    expect(button.setText).toHaveBeenLastCalledWith('M5 Encounters 2/8 ›');
    expect(input.isThrustHeld()).toBe(false);
    expect(input.consumePrimaryActionPress()).toBe(false);
    expect(stop).toHaveBeenCalledTimes(3);
    click();
    panel.destroy();
  });
  it('cancels on pointer cancellation, resize, blur, hidden, and pagehide and owns cleanup', () => {
    const {
      panel,
      input,
      button,
      canvas,
      pageLifecycle,
      events,
      viewport,
      background,
      text,
      refresh,
    } = setup();
    const press = () =>
      button.handlers.get('pointerdown')?.({ id: 1 }, 0, 0, { stopPropagation: vi.fn() });
    const gameEventHandler = (name: string): Handler | undefined =>
      events.on.mock.calls.find(([eventName]) => eventName === name)?.[1];

    press();
    canvas.dispatchEvent(new Event('pointercancel'));
    expect(input.getSnapshot().gameplayBlocked).toBe(false);
    press();
    panel.layout(viewport);
    expect(input.getSnapshot().gameplayBlocked).toBe(false);
    press();
    gameEventHandler('blur')?.();
    expect(input.getSnapshot().gameplayBlocked).toBe(false);
    press();
    gameEventHandler('hidden')?.();
    expect(input.getSnapshot().gameplayBlocked).toBe(false);
    press();
    pageLifecycle.dispatchEvent(new Event('pagehide'));
    expect(input.getSnapshot().gameplayBlocked).toBe(false);
    input.pressPointer(7, 'touch');
    expect(input.isThrustHeld()).toBe(true);
    input.releaseAll();
    press();
    panel.destroy();
    panel.destroy();
    refresh();
    expect(input.getSnapshot().gameplayBlocked).toBe(false);
    expect(events.off).toHaveBeenCalledWith('blur', gameEventHandler('blur'));
    expect(events.off).toHaveBeenCalledWith('hidden', gameEventHandler('hidden'));
    expect(button.destroy).toHaveBeenCalledOnce();
    expect(text.destroy).toHaveBeenCalledOnce();
    expect(background.destroy).toHaveBeenCalledOnce();
  });
  it.each([
    [640, 360],
    [844, 390],
    [1280, 720],
  ])('keeps eight diagnostic rows inside the existing %s × %s layout', (width, height) => {
    const { panel, button, text } = setup();
    const viewport = new ViewportService(width, height).getSnapshot();
    panel.layout(viewport);
    const [buttonWidth] = button.setFixedSize.mock.calls[0] ?? [];
    const rows = fitDirectorDiagnosticLines(Array(8).fill('A'.repeat(100)), buttonWidth);
    expect(rows).toHaveLength(8);
    expect(rows.every((row) => row.length * 6.6 <= buttonWidth)).toBe(true);
    const y = text.setPosition.mock.calls[0]?.[1];
    expect(y + 8 * 13).toBeLessThan(208);
    panel.destroy();
  });
});
