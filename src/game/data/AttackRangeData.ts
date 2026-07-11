import { MAX_UPGRADE_LEVEL } from './UpgradeData';

export function calculateAttackRangeAtLevel(
  baseRange: number,
  maxRange: number,
  level: number,
): number {
  const safeLevel = Math.min(MAX_UPGRADE_LEVEL, Math.max(0, Math.floor(level)));
  const progress = safeLevel / MAX_UPGRADE_LEVEL;
  return baseRange + (maxRange - baseRange) * progress;
}

export function calculateAttackRangeGrowthPerLevel(baseRange: number, maxRange: number): number {
  return (maxRange - baseRange) / MAX_UPGRADE_LEVEL;
}
