import { describe, expect, it } from 'vitest';
import { CHARACTERS } from './CharacterData';
import {
  MIN_LATE_STAGE_CLEAR_RATIO,
  MIN_SURVIVABLE_HITS,
  STABLE_COMPLETION_MIN_UPGRADES,
  calculateAllocationTotal,
  getPreCompletionAllocation,
  getRoleCompletionAllocation,
  simulateCompletionReadiness,
  simulateStageCombat,
} from './RunBalanceSimulation';

describe('400-upgrade completion balance', () => {
  it('defines character-specific allocations on the 399 and 400 boundaries', () => {
    const signatures = new Set<string>();
    for (const character of CHARACTERS) {
      const completion = getRoleCompletionAllocation(character);
      expect(calculateAllocationTotal(getPreCompletionAllocation(character)), character.name).toBe(399);
      expect(calculateAllocationTotal(completion), character.name).toBe(STABLE_COMPLETION_MIN_UPGRADES);
      signatures.add(JSON.stringify(completion));
    }
    expect(signatures.size).toBe(CHARACTERS.length);
  });

  it('keeps every role-specific 400-upgrade plan inside the expected run gold budget', () => {
    for (const character of CHARACTERS) {
      const result = simulateCompletionReadiness(character, getRoleCompletionAllocation(character));
      expect(result.totalUpgradeCost, character.name).toBeLessThanOrEqual(result.estimatedRunGold);
    }
  });

  it('requires at least 400 total upgrades for every character', () => {
    for (const character of CHARACTERS) {
      const result = simulateCompletionReadiness(character, getPreCompletionAllocation(character));
      expect(result.totalUpgradeLevels, character.name).toBe(399);
      expect(result.meetsInvestmentTarget, character.name).toBe(false);
      expect(result.isStableCompletionReady, character.name).toBe(false);
    }
  });

  it('lets all six characters meet late-stage offense and survival goals at 400 upgrades', () => {
    for (const character of CHARACTERS) {
      const result = simulateCompletionReadiness(character, getRoleCompletionAllocation(character));
      expect(result.lateStageClearRatio, character.name).toBeGreaterThanOrEqual(MIN_LATE_STAGE_CLEAR_RATIO);
      expect(result.survivableHits, character.name).toBeGreaterThanOrEqual(MIN_SURVIVABLE_HITS);
      expect(result.isAffordable, character.name).toBe(true);
      expect(result.isStableCompletionReady, character.name).toBe(true);
    }
  });

  it('makes every primary role upgrade materially improve its intended stage-100 metric', () => {
    const survivalFocus = new Set(['maxHealth', 'defense']);
    for (const character of CHARACTERS) {
      const allocation = getRoleCompletionAllocation(character);
      const weakened = {
        ...allocation,
        [character.upgradeFocus.primary]: Math.max(0, allocation[character.upgradeFocus.primary] - 10),
      };
      const full = simulateStageCombat(character, allocation, 100);
      const lower = simulateStageCombat(character, weakened, 100);
      if (survivalFocus.has(character.upgradeFocus.primary)) {
        expect(full.survivableHits, character.name).toBeGreaterThan(lower.survivableHits);
      } else {
        expect(full.lateStageClearRatio, character.name).toBeGreaterThan(lower.lateStageClearRatio);
      }
    }
  });
});
