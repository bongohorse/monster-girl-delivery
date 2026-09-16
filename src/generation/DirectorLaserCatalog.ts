import type { HazardPattern } from './HazardPattern';
import {
  PROTOTYPE_LASER_GROUP_PATTERNS,
  PROTOTYPE_LASER_GROUPS,
  PROTOTYPE_LASER_LANE_PATTERNS,
  PROTOTYPE_LASER_LANES,
  type PrototypeLaserGroupId,
  type PrototypeLaserLaneId,
} from './PrototypeLaserLaneCatalog';

export interface DirectorLaserSelection {
  readonly groupId?: PrototypeLaserGroupId;
  readonly label:
    | 'LOW'
    | 'ML'
    | 'MID'
    | 'MH'
    | 'HIGH'
    | 'G-LOW'
    | 'G-HIGH'
    | 'G-MID'
    | 'SW-DN'
    | 'SW-UP'
    | 'ALT';
  readonly laneId?: PrototypeLaserLaneId;
  readonly pattern: Readonly<HazardPattern>;
}

const laneVariants: ReadonlyArray<Readonly<DirectorLaserSelection>> = PROTOTYPE_LASER_LANES.map(
  (lane, index) => {
    const pattern = PROTOTYPE_LASER_LANE_PATTERNS[index];
    if (!pattern) {
      throw new RangeError('Director Laser lane catalog is incomplete.');
    }
    return Object.freeze({ label: lane.label, laneId: lane.id, pattern });
  },
);

const groupVariants: ReadonlyArray<Readonly<DirectorLaserSelection>> = PROTOTYPE_LASER_GROUPS.map(
  (group, index) => {
    const pattern = PROTOTYPE_LASER_GROUP_PATTERNS[index];
    if (!pattern) {
      throw new RangeError('Director Laser group catalog is incomplete.');
    }
    return Object.freeze({ groupId: group.id, label: group.label, pattern });
  },
);

/**
 * Director `L` first walks the five single lanes, then the authored simultaneous/staggered group
 * patterns. `CLR`/restart still resets the shared cycle to LOW through Foundation's existing index.
 */
export const DIRECTOR_LASER_VARIANTS: ReadonlyArray<Readonly<DirectorLaserSelection>> =
  Object.freeze([...laneVariants, ...groupVariants]);
