import type { ViewportSnapshot } from '../core/ViewportService';
import {
  getPrototypeVerticalOffset,
  PROTOTYPE_LOGICAL_PLAYABLE_HEIGHT,
} from './PrototypeFlightLayout';

const BUILDING_SPACING = 128;
const BUILDING_WIDTH = 104;
const BUILDING_HEIGHT_PATTERN = [96, 144, 112, 176] as const;
const BUILDING_REPEAT_WIDTH = BUILDING_SPACING * BUILDING_HEIGHT_PATTERN.length;
const GROUND_HEIGHT = 12;
const GROUND_MARKER_SPACING = 96;
const GROUND_MARKER_WIDTH = 48;

export interface PrototypeWorldBuilding {
  height: number;
  width: number;
  x: number;
  y: number;
}

export interface PrototypeWorldGroundMarker {
  width: number;
  x: number;
}

export interface PrototypeScrollingWorldLayout {
  buildings: readonly PrototypeWorldBuilding[];
  groundMarkers: readonly PrototypeWorldGroundMarker[];
  groundTopY: number;
  height: number;
  width: number;
}

/** Maps forward run distance to a repeating left-moving presentation offset. */
export const getWrappedScrollOffset = (distance: number, repeatWidth: number): number => {
  if (!Number.isFinite(distance)) {
    throw new RangeError('distance must be finite.');
  }
  if (!Number.isFinite(repeatWidth) || repeatWidth <= 0) {
    throw new RangeError('repeatWidth must be a positive finite number.');
  }

  const positiveRemainder = ((distance % repeatWidth) + repeatWidth) % repeatWidth;
  return positiveRemainder === 0 ? 0 : -positiveRemainder;
};

const sanitizeExtent = (value: number): number => (Number.isFinite(value) ? Math.max(0, value) : 0);

/** Creates temporary skyline and ground geometry without owning run-progress state. */
export const createPrototypeScrollingWorldLayout = (
  viewport: Pick<ViewportSnapshot, 'height' | 'safeArea' | 'width'>,
  distance: number,
): PrototypeScrollingWorldLayout => {
  const width = sanitizeExtent(viewport.width);
  const height = sanitizeExtent(viewport.height);
  const safeTop = Math.min(height, sanitizeExtent(viewport.safeArea.top));
  const verticalOffset = getPrototypeVerticalOffset(viewport);
  const logicalGroundTopY = PROTOTYPE_LOGICAL_PLAYABLE_HEIGHT - GROUND_HEIGHT;
  const groundTopY = Math.max(safeTop, Math.min(height, verticalOffset + logicalGroundTopY));
  const availableBuildingHeight = Math.max(0, groundTopY - safeTop);
  const buildings: PrototypeWorldBuilding[] = [];
  const groundMarkers: PrototypeWorldGroundMarker[] = [];

  if (width > 0 && availableBuildingHeight > 0) {
    const buildingOffset = getWrappedScrollOffset(distance, BUILDING_REPEAT_WIDTH);
    const buildingCount = Math.ceil((width + BUILDING_REPEAT_WIDTH) / BUILDING_SPACING) + 1;

    for (let index = 0; index < buildingCount; index += 1) {
      const buildingHeight = Math.min(
        BUILDING_HEIGHT_PATTERN[index % BUILDING_HEIGHT_PATTERN.length] ?? 0,
        availableBuildingHeight,
      );

      buildings.push({
        x: buildingOffset + index * BUILDING_SPACING,
        y: groundTopY - buildingHeight,
        width: BUILDING_WIDTH,
        height: buildingHeight,
      });
    }

    const markerOffset = getWrappedScrollOffset(distance, GROUND_MARKER_SPACING);
    const markerCount = Math.ceil((width + GROUND_MARKER_SPACING) / GROUND_MARKER_SPACING) + 1;

    for (let index = 0; index < markerCount; index += 1) {
      groundMarkers.push({
        x: markerOffset + index * GROUND_MARKER_SPACING,
        width: GROUND_MARKER_WIDTH,
      });
    }
  }

  return { buildings, groundMarkers, groundTopY, height, width };
};
