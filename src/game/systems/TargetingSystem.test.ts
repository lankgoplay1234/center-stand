import { describe, expect, it } from 'vitest';
import { calculateTotalTargetCount, selectNearestUniqueTargets, type TargetCandidate } from './TargetingSystem';

describe('target count', () => {
  it('adds base and bonus target counts', () => {
    expect(calculateTotalTargetCount(1, 0)).toBe(1);
    expect(calculateTotalTargetCount(1, 3)).toBe(4);
  });
});

describe('target selection', () => {
  const target = (poolId: number, x: number, y = 0): TargetCandidate => ({ poolId, x, y, isAlive: true });

  it('selects the nearest targets in range', () => {
    const selected = selectNearestUniqueTargets([target(1, 80), target(2, 20), target(3, 45)], 0, 0, 60, 2);
    expect(selected.map((entry) => entry.poolId)).toEqual([2, 3]);
  });

  it('prevents duplicate damage targets in one attack', () => {
    const duplicate = target(7, 10);
    const selected = selectNearestUniqueTargets([duplicate, duplicate, target(8, 20)], 0, 0, 100, 3);
    expect(selected.map((entry) => entry.poolId)).toEqual([7, 8]);
    expect(new Set(selected.map((entry) => entry.poolId)).size).toBe(selected.length);
  });

  it('ignores dead and out-of-range targets', () => {
    const dead = { ...target(1, 5), isAlive: false };
    expect(selectNearestUniqueTargets([dead, target(2, 110)], 0, 0, 100, 2)).toEqual([]);
  });
});
