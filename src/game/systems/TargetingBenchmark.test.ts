import { describe, expect, it } from 'vitest';
import { SpatialHashIndex } from './SpatialHashIndex';
import { createBenchmarkCandidates, runTargetingBenchmark } from './TargetingBenchmark';
import { selectNearestUniqueTargets, type TargetCandidate } from './TargetingSystem';

describe('spatial hash targeting prototype', () => {
  it('returns the same nearest unique targets as the bounded selector', () => {
    const candidates = createBenchmarkCandidates(300);
    const index = new SpatialHashIndex<TargetCandidate>(160);
    index.rebuild(candidates);
    const bounded = selectNearestUniqueTargets(candidates, 360, 595, 360, 10);
    const spatial = selectNearestUniqueTargets(index.queryRadius(360, 595, 360), 360, 595, 360, 10);
    expect(spatial.map(({ poolId }) => poolId)).toEqual(bounded.map(({ poolId }) => poolId));
  });

  it('benchmarks 300 moving candidates without changing selection results', () => {
    const result = runTargetingBenchmark(createBenchmarkCandidates(300), 2_000);
    expect(result.candidateCount).toBe(300);
    expect(result.boundedChecksum).toBe(result.spatialChecksum);
    expect(result.boundedMs).toBeGreaterThan(0);
    expect(result.spatialQueryMs).toBeGreaterThan(0);
    expect(result.spatialRebuildAndQueryMs).toBeGreaterThan(0);
    console.info('[targeting benchmark]', JSON.stringify(result));
  });

  it('rejects invalid cell sizes', () => {
    expect(() => new SpatialHashIndex<TargetCandidate>(0)).toThrow('cellSize must be positive');
  });
});
