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
  it('uses exponential growth with a strict per-level minimum increase', () => {
    const upgrade = UPGRADE_DEFINITIONS.attackDamage;
    expect(calculateUpgradeCost(upgrade, 0)).toBe(20);
    expect(calculateUpgradeCost(upgrade, 1)).toBe(Math.ceil(upgrade.baseCost * upgrade.costGrowth));
    expect(calculateUpgradeCost(upgrade, 4)).toBe(Math.ceil(upgrade.baseCost * upgrade.costGrowth ** 4));
  });

  it('strictly increases at every level for every upgrade', () => {
    for (const id of UPGRADE_ORDER) {
      const definition = UPGRADE_DEFINITIONS[id];
      for (let level = 0; level < MAX_UPGRADE_LEVEL - 1; level += 1) {
        expect(calculateUpgradeCost(definition, level + 1), `${id} level ${level + 1}`)
          .toBeGreaterThan(calculateUpgradeCost(definition, level));
      }
      expect(calculateUpgradeCost(definition, 10)).toBeGreaterThan(calculateUpgradeCost(definition, 1));
      expect(calculateUpgradeCost(definition, 50)).toBeGreaterThan(calculateUpgradeCost(definition, 10));
    }
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
      expect(totalCost).toBeGreaterThan(25_000);
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
    expect(UPGRADE_DEFINITIONS.attackRange.effectLabel(1)).toContain('치명타 +0.2%');
    expect(UPGRADE_DEFINITIONS).not.toHaveProperty('specialAbility');
  });
});
