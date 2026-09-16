import type { HazardPattern } from './HazardPattern';
import {
  PROTOTYPE_LASER_PATTERN,
  PROTOTYPE_VERTICAL_LASER_PATTERN,
} from './PrototypeHazardPatternFixtures';

export interface DirectorLaserSelection {
  readonly label: 'H' | 'V';
  readonly pattern: Readonly<HazardPattern>;
}

export const DIRECTOR_LASER_VARIANTS: ReadonlyArray<Readonly<DirectorLaserSelection>> =
  Object.freeze([
    Object.freeze({ label: 'H', pattern: PROTOTYPE_LASER_PATTERN }),
    Object.freeze({ label: 'V', pattern: PROTOTYPE_VERTICAL_LASER_PATTERN }),
  ]);
