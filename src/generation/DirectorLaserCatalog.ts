import type { HazardPattern } from './HazardPattern';
import {
  PROTOTYPE_LASER_LANE_PATTERNS,
  PROTOTYPE_LASER_LANES,
  type PrototypeLaserLaneId,
} from './PrototypeLaserLaneCatalog';

export interface DirectorLaserSelection {
  readonly label: 'LOW' | 'ML' | 'MID' | 'MH' | 'HIGH';
  readonly laneId: PrototypeLaserLaneId;
  readonly pattern: Readonly<HazardPattern>;
}

/**
 * Director `L` walks the reachable horizontal lane set deterministically. Vertical screen-span
 * support remains data-only until an encounter can make it meaningful for the player's route.
 */
export const DIRECTOR_LASER_VARIANTS: ReadonlyArray<Readonly<DirectorLaserSelection>> =
  Object.freeze(
    PROTOTYPE_LASER_LANES.map((lane, index) => {
      const pattern = PROTOTYPE_LASER_LANE_PATTERNS[index];
      if (!pattern) {
        throw new RangeError('Director Laser lane catalog is incomplete.');
      }
      return Object.freeze({ label: lane.label, laneId: lane.id, pattern });
    }),
  );
