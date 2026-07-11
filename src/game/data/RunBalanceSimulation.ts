import type { CharacterData, UpgradeId } from '../types/GameTypes';
import { BASIC_ENEMY } from './EnemyData';
import { calculateOverchargeDamageMultiplier } from './SpecialAbilityData';
import { calculateStageStats, getStageDurationMs } from './StageData';
import {
  MAX_UPGRADE_LEVEL,
  UPGRADE_DEFINITIONS,
  UPGRADE_ORDER,
  calculateSecondaryUpgradeEffect,
  calculateTotalUpgradeCost,
  calculateUpgradeEffect,
} from './UpgradeData';

export type UpgradeAllocation = Readonly<Record<UpgradeId, number>>;

export interface CompletionReadiness {
  totalUpgradeLevels: number;
  totalUpgradeCost: number;
  estimatedRunGold: number;
  lateStageClearRatio: number;
  survivableHits: number;
  meetsInvestmentTarget: boolean;
  isAffordable: boolean;
  isStableCompletionReady: boolean;
}

export interface StageCombatSnapshot {
  stage: number;
  maxHealth: number;
  defense: number;
  enemyDamage: number;
  lateStageClearRatio: number;
  survivableHits: number;
}

export const STABLE_COMPLETION_MIN_UPGRADES = 400;
export const EXPECTED_RUN_KILL_RATIO = 0.58;
export const MIN_LATE_STAGE_CLEAR_RATIO = 1;
export const MIN_SURVIVABLE_HITS = 8;

export const REPRESENTATIVE_COMPLETION_ALLOCATION: UpgradeAllocation = {
  attackDamage: 72,
  attackSpeed: 72,
  targetCount: 55,
  defense: 68,
  maxHealth: 72,
  specialAbility: 61,
};

export const REPRESENTATIVE_PRE_COMPLETION_ALLOCATION: UpgradeAllocation = {
  ...REPRESENTATIVE_COMPLETION_ALLOCATION,
  attackDamage: REPRESENTATIVE_COMPLETION_ALLOCATION.attackDamage - 1,
};

function safeLevel(level: number): number {
  return Math.min(MAX_UPGRADE_LEVEL, Math.max(0, Math.floor(level)));
}

export function calculateAllocationTotal(allocation: UpgradeAllocation): number {
  return UPGRADE_ORDER.reduce((sum, id) => sum + safeLevel(allocation[id]), 0);
}

export function calculateAllocationCost(allocation: UpgradeAllocation): number {
  return UPGRADE_ORDER.reduce(
    (sum, id) => sum + calculateTotalUpgradeCost(UPGRADE_DEFINITIONS[id], safeLevel(allocation[id])),
    0,
  );
}

export function estimateRunSpawnCount(): number {
  let total = 0;
  for (let stage = 1; stage <= 100; stage += 1) {
    total += Math.floor(getStageDurationMs(stage) / calculateStageStats(stage).spawnInterval);
  }
  return total;
}

export function estimateRunGold(killRatio = EXPECTED_RUN_KILL_RATIO): number {
  const safeRatio = Math.min(1, Math.max(0, killRatio));
  return Math.floor(estimateRunSpawnCount() * safeRatio) * BASIC_ENEMY.goldReward;
}

function calculateTargetCapacity(character: CharacterData, allocation: UpgradeAllocation): number {
  const targetBonus = Math.round(calculateUpgradeEffect(
    UPGRADE_DEFINITIONS.targetCount,
    allocation.targetCount,
    character.upgradeEfficiency.targetCount,
  ));
  if (character.attackType === 'SINGLE_TARGET') return 1;
  if (character.attackType === 'MULTI_TARGET' || character.attackType === 'PIERCING' || character.attackType === 'CHAIN') {
    return character.baseTargetCount + targetBonus;
  }
  const radiusBonus = calculateSecondaryUpgradeEffect(
    UPGRADE_DEFINITIONS.specialAbility,
    allocation.specialAbility,
    character.upgradeEfficiency.specialAbility,
  );
  return Math.max(1, Math.floor((character.attackAreaRadius + radiusBonus) / 48));
}

function calculateAverageDamageMultiplier(character: CharacterData, allocation: UpgradeAllocation): number {
  const ability = character.specialAbility;
  if (ability?.type !== 'ARC_OVERCHARGE') return 1;
  const overchargeMultiplier = calculateOverchargeDamageMultiplier(
    ability,
    allocation.specialAbility,
    character.upgradeEfficiency.specialAbility,
  );
  return ((ability.triggerEveryAttacks - 1) + overchargeMultiplier) / ability.triggerEveryAttacks;
}

export function simulateCompletionReadiness(
  character: CharacterData,
  allocation: UpgradeAllocation,
): CompletionReadiness {
  const combat = simulateStageCombat(character, allocation, 100);
  const totalUpgradeLevels = calculateAllocationTotal(allocation);
  const totalUpgradeCost = calculateAllocationCost(allocation);
  const estimatedRunGold = estimateRunGold();
  const meetsInvestmentTarget = totalUpgradeLevels >= STABLE_COMPLETION_MIN_UPGRADES;
  const isAffordable = totalUpgradeCost <= estimatedRunGold;

  return {
    totalUpgradeLevels,
    totalUpgradeCost,
    estimatedRunGold,
    lateStageClearRatio: combat.lateStageClearRatio,
    survivableHits: combat.survivableHits,
    meetsInvestmentTarget,
    isAffordable,
    isStableCompletionReady:
      meetsInvestmentTarget
      && isAffordable
      && combat.lateStageClearRatio >= MIN_LATE_STAGE_CLEAR_RATIO
      && combat.survivableHits >= MIN_SURVIVABLE_HITS,
  };
}

export function simulateStageCombat(
  character: CharacterData,
  allocation: UpgradeAllocation,
  stage: number,
): StageCombatSnapshot {
  const stageStats = calculateStageStats(stage);
  const damage = character.attackDamage + calculateUpgradeEffect(
    UPGRADE_DEFINITIONS.attackDamage,
    allocation.attackDamage,
    character.upgradeEfficiency.attackDamage,
  );
  const attackSpeed = character.attackSpeed + calculateUpgradeEffect(
    UPGRADE_DEFINITIONS.attackSpeed,
    allocation.attackSpeed,
    character.upgradeEfficiency.attackSpeed,
  );
  const defense = character.defense + calculateUpgradeEffect(
    UPGRADE_DEFINITIONS.defense,
    allocation.defense,
    character.upgradeEfficiency.defense,
  );
  const maxHealth = character.maxHealth + calculateUpgradeEffect(
    UPGRADE_DEFINITIONS.maxHealth,
    allocation.maxHealth,
    character.upgradeEfficiency.maxHealth,
  );
  const enemyHealth = BASIC_ENEMY.health * stageStats.enemyHealthMultiplier;
  const baseHitsPerEnemy = Math.ceil(enemyHealth / damage);
  const hitsPerEnemy = Math.max(
    1,
    baseHitsPerEnemy / calculateAverageDamageMultiplier(character, allocation),
  );
  const killsPerSecond = attackSpeed * calculateTargetCapacity(character, allocation) / hitsPerEnemy;
  const enemiesPerSecond = 1_000 / stageStats.spawnInterval;
  const enemyDamage = BASIC_ENEMY.attackDamage * stageStats.enemyDamageMultiplier;
  const incomingDamage = Math.max(1, enemyDamage - defense);
  const lateStageClearRatio = killsPerSecond / enemiesPerSecond;
  const survivableHits = maxHealth / incomingDamage;

  return {
    stage: stageStats.stage,
    maxHealth,
    defense,
    enemyDamage,
    lateStageClearRatio,
    survivableHits,
  };
}
