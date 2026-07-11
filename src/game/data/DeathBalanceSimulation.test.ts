import { describe, expect, it } from 'vitest';
import { CHARACTERS } from './CharacterData';
import {
  MAX_CHARACTER_DEATH_SPREAD,
  MAX_TARGET_DEATHS,
  MIN_TARGET_DEATHS,
  TARGET_AVERAGE_DEATHS,
  buildRepresentativeStageAllocations,
  simulateDeathSamples,
} from './DeathBalanceSimulation';
import { STABLE_COMPLETION_MIN_UPGRADES, calculateAllocationTotal } from './RunBalanceSimulation';

describe('50-death run balance', () => {
  it('spends the expected run gold into the 400-upgrade completion plan', () => {
    const allocations = buildRepresentativeStageAllocations();
    expect(allocations).toHaveLength(100);
    expect(calculateAllocationTotal(allocations.at(-1)!)).toBe(STABLE_COMPLETION_MIN_UPGRADES);
  });

  it('keeps every character average inside the 40 to 60 death target', () => {
    const averages = CHARACTERS.map((character) => {
      const summary = simulateDeathSamples(character);
      expect(summary.averageDeaths, character.name).toBeGreaterThanOrEqual(MIN_TARGET_DEATHS);
      expect(summary.averageDeaths, character.name).toBeLessThanOrEqual(MAX_TARGET_DEATHS);
      expect(summary.finalUpgradeLevels, character.name).toBe(STABLE_COMPLETION_MIN_UPGRADES);
      return summary.averageDeaths;
    });
    expect(Math.max(...averages) - Math.min(...averages)).toBeLessThanOrEqual(MAX_CHARACTER_DEATH_SPREAD);
    expect(averages.reduce((sum, value) => sum + value, 0) / averages.length)
      .toBeCloseTo(TARGET_AVERAGE_DEATHS, -1);
  });

  it('is deterministic for the same repeated sample set', () => {
    for (const character of CHARACTERS) {
      expect(simulateDeathSamples(character, 8)).toEqual(simulateDeathSamples(character, 8));
    }
  });
});
