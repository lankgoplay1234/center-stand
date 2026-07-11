import { describe, expect, it } from 'vitest';
import { CHARACTERS } from './CharacterData';
import { MAX_BASE_CRITICAL_CHANCE } from './CriticalHitData';
import { simulateFastestClearPath } from './FastClearSimulation';

const EXPECTED_PATHS = {
  'arc-ranger': { attackDamage: 38, attackSpeed: 71, attackRange: 3 },
  'blade-warden': { attackDamage: 55, attackSpeed: 57, attackRange: 5 },
  'bastion-gunner': { attackDamage: 49, attackSpeed: 48, attackRange: 5 },
  'rune-mage': { attackDamage: 34, attackSpeed: 34, attackRange: 1 },
  'needle-striker': { attackDamage: 29, attackSpeed: 16, attackRange: 0 },
  'storm-conductor': { attackDamage: 31, attackSpeed: 31, attackRange: 1 },
} as const;

describe('critical-balanced fastest clear paths', () => {
  it('keeps every unupgraded character critical chance at or below 20%', () => {
    for (const character of CHARACTERS) {
      expect(character.baseCriticalChance, character.name).toBeGreaterThanOrEqual(0);
      expect(character.baseCriticalChance, character.name).toBeLessThanOrEqual(MAX_BASE_CRITICAL_CHANCE);
    }
  });

  it('keeps six offensive fastest-clear targets within 13 seconds', () => {
    const results = CHARACTERS.map((character) => ({
      character,
      result: simulateFastestClearPath(character),
    }));
    const times = results.map(({ result }) => result.clearTimeMs);
    expect(Math.max(...times) - Math.min(...times)).toBeLessThanOrEqual(13_000);
    for (const { character, result } of results) {
      expect(result.clearTimeMs / 60_000, character.name).toBeGreaterThanOrEqual(19.6);
      expect(result.clearTimeMs / 60_000, character.name).toBeLessThanOrEqual(19.81);
      expect(result.allocation, character.name).toMatchObject(EXPECTED_PATHS[character.id as keyof typeof EXPECTED_PATHS]);
      expect(result.allocation.defense).toBe(0);
      expect(result.allocation.maxHealth).toBe(0);
    }
  });
});
