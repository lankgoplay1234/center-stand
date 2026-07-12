import { MAX_UPGRADE_LEVEL } from './UpgradeData';
import { roundStat } from './StatPrecisionData';

export function calculateAttackRangeAtLevel(
  baseRange: number,
  maxRange: number,
  level: number,
  efficiency = 1,
): number {
  const safeLevel = Math.min(MAX_UPGRADE_LEVEL, Math.max(0, Math.floor(level)));
  const progress = safeLevel / MAX_UPGRADE_LEVEL;
  const safeEfficiency = Math.max(0.01, efficiency);
  const weightedProgress = progress ** (1 / safeEfficiency);
  return roundStat(baseRange + (maxRange - baseRange) * weightedProgress);
}

export function calculateAttackRangeGrowthPerLevel(baseRange: number, maxRange: number): number {
  return roundStat((maxRange - baseRange) / MAX_UPGRADE_LEVEL);
}
