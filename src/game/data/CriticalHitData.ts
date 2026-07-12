export const BASE_CRITICAL_CHANCE = 0.08;
export const CRITICAL_CHANCE_PER_ATTACK_RANGE_LEVEL = 0.002;
export const CRITICAL_DAMAGE_MULTIPLIER = 1.75;
export const MAX_BASE_CRITICAL_CHANCE = 0.2;

export function calculatePlayerCriticalChance(baseCriticalChance: number, attackRangeLevel: number): number {
  const safeBaseChance = Math.min(MAX_BASE_CRITICAL_CHANCE, Math.max(0, baseCriticalChance));
  const safeLevel = Math.max(0, Math.floor(attackRangeLevel));
  return roundStat(Math.min(1, safeBaseChance + safeLevel * CRITICAL_CHANCE_PER_ATTACK_RANGE_LEVEL));
}

export function calculateExpectedCriticalDamageMultiplier(criticalChance: number): number {
  const safeChance = Math.min(1, Math.max(0, criticalChance));
  return roundStat(1 + safeChance * (CRITICAL_DAMAGE_MULTIPLIER - 1));
}

export function formatCriticalChance(chance: number): string {
  return `${formatSingleDecimalStat(Math.max(0, chance) * 100)}%`;
}
import { formatSingleDecimalStat, roundStat } from './StatPrecisionData';
