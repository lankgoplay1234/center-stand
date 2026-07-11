export interface DamageResult {
  appliedDamage: number;
  died: boolean;
}

export function calculateAppliedDamage(currentHealth: number, requestedDamage: number): number {
  const safeHealth = Math.max(0, currentHealth);
  const safeDamage = Math.max(0, requestedDamage);
  return Math.min(safeHealth, safeDamage);
}
