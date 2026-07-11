import type { CharacterData, UpgradeId } from '../types/GameTypes';
import {
  estimateStageClearTimeMs,
  estimateStageGold,
  type UpgradeAllocation,
} from './RunBalanceSimulation';
import {
  UPGRADE_DEFINITIONS,
  calculateUpgradeCost,
  canUpgrade,
} from './UpgradeData';

export interface FastClearSimulationResult {
  clearTimeMs: number;
  spentGold: number;
  remainingGold: number;
  allocation: UpgradeAllocation;
}

const FAST_CLEAR_UPGRADES: readonly UpgradeId[] = ['attackDamage', 'attackSpeed', 'attackRange'];

function emptyAllocation(): Record<UpgradeId, number> {
  return { attackDamage: 0, attackSpeed: 0, defense: 0, maxHealth: 0, attackRange: 0 };
}

function estimateRemainingTimeMs(
  character: CharacterData,
  allocation: UpgradeAllocation,
  nextStage: number,
): number {
  let total = 0;
  for (let stage = nextStage; stage <= 100; stage += 1) {
    total += estimateStageClearTimeMs(character, allocation, stage);
  }
  return total;
}

export function simulateFastestClearPath(character: CharacterData): FastClearSimulationResult {
  const allocation = emptyAllocation();
  let clearTimeMs = 0;
  let gold = 0;
  let spentGold = 0;

  for (let stage = 1; stage <= 100; stage += 1) {
    clearTimeMs += estimateStageClearTimeMs(character, allocation, stage);
    gold += estimateStageGold(stage);

    while (stage < 100) {
      const currentRemainingTime = estimateRemainingTimeMs(character, allocation, stage + 1);
      const candidates = FAST_CLEAR_UPGRADES.flatMap((id) => {
        const definition = UPGRADE_DEFINITIONS[id];
        const level = allocation[id];
        const cost = calculateUpgradeCost(definition, level);
        if (cost > gold || !canUpgrade(definition, level)) return [];
        const nextAllocation = { ...allocation, [id]: level + 1 };
        const timeSaved = currentRemainingTime
          - estimateRemainingTimeMs(character, nextAllocation, stage + 1);
        if (timeSaved <= 0) return [];
        return [{ id, cost, value: timeSaved / cost }];
      }).sort((left, right) => right.value - left.value
        || FAST_CLEAR_UPGRADES.indexOf(left.id) - FAST_CLEAR_UPGRADES.indexOf(right.id));
      const best = candidates[0];
      if (!best) break;
      allocation[best.id] += 1;
      gold -= best.cost;
      spentGold += best.cost;
    }
  }

  return { clearTimeMs, spentGold, remainingGold: gold, allocation };
}
