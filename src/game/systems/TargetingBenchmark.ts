import { SpatialHashIndex } from './SpatialHashIndex';
import { selectNearestUniqueTargets, type TargetCandidate } from './TargetingSystem';

export interface TargetingBenchmarkResult {
  candidateCount: number;
  iterations: number;
  boundedMs: number;
  spatialQueryMs: number;
  spatialRebuildAndQueryMs: number;
  boundedChecksum: number;
  spatialChecksum: number;
}

export function createBenchmarkCandidates(count: number): TargetCandidate[] {
  let seed = 0x5f3759df;
  const random = (): number => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0x1_0000_0000;
  };
  return Array.from({ length: count }, (_, poolId) => ({
    poolId,
    x: -360 + random() * 1440,
    y: -120 + random() * 1520,
    isAlive: true,
  }));
}

export function runTargetingBenchmark(
  candidates: readonly TargetCandidate[],
  iterations: number,
  now: () => number = () => performance.now(),
): TargetingBenchmarkResult {
  const originX = 360;
  const originY = 595;
  const range = 360;
  const targetCount = 10;
  const index = new SpatialHashIndex<TargetCandidate>(160);
  index.rebuild(candidates);

  let boundedChecksum = 0;
  let startedAt = now();
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const selected = selectNearestUniqueTargets(candidates, originX, originY, range, targetCount);
    boundedChecksum += selected[0]?.poolId ?? -1;
  }
  const boundedMs = now() - startedAt;

  let spatialChecksum = 0;
  startedAt = now();
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const nearby = index.queryRadius(originX, originY, range);
    const selected = selectNearestUniqueTargets(nearby, originX, originY, range, targetCount);
    spatialChecksum += selected[0]?.poolId ?? -1;
  }
  const spatialQueryMs = now() - startedAt;

  startedAt = now();
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    index.rebuild(candidates);
    const nearby = index.queryRadius(originX, originY, range);
    selectNearestUniqueTargets(nearby, originX, originY, range, targetCount);
  }
  const spatialRebuildAndQueryMs = now() - startedAt;

  return {
    candidateCount: candidates.length,
    iterations,
    boundedMs,
    spatialQueryMs,
    spatialRebuildAndQueryMs,
    boundedChecksum,
    spatialChecksum,
  };
}
