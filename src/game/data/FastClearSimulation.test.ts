import { describe, expect, it } from 'vitest';
import { CHARACTERS } from './CharacterData';
import { MAX_BASE_CRITICAL_CHANCE } from './CriticalHitData';
import { simulateFastestClearPath } from './FastClearSimulation';

const EXPECTED_PATHS = {
  'arc-ranger': { attackDamage: 38, attackSpeed: 71, attackRange: 3 },
  'blade-warden': { attackDamage: 55, attackSpeed: 57, attackRange: 5 },
  'bastion-gunner': { attackDamage: 51, attackSpeed: 51, attackRange: 6 },
  'rune-mage': { attackDamage: 35, attackSpeed: 36, attackRange: 2 },
  'needle-striker': { attackDamage: 28, attackSpeed: 16, attackRange: 0 },
  'storm-conductor': { attackDamage: 31, attackSpeed: 31, attackRange: 1 },
} as const;

describe('critical-balanced fastest clear paths', () => {
  it('keeps every unupgraded character critical chance at or below 20%', () => {
    for (const character of CHARACTERS) {
      expect(character.baseCriticalChance, character.name).toBeGreaterThanOrEqual(0);
      expect(character.baseCriticalChance, character.name).toBeLessThanOrEqual(MAX_BASE_CRITICAL_CHANCE);
    }
  });

  it('keeps six offensive fastest-clear targets within 13.5 seconds', () => {
    const results = CHARACTERS.map((character) => ({
      character,
      result: simulateFastestClearPath(character),
    }));
    const times = results.map(({ result }) => result.clearTimeMs);
    expect(Math.max(...times) - Math.min(...times)).toBeLessThanOrEqual(13_500);
    for (const { character, result } of results) {
      expect(result.clearTimeMs / 60_000, character.name).toBeGreaterThanOrEqual(19.6);
      expect(result.clearTimeMs / 60_000, character.name).toBeLessThanOrEqual(19.83);
      expect(result.allocation, character.name).toMatchObject(EXPECTED_PATHS[character.id as keyof typeof EXPECTED_PATHS]);
      expect(result.allocation.defense).toBe(0);
      expect(result.allocation.maxHealth).toBe(0);
    }
  });
});
