import type { CollectiblePath, CollectiblePathIntent, CollectiblePathPoint } from './HazardPattern';

export const M5_DENSE_COIN_SPACING = 32;

interface PathIdentity {
  readonly id: string;
  readonly intent: CollectiblePathIntent;
}

interface UniformPolylineOptions extends PathIdentity {
  readonly controlPoints: ReadonlyArray<Readonly<CollectiblePathPoint>>;
  readonly spacing: number;
}

interface SinePathOptions extends PathIdentity {
  readonly amplitudeY: number;
  readonly centerY: number;
  readonly cycles: number;
  readonly endRunDistance: number;
  readonly phaseRadians?: number;
  readonly spacing: number;
  readonly startRunDistance: number;
}

interface GridOptions extends PathIdentity {
  readonly columns: number;
  readonly columnSpacing: number;
  readonly centerY: number;
  readonly rowSpacing: number;
  readonly rows: number;
  readonly startRunDistance: number;
}

interface BitmapOptions extends PathIdentity {
  readonly bitmap: ReadonlyArray<string>;
  readonly cellSpacingX: number;
  readonly cellSpacingY: number;
  readonly originRunDistance: number;
  readonly originY: number;
}

const assertPositiveFinite = (value: number, name: string): void => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive finite number.`);
  }
};

const assertFinite = (value: number, name: string): void => {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be finite.`);
  }
};

const assertMonotonicPoints = (points: ReadonlyArray<Readonly<CollectiblePathPoint>>): void => {
  if (points.length < 2) {
    throw new RangeError('Collectible formation source must contain at least two points.');
  }

  let previousRunDistance = Number.NEGATIVE_INFINITY;
  for (const point of points) {
    assertFinite(point.runDistance, 'Collectible formation run distance');
    assertFinite(point.y, 'Collectible formation Y');
    if (point.runDistance <= previousRunDistance) {
      throw new RangeError('Collectible formation run distance must increase strictly.');
    }
    previousRunDistance = point.runDistance;
  }
};

const resamplePolyline = (
  points: ReadonlyArray<Readonly<CollectiblePathPoint>>,
  spacing: number,
): ReadonlyArray<Readonly<CollectiblePathPoint>> => {
  assertMonotonicPoints(points);
  assertPositiveFinite(spacing, 'Collectible formation spacing');

  const cumulativeDistances = [0];
  let totalDistance = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    if (!previous || !current) {
      continue;
    }
    totalDistance += Math.hypot(current.runDistance - previous.runDistance, current.y - previous.y);
    cumulativeDistances.push(totalDistance);
  }

  if (totalDistance <= 0) {
    throw new RangeError('Collectible formation source must have positive path length.');
  }

  const intervalCount = Math.max(1, Math.round(totalDistance / spacing));
  const result: Array<Readonly<CollectiblePathPoint>> = [];
  let segmentIndex = 1;

  for (let intervalIndex = 0; intervalIndex <= intervalCount; intervalIndex += 1) {
    const targetDistance = (totalDistance * intervalIndex) / intervalCount;
    while (
      segmentIndex < cumulativeDistances.length - 1 &&
      (cumulativeDistances[segmentIndex] ?? Number.POSITIVE_INFINITY) < targetDistance
    ) {
      segmentIndex += 1;
    }

    const segmentEndDistance = cumulativeDistances[segmentIndex];
    const segmentStartDistance = cumulativeDistances[segmentIndex - 1];
    const start = points[segmentIndex - 1];
    const end = points[segmentIndex];
    if (segmentEndDistance === undefined || segmentStartDistance === undefined || !start || !end) {
      throw new Error('Collectible formation resampling lost its source segment.');
    }

    const segmentLength = segmentEndDistance - segmentStartDistance;
    const progress =
      segmentLength <= 0 ? 0 : (targetDistance - segmentStartDistance) / segmentLength;
    result.push(
      Object.freeze({
        runDistance: start.runDistance + (end.runDistance - start.runDistance) * progress,
        y: start.y + (end.y - start.y) * progress,
      }),
    );
  }

  return Object.freeze(result);
};

/**
 * Turns an authored monotonic route into coins with visually even distance along the actual path,
 * instead of uneven X-only spacing when the route climbs or descends.
 */
export const createUniformPolylineCollectiblePath = (
  options: Readonly<UniformPolylineOptions>,
): Readonly<CollectiblePath> =>
  Object.freeze({
    id: options.id,
    intent: options.intent,
    points: resamplePolyline(options.controlPoints, options.spacing),
  });

/** Creates a deterministic sine route and then arc-length-resamples it for even coin spacing. */
export const createSineCollectiblePath = (
  options: Readonly<SinePathOptions>,
): Readonly<CollectiblePath> => {
  assertFinite(options.startRunDistance, 'Sine start run distance');
  assertFinite(options.endRunDistance, 'Sine end run distance');
  assertFinite(options.centerY, 'Sine center Y');
  assertFinite(options.amplitudeY, 'Sine amplitude');
  assertPositiveFinite(options.cycles, 'Sine cycles');
  assertPositiveFinite(options.spacing, 'Sine spacing');
  if (options.endRunDistance <= options.startRunDistance) {
    throw new RangeError('Sine end run distance must be greater than its start.');
  }

  const phase = options.phaseRadians ?? 0;
  assertFinite(phase, 'Sine phase');
  const horizontalSpan = options.endRunDistance - options.startRunDistance;
  const sampleCount = Math.max(64, Math.ceil(horizontalSpan / 4));
  const samples = Array.from({ length: sampleCount + 1 }, (_, index) => {
    const progress = index / sampleCount;
    return Object.freeze({
      runDistance: options.startRunDistance + horizontalSpan * progress,
      y:
        options.centerY +
        Math.sin(phase + progress * Math.PI * 2 * options.cycles) * options.amplitudeY,
    });
  });

  return createUniformPolylineCollectiblePath({
    id: options.id,
    intent: options.intent,
    controlPoints: samples,
    spacing: options.spacing,
  });
};

/** Creates parallel, perfectly aligned horizontal rows such as a 3x10 reward block. */
export const createGridCollectiblePaths = (
  options: Readonly<GridOptions>,
): ReadonlyArray<Readonly<CollectiblePath>> => {
  if (!Number.isInteger(options.columns) || options.columns < 2) {
    throw new RangeError('Collectible grid columns must be an integer of at least 2.');
  }
  if (!Number.isInteger(options.rows) || options.rows < 1) {
    throw new RangeError('Collectible grid rows must be a positive integer.');
  }
  assertPositiveFinite(options.columnSpacing, 'Collectible grid column spacing');
  assertPositiveFinite(options.rowSpacing, 'Collectible grid row spacing');
  assertFinite(options.startRunDistance, 'Collectible grid start run distance');
  assertFinite(options.centerY, 'Collectible grid center Y');

  return Object.freeze(
    Array.from({ length: options.rows }, (_, rowIndex) => {
      const rowOffset = (rowIndex - (options.rows - 1) / 2) * options.rowSpacing;
      return Object.freeze({
        id: `${options.id}-row-${rowIndex + 1}`,
        intent: options.intent,
        points: Object.freeze(
          Array.from({ length: options.columns }, (_, columnIndex) =>
            Object.freeze({
              runDistance: options.startRunDistance + columnIndex * options.columnSpacing,
              y: options.centerY + rowOffset,
            }),
          ),
        ),
      });
    }),
  );
};

/**
 * Converts an authored ASCII bitmap into horizontal coin rows. This is intentionally data-only: it
 * is suitable for hearts, stars, or text-like reward formations without introducing an editor.
 */
export const createBitmapCollectiblePaths = (
  options: Readonly<BitmapOptions>,
): ReadonlyArray<Readonly<CollectiblePath>> => {
  if (options.bitmap.length === 0) {
    throw new RangeError('Collectible bitmap must contain at least one row.');
  }
  assertPositiveFinite(options.cellSpacingX, 'Collectible bitmap X spacing');
  assertPositiveFinite(options.cellSpacingY, 'Collectible bitmap Y spacing');
  assertFinite(options.originRunDistance, 'Collectible bitmap origin run distance');
  assertFinite(options.originY, 'Collectible bitmap origin Y');

  const width = options.bitmap[0]?.length ?? 0;
  if (width === 0 || options.bitmap.some((row) => row.length !== width)) {
    throw new RangeError('Collectible bitmap rows must have one shared non-zero width.');
  }

  const paths: Array<Readonly<CollectiblePath>> = [];
  options.bitmap.forEach((row, rowIndex) => {
    const activeColumns = [...row].flatMap((cell, columnIndex) =>
      cell === '#' ? [columnIndex] : [],
    );
    if (activeColumns.length === 0) {
      return;
    }
    if (activeColumns.length < 2) {
      throw new RangeError(
        'Every non-empty collectible bitmap row must contain at least two coins.',
      );
    }

    paths.push(
      Object.freeze({
        id: `${options.id}-row-${rowIndex + 1}`,
        intent: options.intent,
        points: Object.freeze(
          activeColumns.map((columnIndex) =>
            Object.freeze({
              runDistance: options.originRunDistance + columnIndex * options.cellSpacingX,
              y: options.originY + rowIndex * options.cellSpacingY,
            }),
          ),
        ),
      }),
    );
  });

  if (paths.length === 0) {
    throw new RangeError('Collectible bitmap must contain at least one active row.');
  }
  return Object.freeze(paths);
};
