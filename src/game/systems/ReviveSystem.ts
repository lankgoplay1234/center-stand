export const REVIVE_INVULNERABILITY_MS = 2_000;

export interface RevivablePlayer {
  health: number;
  maxHealth: number;
}

export function revivePlayer(
  player: RevivablePlayer,
  currentTime: number,
  invulnerabilityDuration = REVIVE_INVULNERABILITY_MS,
): number {
  player.health = player.maxHealth;
  return currentTime + Math.max(0, invulnerabilityDuration);
}

export function canPlayerTakeDamage(currentTime: number, invulnerableUntil: number): boolean {
  return currentTime >= invulnerableUntil;
}
