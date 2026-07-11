import { UPGRADE_ORDER } from './UpgradeData';
import type { CharacterData } from '../types/GameTypes';
import { ARC_OVERCHARGE, rangeAreaBoost, validateSpecialAbilityData } from './SpecialAbilityData';
import { ATTACK_MOTIONS, validateAttackMotionData } from './AttackMotionData';

export const CHARACTERS: readonly CharacterData[] = [
  {
    id: 'arc-ranger',
    name: '아크 레인저',
    description: '가장 가까운 적에게 에너지 탄환을 자동 발사합니다.',
    maxHealth: 180,
    defense: 2,
    attackDamage: 24,
    attackSpeed: 2.2,
    attackRange: 360,
    attackAreaRadius: 24,
    baseTargetCount: 1,
    projectileSpeed: 720,
    knockbackForce: 12,
    attackType: 'SINGLE_TARGET',
    attackMotion: ATTACK_MOTIONS.ARC_SHOT,
    growthProfile: 'STEADY',
    upgradeEfficiency: {
      attackDamage: 1, attackSpeed: 1, targetCount: 1, defense: 1, maxHealth: 1, specialAbility: 1,
    },
    specialAbility: ARC_OVERCHARGE,
  },
  {
    id: 'blade-warden',
    name: '블레이드 워든',
    description: '주변을 휩쓰는 검격으로 가까운 모든 적을 공격합니다.',
    maxHealth: 250,
    defense: 5,
    attackDamage: 34,
    attackSpeed: 1.25,
    attackRange: 145,
    attackAreaRadius: 145,
    baseTargetCount: 1,
    projectileSpeed: 1,
    knockbackForce: 34,
    attackType: 'AREA_MELEE',
    attackMotion: ATTACK_MOTIONS.BLADE_SWEEP,
    growthProfile: 'EARLY',
    upgradeEfficiency: {
      attackDamage: 0.8, attackSpeed: 0.85, targetCount: 1, defense: 0.85, maxHealth: 0.85, specialAbility: 0.8,
    },
    specialAbility: rangeAreaBoost('spinning-slash', '회전 검격', '특수 강화가 검격 사거리와 범위를 확장합니다.'),
  },
  {
    id: 'bastion-gunner',
    name: '바스티온',
    description: '높은 체력과 방어력으로 버티며 여러 적을 동시에 사격합니다.',
    maxHealth: 320,
    defense: 8,
    attackDamage: 15,
    attackSpeed: 1.45,
    attackRange: 295,
    attackAreaRadius: 24,
    baseTargetCount: 3,
    projectileSpeed: 560,
    knockbackForce: 10,
    attackType: 'MULTI_TARGET',
    attackMotion: ATTACK_MOTIONS.BASTION_VOLLEY,
    growthProfile: 'EARLY',
    upgradeEfficiency: {
      attackDamage: 0.85, attackSpeed: 0.85, targetCount: 1, defense: 0.8, maxHealth: 0.8, specialAbility: 0.85,
    },
    specialAbility: rangeAreaBoost('saturation-fire', '분산 포화', '특수 강화가 사격 사거리와 효과 범위를 확장합니다.'),
  },
  {
    id: 'rune-mage',
    name: '룬 메이지',
    description: '가장 가까운 적의 위치에 폭발하는 원형 마법을 시전합니다.',
    maxHealth: 150,
    defense: 1,
    attackDamage: 22,
    attackSpeed: 1.05,
    attackRange: 335,
    attackAreaRadius: 105,
    baseTargetCount: 1,
    projectileSpeed: 1,
    knockbackForce: 0,
    attackType: 'AREA_MAGIC',
    attackMotion: ATTACK_MOTIONS.RUNE_CAST,
    growthProfile: 'SCALING',
    upgradeEfficiency: {
      attackDamage: 1.35, attackSpeed: 1.25, targetCount: 1, defense: 1.15, maxHealth: 1.15, specialAbility: 1.35,
    },
    specialAbility: rangeAreaBoost('rune-burst', '룬 폭발', '특수 강화가 주문 사거리와 폭발 범위를 확장합니다.'),
  },
  {
    id: 'needle-striker',
    name: '니들 스트라이커',
    description: '빠른 관통 광선으로 일직선상의 적들을 꿰뚫습니다.',
    maxHealth: 165,
    defense: 2,
    attackDamage: 13,
    attackSpeed: 3.6,
    attackRange: 390,
    attackAreaRadius: 22,
    baseTargetCount: 3,
    projectileSpeed: 920,
    knockbackForce: 8,
    attackType: 'PIERCING',
    attackMotion: ATTACK_MOTIONS.NEEDLE_BURST,
    growthProfile: 'STEADY',
    upgradeEfficiency: {
      attackDamage: 1.05, attackSpeed: 1, targetCount: 1, defense: 0.95, maxHealth: 0.95, specialAbility: 1.05,
    },
    specialAbility: rangeAreaBoost('piercing-beam', '관통 광선', '특수 강화가 광선 사거리와 관통 폭을 확장합니다.'),
  },
  {
    id: 'storm-conductor',
    name: '스톰 컨덕터',
    description: '가까운 적 사이를 뛰어다니는 번개로 연쇄 피해를 줍니다.',
    maxHealth: 175,
    defense: 2,
    attackDamage: 18,
    attackSpeed: 1.5,
    attackRange: 320,
    attackAreaRadius: 155,
    baseTargetCount: 3,
    projectileSpeed: 1,
    knockbackForce: 0,
    attackType: 'CHAIN',
    attackMotion: ATTACK_MOTIONS.STORM_SURGE,
    growthProfile: 'SCALING',
    upgradeEfficiency: {
      attackDamage: 1.25, attackSpeed: 1.2, targetCount: 1, defense: 1.1, maxHealth: 1.1, specialAbility: 1.3,
    },
    specialAbility: rangeAreaBoost('chain-lightning', '연쇄 번개', '특수 강화가 시전 사거리와 연쇄 거리를 확장합니다.'),
  },
];

export function validateCharacterData(character: CharacterData): string[] {
  const errors: string[] = [];
  if (!character.id.trim()) errors.push('id is required');
  if (!character.name.trim()) errors.push('name is required');
  if (character.maxHealth <= 0) errors.push('maxHealth must be positive');
  if (character.defense < 0) errors.push('defense cannot be negative');
  if (character.attackDamage <= 0) errors.push('attackDamage must be positive');
  if (character.attackSpeed <= 0) errors.push('attackSpeed must be positive');
  if (character.attackRange <= 0) errors.push('attackRange must be positive');
  if (character.attackAreaRadius <= 0) errors.push('attackAreaRadius must be positive');
  if (!Number.isInteger(character.baseTargetCount) || character.baseTargetCount < 1) {
    errors.push('baseTargetCount must be a positive integer');
  }
  if (character.projectileSpeed <= 0) errors.push('projectileSpeed must be positive');
  if (character.knockbackForce < 0) errors.push('knockbackForce cannot be negative');
  errors.push(...validateAttackMotionData(character.attackMotion));
  errors.push(...validateSpecialAbilityData(character.specialAbility));
  if (character.specialAbility?.type === 'ARC_OVERCHARGE' && character.attackType !== 'SINGLE_TARGET') {
    errors.push('ARC_OVERCHARGE requires SINGLE_TARGET attackType');
  }
  for (const id of UPGRADE_ORDER) {
    const efficiency = character.upgradeEfficiency[id];
    if (!Number.isFinite(efficiency) || efficiency <= 0) errors.push(`upgradeEfficiency.${id} must be positive`);
  }
  return errors;
}

export function getCharacterById(id: string): CharacterData {
  const character = CHARACTERS.find((entry) => entry.id === id);
  if (!character) throw new Error(`Unknown character: ${id}`);
  return character;
}
