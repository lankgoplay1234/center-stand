import type { CharacterData, UpgradeId } from '../types/GameTypes';
import {
  BASIC_ENEMY,
  CAPTAIN_ENEMY,
  calculateCaptainSpawnChance,
  calculateEnemyGoldReward,
} from './EnemyData';
import { calculateOverchargeDamageMultiplier } from './SpecialAbilityData';
import { calculateStageStats, getStageKillTarget } from './StageData';
import {
  MAX_UPGRADE_LEVEL,
  UPGRADE_DEFINITIONS,
  UPGRADE_ORDER,
  calculateTotalUpgradeCost,
  calculateUpgradedStat,
} from './UpgradeData';
import {
  calculateExpectedCriticalDamageMultiplier,
  calculatePlayerCriticalChance,
} from './CriticalHitData';
import { STARTING_GOLD } from './BalanceData';

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
  enemyDefense: number;
  lateStageClearRatio: number;
  survivableHits: number;
  killsPerSecond: number;
  spawnRate: number;
}

export const STABLE_COMPLETION_MIN_UPGRADES = 400;
export const EXPECTED_RUN_KILL_RATIO = 1;
export const MIN_LATE_STAGE_CLEAR_RATIO = 0.015;
export const MIN_SURVIVABLE_HITS = 8;

export const ROLE_COMPLETION_ALLOCATIONS: Readonly<Record<string, UpgradeAllocation>> = {
  'arc-ranger': { attackDamage: 25, attackSpeed: 99, defense: 95, maxHealth: 95, attackRange: 86 },
  'blade-warden': { attackDamage: 65, attackSpeed: 70, defense: 85, maxHealth: 95, attackRange: 85 },
  'bastion-gunner': { attackDamage: 70, attackSpeed: 75, defense: 95, maxHealth: 90, attackRange: 70 },
  'rune-mage': { attackDamage: 80, attackSpeed: 99, defense: 75, maxHealth: 75, attackRange: 71 },
  'needle-striker': { attackDamage: 50, attackSpeed: 99, defense: 85, maxHealth: 92, attackRange: 74 },
  'storm-conductor': { attackDamage: 85, attackSpeed: 90, defense: 75, maxHealth: 70, attackRange: 80 },
};

export function getRoleCompletionAllocation(character: CharacterData): UpgradeAllocation {
  const allocation = ROLE_COMPLETION_ALLOCATIONS[character.id];
  if (!allocation) throw new Error(`Missing role completion allocation: ${character.id}`);
  return allocation;
}

export function getPreCompletionAllocation(character: CharacterData): UpgradeAllocation {
  const allocation = getRoleCompletionAllocation(character);
  const primary = character.upgradeFocus.primary;
  return { ...allocation, [primary]: Math.max(0, allocation[primary] - 1) };
}

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
    total += getStageKillTarget(stage);
  }
  return total;
}

export function estimateRunGold(killRatio = EXPECTED_RUN_KILL_RATIO): number {
  const safeRatio = Math.min(1, Math.max(0, killRatio));
  let total = STARTING_GOLD;
  for (let stage = 1; stage <= 100; stage += 1) {
    total += estimateStageGold(stage) * safeRatio;
  }
  return Math.floor(total);
}

export function estimateStageGold(stage: number): number {
  const captainChance = calculateCaptainSpawnChance(stage);
  const normalReward = calculateEnemyGoldReward(stage, BASIC_ENEMY);
  const captainReward = calculateEnemyGoldReward(stage, CAPTAIN_ENEMY);
  const expectedReward = normalReward + captainChance * (captainReward - normalReward);
  return Math.floor(getStageKillTarget(stage) * expectedReward);
}

function calculateTargetCapacity(character: CharacterData): number {
  if (character.attackType === 'SINGLE_TARGET') return 1;
  if (character.attackType === 'MULTI_TARGET' || character.attackType === 'PIERCING' || character.attackType === 'CHAIN') {
    return character.baseTargetCount;
  }
  return Math.max(1, Math.floor(character.attackAreaRadius / 48));
}

function calculateAverageDamageMultiplier(character: CharacterData, allocation: UpgradeAllocation): number {
  const criticalMultiplier = calculateExpectedCriticalDamageMultiplier(calculatePlayerCriticalChance(
    character.baseCriticalChance,
    allocation.attackRange,
  ));
  const ability = character.specialAbility;
  if (ability?.type !== 'ARC_OVERCHARGE') return criticalMultiplier;
  const overchargeMultiplier = calculateOverchargeDamageMultiplier(
    ability,
    allocation.attackRange,
    character.upgradeEfficiency.attackRange,
  );
  return criticalMultiplier
    * ((ability.triggerEveryAttacks - 1) + overchargeMultiplier) / ability.triggerEveryAttacks;
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
  const damage = calculateUpgradedStat(character.attackDamage,
    UPGRADE_DEFINITIONS.attackDamage,
    allocation.attackDamage,
    character.upgradeEfficiency.attackDamage,
  );
  const attackSpeed = calculateUpgradedStat(character.attackSpeed,
    UPGRADE_DEFINITIONS.attackSpeed,
    allocation.attackSpeed,
    character.upgradeEfficiency.attackSpeed,
  );
  const defense = calculateUpgradedStat(character.defense,
    UPGRADE_DEFINITIONS.defense,
    allocation.defense,
    character.upgradeEfficiency.defense,
  );
  const maxHealth = calculateUpgradedStat(character.maxHealth,
    UPGRADE_DEFINITIONS.maxHealth,
    allocation.maxHealth,
    character.upgradeEfficiency.maxHealth,
  );
  const averageDamage = damage * calculateAverageDamageMultiplier(character, allocation);
  const captainChance = calculateCaptainSpawnChance(stage);
  const normalDamagePerHit = Math.max(1, averageDamage - BASIC_ENEMY.defense - stageStats.enemyDefenseBonus);
  const captainDamagePerHit = Math.max(1, averageDamage - CAPTAIN_ENEMY.defense - stageStats.enemyDefenseBonus);
  const normalHitsPerEnemy = Math.max(
    1,
    BASIC_ENEMY.health * stageStats.enemyHealthMultiplier / normalDamagePerHit,
  );
  const captainHitsPerEnemy = Math.max(
    1,
    CAPTAIN_ENEMY.health * stageStats.enemyHealthMultiplier / captainDamagePerHit,
  );
  const hitsPerEnemy = normalHitsPerEnemy * (1 - captainChance) + captainHitsPerEnemy * captainChance;
  const killsPerSecond = attackSpeed * calculateTargetCapacity(character) / hitsPerEnemy;
  const enemiesPerSecond = 1_000 / stageStats.spawnInterval;
  const enemyDamage = BASIC_ENEMY.attackDamage + stageStats.enemyAttackBonus;
  const enemyDefense = BASIC_ENEMY.defense + stageStats.enemyDefenseBonus;
  const incomingDamage = Math.max(1, enemyDamage - defense);
  const lateStageClearRatio = killsPerSecond / enemiesPerSecond;
  const survivableHits = maxHealth / incomingDamage;

  return {
    stage: stageStats.stage,
    maxHealth,
    defense,
    enemyDamage,
    enemyDefense,
    lateStageClearRatio,
    survivableHits,
    killsPerSecond,
    spawnRate: enemiesPerSecond,
  };
}

export function estimateStageClearTimeMs(
  character: CharacterData,
  allocation: UpgradeAllocation,
  stage: number,
): number {
  const combat = simulateStageCombat(character, allocation, stage);
  const effectiveKillsPerSecond = Math.max(0.001, Math.min(combat.spawnRate, combat.killsPerSecond));
  return getStageKillTarget(stage) / effectiveKillsPerSecond * 1_000;
}

export function estimateRunClearTimeMs(
  character: CharacterData,
  allocation: UpgradeAllocation,
): number {
  let total = 0;
  for (let stage = 1; stage <= 100; stage += 1) {
    total += estimateStageClearTimeMs(character, allocation, stage);
  }
  return total;
}
