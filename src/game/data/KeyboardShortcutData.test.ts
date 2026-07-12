import { describe, expect, it } from 'vitest';
import { GAMEPLAY_SHORTCUTS, UPGRADE_SHORTCUT_LABELS, getGameplayShortcut } from './KeyboardShortcutData';

describe('PC gameplay shortcuts', () => {
  it('maps Q/W/E/A/S/D/F to the requested actions', () => {
    expect(getGameplayShortcut('KeyQ')).toEqual({ type: 'UPGRADE', upgradeId: 'attackDamage' });
    expect(getGameplayShortcut('KeyW')).toEqual({ type: 'UPGRADE', upgradeId: 'attackSpeed' });
    expect(getGameplayShortcut('KeyE')).toEqual({ type: 'MOB_CLEAR' });
    expect(getGameplayShortcut('KeyA')).toEqual({ type: 'UPGRADE', upgradeId: 'defense' });
    expect(getGameplayShortcut('KeyS')).toEqual({ type: 'UPGRADE', upgradeId: 'maxHealth' });
    expect(getGameplayShortcut('KeyD')).toEqual({ type: 'UPGRADE', upgradeId: 'attackRange' });
    expect(getGameplayShortcut('KeyF')).toEqual({ type: 'REVIVE' });
    expect(getGameplayShortcut('KeyX')).toBeNull();
  });

  it('uses unique keys and labels every persistent upgrade', () => {
    expect(Object.keys(GAMEPLAY_SHORTCUTS)).toHaveLength(7);
    expect(new Set(Object.keys(GAMEPLAY_SHORTCUTS)).size).toBe(7);
    expect(UPGRADE_SHORTCUT_LABELS).toEqual({
      attackDamage: 'Q', attackSpeed: 'W', defense: 'A', maxHealth: 'S', attackRange: 'D',
    });
  });
});
