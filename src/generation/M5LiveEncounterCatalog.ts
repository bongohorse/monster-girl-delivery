import type { HazardPattern } from './HazardPattern';
import { M5_AUTHORED_PRESSURE_ENCOUNTER_SEGMENTS } from './M5AuthoredPressureEncounterSegments';
import {
  M5_SEGMENT_LASER_HIGH,
  M5_SEGMENT_ZAPPER_DIAGONAL_LOWER,
  M5_SEGMENT_ZAPPER_HORIZONTAL_UPPER,
  M5_SEGMENT_ZAPPER_ROTATING_UPPER,
  M5_SEGMENT_ZAPPER_TIMED_CENTER,
  M5_SEGMENT_ZAPPER_VERTICAL_UPPER,
} from './M5AuthoredSingleEncounterSegments';

/**
 * M5 AUTO vocabulary accepted by the gameplay-feel gate.
 *
 * Every entry is an authored decision segment with its own variety-family identity. The authored
 * Missile remains intentionally absent until its longer lifecycle can coexist with mandatory
 * breather boundaries without weakening the readability authority.
 */
export const M5_LIVE_SINGLE_ENCOUNTER_SEGMENTS: ReadonlyArray<Readonly<HazardPattern>> =
  Object.freeze([
    M5_SEGMENT_ZAPPER_HORIZONTAL_UPPER,
    M5_SEGMENT_ZAPPER_DIAGONAL_LOWER,
    M5_SEGMENT_ZAPPER_ROTATING_UPPER,
    M5_SEGMENT_ZAPPER_VERTICAL_UPPER,
    M5_SEGMENT_ZAPPER_TIMED_CENTER,
    M5_SEGMENT_LASER_HIGH,
  ]);

export const PROTOTYPE_M5_LIVE_HAZARD_PATTERN_CATALOG: ReadonlyArray<Readonly<HazardPattern>> =
  Object.freeze([
    ...M5_LIVE_SINGLE_ENCOUNTER_SEGMENTS,
    ...M5_AUTHORED_PRESSURE_ENCOUNTER_SEGMENTS,
  ]);
