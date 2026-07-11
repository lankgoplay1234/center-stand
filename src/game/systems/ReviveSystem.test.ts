import { describe, expect, it } from 'vitest';
import { REVIVE_INVULNERABILITY_MS, canPlayerTakeDamage, revivePlayer } from './ReviveSystem';

describe('revivePlayer', () => {
  it('restores full health and returns the safety deadline', () => {
    const player = { health: 0, maxHealth: 180 };
    expect(revivePlayer(player, 5_000)).toBe(5_000 + REVIVE_INVULNERABILITY_MS);
    expect(player.health).toBe(180);
  });

  it('supports unlimited repeated revives', () => {
    const player = { health: 0, maxHealth: 120 };
    for (let death = 0; death < 20; death += 1) {
      player.health = 0;
      revivePlayer(player, death * 3_000);
      expect(player.health).toBe(120);
    }
  });
});

describe('canPlayerTakeDamage', () => {
  it('blocks damage until the safety deadline', () => {
    expect(canPlayerTakeDamage(6_999, 7_000)).toBe(false);
    expect(canPlayerTakeDamage(7_000, 7_000)).toBe(true);
  });
});
