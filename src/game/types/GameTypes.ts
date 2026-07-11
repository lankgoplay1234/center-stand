export type AttackType =
  | 'SINGLE_TARGET'
  | 'MULTI_TARGET'
  | 'AREA_MELEE'
  | 'AREA_MAGIC'
  | 'PIERCING'
  | 'CHAIN';

export type GrowthProfile = 'EARLY' | 'STEADY' | 'SCALING';
export type UpgradeEffectCurve = 'LINEAR' | 'SQRT';
export type AttackMotionStyle =
  | 'ARC_SHOT'
  | 'BLADE_SWEEP'
  | 'BASTION_VOLLEY'
  | 'RUNE_CAST'
  | 'NEEDLE_BURST'
  | 'STORM_SURGE';

export interface AttackMotionData {
  style: AttackMotionStyle;
  primaryColor: number;
  accentColor: number;
  durationMs: number;
  pulseScale: number;
}

interface SpecialAbilityBase {
  id: string;
  name: string;
  description: string;
}

export interface RangeAreaBoostAbilityData extends SpecialAbilityBase {
  type: 'RANGE_AREA_BOOST';
}

export interface ArcOverchargeAbilityData extends SpecialAbilityBase {
  type: 'ARC_OVERCHARGE';
  triggerEveryAttacks: number;
  baseDamageMultiplier: number;
  damageMultiplierPerLevel: number;
  maxDamageMultiplier: number;
}

export interface BladeFuryAbilityData extends SpecialAbilityBase {
  type: 'BLADE_FURY';
  triggerEveryAttacks: number;
  baseDamageMultiplier: number;
  damageMultiplierPerLevel: number;
  maxDamageMultiplier: number;
}

export type SpecialAbilityData = RangeAreaBoostAbilityData | ArcOverchargeAbilityData | BladeFuryAbilityData;

export interface UpgradeFocusData {
  primary: UpgradeId;
  secondary: UpgradeId;
  description: string;
}

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
  attackMotion: AttackMotionData;
  growthProfile: GrowthProfile;
  upgradeEfficiency: Readonly<Record<UpgradeId, number>>;
  upgradeFocus: UpgradeFocusData;
  specialAbility: SpecialAbilityData | null;
}

export interface EnemyData {
  id: string;
  rank: 'NORMAL' | 'CAPTAIN';
  health: number;
  attackDamage: number;
  moveSpeed: number;
  attackInterval: number;
  goldReward: number;
  contactRange: number;
}

export interface EnemyVisualProfile {
  tier: number;
  radius: number;
  fillColor: number;
  strokeColor: number;
  strokeWidth: number;
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
  leaderboardRunId?: string;
  leaderboardVerificationToken?: string;
}

export interface RunStats {
  gold: number;
  earnedGold: number;
  kills: number;
  deaths: number;
  elapsedSeconds: number;
}

export interface LeaderboardSubmission {
  nickname: string;
  characterId: string;
  deaths: number;
  completionTimeSeconds: number;
  runId: string;
  verificationToken: string;
}

export interface LeaderboardRecord {
  id: string;
  nickname: string;
  characterId: string;
  deaths: number;
  completionTimeSeconds: number;
  runId: string;
  completedAt: number;
}

export interface RankedLeaderboardEntry {
  id: string;
  nickname: string;
  characterId: string;
  deaths: number;
  completionTimeSeconds: number;
  completedAt: number;
  rank: number;
}
