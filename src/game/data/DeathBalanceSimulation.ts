import { REVIVE_INVULNERABILITY_MS } from '../systems/ReviveSystem';
import type { AttackType, CharacterData, UpgradeId } from '../types/GameTypes';
import { BASIC_ENEMY, CAPTAIN_ENEMY, calculateCaptainSpawnChance } from './EnemyData';
import {
  EXPECTED_RUN_KILL_RATIO,
  estimateStageGold,
  getRoleCompletionAllocation,
  type UpgradeAllocation,
  estimateStageClearTimeMs,
  simulateStageCombat,
} from './RunBalanceSimulation';
import { calculateStageStats } from './StageData';
import { UPGRADE_DEFINITIONS, UPGRADE_ORDER, calculateUpgradeCost } from './UpgradeData';
import { calculateAttackRangeAtLevel } from './AttackRangeData';

export interface DeathSimulationSummary {
  samples: readonly number[];
  averageDeaths: number;
  minDeaths: number;
  maxDeaths: number;
  finalUpgradeLevels: number;
}

export const TARGET_AVERAGE_DEATHS = 50;
export const MIN_TARGET_DEATHS = 40;
export const MAX_TARGET_DEATHS = 60;
export const MAX_CHARACTER_DEATH_SPREAD = 12;
export const DEFAULT_DEATH_SIMULATION_SAMPLES = 24;

const CONTACTING_ENEMY_SHARE = 0.0037;
const MIN_CLEAR_PRESSURE = 1;
const MAX_CLEAR_PRESSURE = 2.5;

const ROLE_EXPOSURE: Readonly<Record<AttackType, number>> = {
  SINGLE_TARGET: 3.16,
  MULTI_TARGET: 8.96,
  AREA_MELEE: 3.52,
  AREA_MAGIC: 2.3,
  PIERCING: 3.02,
  CHAIN: 3.18,
};

function emptyAllocation(): Record<UpgradeId, number> {
  return {
    attackDamage: 0,
    attackSpeed: 0,
    defense: 0,
    maxHealth: 0,
    attackRange: 0,
  };
}

function copyAllocation(allocation: Record<UpgradeId, number>): UpgradeAllocation {
  return { ...allocation };
}

function purchasePlannedUpgrades(
  allocation: Record<UpgradeId, number>,
  availableGold: number,
  targetAllocation: UpgradeAllocation,
): number {
  let gold = availableGold;
  while (true) {
    const candidates = UPGRADE_ORDER
      .filter((id) => allocation[id] < targetAllocation[id])
      .filter((id) => calculateUpgradeCost(UPGRADE_DEFINITIONS[id], allocation[id]) <= gold)
      .sort((left, right) => {
        const leftProgress = allocation[left] / targetAllocation[left];
        const rightProgress = allocation[right] / targetAllocation[right];
        return leftProgress - rightProgress || UPGRADE_ORDER.indexOf(left) - UPGRADE_ORDER.indexOf(right);
      });
    const next = candidates[0];
    if (!next) return gold;
    gold -= calculateUpgradeCost(UPGRADE_DEFINITIONS[next], allocation[next]);
    allocation[next] += 1;
  }
}

export function buildRepresentativeStageAllocations(character: CharacterData): readonly UpgradeAllocation[] {
  const targetAllocation = getRoleCompletionAllocation(character);
  const allocation = emptyAllocation();
  const snapshots: UpgradeAllocation[] = [];
  let gold = 0;
  for (let stage = 1; stage <= 100; stage += 1) {
    gold += estimateStageGold(stage) * EXPECTED_RUN_KILL_RATIO;
    gold = purchasePlannedUpgrades(allocation, gold, targetAllocation);
    snapshots.push(copyAllocation(allocation));
  }
  return snapshots;
}

function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

function calculateExposureMultiplier(character: CharacterData, allocation: UpgradeAllocation): number {
  const attackRange = calculateAttackRangeAtLevel(
    character.attackRange,
    character.maxAttackRange,
    allocation.attackRange,
  );
  const rangeExposure = Math.min(1.35, Math.max(0.75, 300 / attackRange));
  const knockbackMitigation = 1 - Math.min(0.17, character.knockbackForce / 200);
  return rangeExposure * knockbackMitigation * ROLE_EXPOSURE[character.attackType];
}

export function simulateRunDeaths(
  character: CharacterData,
  seed = 1,
  stageAllocations = buildRepresentativeStageAllocations(character),
): number {
  const random = createRandom(seed);
  let expectedDeaths = 0;

  for (let stage = 1; stage <= 100; stage += 1) {
    const stageStats = calculateStageStats(stage);
    const allocation = stageAllocations[stage - 1]!;
    const combat = simulateStageCombat(character, allocation, stage);
    const exposureMultiplier = calculateExposureMultiplier(character, allocation);
    const captainChance = calculateCaptainSpawnChance(stage);
    const weightedHealthMultiplier = 1 + captainChance * (CAPTAIN_ENEMY.health / BASIC_ENEMY.health - 1);
    const adjustedClearRatio = combat.lateStageClearRatio / weightedHealthMultiplier;
    const clearPressure = Math.min(
      MAX_CLEAR_PRESSURE,
      Math.max(MIN_CLEAR_PRESSURE, 1 / Math.max(0.01, adjustedClearRatio)),
    );
    const stageVariance = 0.9 + random() * 0.2;
    const contactingEnemies = stageStats.maxActiveEnemies
      * CONTACTING_ENEMY_SHARE
      * clearPressure
      * exposureMultiplier
      * stageVariance;
    const normalDamagePerHit = Math.max(1, combat.enemyDamage - combat.defense);
    const captainDamage = CAPTAIN_ENEMY.attackDamage * stageStats.enemyDamageMultiplier;
    const captainDamagePerHit = Math.max(1, captainDamage - combat.defense);
    const weightedDamagePerSecond = (1 - captainChance)
      * normalDamagePerHit * 1_000 / BASIC_ENEMY.attackInterval
      + captainChance * captainDamagePerHit * 1_000 / CAPTAIN_ENEMY.attackInterval;
    const incomingDamagePerSecond = contactingEnemies * weightedDamagePerSecond;
    if (incomingDamagePerSecond <= 0) continue;
    const vulnerableLifetimeSeconds = combat.maxHealth / incomingDamagePerSecond;
    const lifeCycleSeconds = vulnerableLifetimeSeconds + REVIVE_INVULNERABILITY_MS / 1_000;
    expectedDeaths += estimateStageClearTimeMs(character, allocation, stage) / 1_000 / lifeCycleSeconds;
  }

  return Math.round(expectedDeaths);
}

export function simulateDeathSamples(
  character: CharacterData,
  sampleCount = DEFAULT_DEATH_SIMULATION_SAMPLES,
): DeathSimulationSummary {
  const safeSampleCount = Math.max(1, Math.floor(sampleCount));
  const stageAllocations = buildRepresentativeStageAllocations(character);
  const samples = Array.from(
    { length: safeSampleCount },
    (_, index) => simulateRunDeaths(character, index + 1, stageAllocations),
  );
  const averageDeaths = samples.reduce((sum, deaths) => sum + deaths, 0) / samples.length;
  const finalAllocation = stageAllocations.at(-1)!;
  const finalUpgradeLevels = UPGRADE_ORDER.reduce((sum, id) => sum + finalAllocation[id], 0);
  return {
    samples,
    averageDeaths,
    minDeaths: Math.min(...samples),
    maxDeaths: Math.max(...samples),
    finalUpgradeLevels,
  };
}
