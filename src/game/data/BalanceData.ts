import type { CharacterData, GrowthProfile } from '../types/GameTypes';
import { UPGRADE_DEFINITIONS, UPGRADE_ORDER, calculateUpgradeEffect } from './UpgradeData';

export const GROWTH_PROFILE_LABELS: Readonly<Record<GrowthProfile, string>> = {
  EARLY: '초반 강세',
  STEADY: '안정 성장',
  SCALING: '후반 성장',
};

export const GROWTH_EFFICIENCY_RANGES: Readonly<Record<GrowthProfile, { min: number; max: number }>> = {
  EARLY: { min: 0.8, max: 0.9 },
  STEADY: { min: 0.97, max: 1.03 },
  SCALING: { min: 1.15, max: 1.25 },
};

export function calculateAverageUpgradeEfficiency(character: CharacterData): number {
  const total = UPGRADE_ORDER.reduce((sum, id) => sum + character.upgradeEfficiency[id], 0);
  return total / UPGRADE_ORDER.length;
}

export function calculateBaselineCombatScore(character: CharacterData): number {
  const offense = character.attackDamage * character.attackSpeed * Math.sqrt(character.baseTargetCount);
  const survival = character.maxHealth * 0.08 + character.defense * 3;
  return offense + survival;
}

export function calculateProjectedCombatScore(character: CharacterData, upgradeLevel: number): number {
  const effect = (id: keyof CharacterData['upgradeEfficiency']): number =>
    calculateUpgradeEffect(UPGRADE_DEFINITIONS[id], upgradeLevel, character.upgradeEfficiency[id]);
  const damage = character.attackDamage + effect('attackDamage');
  const speed = character.attackSpeed + effect('attackSpeed');
  const targets = character.baseTargetCount + effect('targetCount');
  const health = character.maxHealth + effect('maxHealth');
  const defense = character.defense + effect('defense');
  return damage * speed * Math.sqrt(targets) + health * 0.08 + defense * 3;
}
