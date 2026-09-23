import { describe, expect, it } from 'vitest';
import { InputService } from '../../src/input/InputService';

describe('InputService', () => {
  it('tracks one active pointer by identity', () => {
    const input = new InputService();

    input.pressPointer(4, 'touch');
    input.pressPointer(8, 'touch');
    input.releasePointer(8);

    expect(input.getSnapshot()).toMatchObject({
      activePointerId: 4,
      pointerHeld: true,
      pointerSource: 'touch',
      thrustHeld: true,
    });

    input.releasePointer(4);
    expect(input.isThrustHeld()).toBe(false);
  });

  it('handles pointer cancellation for the active pointer', () => {
    const input = new InputService();

    input.pressPointer(2, 'touch');
    input.cancelPointer(2);

    expect(input.getSnapshot().activePointerId).toBeNull();
    expect(input.isThrustHeld()).toBe(false);
  });

  it('combines mouse and Space into the same intent', () => {
    const input = new InputService();

    input.pressPointer(0, 'mouse');
    input.setSpaceHeld(true);
    input.releasePointer(0);

    expect(input.isThrustHeld()).toBe(true);

    input.setSpaceHeld(false);
    expect(input.isThrustHeld()).toBe(false);
  });

  it('exposes fresh primary presses once and clears stale presses with input ownership', () => {
    const input = new InputService();

    input.pressPointer(3, 'touch');
    expect(input.consumePrimaryActionPress()).toBe(true);
    expect(input.consumePrimaryActionPress()).toBe(false);

    input.releasePointer(3);
    input.setSpaceHeld(true);
    input.releaseAll();

    expect(input.consumePrimaryActionPress()).toBe(false);
    expect(input.isThrustHeld()).toBe(false);
  });

  it('reports the source of a fresh primary action exactly once', () => {
    const input = new InputService();

    input.pressPointer(3, 'touch');
    expect(input.consumePrimaryActionPressSource()).toBe('touch');
    expect(input.consumePrimaryActionPressSource()).toBeNull();

    input.releasePointer(3);
    input.setSpaceHeld(true);
    expect(input.consumePrimaryActionPressSource()).toBe('keyboard');
    expect(input.consumePrimaryActionPress()).toBe(false);
  });

  it('clears input when blocked and ignores presses that start while blocked', () => {
    const input = new InputService();

    input.pressPointer(1, 'touch');
    input.setSpaceHeld(true);
    input.setGameplayBlocked(true);

    expect(input.getSnapshot()).toMatchObject({
      activePointerId: null,
      gameplayBlocked: true,
      spaceHeld: false,
      thrustHeld: false,
    });

    input.pressPointer(2, 'touch');
    input.setSpaceHeld(true);
    input.setGameplayBlocked(false);
    expect(input.isThrustHeld()).toBe(false);

    input.pressPointer(3, 'touch');
    expect(input.isThrustHeld()).toBe(true);
  });

  it('releases every source during lifecycle interruptions', () => {
    const input = new InputService();

    input.pressPointer(7, 'touch');
    input.setSpaceHeld(true);
    input.releaseAll();

    expect(input.getSnapshot()).toMatchObject({
      activePointerId: null,
      pointerHeld: false,
      spaceHeld: false,
      thrustHeld: false,
    });
  });
});
