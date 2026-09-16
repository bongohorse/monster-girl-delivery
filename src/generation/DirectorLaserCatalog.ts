import type { HazardPattern } from './HazardPattern';
import { PROTOTYPE_LASER_PATTERN } from './PrototypeHazardPatternFixtures';

export interface DirectorLaserSelection {
  readonly label: 'H';
  readonly pattern: Readonly<HazardPattern>;
}

/**
 * M5 Director playtesting currently exposes only the horizontal screen-spanning Laser. The vertical
 * data/presentation support remains available for future encounter designs that can actually route
 * the player through its lane, but it is intentionally not selectable yet.
 */
export const DIRECTOR_LASER_VARIANTS: ReadonlyArray<Readonly<DirectorLaserSelection>> =
  Object.freeze([Object.freeze({ label: 'H', pattern: PROTOTYPE_LASER_PATTERN })]);
