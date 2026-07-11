export const MOB_CLEAR_NAME = '모든 몹 제거';
export const MOB_CLEAR_BASE_COST = 1_000;
export const MOB_CLEAR_COST_GROWTH = 1.3;

export function calculateMobClearCost(usageCount: number): number {
  const safeUsageCount = Math.max(0, Math.floor(usageCount));
  return Math.floor(MOB_CLEAR_BASE_COST * MOB_CLEAR_COST_GROWTH ** safeUsageCount);
}
