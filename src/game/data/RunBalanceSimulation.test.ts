import { describe, expect, it } from 'vitest';
import { CHARACTERS, getCharacterById } from './CharacterData';
import { BASIC_ENEMY } from './EnemyData';
import {
  MIN_LATE_STAGE_CLEAR_RATIO,
  MIN_SURVIVABLE_HITS,
  REPRESENTATIVE_COMPLETION_ALLOCATION,
  REPRESENTATIVE_PRE_COMPLETION_ALLOCATION,
  STABLE_COMPLETION_MIN_UPGRADES,
  calculateAllocationTotal,
  simulateCompletionReadiness,
} from './RunBalanceSimulation';
import { calculateStageStats } from './StageData';
import { UPGRADE_DEFINITIONS, calculateUpgradeEffect } from './UpgradeData';

describe('400-upgrade completion balance', () => {
  it('defines representative allocations on the 399 and 400 boundaries', () => {
    expect(calculateAllocationTotal(REPRESENTATIVE_PRE_COMPLETION_ALLOCATION)).toBe(399);
    expect(calculateAllocationTotal(REPRESENTATIVE_COMPLETION_ALLOCATION)).toBe(STABLE_COMPLETION_MIN_UPGRADES);
  });

  it('keeps the representative 400-upgrade plan inside the expected run gold budget', () => {
    const result = simulateCompletionReadiness(CHARACTERS[0]!, REPRESENTATIVE_COMPLETION_ALLOCATION);
    expect(result.totalUpgradeCost).toBeLessThanOrEqual(result.estimatedRunGold);
    expect(result.estimatedRunGold - result.totalUpgradeCost).toBeLessThan(2_000);
  });

  it('requires at least 400 total upgrades for every character', () => {
    for (const character of CHARACTERS) {
      const result = simulateCompletionReadiness(character, REPRESENTATIVE_PRE_COMPLETION_ALLOCATION);
      expect(result.totalUpgradeLevels, character.name).toBe(399);
      expect(result.meetsInvestmentTarget, character.name).toBe(false);
      expect(result.isStableCompletionReady, character.name).toBe(false);
    }
  });

  it('lets all six characters meet late-stage offense and survival goals at 400 upgrades', () => {
    for (const character of CHARACTERS) {
      const result = simulateCompletionReadiness(character, REPRESENTATIVE_COMPLETION_ALLOCATION);
      expect(result.lateStageClearRatio, character.name).toBeGreaterThanOrEqual(MIN_LATE_STAGE_CLEAR_RATIO);
      expect(result.survivableHits, character.name).toBeGreaterThanOrEqual(MIN_SURVIVABLE_HITS);
      expect(result.isAffordable, character.name).toBe(true);
      expect(result.isStableCompletionReady, character.name).toBe(true);
    }
  });

  it('puts the Arc Ranger one-hit breakpoint on the 400th representative upgrade', () => {
    const character = getCharacterById('arc-ranger');
    const enemyHealth = BASIC_ENEMY.health * calculateStageStats(100).enemyHealthMultiplier;
    const damageAt399 = character.attackDamage + calculateUpgradeEffect(
      UPGRADE_DEFINITIONS.attackDamage,
      REPRESENTATIVE_PRE_COMPLETION_ALLOCATION.attackDamage,
      character.upgradeEfficiency.attackDamage,
    );
    const damageAt400 = character.attackDamage + calculateUpgradeEffect(
      UPGRADE_DEFINITIONS.attackDamage,
      REPRESENTATIVE_COMPLETION_ALLOCATION.attackDamage,
      character.upgradeEfficiency.attackDamage,
    );
    expect(damageAt399).toBeLessThan(enemyHealth);
    expect(damageAt400).toBeGreaterThanOrEqual(enemyHealth);
    expect(simulateCompletionReadiness(character, REPRESENTATIVE_PRE_COMPLETION_ALLOCATION).lateStageClearRatio)
      .toBeLessThan(MIN_LATE_STAGE_CLEAR_RATIO);
    expect(simulateCompletionReadiness(character, REPRESENTATIVE_COMPLETION_ALLOCATION).lateStageClearRatio)
      .toBeGreaterThanOrEqual(MIN_LATE_STAGE_CLEAR_RATIO);
  });
});
