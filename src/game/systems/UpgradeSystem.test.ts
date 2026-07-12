import { describe, expect, it, vi } from 'vitest';
import { ARC_OVERCHARGE } from '../data/SpecialAbilityData';
import { calculateAttackRangeAtLevel } from '../data/AttackRangeData';
import type { Player } from '../entities/Player';
import type { SpecialAbilityData, UpgradeId } from '../types/GameTypes';
import { UpgradeSystem } from './UpgradeSystem';

function createPlayer(
  efficiencyOverrides: Partial<Record<UpgradeId, number>> = {},
  specialAbility: SpecialAbilityData | null = null,
): Player {
  return {
    character: {
      specialAbility,
      attackDamage: 10,
      attackSpeed: 2,
      defense: 3,
      maxHealth: 100,
      attackRange: 200,
      maxAttackRange: 300,
      baseCriticalChance: 0.08,
    },
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
    applyUpgradeVisual: vi.fn(),
    upgradeEfficiency: {
      attackDamage: 1, attackSpeed: 1, defense: 1, maxHealth: 1, attackRange: 1,
      ...efficiencyOverrides,
    },
  } as unknown as Player;
}

describe('UpgradeSystem', () => {
  it('applies all five persistent upgrades to live player stats', () => {
    const player = createPlayer();
    const upgrades = new UpgradeSystem(player);
    const ids: readonly UpgradeId[] = [
      'attackDamage', 'attackSpeed', 'defense', 'maxHealth', 'attackRange',
    ];
    let gold = 10_000;
    for (const id of ids) {
      const result = upgrades.purchase(id, gold);
      expect(result.success).toBe(true);
      gold = result.gold;
      expect(upgrades.getState(id).level).toBe(1);
    }

    expect(player.attackDamage).toBe(12.5);
    expect(player.attackSpeed).toBeCloseTo(2.12);
    expect(player.bonusTargetCount).toBe(0);
    expect(player.defense).toBeCloseTo(3.15);
    expect(player.maxHealth).toBe(120);
    expect(player.health).toBe(100);
    expect(player.attackRange).toBeCloseTo(201.01, 2);
    expect(player.attackAreaRadius).toBe(40);
    expect(upgrades.totalLevels).toBe(5);
    expect(player.applyUpgradeVisual).toHaveBeenLastCalledWith(5);
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
    expect(earlyPlayer.attackDamage).toBeCloseTo(12);
    expect(scalingPlayer.attackDamage).toBeCloseTo(13.38);
  });

  it('recomputes percentage upgrades from immutable base stats without cumulative drift', () => {
    const player = createPlayer({ attackDamage: 1.4 });
    const upgrades = new UpgradeSystem(player);

    for (let level = 0; level < 10; level += 1) {
      expect(upgrades.purchase('attackDamage', 10_000).success).toBe(true);
    }

    expect(player.attackDamage).toBeCloseTo(45);
    expect(upgrades.getEffectLabel('attackDamage')).toBe('기본 공격력 +350%');
  });

  it('grows Arc Ranger range while preserving overcharge level progression', () => {
    const player = createPlayer({ attackRange: 1.25 }, ARC_OVERCHARGE);
    const upgrades = new UpgradeSystem(player);

    expect(upgrades.getEffectLabel('attackRange')).toBe('범위 200/300 · 치명타 8.0%');
    expect(upgrades.purchase('attackRange', 100)).toEqual({ success: true, gold: 61 });
    expect(player.specialAbilityLevel).toBe(1);
    const expectedRange = calculateAttackRangeAtLevel(200, 300, 1, 1.25);
    expect(player.attackRange).toBeCloseTo(expectedRange, 5);
    expect(player.attackAreaRadius).toBe(40);
    expect(upgrades.getEffectLabel('attackRange')).toBe(`범위 ${Math.round(expectedRange)}/300 · 치명타 8.2%`);
  });

  it('allows level 98 to 99 and rejects every purchase beyond the cap', () => {
    const player = createPlayer();
    const upgrades = new UpgradeSystem(player);
    const ids: readonly UpgradeId[] = [
      'attackDamage', 'attackSpeed', 'defense', 'maxHealth', 'attackRange',
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
    expect(player.bonusTargetCount).toBe(0);
    expect(player.attackRange).toBe(300);
  });
});
