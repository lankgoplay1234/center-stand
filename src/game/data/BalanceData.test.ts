import { describe, expect, it } from 'vitest';
import { CHARACTERS } from './CharacterData';
import {
  GROWTH_EFFICIENCY_RANGES,
  FAST_CLEAR_REFERENCE_MS,
  LONG_CLEAR_REFERENCE_MS,
  calculateAverageUpgradeEfficiency,
  calculateBaselineCombatScore,
  calculateProjectedCombatScore,
  estimateWallClockRunMs,
} from './BalanceData';
import type { GrowthProfile } from '../types/GameTypes';
import { UPGRADE_DEFINITIONS, calculateUpgradedStat } from './UpgradeData';

describe('character growth balance', () => {
  it('keeps clear time variable and halves wall time at double speed', () => {
    expect(estimateWallClockRunMs(FAST_CLEAR_REFERENCE_MS)).toBe(20 * 60_000);
    expect(estimateWallClockRunMs(FAST_CLEAR_REFERENCE_MS, 2)).toBe(10 * 60_000);
    expect(estimateWallClockRunMs(LONG_CLEAR_REFERENCE_MS, 1, 5)).toBe(60 * 60_000 + 6_000);
  });

  it('assigns two characters to each growth profile', () => {
    const counts = new Map<GrowthProfile, number>();
    for (const character of CHARACTERS) {
      counts.set(character.growthProfile, (counts.get(character.growthProfile) ?? 0) + 1);
    }
    expect(Object.fromEntries(counts)).toEqual({ STEADY: 2, EARLY: 2, SCALING: 2 });
  });

  it('keeps every character inside its profile efficiency target', () => {
    for (const character of CHARACTERS) {
      const average = calculateAverageUpgradeEfficiency(character);
      const range = GROWTH_EFFICIENCY_RANGES[character.growthProfile];
      expect(average).toBeGreaterThanOrEqual(range.min);
      expect(average).toBeLessThanOrEqual(range.max);
    }
  });

  it('gives early characters a stronger average baseline than scaling characters', () => {
    const averageScore = (profile: GrowthProfile): number => {
      const characters = CHARACTERS.filter((character) => character.growthProfile === profile);
      return characters.reduce((sum, character) => sum + calculateBaselineCombatScore(character), 0) / characters.length;
    };
    expect(averageScore('EARLY')).toBeGreaterThan(averageScore('SCALING'));
    expect(averageScore('SCALING')).toBeLessThan(averageScore('STEADY'));
  });

  it('gives scaling characters the strongest relative growth by levels 50 and 99', () => {
    const averageGrowth = (profile: GrowthProfile, level: number): number => {
      const characters = CHARACTERS.filter((character) => character.growthProfile === profile);
      return characters.reduce((sum, character) =>
        sum + calculateProjectedCombatScore(character, level) / calculateProjectedCombatScore(character, 0), 0) / characters.length;
    };
    for (const level of [50, 99]) {
      expect(averageGrowth('SCALING', level)).toBeGreaterThan(averageGrowth('STEADY', level));
      expect(averageGrowth('STEADY', level)).toBeGreaterThan(averageGrowth('EARLY', level));
    }
  });

  it('keeps character base-stat identities distinct at level 99', () => {
    const finalValues = (id: 'attackDamage' | 'attackSpeed' | 'defense' | 'maxHealth') =>
      CHARACTERS.map((character) => calculateUpgradedStat(
        character[id],
        UPGRADE_DEFINITIONS[id],
        99,
        character.upgradeEfficiency[id],
      ));
    const spread = (values: readonly number[]): number => Math.max(...values) / Math.min(...values);

    expect(spread(finalValues('attackDamage'))).toBeGreaterThan(2);
    expect(spread(finalValues('attackSpeed'))).toBeGreaterThan(3);
    expect(spread(finalValues('defense'))).toBeGreaterThan(10);
    expect(spread(finalValues('maxHealth'))).toBeGreaterThan(3);
  });
});
