import { describe, expect, it } from 'vitest';
import { CHARACTERS, validateCharacterData } from './CharacterData';
import { ARC_OVERCHARGE, BLADE_FURY } from './SpecialAbilityData';
import { ATTACK_MOTIONS } from './AttackMotionData';

describe('character data', () => {
  it('contains valid unique characters', () => {
    expect(CHARACTERS).toHaveLength(6);
    expect(new Set(CHARACTERS.map((character) => character.id)).size).toBe(CHARACTERS.length);
    expect(new Set(CHARACTERS.map((character) => character.attackType)).size).toBe(6);
    expect(new Set(CHARACTERS.map((character) => character.growthProfile)).size).toBe(3);
    expect(new Set(CHARACTERS.map((character) => character.attackMotion.style)).size).toBe(6);
    for (const character of CHARACTERS) expect(validateCharacterData(character)).toEqual([]);
  });

  it('assigns a distinct reusable motion profile to every character', () => {
    expect(CHARACTERS.map((character) => character.attackMotion)).toEqual([
      ATTACK_MOTIONS.ARC_SHOT,
      ATTACK_MOTIONS.BLADE_SWEEP,
      ATTACK_MOTIONS.BASTION_VOLLEY,
      ATTACK_MOTIONS.RUNE_CAST,
      ATTACK_MOTIONS.NEEDLE_BURST,
      ATTACK_MOTIONS.STORM_SURGE,
    ]);
    const invalid = {
      ...CHARACTERS[0]!,
      attackMotion: { ...ATTACK_MOTIONS.ARC_SHOT, durationMs: 0, pulseScale: 1 },
    };
    expect(validateCharacterData(invalid)).toContain('attackMotion.durationMs must be positive');
    expect(validateCharacterData(invalid)).toContain('attackMotion.pulseScale must be greater than 1');
  });

  it('rejects invalid combat values', () => {
    const character = {
      ...CHARACTERS[0]!,
      attackSpeed: 0,
      baseCriticalChance: 0.201,
      maxAttackRange: CHARACTERS[0]!.attackRange,
      attackAreaRadius: 0,
      baseTargetCount: 0,
      knockbackForce: -1,
      upgradeEfficiency: { ...CHARACTERS[0]!.upgradeEfficiency, attackDamage: 0 },
    };
    expect(validateCharacterData(character)).toContain('attackSpeed must be positive');
    expect(validateCharacterData(character)).toContain('baseCriticalChance must be between 0 and 0.2');
    expect(validateCharacterData(character)).toContain('maxAttackRange must be greater than attackRange');
    expect(validateCharacterData(character)).toContain('attackAreaRadius must be positive');
    expect(validateCharacterData(character)).toContain('baseTargetCount must be a positive integer');
    expect(validateCharacterData(character)).toContain('knockbackForce cannot be negative');
    expect(validateCharacterData(character)).toContain('upgradeEfficiency.attackDamage must be positive');
  });

  it('uses bounded role-pair critical chances from the fastest-clear analysis', () => {
    expect(Object.fromEntries(CHARACTERS.map((character) => [character.id, character.baseCriticalChance]))).toEqual({
      'arc-ranger': 0.2,
      'blade-warden': 0,
      'bastion-gunner': 0.07,
      'rune-mage': 0.1,
      'needle-striker': 0.05,
      'storm-conductor': 0,
    });
    for (const character of CHARACTERS) {
      expect(character.baseCriticalChance).toBeGreaterThanOrEqual(0);
      expect(character.baseCriticalChance).toBeLessThanOrEqual(0.2);
    }
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

  it('uses narrow directional arcs for Blade Warden and Bastion only', () => {
    const byId = new Map(CHARACTERS.map((character) => [character.id, character]));
    expect(byId.get('blade-warden')?.attackArcDegrees).toBe(45);
    expect(byId.get('bastion-gunner')?.attackArcDegrees).toBe(90);
    expect(byId.get('bastion-gunner')?.attackRange).toBe(60);
    expect(byId.get('bastion-gunner')?.maxAttackRange).toBe(150);
    expect(byId.get('bastion-gunner')?.attackRange).toBeLessThan(byId.get('blade-warden')?.attackRange ?? 0);
    for (const id of ['arc-ranger', 'rune-mage', 'needle-striker', 'storm-conductor']) {
      expect(byId.get(id)?.attackArcDegrees).toBeNull();
    }
  });

  it('gives every role an explicit primary and secondary upgrade focus', () => {
    expect(Object.fromEntries(CHARACTERS.map((character) => [character.id, character.upgradeFocus.primary]))).toEqual({
      'arc-ranger': 'attackDamage',
      'blade-warden': 'maxHealth',
      'bastion-gunner': 'defense',
      'rune-mage': 'attackSpeed',
      'needle-striker': 'attackDamage',
      'storm-conductor': 'attackSpeed',
    });
    expect(CHARACTERS.find((character) => character.id === 'arc-ranger')?.upgradeFocus).toEqual(
      expect.objectContaining({ primary: 'attackDamage', secondary: 'attackSpeed' }),
    );
    for (const character of CHARACTERS) {
      expect(character.upgradeFocus.primary).not.toBe(character.upgradeFocus.secondary);
      expect(character.upgradeEfficiency[character.upgradeFocus.primary]).toBe(
        Math.max(...Object.values(character.upgradeEfficiency)),
      );
    }
  });

  it('assigns the first unique ability to the Arc Ranger and validates its attack contract', () => {
    const arcRanger = CHARACTERS.find((character) => character.id === 'arc-ranger')!;
    expect(arcRanger.specialAbility).toEqual(ARC_OVERCHARGE);

    const invalid = {
      ...arcRanger,
      attackType: 'MULTI_TARGET' as const,
      specialAbility: { ...ARC_OVERCHARGE, triggerEveryAttacks: 0 },
    };
    expect(validateCharacterData(invalid)).toContain('specialAbility.triggerEveryAttacks must be a positive integer');
    expect(validateCharacterData(invalid)).toContain('ARC_OVERCHARGE requires SINGLE_TARGET attackType');
  });

  it('assigns Blade Fury to the melee character and validates its attack contract', () => {
    const blade = CHARACTERS.find((character) => character.id === 'blade-warden')!;
    expect(blade.specialAbility).toEqual(BLADE_FURY);
    expect(validateCharacterData({ ...blade, attackType: 'MULTI_TARGET' })).toContain(
      'BLADE_FURY requires AREA_MELEE attackType',
    );
  });
});
