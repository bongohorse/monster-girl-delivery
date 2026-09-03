import { describe, expect, it } from 'vitest';
import { createPreloaderLayout } from '../../src/game/PreloaderLayout';

describe('Preloader layout', () => {
  it('centers the loading presentation in portrait space', () => {
    expect(createPreloaderLayout(390, 844, 0.5)).toEqual({
      background: { x: 195, y: 422, width: 390, height: 844 },
      frame: { x: 195, y: 422, width: 334, height: 32 },
      fill: { x: 32, y: 422, width: 163, height: 28 },
      progress: 0.5,
    });
  });

  it('caps and centers the loading bar in landscape and wide viewports', () => {
    expect(createPreloaderLayout(844, 390, 0.5)).toMatchObject({
      frame: { x: 422, y: 195, width: 468, height: 32 },
      fill: { x: 192, y: 195, width: 230, height: 28 },
    });
    expect(createPreloaderLayout(1_440, 900, 0.5)).toMatchObject({
      frame: { x: 720, y: 450, width: 468, height: 32 },
      fill: { x: 490, y: 450, width: 230, height: 28 },
    });
  });

  it('preserves the progress proportion across representative resizes', () => {
    const portrait = createPreloaderLayout(390, 844, 0.5);
    const landscape = createPreloaderLayout(844, 390, portrait.progress);

    expect(portrait.fill.width / (portrait.frame.width - 8)).toBeCloseTo(0.5);
    expect(landscape.fill.width / (landscape.frame.width - 8)).toBeCloseTo(0.5);
  });

  it('keeps narrow and invalid viewport dimensions bounded', () => {
    const narrow = createPreloaderLayout(80, 24, 2);

    expect(narrow).toEqual({
      background: { x: 40, y: 12, width: 80, height: 24 },
      frame: { x: 40, y: 12, width: 24, height: 24 },
      fill: { x: 32, y: 12, width: 16, height: 20 },
      progress: 1,
    });

    const invalid = createPreloaderLayout(Number.NaN, -10, Number.NaN);
    expect(invalid).toEqual({
      background: { x: 0, y: 0, width: 0, height: 0 },
      frame: { x: 0, y: 0, width: 0, height: 0 },
      fill: { x: 0, y: 0, width: 0, height: 0 },
      progress: 0,
    });
  });
});
