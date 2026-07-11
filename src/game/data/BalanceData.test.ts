import { describe, expect, it } from 'vitest';
import { CHARACTERS } from './CharacterData';
import {
  GROWTH_EFFICIENCY_RANGES,
  calculateAverageUpgradeEfficiency,
  calculateBaselineCombatScore,
  calculateProjectedCombatScore,
} from './BalanceData';
import type { GrowthProfile } from '../types/GameTypes';

describe('character growth balance', () => {
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
});
