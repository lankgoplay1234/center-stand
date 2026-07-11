import type { StageStats } from '../types/GameTypes';

export interface StageDurationSegment {
  startStage: number;
  endStage: number;
  durationMs: number;
}

export const STAGE_DURATION_SEGMENTS: readonly StageDurationSegment[] = [
  { startStage: 1, endStage: 20, durationMs: 18_000 },
  { startStage: 21, endStage: 60, durationMs: 23_000 },
  { startStage: 61, endStage: 100, durationMs: 26_500 },
];

export const STAGE_TRANSITION_SPAWN_DELAY_MS = 800;

export function getStageDurationMs(stage: number): number {
  const integerStage = Number.isFinite(stage) ? Math.floor(stage) : 1;
  const safeStage = Math.min(100, Math.max(1, integerStage));
  const segment = STAGE_DURATION_SEGMENTS.find(
    ({ startStage, endStage }) => safeStage >= startStage && safeStage <= endStage,
  );
  if (!segment) throw new Error(`Missing duration data for stage ${safeStage}`);
  return segment.durationMs;
}

export function calculateTotalStageDurationMs(startStage = 1, endStage = 100): number {
  const safeStart = Math.min(100, Math.max(1, Math.floor(startStage)));
  const safeEnd = Math.min(100, Math.max(safeStart, Math.floor(endStage)));
  let total = 0;
  for (let stage = safeStart; stage <= safeEnd; stage += 1) {
    total += getStageDurationMs(stage);
  }
  return total;
}

export const TOTAL_STAGE_DURATION_MS = calculateTotalStageDurationMs();

export function calculateStageStats(stage: number): StageStats {
  const safeStage = Math.max(1, Math.floor(stage));
  const step = safeStage - 1;
  return {
    stage: safeStage,
    enemyHealthMultiplier: 1 + step * 0.24,
    enemyDamageMultiplier: 1 + step * 0.13,
    enemySpeedMultiplier: Math.min(1.75, 1 + step * 0.035),
    spawnInterval: Math.max(115, 520 * 0.9 ** step),
    maxActiveEnemies: Math.min(140, 32 + step * 8),
  };
}
