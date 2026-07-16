import { describe, expect, it } from 'vitest';
import { CHARACTERS } from './CharacterData';
import { analyzeMinimumDeathBuild, calculateBuildUpgradeTotal } from './MinimumDeathBuildSimulation';

const ANALYSES = CHARACTERS.map((character) => ({
  character,
  result: analyzeMinimumDeathBuild(character),
}));

describe('minimum-death completion builds', () => {
  it('builds a deterministic affordable stage-by-stage plan for every character', () => {
    for (const { character, result } of ANALYSES) {
      expect(result.stageAllocations, character.name).toHaveLength(100);
      expect(result.purchases, character.name).toHaveLength(495);
      expect(calculateBuildUpgradeTotal(result), character.name).toBe(495);
      expect(result.remainingGold, character.name).toBeGreaterThanOrEqual(0);
      expect(result.completion.isStableCompletionReady, character.name).toBe(true);
      expect(analyzeMinimumDeathBuild(character, 4).priorityWeights).toEqual(result.priorityWeights);
    }
  });

  it('records the higher death pressure caused by the reduced stage reward budget', () => {
    const averages = ANALYSES.map(({ character, result }) => {
      expect(result.averageDeaths, character.name).toBeGreaterThanOrEqual(50);
      expect(result.averageDeaths, character.name).toBeLessThanOrEqual(80);
      return result.averageDeaths;
    });
    expect(Math.max(...averages) - Math.min(...averages)).toBeLessThanOrEqual(30);
    expect(averages.reduce((sum, deaths) => sum + deaths, 0) / averages.length)
      .toBeCloseTo(70, -1);
  });

  it('records distinct role-aware priorities and nonzero early, middle, and late deaths', () => {
    const signatures = new Set(ANALYSES.map(({ result }) => JSON.stringify(result.priorityWeights)));
    expect(signatures.size).toBeGreaterThanOrEqual(3);
    for (const { character, result } of ANALYSES) {
      expect(result.stageProfile.early, character.name).toBeGreaterThan(0);
      expect(result.stageProfile.middle, character.name).toBeGreaterThan(0);
      expect(result.stageProfile.late, character.name).toBeGreaterThan(0);
      expect(result.stageProfile.total, character.name).toBeCloseTo(result.averageDeaths, 0);
    }
    const earlyShares = ANALYSES.map(({ result }) => result.stageProfile.early / result.stageProfile.total);
    expect(Math.max(...earlyShares) - Math.min(...earlyShares)).toBeGreaterThan(0.15);
    expect(new Set(ANALYSES.map(({ result }) => result.stageProfile.peakBand)))
      .toEqual(new Set(['EARLY', 'LATE']));
  });
});
