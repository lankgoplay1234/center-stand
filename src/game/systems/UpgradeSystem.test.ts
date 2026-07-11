import { describe, expect, it } from 'vitest';
import { ARC_OVERCHARGE } from '../data/SpecialAbilityData';
import type { Player } from '../entities/Player';
import type { SpecialAbilityData, UpgradeId } from '../types/GameTypes';
import { UpgradeSystem } from './UpgradeSystem';

function createPlayer(
  efficiencyOverrides: Partial<Record<UpgradeId, number>> = {},
  specialAbility: SpecialAbilityData | null = null,
): Player {
  return {
    character: { specialAbility },
    attackDamage: 10,
    attackSpeed: 2,
    baseTargetCount: 1,
    bonusTargetCount: 0,
    defense: 3,
    health: 80,
    maxHealth: 100,
    attackRange: 200,
    attackAreaRadius: 40,
    specialAbilityLevel: 0,
    upgradeEfficiency: {
      attackDamage: 1, attackSpeed: 1, targetCount: 1, defense: 1, maxHealth: 1, specialAbility: 1,
      ...efficiencyOverrides,
    },
  } as unknown as Player;
}

describe('UpgradeSystem', () => {
  it('applies all six upgrades to live player stats', () => {
    const player = createPlayer();
    const upgrades = new UpgradeSystem(player);
    const ids: readonly UpgradeId[] = [
      'attackDamage', 'attackSpeed', 'targetCount', 'defense', 'maxHealth', 'specialAbility',
    ];
    let gold = 10_000;
    for (const id of ids) {
      const result = upgrades.purchase(id, gold);
      expect(result.success).toBe(true);
      gold = result.gold;
      expect(upgrades.getState(id).level).toBe(1);
    }

    expect(player.attackDamage).toBe(16);
    expect(player.attackSpeed).toBeCloseTo(2.08);
    expect(player.bonusTargetCount).toBe(1);
    expect(player.defense).toBeCloseTo(3.8);
    expect(player.maxHealth).toBe(116);
    expect(player.health).toBe(96);
    expect(player.attackRange).toBe(208);
    expect(player.attackAreaRadius).toBe(44);
  });

  it('does not change stats or level when gold is insufficient', () => {
    const player = createPlayer();
    const upgrades = new UpgradeSystem(player);
    const result = upgrades.purchase('maxHealth', 0);
    expect(result).toEqual({ success: false, gold: 0 });
    expect(upgrades.getState('maxHealth').level).toBe(0);
    expect(player.maxHealth).toBe(100);
  });

  it('applies character-specific upgrade efficiency while keeping common costs', () => {
    const earlyPlayer = createPlayer({ attackDamage: 0.8 });
    const scalingPlayer = createPlayer({ attackDamage: 1.35 });
    const early = new UpgradeSystem(earlyPlayer);
    const scaling = new UpgradeSystem(scalingPlayer);
    const earlyCost = early.getState('attackDamage').currentCost;
    const scalingCost = scaling.getState('attackDamage').currentCost;
    early.purchase('attackDamage', 100);
    scaling.purchase('attackDamage', 100);

    expect(earlyCost).toBe(scalingCost);
    expect(earlyPlayer.attackDamage).toBeCloseTo(14.8);
    expect(scalingPlayer.attackDamage).toBeCloseTo(18.1);
  });

  it('routes the Arc Ranger special upgrade into overcharge without changing range stats', () => {
    const player = createPlayer({ specialAbility: 1.25 }, ARC_OVERCHARGE);
    const upgrades = new UpgradeSystem(player);

    expect(upgrades.getEffectLabel('specialAbility')).toContain('아크 과충전');
    expect(upgrades.purchase('specialAbility', 100)).toEqual({ success: true, gold: 55 });
    expect(player.specialAbilityLevel).toBe(1);
    expect(player.attackRange).toBe(200);
    expect(player.attackAreaRadius).toBe(40);
    expect(upgrades.getEffectLabel('specialAbility')).toContain('×1.63');
  });

  it('allows level 98 to 99 and rejects every purchase beyond the cap', () => {
    const player = createPlayer();
    const upgrades = new UpgradeSystem(player);
    const ids: readonly UpgradeId[] = [
      'attackDamage', 'attackSpeed', 'targetCount', 'defense', 'maxHealth', 'specialAbility',
    ];
    let gold = 1_000_000;
    for (const id of ids) {
      for (let level = 0; level < 98; level += 1) {
        const result = upgrades.purchase(id, gold);
        expect(result.success).toBe(true);
        gold = result.gold;
      }
      expect(upgrades.getState(id).level).toBe(98);
      const finalPurchase = upgrades.purchase(id, gold);
      expect(finalPurchase.success).toBe(true);
      gold = finalPurchase.gold;
      expect(upgrades.getState(id).level).toBe(99);
      expect(upgrades.isMaxLevel(id)).toBe(true);

      const goldAtMax = gold;
      expect(upgrades.purchase(id, goldAtMax)).toEqual({ success: false, gold: goldAtMax });
      expect(upgrades.getState(id).level).toBe(99);
    }
    expect(player.bonusTargetCount).toBe(10);
  });
});
