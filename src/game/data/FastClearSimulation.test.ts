import { describe, expect, it } from 'vitest';
import { CHARACTERS } from './CharacterData';
import { MAX_BASE_CRITICAL_CHANCE } from './CriticalHitData';
import { simulateFastestClearPath } from './FastClearSimulation';

describe('critical-balanced fastest clear paths', () => {
  it('keeps every unupgraded character critical chance at or below 20%', () => {
    for (const character of CHARACTERS) {
      expect(character.baseCriticalChance, character.name).toBeGreaterThanOrEqual(0);
      expect(character.baseCriticalChance, character.name).toBeLessThanOrEqual(MAX_BASE_CRITICAL_CHANCE);
    }
  });

  it('spends the reduced run economy on capped offense and records the new modeled bounds', () => {
    const results = CHARACTERS.map((character) => ({
      character,
      result: simulateFastestClearPath(character),
    }));
    const times = results.map(({ result }) => result.clearTimeMs);
    expect(Math.max(...times) - Math.min(...times)).toBeLessThanOrEqual(50 * 60_000);
    for (const { character, result } of results) {
      expect(result.clearTimeMs / 60_000, character.name).toBeGreaterThanOrEqual(10);
      expect(result.clearTimeMs / 60_000, character.name).toBeLessThanOrEqual(90);
      expect(result.allocation.attackDamage, character.name).toBe(99);
      expect(result.allocation.attackSpeed, character.name).toBe(99);
      expect(result.allocation.attackRange, character.name).toBe(99);
      expect(result.allocation.defense).toBe(0);
      expect(result.allocation.maxHealth).toBe(0);
    }
  });
});
