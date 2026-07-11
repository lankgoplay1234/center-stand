export const MOB_CLEAR_NAME = '모든 몹 제거';
export const MOB_CLEAR_BASE_COST = 300;
export const MOB_CLEAR_COST_GROWTH = 2;
export const MOB_CLEAR_MAX_USES = 10;

export function calculateMobClearCost(usageCount: number): number {
  const safeUsageCount = Math.max(0, Math.floor(usageCount));
  return Math.floor(MOB_CLEAR_BASE_COST * MOB_CLEAR_COST_GROWTH ** safeUsageCount);
}
