import { UPGRADE_ORDER } from './UpgradeData';
import type { CharacterData } from '../types/GameTypes';
import { ARC_OVERCHARGE, BLADE_FURY, rangeAreaBoost, validateSpecialAbilityData } from './SpecialAbilityData';
import { ATTACK_MOTIONS, validateAttackMotionData } from './AttackMotionData';
import { roundStat } from './StatPrecisionData';

export const CHARACTERS: readonly CharacterData[] = [
  {
    id: 'arc-ranger',
    name: '아크 레인저',
    description: '가장 가까운 적에게 에너지 탄환을 자동 발사합니다.',
    maxHealth: 86,
    defense: 2,
    attackDamage: 30,
    attackSpeed: 2,
    baseCriticalChance: 0.2,
    attackRange: 200,
    maxAttackRange: 550,
    attackArcDegrees: null,
    attackAreaRadius: 24,
    baseTargetCount: 1,
    projectileSpeed: 720,
    knockbackForce: 12,
    attackType: 'SINGLE_TARGET',
    attackMotion: ATTACK_MOTIONS.ARC_SHOT,
    growthProfile: 'STEADY',
    upgradeEfficiency: {
      attackDamage: 1.4, attackSpeed: 1, defense: 0.85, maxHealth: 0.6, attackRange: 1.3,
    },
    upgradeFocus: { primary: 'attackDamage', secondary: 'attackSpeed', description: '공격력과 공격 속도로 정밀 사격의 연속 화력을 키우는 원거리 화력형' },
    specialAbility: ARC_OVERCHARGE,
  },
  {
    id: 'blade-warden',
    name: '블레이드 워든',
    description: '주변을 휩쓰는 검격으로 가까운 모든 적을 공격합니다.',
    maxHealth: 118,
    defense: 5,
    attackDamage: 33,
    attackSpeed: 1.2,
    baseCriticalChance: 0,
    attackRange: 80,
    maxAttackRange: 240,
    attackArcDegrees: 45,
    attackAreaRadius: 145,
    baseTargetCount: 1,
    projectileSpeed: 1,
    knockbackForce: 34,
    attackType: 'AREA_MELEE',
    attackMotion: ATTACK_MOTIONS.BLADE_SWEEP,
    growthProfile: 'EARLY',
    upgradeEfficiency: {
      attackDamage: 0.7, attackSpeed: 0.7, defense: 0.5, maxHealth: 1.7, attackRange: 0.8,
    },
    upgradeFocus: { primary: 'maxHealth', secondary: 'defense', description: '최대 체력으로 근접 노출을 버티는 생존형' },
    specialAbility: BLADE_FURY,
  },
  {
    id: 'bastion-gunner',
    name: '바스티온',
    description: '높은 체력과 방어력으로 버티며 여러 적을 동시에 사격합니다.',
    maxHealth: 150,
    defense: 12,
    attackDamage: 16,
    attackSpeed: 1.45,
    baseCriticalChance: 0.07,
    attackRange: 60,
    maxAttackRange: 150,
    attackArcDegrees: 90,
    attackAreaRadius: 24,
    baseTargetCount: 3,
    projectileSpeed: 560,
    knockbackForce: 10,
    attackType: 'MULTI_TARGET',
    attackMotion: ATTACK_MOTIONS.BASTION_VOLLEY,
    growthProfile: 'EARLY',
    upgradeEfficiency: {
      attackDamage: 1.05, attackSpeed: 1.05, defense: 1.3, maxHealth: 0.75, attackRange: 0.35,
    },
    upgradeFocus: { primary: 'defense', secondary: 'maxHealth', description: '방어력과 최대 체력으로 짧은 사거리의 전투를 버티는 탱커형' },
    specialAbility: rangeAreaBoost('saturation-fire', '분산 포화', '짧은 90도 전방 포화로 여러 적을 동시에 저지합니다.'),
  },
  {
    id: 'rune-mage',
    name: '룬 메이지',
    description: '가장 가까운 적의 위치에 폭발하는 원형 마법을 시전합니다.',
    maxHealth: 104,
    defense: 1,
    attackDamage: 22,
    attackSpeed: 1,
    baseCriticalChance: 0.1,
    attackRange: 155,
    maxAttackRange: 430,
    attackArcDegrees: null,
    attackAreaRadius: 110,
    baseTargetCount: 1,
    projectileSpeed: 1,
    knockbackForce: 0,
    attackType: 'AREA_MAGIC',
    attackMotion: ATTACK_MOTIONS.RUNE_CAST,
    growthProfile: 'SCALING',
    upgradeEfficiency: {
      attackDamage: 1.15, attackSpeed: 1.8, defense: 0.8, maxHealth: 0.75, attackRange: 1.55,
    },
    upgradeFocus: { primary: 'attackSpeed', secondary: 'attackRange', description: '공격 속도와 중장거리 시전 범위를 키우는 주문형' },
    specialAbility: rangeAreaBoost('rune-burst', '룬 폭발', '지정한 위치에 고정 반경의 원형 마법 폭발을 일으킵니다.'),
  },
  {
    id: 'needle-striker',
    name: '니들 스트라이커',
    description: '빠른 관통 광선으로 일직선상의 적들을 꿰뚫습니다.',
    maxHealth: 64,
    defense: 2,
    attackDamage: 14,
    attackSpeed: 3.8,
    baseCriticalChance: 0.05,
    attackRange: 240,
    maxAttackRange: 660,
    attackArcDegrees: null,
    attackAreaRadius: 22,
    baseTargetCount: 3,
    projectileSpeed: 920,
    knockbackForce: 8,
    attackType: 'PIERCING',
    attackMotion: ATTACK_MOTIONS.NEEDLE_BURST,
    growthProfile: 'STEADY',
    upgradeEfficiency: {
      attackDamage: 1.4, attackSpeed: 0.8, defense: 0.8, maxHealth: 0.75, attackRange: 1.1,
    },
    upgradeFocus: { primary: 'attackDamage', secondary: 'attackRange', description: '높은 기본 연사에 공격력과 최장 사거리를 더하는 관통 화력형' },
    specialAbility: rangeAreaBoost('piercing-beam', '관통 광선', '긴 직선상의 적을 고정 폭 관통 광선으로 공격합니다.'),
  },
  {
    id: 'storm-conductor',
    name: '스톰 컨덕터',
    description: '가까운 적 사이를 뛰어다니는 번개로 연쇄 피해를 줍니다.',
    maxHealth: 114,
    defense: 2,
    attackDamage: 20,
    attackSpeed: 1.4,
    baseCriticalChance: 0,
    attackRange: 170,
    maxAttackRange: 470,
    attackArcDegrees: null,
    attackAreaRadius: 155,
    baseTargetCount: 3,
    projectileSpeed: 1,
    knockbackForce: 0,
    attackType: 'CHAIN',
    attackMotion: ATTACK_MOTIONS.STORM_SURGE,
    growthProfile: 'SCALING',
    upgradeEfficiency: {
      attackDamage: 1.15, attackSpeed: 1.5, defense: 0.9, maxHealth: 0.9, attackRange: 1.45,
    },
    upgradeFocus: { primary: 'attackSpeed', secondary: 'attackRange', description: '시전 속도와 넓은 공격가능범위로 밀집 적을 지우는 확산형' },
    specialAbility: rangeAreaBoost('chain-lightning', '연쇄 번개', '공격가능범위 안에서 고정 연쇄 거리로 번개를 전파합니다.'),
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
  if (!Number.isFinite(character.baseCriticalChance)
    || character.baseCriticalChance < 0
    || character.baseCriticalChance > 0.2) {
    errors.push('baseCriticalChance must be between 0 and 0.2');
  }
  if (character.attackRange <= 0) errors.push('attackRange must be positive');
  if (!Number.isFinite(character.maxAttackRange) || character.maxAttackRange <= character.attackRange) {
    errors.push('maxAttackRange must be greater than attackRange');
  }
  if (character.attackArcDegrees !== null
    && (!Number.isFinite(character.attackArcDegrees) || character.attackArcDegrees <= 0 || character.attackArcDegrees > 360)) {
    errors.push('attackArcDegrees must be null or between 0 and 360');
  }
  if (character.attackAreaRadius <= 0) errors.push('attackAreaRadius must be positive');
  if (!Number.isInteger(character.baseTargetCount) || character.baseTargetCount < 1) {
    errors.push('baseTargetCount must be a positive integer');
  }
  if (character.projectileSpeed <= 0) errors.push('projectileSpeed must be positive');
  if (character.knockbackForce < 0) errors.push('knockbackForce cannot be negative');
  const precisionStats = {
    maxHealth: character.maxHealth,
    defense: character.defense,
    attackDamage: character.attackDamage,
    attackSpeed: character.attackSpeed,
    baseCriticalChance: character.baseCriticalChance,
    attackRange: character.attackRange,
    maxAttackRange: character.maxAttackRange,
    attackAreaRadius: character.attackAreaRadius,
    projectileSpeed: character.projectileSpeed,
    knockbackForce: character.knockbackForce,
  };
  for (const [id, value] of Object.entries(precisionStats)) {
    if (Math.abs(roundStat(value) - value) > Number.EPSILON) errors.push(`${id} must use at most three decimal places`);
  }
  errors.push(...validateAttackMotionData(character.attackMotion));
  errors.push(...validateSpecialAbilityData(character.specialAbility));
  if (character.specialAbility?.type === 'ARC_OVERCHARGE' && character.attackType !== 'SINGLE_TARGET') {
    errors.push('ARC_OVERCHARGE requires SINGLE_TARGET attackType');
  }
  if (character.specialAbility?.type === 'BLADE_FURY' && character.attackType !== 'AREA_MELEE') {
    errors.push('BLADE_FURY requires AREA_MELEE attackType');
  }
  for (const id of UPGRADE_ORDER) {
    const efficiency = character.upgradeEfficiency[id];
    if (!Number.isFinite(efficiency) || efficiency <= 0) errors.push(`upgradeEfficiency.${id} must be positive`);
    if (Math.abs(roundStat(efficiency) - efficiency) > Number.EPSILON) {
      errors.push(`upgradeEfficiency.${id} must use at most three decimal places`);
    }
  }
  if (character.upgradeFocus.primary === character.upgradeFocus.secondary) {
    errors.push('upgradeFocus primary and secondary must be different');
  }
  if (!character.upgradeFocus.description.trim()) errors.push('upgradeFocus.description is required');
  const highestEfficiency = Math.max(...UPGRADE_ORDER.map((id) => character.upgradeEfficiency[id]));
  if (character.upgradeEfficiency[character.upgradeFocus.primary] < highestEfficiency) {
    errors.push('upgradeFocus.primary must use the highest upgrade efficiency');
  }
  return errors;
}

export function getCharacterById(id: string): CharacterData {
  const character = CHARACTERS.find((entry) => entry.id === id);
  if (!character) throw new Error(`Unknown character: ${id}`);
  return character;
}
