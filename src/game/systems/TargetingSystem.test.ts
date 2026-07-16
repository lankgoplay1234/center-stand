import { describe, expect, it } from 'vitest';
import {
  calculateTotalTargetCount,
  selectNearestUniqueTargets,
  selectNearestUniqueTargetsInCone,
  type TargetCandidate,
} from './TargetingSystem';

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

describe('cone target selection', () => {
  const target = (poolId: number, x: number, y = 0): TargetCandidate => ({ poolId, x, y, isAlive: true });

  it('selects nearest targets within the cone and exempts ultra-close targets', () => {
    // 플레이어 위치는 (0, 0), 가장 가까운 몹 1번은 (20, 0)이므로 조준 벡터는 우측(0도)
    // 90도 전방 포화는 우측 기준 +/- 45도
    // target(2, 40, 10) -> 거리 ~41.2, 각도 ~14도 (콘 내부)
    // target(3, 0, 100) -> 거리 100, 각도 90도 (콘 외부) -> 각도 체크로 제외
    // target(4, 0, 30) -> 거리 30, 각도 90도 (콘 외부) -> 32px 이하 초근접으로 구제
    const candidates = [
      target(1, 20, 0),
      target(2, 40, 10),
      target(3, 0, 100),
      target(4, 0, 30),
    ];

    const selected = selectNearestUniqueTargetsInCone(candidates, 0, 0, 120, 90, 4);
    const selectedIds = selected.map((entry) => entry.poolId);

    expect(selectedIds).toContain(1);
    expect(selectedIds).toContain(2);
    expect(selectedIds).toContain(4);
    expect(selectedIds).not.toContain(3);
  });
});
