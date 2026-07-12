import type { UpgradeId } from '../types/GameTypes';

export type GameplayShortcutAction =
  | { type: 'UPGRADE'; upgradeId: UpgradeId }
  | { type: 'MOB_CLEAR' }
  | { type: 'REVIVE' };

export const GAMEPLAY_SHORTCUTS: Readonly<Record<string, GameplayShortcutAction>> = {
  KeyQ: { type: 'UPGRADE', upgradeId: 'attackDamage' },
  KeyW: { type: 'UPGRADE', upgradeId: 'attackSpeed' },
  KeyE: { type: 'MOB_CLEAR' },
  KeyA: { type: 'UPGRADE', upgradeId: 'defense' },
  KeyS: { type: 'UPGRADE', upgradeId: 'maxHealth' },
  KeyD: { type: 'UPGRADE', upgradeId: 'attackRange' },
  KeyF: { type: 'REVIVE' },
};

export const UPGRADE_SHORTCUT_LABELS: Readonly<Record<UpgradeId, string>> = {
  attackDamage: 'Q',
  attackSpeed: 'W',
  defense: 'A',
  maxHealth: 'S',
  attackRange: 'D',
};

export const MOB_CLEAR_SHORTCUT_LABEL = 'E';
export const REVIVE_SHORTCUT_LABEL = 'F';

export function getGameplayShortcut(code: string): GameplayShortcutAction | null {
  return GAMEPLAY_SHORTCUTS[code] ?? null;
}
