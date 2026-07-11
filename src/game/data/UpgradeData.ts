import type { UpgradeDefinition, UpgradeId } from '../types/GameTypes';

function formatValue(value: number): string {
  return Number(value.toFixed(2)).toString();
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
    effectPerLevel: 6,
    maxLevel: MAX_UPGRADE_LEVEL,
    effectLabel: (level, efficiency = 1) => `+${formatValue(calculateUpgradeEffect(UPGRADE_DEFINITIONS.attackDamage, level, efficiency))} 피해`,
  },
  attackSpeed: {
    id: 'attackSpeed',
    name: '공격 속도',
    baseCost: 30,
    costGrowth: 1.04,
    effectPerLevel: 0.09,
    maxLevel: MAX_UPGRADE_LEVEL,
    effectLabel: (level, efficiency = 1) => `+${calculateUpgradeEffect(UPGRADE_DEFINITIONS.attackSpeed, level, efficiency).toFixed(2)} 공격/초`,
  },
  defense: {
    id: 'defense',
    name: '방어력',
    baseCost: 28,
    costGrowth: 1.04,
    effectPerLevel: 0.8,
    maxLevel: MAX_UPGRADE_LEVEL,
    effectLabel: (level, efficiency = 1) => `+${formatValue(calculateUpgradeEffect(UPGRADE_DEFINITIONS.defense, level, efficiency))} 방어`,
  },
  maxHealth: {
    id: 'maxHealth',
    name: '최대 체력',
    baseCost: 32,
    costGrowth: 1.04,
    effectPerLevel: 16,
    maxLevel: MAX_UPGRADE_LEVEL,
    effectLabel: (level, efficiency = 1) => `+${formatValue(calculateUpgradeEffect(UPGRADE_DEFINITIONS.maxHealth, level, efficiency))} HP`,
  },
  attackRange: {
    id: 'attackRange',
    name: '공격가능범위',
    baseCost: 39,
    costGrowth: 1.04,
    effectPerLevel: 1,
    maxLevel: MAX_UPGRADE_LEVEL,
    effectLabel: (level) => `공격 범위 강화 ${Math.max(0, Math.floor(level))}회`,
  },
};

export function calculateUpgradeCost(definition: UpgradeDefinition, level: number): number {
  return Math.floor(definition.baseCost * definition.costGrowth ** level);
}

export function calculateUpgradeEffect(definition: UpgradeDefinition, level: number, efficiency = 1): number {
  const safeLevel = Math.max(0, Math.floor(level));
  const curvedLevel = definition.effectCurve === 'SQRT' ? Math.ceil(Math.sqrt(safeLevel)) : safeLevel;
  return curvedLevel * definition.effectPerLevel * efficiency;
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
