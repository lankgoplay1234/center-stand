import type { StageStats } from '../types/GameTypes';

export const STAGE_DURATION_MS = 30_000;

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
