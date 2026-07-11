import { calculateMobClearCost } from '../data/MobClearData';

export interface MobClearState {
  usageCount: number;
  currentCost: number;
}

export interface MobClearPurchaseResult {
  success: boolean;
  gold: number;
  clearedEnemies: number;
  rewardGold: number;
  stageKills: number;
}

export interface MobClearOutcome {
  clearedEnemies: number;
  rewardGold: number;
  stageKills: number;
}

export class MobClearSystem {
  private usageCount = 0;

  get state(): MobClearState {
    return {
      usageCount: this.usageCount,
      currentCost: calculateMobClearCost(this.usageCount),
    };
  }

  purchase(gold: number, activeEnemies: number, clearEnemies: () => MobClearOutcome): MobClearPurchaseResult {
    const currentCost = calculateMobClearCost(this.usageCount);
    if (activeEnemies <= 0 || gold < currentCost) {
      return { success: false, gold, clearedEnemies: 0, rewardGold: 0, stageKills: 0 };
    }
    const outcome = clearEnemies();
    if (outcome.clearedEnemies <= 0) {
      return { success: false, gold, clearedEnemies: 0, rewardGold: 0, stageKills: 0 };
    }
    this.usageCount += 1;
    return {
      success: true,
      gold: gold - currentCost + outcome.rewardGold,
      clearedEnemies: outcome.clearedEnemies,
      rewardGold: outcome.rewardGold,
      stageKills: outcome.stageKills,
    };
  }
}
