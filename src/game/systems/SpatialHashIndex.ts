import type { TargetCandidate } from './TargetingSystem';

/** 이동 객체용 실험적 공간 인덱스입니다. 런타임 채택 전 벤치마크 비교에 사용합니다. */
export class SpatialHashIndex<T extends TargetCandidate> {
  private readonly columns = new Map<number, Map<number, T[]>>();

  constructor(readonly cellSize: number) {
    if (!Number.isFinite(cellSize) || cellSize <= 0) throw new Error('cellSize must be positive');
  }

  rebuild(candidates: readonly T[]): void {
    this.columns.clear();
    const seen = new Set<number>();
    for (const candidate of candidates) {
      if (!candidate.isAlive || seen.has(candidate.poolId)) continue;
      seen.add(candidate.poolId);
      const cellX = this.toCell(candidate.x);
      const cellY = this.toCell(candidate.y);
      let column = this.columns.get(cellX);
      if (!column) {
        column = new Map<number, T[]>();
        this.columns.set(cellX, column);
      }
      const bucket = column.get(cellY);
      if (bucket) bucket.push(candidate);
      else column.set(cellY, [candidate]);
    }
  }

  queryRadius(originX: number, originY: number, range: number): T[] {
    const safeRange = Math.max(0, range);
    const minX = this.toCell(originX - safeRange);
    const maxX = this.toCell(originX + safeRange);
    const minY = this.toCell(originY - safeRange);
    const maxY = this.toCell(originY + safeRange);
    const candidates: T[] = [];
    for (let cellX = minX; cellX <= maxX; cellX += 1) {
      const column = this.columns.get(cellX);
      if (!column) continue;
      for (let cellY = minY; cellY <= maxY; cellY += 1) {
        const bucket = column.get(cellY);
        if (bucket) candidates.push(...bucket);
      }
    }
    return candidates;
  }

  private toCell(value: number): number {
    return Math.floor(value / this.cellSize);
  }
}
