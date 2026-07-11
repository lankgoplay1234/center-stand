import { describe, expect, it } from 'vitest';
import { CHARACTERS } from './CharacterData';
import { MAX_UPGRADE_LEVEL } from './UpgradeData';
import { calculateAttackRangeAtLevel, calculateAttackRangeGrowthPerLevel } from './AttackRangeData';

const PREVIOUS_BASE_RANGES: Readonly<Record<string, number>> = {
  'arc-ranger': 400,
  'blade-warden': 160,
  'bastion-gunner': 100,
  'rune-mage': 310,
  'needle-striker': 480,
  'storm-conductor': 340,
};

describe('attack range progression', () => {
  it('starts at base range and reaches the declared maximum at level 99', () => {
    for (const character of CHARACTERS) {
      expect(character.attackRange, character.name).toBe(PREVIOUS_BASE_RANGES[character.id]! / 2);
      expect(calculateAttackRangeAtLevel(character.attackRange, character.maxAttackRange, 0)).toBe(character.attackRange);
      expect(calculateAttackRangeAtLevel(character.attackRange, character.maxAttackRange, MAX_UPGRADE_LEVEL))
        .toBe(character.maxAttackRange);
    }
  });

  it('keeps every character clearly separated at base and maximum range', () => {
    const sortedByBase = [...CHARACTERS].sort((left, right) => left.attackRange - right.attackRange);
    const sortedByMax = [...CHARACTERS].sort((left, right) => left.maxAttackRange - right.maxAttackRange);
    expect(sortedByBase.map((character) => character.id)).toEqual([
      'bastion-gunner', 'blade-warden', 'rune-mage', 'storm-conductor', 'arc-ranger', 'needle-striker',
    ]);
    expect(sortedByMax.map((character) => character.id)).toEqual([
      'bastion-gunner', 'blade-warden', 'rune-mage', 'storm-conductor', 'arc-ranger', 'needle-striker',
    ]);
    for (let index = 1; index < sortedByBase.length; index += 1) {
      expect(sortedByBase[index]!.attackRange - sortedByBase[index - 1]!.attackRange).toBeGreaterThanOrEqual(15);
      expect(sortedByMax[index]!.maxAttackRange - sortedByMax[index - 1]!.maxAttackRange).toBeGreaterThanOrEqual(40);
    }
  });

  it('keeps maximum ranges while increasing the base per-level growth span', () => {
    for (const character of CHARACTERS) {
      const previousBase = PREVIOUS_BASE_RANGES[character.id]!;
      expect(calculateAttackRangeGrowthPerLevel(character.attackRange, character.maxAttackRange), character.name)
        .toBeGreaterThan(calculateAttackRangeGrowthPerLevel(previousBase, character.maxAttackRange));
      expect(calculateAttackRangeAtLevel(
        character.attackRange,
        character.maxAttackRange,
        MAX_UPGRADE_LEVEL,
        character.upgradeEfficiency.attackRange,
      )).toBe(character.maxAttackRange);
    }
  });

  it('grows monotonically and clamps levels outside the supported range', () => {
    expect(calculateAttackRangeAtLevel(100, 150, -2)).toBe(100);
    expect(calculateAttackRangeAtLevel(100, 150, 50)).toBeGreaterThan(100);
    expect(calculateAttackRangeAtLevel(100, 150, 500)).toBe(150);
  });

  it('applies character efficiency during growth while preserving both endpoints', () => {
    expect(calculateAttackRangeAtLevel(100, 200, 0, 1.5)).toBe(100);
    expect(calculateAttackRangeAtLevel(100, 200, MAX_UPGRADE_LEVEL, 0.5)).toBe(200);
    expect(calculateAttackRangeAtLevel(100, 200, 40, 1.5))
      .toBeGreaterThan(calculateAttackRangeAtLevel(100, 200, 40, 1));
    expect(calculateAttackRangeAtLevel(100, 200, 40, 0.5))
      .toBeLessThan(calculateAttackRangeAtLevel(100, 200, 40, 1));
  });
});
