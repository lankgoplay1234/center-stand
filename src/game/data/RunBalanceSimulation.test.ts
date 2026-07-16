import { describe, expect, it } from 'vitest';
import { CHARACTERS } from './CharacterData';
import {
  MIN_LATE_STAGE_CLEAR_RATIO,
  MIN_SURVIVABLE_HITS,
  STABLE_COMPLETION_MIN_UPGRADES,
  calculateAllocationCost,
  calculateAllocationTotal,
  getPreCompletionAllocation,
  getRoleCompletionAllocation,
  estimateRunClearTimeMs,
  estimateRunGold,
  simulateCompletionReadiness,
  simulateStageCombat,
} from './RunBalanceSimulation';

describe('400-upgrade completion balance', () => {
  it('estimates the reduced stage-scaled monster reward budget', () => {
    expect(estimateRunGold()).toBe(188_210);
  });

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

  it('keeps high-pressure clear times finite and sensitive to upgrade choices', () => {
    for (const character of CHARACTERS) {
      const fastMinutes = estimateRunClearTimeMs(character, getRoleCompletionAllocation(character)) / 60_000;
      expect(fastMinutes, character.name).toBeGreaterThanOrEqual(11);
      expect(fastMinutes, character.name).toBeLessThanOrEqual(90);
    }
    const arc = CHARACTERS.find((character) => character.id === 'arc-ranger')!;
    const poorAllocation = {
      attackDamage: 99,
      attackSpeed: 4,
      defense: 99,
      maxHealth: 99,
      attackRange: 99,
    } as const;
    expect(calculateAllocationTotal(poorAllocation)).toBe(400);
    expect(estimateRunClearTimeMs(arc, poorAllocation)).toBeGreaterThanOrEqual(60 * 60_000);
  });

  it('makes a mixed offensive build cheaper and faster than damage overinvestment', () => {
    const arc = CHARACTERS.find((character) => character.id === 'arc-ranger')!;
    const concentrated = {
      attackDamage: 50, attackSpeed: 1, defense: 1, maxHealth: 1, attackRange: 1,
    } as const;
    const mixed = {
      attackDamage: 30, attackSpeed: 20, defense: 1, maxHealth: 1, attackRange: 10,
    } as const;
    expect(calculateAllocationCost(mixed)).toBeLessThan(calculateAllocationCost(concentrated));
    expect(estimateRunClearTimeMs(arc, mixed)).toBeLessThan(estimateRunClearTimeMs(arc, concentrated));
  });
});
