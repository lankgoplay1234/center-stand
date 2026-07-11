import type { ArcOverchargeAbilityData, RangeAreaBoostAbilityData, SpecialAbilityData } from '../types/GameTypes';

export const ARC_OVERCHARGE: ArcOverchargeAbilityData = {
  id: 'arc-overcharge',
  name: '아크 과충전',
  description: '5번째 유효 공격의 단일 투사체 피해를 증폭합니다.',
  type: 'ARC_OVERCHARGE',
  triggerEveryAttacks: 5,
  baseDamageMultiplier: 1.6,
  damageMultiplierPerLevel: 0.02,
  maxDamageMultiplier: 3.5,
};

export function rangeAreaBoost(id: string, name: string, description: string): RangeAreaBoostAbilityData {
  return { id, name, description, type: 'RANGE_AREA_BOOST' };
}

export function calculateOverchargeDamageMultiplier(
  ability: ArcOverchargeAbilityData,
  level: number,
  efficiency = 1,
): number {
  const safeLevel = Math.max(0, Math.floor(level));
  return Math.min(
    ability.maxDamageMultiplier,
    ability.baseDamageMultiplier + safeLevel * ability.damageMultiplierPerLevel * efficiency,
  );
}

export function validateSpecialAbilityData(ability: SpecialAbilityData | null): string[] {
  if (!ability) return [];
  const errors: string[] = [];
  if (!ability.id.trim()) errors.push('specialAbility.id is required');
  if (!ability.name.trim()) errors.push('specialAbility.name is required');
  if (ability.type === 'ARC_OVERCHARGE') {
    if (!Number.isInteger(ability.triggerEveryAttacks) || ability.triggerEveryAttacks < 1) {
      errors.push('specialAbility.triggerEveryAttacks must be a positive integer');
    }
    if (ability.baseDamageMultiplier <= 1) errors.push('specialAbility.baseDamageMultiplier must be greater than 1');
    if (ability.damageMultiplierPerLevel < 0) errors.push('specialAbility.damageMultiplierPerLevel cannot be negative');
    if (ability.maxDamageMultiplier < ability.baseDamageMultiplier) {
      errors.push('specialAbility.maxDamageMultiplier must cover the base multiplier');
    }
  }
  return errors;
}
