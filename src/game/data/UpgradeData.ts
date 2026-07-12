import type { UpgradeDefinition, UpgradeId } from '../types/GameTypes';
import { CRITICAL_CHANCE_PER_ATTACK_RANGE_LEVEL } from './CriticalHitData';
import { roundStat } from './StatPrecisionData';

function formatValue(value: number): string {
  return Number(value.toFixed(2)).toString();
}

function formatPercent(value: number): string {
  return `${formatValue(value * 100)}%`;
}

export const UPGRADE_ORDER: readonly UpgradeId[] = [
  'attackDamage',
  'attackSpeed',
  'defense',
  'maxHealth',
  'attackRange',
];

export const MAX_UPGRADE_LEVEL = 99;

export const UPGRADE_DEFINITIONS: Readonly<Record<UpgradeId, UpgradeDefinition>> = {
  attackDamage: {
    id: 'attackDamage',
    name: '공격력',
    baseCost: 20,
    costGrowth: 1.045,
    effectPerLevel: 0.25,
    effectMode: 'BASE_PERCENT',
    maxLevel: MAX_UPGRADE_LEVEL,
    effectLabel: (level, efficiency = 1) => `기본 공격력 +${formatPercent(calculateUpgradeEffect(UPGRADE_DEFINITIONS.attackDamage, level, efficiency))}`,
  },
  attackSpeed: {
    id: 'attackSpeed',
    name: '공격 속도',
    baseCost: 22,
    costGrowth: 1.04,
    effectPerLevel: 0.06,
    effectMode: 'BASE_PERCENT',
    maxLevel: MAX_UPGRADE_LEVEL,
    effectLabel: (level, efficiency = 1) => `기본 공격 속도 +${formatPercent(calculateUpgradeEffect(UPGRADE_DEFINITIONS.attackSpeed, level, efficiency))}`,
  },
  defense: {
    id: 'defense',
    name: '방어력',
    baseCost: 28,
    costGrowth: 1.04,
    effectPerLevel: 0.05,
    effectMode: 'BASE_PERCENT',
    maxLevel: MAX_UPGRADE_LEVEL,
    effectLabel: (level, efficiency = 1) => `기본 방어력 +${formatPercent(calculateUpgradeEffect(UPGRADE_DEFINITIONS.defense, level, efficiency))}`,
  },
  maxHealth: {
    id: 'maxHealth',
    name: '최대 체력',
    baseCost: 32,
    costGrowth: 1.04,
    effectPerLevel: 0.2,
    effectMode: 'BASE_PERCENT',
    maxLevel: MAX_UPGRADE_LEVEL,
    effectLabel: (level, efficiency = 1) => `기본 최대 체력 +${formatPercent(calculateUpgradeEffect(UPGRADE_DEFINITIONS.maxHealth, level, efficiency))}`,
  },
  attackRange: {
    id: 'attackRange',
    name: '공격가능범위',
    baseCost: 39,
    costGrowth: 1.04,
    effectPerLevel: 1,
    effectMode: 'FLAT',
    maxLevel: MAX_UPGRADE_LEVEL,
    effectLabel: (level) => {
      const safeLevel = Math.max(0, Math.floor(level));
      return `범위 강화 ${safeLevel}회 · 치명타 +${(safeLevel * CRITICAL_CHANCE_PER_ATTACK_RANGE_LEVEL * 100).toFixed(1)}%`;
    },
  },
};

export function calculateUpgradeCost(definition: UpgradeDefinition, level: number): number {
  const safeLevel = Math.max(0, Math.floor(level));
  return Math.max(
    Math.ceil(definition.baseCost * definition.costGrowth ** safeLevel),
    Math.ceil(definition.baseCost) + safeLevel,
  );
}

export function calculateUpgradeEffect(definition: UpgradeDefinition, level: number, efficiency = 1): number {
  const safeLevel = Math.max(0, Math.floor(level));
  const curvedLevel = definition.effectCurve === 'SQRT' ? Math.ceil(Math.sqrt(safeLevel)) : safeLevel;
  return roundStat(curvedLevel * definition.effectPerLevel * efficiency);
}

export function calculateUpgradedStat(
  baseValue: number,
  definition: UpgradeDefinition,
  level: number,
  efficiency = 1,
): number {
  const effect = calculateUpgradeEffect(definition, level, efficiency);
  return roundStat(definition.effectMode === 'BASE_PERCENT'
    ? baseValue * (1 + effect)
    : baseValue + effect);
}

export function calculateSecondaryUpgradeEffect(definition: UpgradeDefinition, level: number, efficiency = 1): number {
  return Math.max(0, Math.floor(level)) * (definition.secondaryEffectPerLevel ?? 0) * efficiency;
}

export function calculateTotalUpgradeCost(definition: UpgradeDefinition, targetLevel: number): number {
  const cappedLevel = Math.min(Math.max(0, Math.floor(targetLevel)), definition.maxLevel ?? targetLevel);
  let total = 0;
  for (let level = 0; level < cappedLevel; level += 1) total += calculateUpgradeCost(definition, level);
  return total;
}

export function canUpgrade(definition: UpgradeDefinition, level: number): boolean {
  return definition.maxLevel === null || level < definition.maxLevel;
}
