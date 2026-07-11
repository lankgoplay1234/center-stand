import { describe, expect, it } from 'vitest';
import { CHARACTERS, validateCharacterData } from './CharacterData';

describe('character data', () => {
  it('contains valid unique characters', () => {
    expect(CHARACTERS).toHaveLength(6);
    expect(new Set(CHARACTERS.map((character) => character.id)).size).toBe(CHARACTERS.length);
    expect(new Set(CHARACTERS.map((character) => character.attackType)).size).toBe(6);
    expect(new Set(CHARACTERS.map((character) => character.growthProfile)).size).toBe(3);
    for (const character of CHARACTERS) expect(validateCharacterData(character)).toEqual([]);
  });

  it('rejects invalid combat values', () => {
    const character = {
      ...CHARACTERS[0]!,
      attackSpeed: 0,
      attackAreaRadius: 0,
      baseTargetCount: 0,
      knockbackForce: -1,
      upgradeEfficiency: { ...CHARACTERS[0]!.upgradeEfficiency, attackDamage: 0 },
    };
    expect(validateCharacterData(character)).toContain('attackSpeed must be positive');
    expect(validateCharacterData(character)).toContain('attackAreaRadius must be positive');
    expect(validateCharacterData(character)).toContain('baseTargetCount must be a positive integer');
    expect(validateCharacterData(character)).toContain('knockbackForce cannot be negative');
    expect(validateCharacterData(character)).toContain('upgradeEfficiency.attackDamage must be positive');
  });

  it('uses strong melee, light standard, and zero area knockback profiles', () => {
    const byId = new Map(CHARACTERS.map((character) => [character.id, character]));
    expect(byId.get('blade-warden')?.knockbackForce).toBeGreaterThan(byId.get('arc-ranger')?.knockbackForce ?? 0);
    expect(byId.get('arc-ranger')?.knockbackForce).toBeGreaterThan(0);
    expect(byId.get('bastion-gunner')?.knockbackForce).toBeGreaterThan(0);
    expect(byId.get('needle-striker')?.knockbackForce).toBeGreaterThan(0);
    expect(byId.get('rune-mage')?.knockbackForce).toBe(0);
    expect(byId.get('storm-conductor')?.knockbackForce).toBe(0);
  });
});
