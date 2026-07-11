import { calculateAttackRangeAtLevel } from '../data/AttackRangeData';
import { simulateStageCombat, type UpgradeAllocation } from '../data/RunBalanceSimulation';
import {
  UPGRADE_DEFINITIONS,
  UPGRADE_ORDER,
  calculateUpgradeCost,
  calculateUpgradeEffect,
  calculateTotalUpgradeCost,
  canUpgrade,
} from '../data/UpgradeData';
import type { AttackType, CharacterData, UpgradeId } from '../types/GameTypes';

export const STAGE_DEATH_RECOMMENDATION_THRESHOLD = 5;

export type RecommendationMode = 'FAST_CLEAR' | 'SURVIVAL_RECOVERY';

export interface UpgradeEfficiencyAnalysis {
  id: UpgradeId;
  name: string;
  level: number;
  cost: number;
  affordable: boolean;
  offenseGain: number;
  survivalGain: number;
  rangeGain: number;
  investedCost: number;
  projectedCostShare: number;
  targetCostShare: number;
  balanceMultiplier: number;
  score: number;
  reason: string;
}

const RANGE_UTILITY: Readonly<Record<AttackType, number>> = {
  SINGLE_TARGET: 0.75,
  MULTI_TARGET: 1.35,
  AREA_MELEE: 1.5,
  AREA_MAGIC: 0.9,
  PIERCING: 0.65,
  CHAIN: 0.85,
};

function relativeGain(current: number, next: number): number {
  return Math.max(0, Math.log(Math.max(0.000_001, next) / Math.max(0.000_001, current)));
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function modeRelevance(id: UpgradeId, mode: RecommendationMode): number {
  if (id === 'attackDamage' || id === 'attackSpeed') return mode === 'FAST_CLEAR' ? 1.25 : 0.7;
  if (id === 'defense' || id === 'maxHealth') return mode === 'FAST_CLEAR' ? 0.7 : 1.35;
  return mode === 'FAST_CLEAR' ? 1 : 0.9;
}

function targetInvestmentShares(
  character: CharacterData,
  mode: RecommendationMode,
): Readonly<Record<UpgradeId, number>> {
  const weights = Object.fromEntries(UPGRADE_ORDER.map((id) => {
    const focus = id === character.upgradeFocus.primary
      ? 1.2
      : id === character.upgradeFocus.secondary ? 1.08 : 1;
    return [id, character.upgradeEfficiency[id] * focus * modeRelevance(id, mode)];
  })) as Record<UpgradeId, number>;
  const total = UPGRADE_ORDER.reduce((sum, id) => sum + weights[id], 0);
  return Object.fromEntries(UPGRADE_ORDER.map((id) => [id, weights[id] / total])) as Record<UpgradeId, number>;
}

function nextAllocation(levels: UpgradeAllocation, id: UpgradeId): UpgradeAllocation {
  return { ...levels, [id]: levels[id] + 1 };
}

function estimateContinuousOffense(character: CharacterData, levels: UpgradeAllocation): number {
  const damage = character.attackDamage + calculateUpgradeEffect(
    UPGRADE_DEFINITIONS.attackDamage,
    levels.attackDamage,
    character.upgradeEfficiency.attackDamage,
  );
  const speed = character.attackSpeed + calculateUpgradeEffect(
    UPGRADE_DEFINITIONS.attackSpeed,
    levels.attackSpeed,
    character.upgradeEfficiency.attackSpeed,
  );
  return damage * speed * Math.max(1, character.baseTargetCount);
}

function buildReason(offenseGain: number, survivalGain: number, rangeGain: number): string {
  const dominant = Math.max(offenseGain, survivalGain, rangeGain);
  if (dominant === survivalGain) return '비용 대비 생존 효율 1위';
  if (dominant === rangeGain) return '비용 대비 선제 교전 효율 1위';
  return '비용 대비 적 처리 효율 1위';
}

export function analyzeUpgradeEfficiency(
  character: CharacterData,
  levels: UpgradeAllocation,
  stage: number,
  gold: number,
  mode: RecommendationMode,
): readonly UpgradeEfficiencyAnalysis[] {
  const currentCombat = simulateStageCombat(character, levels, stage);
  const currentOffense = estimateContinuousOffense(character, levels);
  const currentRange = calculateAttackRangeAtLevel(
    character.attackRange,
    character.maxAttackRange,
    levels.attackRange,
    character.upgradeEfficiency.attackRange,
  );
  const investedCosts = Object.fromEntries(UPGRADE_ORDER.map((id) => [
    id,
    calculateTotalUpgradeCost(UPGRADE_DEFINITIONS[id], levels[id]),
  ])) as Record<UpgradeId, number>;
  const totalInvestedCost = UPGRADE_ORDER.reduce((sum, id) => sum + investedCosts[id], 0);
  const targetShares = targetInvestmentShares(character, mode);

  return UPGRADE_ORDER.flatMap((id) => {
    const definition = UPGRADE_DEFINITIONS[id];
    const level = levels[id];
    if (!canUpgrade(definition, level)) return [];
    const nextLevels = nextAllocation(levels, id);
    const nextCombat = simulateStageCombat(character, nextLevels, stage);
    const nextRange = calculateAttackRangeAtLevel(
      character.attackRange,
      character.maxAttackRange,
      nextLevels.attackRange,
      character.upgradeEfficiency.attackRange,
    );
    const offenseGain = Math.max(
      relativeGain(currentCombat.lateStageClearRatio, nextCombat.lateStageClearRatio),
      relativeGain(currentOffense, estimateContinuousOffense(character, nextLevels)),
    );
    const survivalGain = relativeGain(currentCombat.survivableHits, nextCombat.survivableHits);
    const rangeGain = id === 'attackRange'
      ? relativeGain(currentRange, nextRange) * RANGE_UTILITY[character.attackType]
      : 0;
    const cost = calculateUpgradeCost(definition, level);
    const projectedCostShare = (investedCosts[id] + cost) / Math.max(1, totalInvestedCost + cost);
    const targetCostShare = targetShares[id];
    const balanceMultiplier = clamp(Math.sqrt(targetCostShare / Math.max(0.01, projectedCostShare)), 0.65, 1.6);
    const weightedGain = mode === 'FAST_CLEAR'
      ? offenseGain * 1.35 + survivalGain * 0.45 + rangeGain * 0.8
      : offenseGain * 0.65 + survivalGain * 1.6 + rangeGain;
    const score = weightedGain * balanceMultiplier * 1_000 / Math.max(1, cost);
    return [{
      id,
      name: definition.name,
      level,
      cost,
      affordable: gold >= cost,
      offenseGain,
      survivalGain,
      rangeGain,
      investedCost: investedCosts[id],
      projectedCostShare,
      targetCostShare,
      balanceMultiplier,
      score,
      reason: buildReason(offenseGain, survivalGain, rangeGain),
    }];
  }).sort((left, right) => right.score - left.score || UPGRADE_ORDER.indexOf(left.id) - UPGRADE_ORDER.indexOf(right.id));
}

export function recommendUpgrade(
  character: CharacterData,
  levels: UpgradeAllocation,
  stage: number,
  gold: number,
  mode: RecommendationMode = 'SURVIVAL_RECOVERY',
): UpgradeEfficiencyAnalysis | null {
  const analyses = analyzeUpgradeEfficiency(character, levels, stage, gold, mode);
  return analyses.find((entry) => entry.affordable) ?? analyses[0] ?? null;
}
