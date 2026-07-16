import { describe, expect, it } from 'vitest';
import { CHARACTERS } from '../data/CharacterData';
import type { UpgradeAllocation } from '../data/RunBalanceSimulation';
import { analyzeUpgradeEfficiency, recommendUpgrade } from './UpgradeRecommendationSystem';

const MID_RUN_LEVELS: UpgradeAllocation = {
  attackDamage: 50,
  attackSpeed: 50,
  defense: 50,
  maxHealth: 50,
  attackRange: 50,
};

describe('UpgradeRecommendationSystem', () => {
  it('finds the most efficient representative fast-clear upgrade for every character', () => {
    const expected = {
      'arc-ranger': 'attackDamage',
      'blade-warden': 'attackDamage',
      'bastion-gunner': 'defense',
      'rune-mage': 'attackSpeed',
      'needle-striker': 'attackDamage',
      'storm-conductor': 'attackSpeed',
    } as const;
    for (const character of CHARACTERS) {
      const recommendation = recommendUpgrade(character, MID_RUN_LEVELS, 50, 100_000, 'FAST_CLEAR');
      expect(recommendation?.id, character.name).toBe(expected[character.id as keyof typeof expected]);
    }
  });

  it('switches to role-aware survival recovery after repeated deaths', () => {
    const expected = {
      'arc-ranger': 'maxHealth',
      'blade-warden': 'maxHealth',
      'bastion-gunner': 'defense',
      'rune-mage': 'maxHealth',
      'needle-striker': 'maxHealth',
      'storm-conductor': 'maxHealth',
    } as const;
    for (const character of CHARACTERS) {
      const recommendation = recommendUpgrade(character, MID_RUN_LEVELS, 50, 100_000);
      expect(recommendation?.id, character.name).toBe(expected[character.id as keyof typeof expected]);
      expect(recommendation?.reason).toContain('효율 1위');
    }
  });

  it('prefers an affordable candidate and reports the best option when none are affordable', () => {
    const character = CHARACTERS.find((entry) => entry.id === 'arc-ranger')!;
    const analyses = analyzeUpgradeEfficiency(character, MID_RUN_LEVELS, 50, 0, 'SURVIVAL_RECOVERY');
    const cheapestCost = Math.min(...analyses.map((entry) => entry.cost));
    const affordable = recommendUpgrade(character, MID_RUN_LEVELS, 50, cheapestCost);
    expect(affordable?.affordable).toBe(true);
    expect(affordable?.cost).toBeLessThanOrEqual(cheapestCost);
    const noneAffordable = recommendUpgrade(character, MID_RUN_LEVELS, 50, 0);
    expect(noneAffordable?.id).toBe(analyses[0]?.id);
    expect(noneAffordable?.affordable).toBe(false);
  });

  it('excludes maxed upgrades and returns null when every option is maxed', () => {
    const character = CHARACTERS[0]!;
    const almostMaxed: UpgradeAllocation = {
      attackDamage: 99, attackSpeed: 99, defense: 99, maxHealth: 98, attackRange: 99,
    };
    expect(recommendUpgrade(character, almostMaxed, 100, 1_000_000)?.id).toBe('maxHealth');
    expect(recommendUpgrade(character, { ...almostMaxed, maxHealth: 99 }, 100, 1_000_000)).toBeNull();
  });

  it('evaluates range growth without mutating the supplied levels', () => {
    const character = CHARACTERS.find((entry) => entry.id === 'blade-warden')!;
    const levels = { ...MID_RUN_LEVELS };
    const before = { ...levels };
    const range = analyzeUpgradeEfficiency(character, levels, 50, 10_000, 'FAST_CLEAR')
      .find((entry) => entry.id === 'attackRange');
    expect(range?.rangeGain).toBeGreaterThan(0);
    expect(levels).toEqual(before);
  });

  it('penalizes cumulative overinvestment and recommends a low-level complement', () => {
    const character = CHARACTERS.find((entry) => entry.id === 'arc-ranger')!;
    const concentrated: UpgradeAllocation = {
      attackDamage: 50, attackSpeed: 1, defense: 1, maxHealth: 1, attackRange: 1,
    };
    const analyses = analyzeUpgradeEfficiency(character, concentrated, 40, 100_000, 'FAST_CLEAR');
    const damage = analyses.find((entry) => entry.id === 'attackDamage')!;
    const recommendation = recommendUpgrade(character, concentrated, 40, 100_000, 'FAST_CLEAR');
    expect(recommendation?.id).not.toBe('attackDamage');
    expect(recommendation?.id).toBe('attackSpeed');
    expect(damage.projectedCostShare).toBeGreaterThan(damage.targetCostShare);
    expect(damage.balanceMultiplier).toBeLessThan(1);
  });

  it('keeps representative character recommendations role-diverse', () => {
    const recommendations = CHARACTERS.map((character) =>
      recommendUpgrade(character, MID_RUN_LEVELS, 50, 100_000, 'FAST_CLEAR')?.id);
    const counts = new Map(recommendations.map((id) => [id, recommendations.filter((entry) => entry === id).length]));
    expect(new Set(recommendations).size).toBeGreaterThanOrEqual(2);
    expect(Math.max(...counts.values())).toBeLessThanOrEqual(4);
  });

  it('changes priorities when each character overinvests in its primary upgrade', () => {
    for (const character of CHARACTERS) {
      const levels: UpgradeAllocation = {
        attackDamage: 1, attackSpeed: 1, defense: 1, maxHealth: 1, attackRange: 1,
        [character.upgradeFocus.primary]: 60,
      };
      const recommendation = recommendUpgrade(character, levels, 50, 100_000, 'FAST_CLEAR');
      expect(recommendation?.id, character.name).not.toBe(character.upgradeFocus.primary);
    }
  });
});
