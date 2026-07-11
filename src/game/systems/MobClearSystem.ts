import { MOB_CLEAR_MAX_USES, calculateMobClearCost } from '../data/MobClearData';

export interface MobClearState {
  usageCount: number;
  currentCost: number;
  maxUses: number;
  isMaxed: boolean;
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
      maxUses: MOB_CLEAR_MAX_USES,
      isMaxed: this.usageCount >= MOB_CLEAR_MAX_USES,
    };
  }

  purchase(gold: number, activeEnemies: number, clearEnemies: () => MobClearOutcome): MobClearPurchaseResult {
    const currentCost = calculateMobClearCost(this.usageCount);
    if (this.usageCount >= MOB_CLEAR_MAX_USES || activeEnemies <= 0 || gold < currentCost) {
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
