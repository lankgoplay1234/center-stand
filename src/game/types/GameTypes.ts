export type AttackType =
  | 'SINGLE_TARGET'
  | 'MULTI_TARGET'
  | 'AREA_MELEE'
  | 'AREA_MAGIC'
  | 'PIERCING'
  | 'CHAIN';

export type GrowthProfile = 'EARLY' | 'STEADY' | 'SCALING';
export type UpgradeEffectCurve = 'LINEAR' | 'SQRT';

export interface CharacterData {
  id: string;
  name: string;
  description: string;
  maxHealth: number;
  defense: number;
  attackDamage: number;
  attackSpeed: number;
  attackRange: number;
  attackAreaRadius: number;
  baseTargetCount: number;
  projectileSpeed: number;
  knockbackForce: number;
  attackType: AttackType;
  growthProfile: GrowthProfile;
  upgradeEfficiency: Readonly<Record<UpgradeId, number>>;
  specialAbility: string | null;
}

export interface EnemyData {
  id: string;
  health: number;
  attackDamage: number;
  moveSpeed: number;
  attackInterval: number;
  goldReward: number;
  contactRange: number;
}

export type UpgradeId =
  | 'attackDamage'
  | 'attackSpeed'
  | 'targetCount'
  | 'defense'
  | 'maxHealth'
  | 'specialAbility';

export interface UpgradeDefinition {
  id: UpgradeId;
  name: string;
  baseCost: number;
  costGrowth: number;
  effectPerLevel: number;
  secondaryEffectPerLevel?: number;
  effectCurve?: UpgradeEffectCurve;
  maxLevel: number | null;
  effectLabel: (level: number, efficiency?: number) => string;
}

export interface UpgradeState {
  definition: UpgradeDefinition;
  level: number;
  currentCost: number;
}

export interface StageStats {
  stage: number;
  enemyHealthMultiplier: number;
  enemyDamageMultiplier: number;
  enemySpeedMultiplier: number;
  spawnInterval: number;
  maxActiveEnemies: number;
}

export interface GameResult {
  characterId: string;
  characterName: string;
  completed: boolean;
  deaths: number;
  survivalSeconds: number;
  stage: number;
  kills: number;
  earnedGold: number;
  bestSeconds: number;
}

export interface RunStats {
  gold: number;
  earnedGold: number;
  kills: number;
  deaths: number;
  elapsedSeconds: number;
}
