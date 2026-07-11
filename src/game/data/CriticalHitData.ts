export const BASE_CRITICAL_CHANCE = 0.08;
export const CRITICAL_CHANCE_PER_ATTACK_RANGE_LEVEL = 0.002;
export const CRITICAL_DAMAGE_MULTIPLIER = 1.75;

export function calculatePlayerCriticalChance(attackRangeLevel: number): number {
  const safeLevel = Math.max(0, Math.floor(attackRangeLevel));
  return Math.min(1, BASE_CRITICAL_CHANCE + safeLevel * CRITICAL_CHANCE_PER_ATTACK_RANGE_LEVEL);
}

export function formatCriticalChance(chance: number): string {
  return `${(Math.max(0, chance) * 100).toFixed(1)}%`;
}
