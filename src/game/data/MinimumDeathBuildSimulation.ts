import type { CharacterData, UpgradeId } from '../types/GameTypes';
import {
  calculateStageBandDeathProfile,
  simulateRunDeaths,
  type StageBandDeathProfile,
} from './DeathBalanceSimulation';
import {
  calculateAllocationTotal,
  estimateStageGold,
  simulateCompletionReadiness,
  type CompletionReadiness,
  type UpgradeAllocation,
} from './RunBalanceSimulation';
import {
  UPGRADE_DEFINITIONS,
  UPGRADE_ORDER,
  calculateUpgradeCost,
  canUpgrade,
} from './UpgradeData';
export interface MinimumDeathPurchase {
  stage: number;
  id: UpgradeId;
  level: number;
  cost: number;
}

export interface MinimumDeathBuildPlan {
  stageAllocations: readonly UpgradeAllocation[];
  purchases: readonly MinimumDeathPurchase[];
  finalAllocation: UpgradeAllocation;
  spentGold: number;
  remainingGold: number;
  priorityWeights: Readonly<Record<UpgradeId, number>>;
}

export interface MinimumDeathBuildAnalysis extends MinimumDeathBuildPlan {
  averageDeaths: number;
  minDeaths: number;
  maxDeaths: number;
  stageProfile: StageBandDeathProfile;
  completion: CompletionReadiness;
}

const DEFAULT_ANALYSIS_SAMPLES = 24;
const PRIORITY_WEIGHT_OPTIONS = [1, 2, 4] as const;

function emptyAllocation(): Record<UpgradeId, number> {
  return { attackDamage: 0, attackSpeed: 0, defense: 0, maxHealth: 0, attackRange: 0 };
}

function buildWeightedPlan(priorityWeights: Readonly<Record<UpgradeId, number>>): MinimumDeathBuildPlan {
  const allocation = emptyAllocation();
  const stageAllocations: UpgradeAllocation[] = [];
  const purchases: MinimumDeathPurchase[] = [];
  let gold = 0;
  let spentGold = 0;

  for (let stage = 1; stage <= 100; stage += 1) {
    gold += estimateStageGold(stage);
    while (true) {
      const candidates = UPGRADE_ORDER.flatMap((id) => {
        const definition = UPGRADE_DEFINITIONS[id];
        const level = allocation[id];
        const cost = calculateUpgradeCost(definition, level);
        if (cost > gold || !canUpgrade(definition, level)) return [];
        return [{ id, cost, progress: (level + 1) / priorityWeights[id] }];
      }).sort((left, right) => left.progress - right.progress
        || UPGRADE_ORDER.indexOf(left.id) - UPGRADE_ORDER.indexOf(right.id));
      const best = candidates[0];
      if (!best) break;
      allocation[best.id] += 1;
      gold -= best.cost;
      spentGold += best.cost;
      purchases.push({ stage, id: best.id, level: allocation[best.id], cost: best.cost });
    }
    stageAllocations.push({ ...allocation });
  }

  return {
    stageAllocations,
    purchases,
    finalAllocation: { ...allocation },
    spentGold,
    remainingGold: gold,
    priorityWeights,
  };
}

function buildPriorityWeightCandidates(): readonly Readonly<Record<UpgradeId, number>>[] {
  const candidates: Record<UpgradeId, number>[] = [];
  for (const attackDamage of PRIORITY_WEIGHT_OPTIONS) {
    for (const attackSpeed of PRIORITY_WEIGHT_OPTIONS) {
      for (const defense of PRIORITY_WEIGHT_OPTIONS) {
        for (const maxHealth of PRIORITY_WEIGHT_OPTIONS) {
          for (const attackRange of PRIORITY_WEIGHT_OPTIONS) {
            candidates.push({ attackDamage, attackSpeed, defense, maxHealth, attackRange });
          }
        }
      }
    }
  }
  return candidates;
}

const PRIORITY_WEIGHT_CANDIDATES = buildPriorityWeightCandidates();

export function buildMinimumDeathPlan(character: CharacterData): MinimumDeathBuildPlan {
  let bestPlan: MinimumDeathBuildPlan | null = null;
  let bestDeaths = Number.POSITIVE_INFINITY;
  for (const priorityWeights of PRIORITY_WEIGHT_CANDIDATES) {
    const plan = buildWeightedPlan(priorityWeights);
    const deaths = calculateStageBandDeathProfile(character, plan.stageAllocations).total;
    if (deaths < bestDeaths) {
      bestPlan = plan;
      bestDeaths = deaths;
    }
  }
  if (!bestPlan) throw new Error(`Unable to build minimum-death plan for ${character.id}`);
  return bestPlan;
}

export function analyzeMinimumDeathBuild(
  character: CharacterData,
  sampleCount = DEFAULT_ANALYSIS_SAMPLES,
): MinimumDeathBuildAnalysis {
  const plan = buildMinimumDeathPlan(character);
  const safeSampleCount = Math.max(1, Math.floor(sampleCount));
  const samples = Array.from(
    { length: safeSampleCount },
    (_, index) => simulateRunDeaths(character, index + 1, plan.stageAllocations),
  );
  return {
    ...plan,
    averageDeaths: samples.reduce((sum, deaths) => sum + deaths, 0) / samples.length,
    minDeaths: Math.min(...samples),
    maxDeaths: Math.max(...samples),
    stageProfile: calculateStageBandDeathProfile(character, plan.stageAllocations),
    completion: simulateCompletionReadiness(character, plan.finalAllocation),
  };
}

export function calculateBuildUpgradeTotal(plan: MinimumDeathBuildPlan): number {
  return calculateAllocationTotal(plan.finalAllocation);
}
