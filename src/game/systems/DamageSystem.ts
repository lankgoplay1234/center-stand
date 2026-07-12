export interface DamageResult {
  appliedDamage: number;
  died: boolean;
}

export function calculateAppliedDamage(currentHealth: number, requestedDamage: number): number {
  const safeHealth = Math.max(0, currentHealth);
  const safeDamage = Math.max(0, requestedDamage);
  return roundStat(Math.min(safeHealth, safeDamage));
}

export function calculateDamageAfterDefense(requestedDamage: number, defense: number): number {
  const safeDamage = Math.max(0, requestedDamage);
  if (safeDamage === 0) return 0;
  return roundStat(Math.max(1, safeDamage - Math.max(0, defense)));
}
import { roundStat } from '../data/StatPrecisionData';
