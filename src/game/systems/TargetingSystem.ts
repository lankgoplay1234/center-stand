export interface TargetCandidate {
  readonly poolId: number;
  x: number;
  y: number;
  isAlive: boolean;
}

export function calculateTotalTargetCount(baseTargetCount: number, bonusTargetCount: number): number {
  return Math.max(1, Math.floor(baseTargetCount) + Math.max(0, Math.floor(bonusTargetCount)));
}

/**
 * 작은 크기의 정렬된 후보 목록만 유지하는 O(n*k) 선택기입니다.
 * 전체 적 배열을 복사해 정렬하지 않아, 대량 적 상황에서 할당을 줄입니다.
 */
export function selectNearestUniqueTargets<T extends TargetCandidate>(
  candidates: readonly T[],
  originX: number,
  originY: number,
  range: number,
  targetCount: number,
): T[] {
  const limit = Math.max(0, Math.floor(targetCount));
  if (limit === 0) return [];
  const rangeSquared = range * range;
  const selected: Array<{ target: T; distanceSquared: number }> = [];
  const seen = new Set<number>();

  for (const target of candidates) {
    if (!target.isAlive || seen.has(target.poolId)) continue;
    const dx = target.x - originX;
    const dy = target.y - originY;
    const distanceSquared = dx * dx + dy * dy;
    if (distanceSquared > rangeSquared) continue;

    let insertAt = selected.length;
    while (insertAt > 0 && selected[insertAt - 1]!.distanceSquared > distanceSquared) insertAt -= 1;
    if (insertAt < limit) {
      selected.splice(insertAt, 0, { target, distanceSquared });
      seen.add(target.poolId);
      if (selected.length > limit) {
        const removed = selected.pop();
        if (removed) seen.delete(removed.target.poolId);
      }
    }
  }
  return selected.map((entry) => entry.target);
}

/** 정렬이 필요 없는 범위 공격용 선택기입니다. */
export function selectAllUniqueTargetsInRange<T extends TargetCandidate>(
  candidates: readonly T[],
  originX: number,
  originY: number,
  range: number,
): T[] {
  const rangeSquared = range * range;
  const selected: T[] = [];
  const seen = new Set<number>();

  for (const target of candidates) {
    if (!target.isAlive || seen.has(target.poolId)) continue;
    const dx = target.x - originX;
    const dy = target.y - originY;
    if (dx * dx + dy * dy > rangeSquared) continue;
    seen.add(target.poolId);
    selected.push(target);
  }
  return selected;
}

export function selectNearestUniqueTargetsInCone<T extends TargetCandidate>(
  candidates: readonly T[],
  originX: number,
  originY: number,
  range: number,
  arcDegrees: number,
  targetCount: number | null = null,
): T[] {
  const first = selectNearestUniqueTargets(candidates, originX, originY, range, 1)[0];
  if (!first) return [];
  const aimX = first.x - originX;
  const aimY = first.y - originY;
  const aimLength = Math.sqrt(aimX * aimX + aimY * aimY) || 1;
  const unitAimX = aimX / aimLength;
  const unitAimY = aimY / aimLength;
  const halfRadians = Math.min(360, Math.max(0, arcDegrees)) * Math.PI / 360;
  const minimumDot = Math.cos(halfRadians);
  const rangeSquared = range * range;
  const limit = targetCount === null ? Number.POSITIVE_INFINITY : Math.max(0, Math.floor(targetCount));
  const selected: Array<{ target: T; distanceSquared: number }> = [];
  const seen = new Set<number>();

  for (const target of candidates) {
    if (!target.isAlive || seen.has(target.poolId)) continue;
    const dx = target.x - originX;
    const dy = target.y - originY;
    const distanceSquared = dx * dx + dy * dy;
    if (distanceSquared > rangeSquared) continue;
    const distance = Math.sqrt(distanceSquared);
    const dot = distance === 0 ? 1 : (dx * unitAimX + dy * unitAimY) / distance;
    const isUltraClose = distance <= 32;
    if (!isUltraClose && dot + Number.EPSILON < minimumDot) continue;

    let insertAt = selected.length;
    while (insertAt > 0 && selected[insertAt - 1]!.distanceSquared > distanceSquared) insertAt -= 1;
    if (insertAt < limit) {
      selected.splice(insertAt, 0, { target, distanceSquared });
      seen.add(target.poolId);
      if (selected.length > limit) {
        const removed = selected.pop();
        if (removed) seen.delete(removed.target.poolId);
      }
    }
  }
  return selected.map((entry) => entry.target);
}

export interface PiercingSelection<T extends TargetCandidate> {
  targets: T[];
  end: { x: number; y: number };
}

export function selectPiercingTargets<T extends TargetCandidate>(
  candidates: readonly T[],
  originX: number,
  originY: number,
  range: number,
  halfWidth: number,
  targetCount: number,
): PiercingSelection<T> | null {
  const first = selectNearestUniqueTargets(candidates, originX, originY, range, 1)[0];
  if (!first) return null;
  const directionX = first.x - originX;
  const directionY = first.y - originY;
  const directionLength = Math.sqrt(directionX * directionX + directionY * directionY) || 1;
  const unitX = directionX / directionLength;
  const unitY = directionY / directionLength;
  const limit = Math.max(1, Math.floor(targetCount));
  const widthSquared = halfWidth * halfWidth;
  const selected: Array<{ target: T; projection: number }> = [];
  const seen = new Set<number>();

  for (const target of candidates) {
    if (!target.isAlive || seen.has(target.poolId)) continue;
    const relativeX = target.x - originX;
    const relativeY = target.y - originY;
    const projection = relativeX * unitX + relativeY * unitY;
    if (projection < 0 || projection > range) continue;
    const perpendicularX = relativeX - projection * unitX;
    const perpendicularY = relativeY - projection * unitY;
    if (perpendicularX * perpendicularX + perpendicularY * perpendicularY > widthSquared) continue;

    let insertAt = selected.length;
    while (insertAt > 0 && selected[insertAt - 1]!.projection > projection) insertAt -= 1;
    if (insertAt < limit) {
      selected.splice(insertAt, 0, { target, projection });
      seen.add(target.poolId);
      if (selected.length > limit) {
        const removed = selected.pop();
        if (removed) seen.delete(removed.target.poolId);
      }
    }
  }

  return {
    targets: selected.map((entry) => entry.target),
    end: { x: originX + unitX * range, y: originY + unitY * range },
  };
}

export function selectChainTargets<T extends TargetCandidate>(
  candidates: readonly T[],
  originX: number,
  originY: number,
  initialRange: number,
  chainRange: number,
  targetCount: number,
): T[] {
  const limit = Math.max(0, Math.floor(targetCount));
  if (limit === 0) return [];
  const first = selectNearestUniqueTargets(candidates, originX, originY, initialRange, 1)[0];
  if (!first) return [];

  const selected = [first];
  const seen = new Set<number>([first.poolId]);
  let current: T = first;
  const rangeSquared = chainRange * chainRange;

  while (selected.length < limit) {
    let nearest: T | null = null;
    let nearestDistanceSquared = Number.POSITIVE_INFINITY;
    for (const candidate of candidates) {
      if (!candidate.isAlive || seen.has(candidate.poolId)) continue;
      const dx = candidate.x - current.x;
      const dy = candidate.y - current.y;
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared <= rangeSquared && distanceSquared < nearestDistanceSquared) {
        nearest = candidate;
        nearestDistanceSquared = distanceSquared;
      }
    }
    if (!nearest) break;
    selected.push(nearest);
    seen.add(nearest.poolId);
    current = nearest;
  }
  return selected;
}
