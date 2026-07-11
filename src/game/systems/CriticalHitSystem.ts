export const PLAYER_CRITICAL_CHANCE = 0.08;
export const PLAYER_CRITICAL_MULTIPLIER = 1.75;

export interface CriticalHitResult {
  damage: number;
  isCritical: boolean;
}

export function resolveCriticalHit(
  damage: number,
  roll: number,
  chance = PLAYER_CRITICAL_CHANCE,
  multiplier = PLAYER_CRITICAL_MULTIPLIER,
): CriticalHitResult {
  const safeDamage = Math.max(0, damage);
  const isCritical = chance > 0 && roll < Math.min(1, Math.max(0, chance));
  return {
    damage: isCritical ? safeDamage * Math.max(1, multiplier) : safeDamage,
    isCritical,
  };
}
