export interface PrototypeBroadphaseWorkCounters {
  collectibleCandidateCount: number;
  collectibleCollisionEvaluationCount: number;
  collectibleContactResolutionCount: number;
  collectibleRetainedCount: number;
  hazardCandidateCount: number;
  hazardCollisionEvaluationCount: number;
  hazardRetainedCount: number;
}

export const createPrototypeBroadphaseWorkCounters = (): PrototypeBroadphaseWorkCounters => ({
  collectibleCandidateCount: 0,
  collectibleCollisionEvaluationCount: 0,
  collectibleContactResolutionCount: 0,
  collectibleRetainedCount: 0,
  hazardCandidateCount: 0,
  hazardCollisionEvaluationCount: 0,
  hazardRetainedCount: 0,
});

export const resetPrototypeBroadphaseWorkCounters = (
  counters: PrototypeBroadphaseWorkCounters,
): void => {
  counters.collectibleCandidateCount = 0;
  counters.collectibleCollisionEvaluationCount = 0;
  counters.collectibleContactResolutionCount = 0;
  counters.collectibleRetainedCount = 0;
  counters.hazardCandidateCount = 0;
  counters.hazardCollisionEvaluationCount = 0;
  counters.hazardRetainedCount = 0;
};
