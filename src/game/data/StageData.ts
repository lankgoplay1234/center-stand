import type { StageStats } from '../types/GameTypes';
import { BASIC_ENEMY } from './EnemyData';

export const STAGE_TRANSITION_SPAWN_DELAY_MS = 800;
export const FIRST_STAGE_SPAWN_RATE = 10;
export const FINAL_STAGE_SPAWN_RATE = 100;
export const FIRST_STAGE_KILL_TARGET = 50;
export const FINAL_STAGE_KILL_TARGET = 300;

function normalizeStage(stage: number): number {
  const integerStage = Number.isFinite(stage) ? Math.floor(stage) : 1;
  return Math.min(100, Math.max(1, integerStage));
}

export function calculateStageStats(stage: number): StageStats {
  const safeStage = normalizeStage(stage);
  const step = safeStage - 1;
  const progress = step / 99;
  const spawnRate = FIRST_STAGE_SPAWN_RATE
    + (FINAL_STAGE_SPAWN_RATE - FIRST_STAGE_SPAWN_RATE) * progress;

  const enemyHealthMultiplier = safeStage <= 5
    ? 1
    : 1 + step * 0.075;
  const enemyAttackBonus = safeStage <= 5
    ? -BASIC_ENEMY.attackDamage + 1.5 + (safeStage - 1) * 0.5
    : step;
  const enemyDefenseBonus = safeStage <= 5
    ? 0
    : step;

  return {
    stage: safeStage,
    enemyHealthMultiplier,
    enemyAttackBonus,
    enemyDefenseBonus,
    enemySpeedMultiplier: 1 + 0.75 * progress,
    spawnInterval: 1_000 / spawnRate,
    maxActiveEnemies: Math.round(50 + 90 * progress),
  };
}

export function getStageKillTarget(stage: number): number {
  const safeStage = normalizeStage(stage);
  const progress = (safeStage - 1) / 99;
  return Math.round(FIRST_STAGE_KILL_TARGET
    + (FINAL_STAGE_KILL_TARGET - FIRST_STAGE_KILL_TARGET) * progress);
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
