import { describe, expect, it } from 'vitest';
import {
  createBitmapCollectiblePaths,
  createGridCollectiblePaths,
  createSineCollectiblePath,
  createUniformPolylineCollectiblePath,
} from '../../src/generation/CollectibleFormationGenerator';

const distancesBetweenPoints = (
  points: ReadonlyArray<Readonly<{ runDistance: number; y: number }>>,
): number[] =>
  points.slice(1).map((point, index) => {
    const previous = points[index];
    if (!previous) {
      throw new Error('Missing previous collectible point.');
    }
    return Math.hypot(point.runDistance - previous.runDistance, point.y - previous.y);
  });

describe('CollectibleFormationGenerator', () => {
  it('resamples an authored climb with nearly equal visual coin-to-coin distance', () => {
    const path = createUniformPolylineCollectiblePath({
      id: 'uniform-climb',
      intent: 'safe-guide',
      spacing: 32,
      controlPoints: [
        { runDistance: 0, y: 200 },
        { runDistance: 100, y: 100 },
        { runDistance: 220, y: 100 },
      ],
    });

    const distances = distancesBetweenPoints(path.points);
    const average = distances.reduce((sum, distance) => sum + distance, 0) / distances.length;
    expect(path.points.length).toBeGreaterThan(6);
    expect(Math.max(...distances) - Math.min(...distances)).toBeLessThan(2);
    expect(average).toBeGreaterThan(28);
    expect(average).toBeLessThan(36);
  });

  it('creates perfectly aligned dense multi-row blocks', () => {
    const paths = createGridCollectiblePaths({
      id: 'three-by-ten',
      intent: 'safe-guide',
      columns: 10,
      rows: 3,
      columnSpacing: 32,
      rowSpacing: 24,
      startRunDistance: 40,
      centerY: 195,
    });

    expect(paths).toHaveLength(3);
    expect(paths.map((path) => path.points.length)).toEqual([10, 10, 10]);
    expect(paths.map((path) => path.points[0]?.y)).toEqual([171, 195, 219]);
    for (const path of paths) {
      expect(path.points.map((point) => point.runDistance)).toEqual(
        Array.from({ length: 10 }, (_, index) => 40 + index * 32),
      );
    }
  });

  it('arc-length-resamples sine waves so curved sections do not bunch coins', () => {
    const path = createSineCollectiblePath({
      id: 'sine',
      intent: 'safe-guide',
      startRunDistance: 0,
      endRunDistance: 640,
      centerY: 195,
      amplitudeY: 35,
      cycles: 2,
      spacing: 32,
    });

    const distances = distancesBetweenPoints(path.points);
    const average = distances.reduce((sum, distance) => sum + distance, 0) / distances.length;
    expect(path.points[0]?.y).toBeCloseTo(195);
    expect(path.points.at(-1)?.y).toBeCloseTo(195);
    expect(Math.max(...distances) - Math.min(...distances)).toBeLessThan(1.5);
    expect(average).toBeGreaterThan(28);
    expect(average).toBeLessThan(36);
  });

  it('turns deterministic ASCII art into dense reward rows suitable for text and shapes', () => {
    const first = createBitmapCollectiblePaths({
      id: 'heart',
      intent: 'safe-guide',
      bitmap: ['##.##', '#####', '.###.'],
      cellSpacingX: 16,
      cellSpacingY: 14,
      originRunDistance: 100,
      originY: 160,
    });
    const second = createBitmapCollectiblePaths({
      id: 'heart',
      intent: 'safe-guide',
      bitmap: ['##.##', '#####', '.###.'],
      cellSpacingX: 16,
      cellSpacingY: 14,
      originRunDistance: 100,
      originY: 160,
    });

    expect(first).toEqual(second);
    expect(first).toHaveLength(3);
    expect(first[0]?.points.map((point) => point.runDistance)).toEqual([100, 116, 148, 164]);
    expect(first.map((path) => path.points[0]?.y)).toEqual([160, 174, 188]);
  });
});
