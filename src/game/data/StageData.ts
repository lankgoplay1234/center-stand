import type { StageStats } from '../types/GameTypes';

export interface StageKillTargetSegment {
  startStage: number;
  endStage: number;
  targetAtMaximumSpawnRate: number;
}

export const STAGE_KILL_TARGET_SEGMENTS: readonly StageKillTargetSegment[] = [
  { startStage: 1, endStage: 20, targetAtMaximumSpawnRate: 75 },
  { startStage: 21, endStage: 60, targetAtMaximumSpawnRate: 96 },
  { startStage: 61, endStage: 100, targetAtMaximumSpawnRate: 111 },
];

export const STAGE_TRANSITION_SPAWN_DELAY_MS = 800;
export const MINIMUM_SPAWN_INTERVAL_MS = 120;

function normalizeStage(stage: number): number {
  const integerStage = Number.isFinite(stage) ? Math.floor(stage) : 1;
  return Math.min(100, Math.max(1, integerStage));
}

export function calculateStageStats(stage: number): StageStats {
  const safeStage = Math.max(1, Math.floor(stage));
  const step = safeStage - 1;
  return {
    stage: safeStage,
    enemyHealthMultiplier: 1 + step * 0.075,
    enemyDamageMultiplier: 1 + step * 0.13,
    enemySpeedMultiplier: Math.min(1.75, 1 + step * 0.035),
    spawnInterval: Math.max(MINIMUM_SPAWN_INTERVAL_MS, 520 * 0.9 ** step),
    maxActiveEnemies: Math.min(140, 32 + step * 8),
  };
}

export function getStageKillTarget(stage: number): number {
  const safeStage = normalizeStage(stage);
  const segment = STAGE_KILL_TARGET_SEGMENTS.find(
    ({ startStage, endStage }) => safeStage >= startStage && safeStage <= endStage,
  );
  if (!segment) throw new Error(`Missing kill target data for stage ${safeStage}`);
  const spawnInterval = calculateStageStats(safeStage).spawnInterval;
  return Math.ceil(segment.targetAtMaximumSpawnRate * MINIMUM_SPAWN_INTERVAL_MS / spawnInterval);
}

export function calculateTotalStageKillTarget(startStage = 1, endStage = 100): number {
  const safeStart = normalizeStage(startStage);
  const safeEnd = Math.max(safeStart, normalizeStage(endStage));
  let total = 0;
  for (let stage = safeStart; stage <= safeEnd; stage += 1) total += getStageKillTarget(stage);
  return total;
}

export function calculateTheoreticalFastestClearMs(startStage = 1, endStage = 100): number {
  const safeStart = normalizeStage(startStage);
  const safeEnd = Math.max(safeStart, normalizeStage(endStage));
  let total = 0;
  for (let stage = safeStart; stage <= safeEnd; stage += 1) {
    total += getStageKillTarget(stage) * calculateStageStats(stage).spawnInterval;
  }
  return total;
}

export const TOTAL_STAGE_KILL_TARGET = calculateTotalStageKillTarget();
export const THEORETICAL_FASTEST_CLEAR_MS = calculateTheoreticalFastestClearMs();
