import { describe, expect, it } from 'vitest';
import { CHARACTERS } from './CharacterData';
import {
  buildRepresentativeStageAllocations,
  simulateDeathSamples,
} from './DeathBalanceSimulation';
import { STABLE_COMPLETION_MIN_UPGRADES, calculateAllocationTotal } from './RunBalanceSimulation';
import { analyzeMinimumDeathBuild } from './MinimumDeathBuildSimulation';

describe('50-death run balance', () => {
  it('spends the expected run gold into the 400-upgrade completion plan', () => {
    for (const character of CHARACTERS) {
      const allocations = buildRepresentativeStageAllocations(character);
      expect(allocations).toHaveLength(100);
      expect(calculateAllocationTotal(allocations.at(-1)!), character.name).toBe(STABLE_COMPLETION_MIN_UPGRADES);
    }
  });

  it('keeps the legacy 400-upgrade role plan no safer than the optimized completion build', () => {
    for (const character of CHARACTERS) {
      const summary = simulateDeathSamples(character);
      const optimized = analyzeMinimumDeathBuild(character, 8);
      expect(summary.averageDeaths, character.name).toBeGreaterThanOrEqual(optimized.averageDeaths);
      expect(summary.finalUpgradeLevels, character.name).toBe(STABLE_COMPLETION_MIN_UPGRADES);
    }
  });

  it('is deterministic for the same repeated sample set', () => {
    for (const character of CHARACTERS) {
      expect(simulateDeathSamples(character, 8)).toEqual(simulateDeathSamples(character, 8));
    }
  });
});
