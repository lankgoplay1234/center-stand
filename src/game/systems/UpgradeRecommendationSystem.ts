import { calculateAttackRangeAtLevel } from '../data/AttackRangeData';
import { simulateStageCombat, type UpgradeAllocation } from '../data/RunBalanceSimulation';
import {
  UPGRADE_DEFINITIONS,
  UPGRADE_ORDER,
  calculateUpgradeCost,
  calculateUpgradeEffect,
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
  return Math.max(0, (next - current) / Math.max(0.000_001, current));
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
  );

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
    const focusMultiplier = id === character.upgradeFocus.primary
      ? 1.16
      : id === character.upgradeFocus.secondary ? 1.07 : 1;
    const weightedGain = mode === 'FAST_CLEAR'
      ? offenseGain * 1.35 + survivalGain * 0.45 + rangeGain * 0.8
      : offenseGain * 0.65 + survivalGain * 1.6 + rangeGain;
    const score = weightedGain * focusMultiplier * 1_000 / Math.max(1, cost);
    return [{
      id,
      name: definition.name,
      level,
      cost,
      affordable: gold >= cost,
      offenseGain,
      survivalGain,
      rangeGain,
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
