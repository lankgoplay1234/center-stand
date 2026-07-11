import { describe, expect, it } from 'vitest';
import { CHARACTERS } from './CharacterData';
import { MAX_UPGRADE_LEVEL } from './UpgradeData';
import { calculateAttackRangeAtLevel } from './AttackRangeData';

describe('attack range progression', () => {
  it('starts at base range and reaches the declared maximum at level 99', () => {
    for (const character of CHARACTERS) {
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
      expect(sortedByBase[index]!.attackRange - sortedByBase[index - 1]!.attackRange).toBeGreaterThanOrEqual(30);
      expect(sortedByMax[index]!.maxAttackRange - sortedByMax[index - 1]!.maxAttackRange).toBeGreaterThanOrEqual(40);
    }
  });

  it('grows monotonically and clamps levels outside the supported range', () => {
    expect(calculateAttackRangeAtLevel(100, 150, -2)).toBe(100);
    expect(calculateAttackRangeAtLevel(100, 150, 50)).toBeGreaterThan(100);
    expect(calculateAttackRangeAtLevel(100, 150, 500)).toBe(150);
  });
});
