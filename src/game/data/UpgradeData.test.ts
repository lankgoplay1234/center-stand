import { describe, expect, it } from 'vitest';
import {
  MAX_UPGRADE_LEVEL,
  UPGRADE_DEFINITIONS,
  UPGRADE_ORDER,
  calculateTotalUpgradeCost,
  calculateUpgradeCost,
  canUpgrade,
} from './UpgradeData';

describe('upgrade cost', () => {
  it('uses floor(baseCost × costGrowth ^ level)', () => {
    const upgrade = UPGRADE_DEFINITIONS.attackDamage;
    expect(calculateUpgradeCost(upgrade, 0)).toBe(20);
    expect(calculateUpgradeCost(upgrade, 1)).toBe(Math.floor(upgrade.baseCost * upgrade.costGrowth));
    expect(calculateUpgradeCost(upgrade, 4)).toBe(Math.floor(upgrade.baseCost * upgrade.costGrowth ** 4));
  });

  it('increases with each level', () => {
    const upgrade = UPGRADE_DEFINITIONS.defense;
    expect(calculateUpgradeCost(upgrade, 2)).toBeGreaterThan(calculateUpgradeCost(upgrade, 1));
  });

  it('defines the five persistent upgrades with a level 99 cap in display order', () => {
    expect(UPGRADE_ORDER).toEqual([
      'attackDamage', 'attackSpeed', 'defense', 'maxHealth', 'attackRange',
    ]);
    for (const id of UPGRADE_ORDER) {
      const definition = UPGRADE_DEFINITIONS[id];
      expect(definition.maxLevel).toBe(MAX_UPGRADE_LEVEL);
      expect(canUpgrade(definition, 98)).toBe(true);
      expect(canUpgrade(definition, 99)).toBe(false);
    }
  });

  it('keeps level 99 costs finite and balanced for a single run', () => {
    for (const id of UPGRADE_ORDER) {
      const totalCost = calculateTotalUpgradeCost(UPGRADE_DEFINITIONS[id], MAX_UPGRADE_LEVEL);
      expect(totalCost).toBeGreaterThan(30_000);
      expect(totalCost).toBeLessThan(60_000);
      expect(Number.isSafeInteger(totalCost)).toBe(true);
    }
  });

  it('does not expose target count as a persistent upgrade', () => {
    expect(UPGRADE_ORDER).not.toContain('targetCount');
    expect(UPGRADE_DEFINITIONS).not.toHaveProperty('targetCount');
  });

  it('names the former special upgrade as attack range', () => {
    expect(UPGRADE_DEFINITIONS.attackRange.name).toBe('공격가능범위');
    expect(UPGRADE_DEFINITIONS).not.toHaveProperty('specialAbility');
  });
});
