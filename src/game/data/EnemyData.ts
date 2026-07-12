import type { EnemyData, EnemyVisualProfile } from '../types/GameTypes';
import { getEnemyPixelArt } from './EnemyPixelArtData';

export const BASIC_ENEMY: Readonly<EnemyData> = {
  id: 'void-runner',
  rank: 'NORMAL',
  health: 54,
  attackDamage: 9,
  defense: 0,
  moveSpeed: 66,
  attackInterval: 850,
  goldReward: 11,
  contactRange: 44,
};

export const CAPTAIN_ENEMY: Readonly<EnemyData> = {
  id: 'void-captain',
  rank: 'CAPTAIN',
  health: BASIC_ENEMY.health * 12,
  attackDamage: BASIC_ENEMY.attackDamage * 10,
  defense: 10,
  moveSpeed: BASIC_ENEMY.moveSpeed * 0.82,
  attackInterval: 1_200,
  goldReward: BASIC_ENEMY.goldReward * 18,
  contactRange: 58,
};

const NORMAL_VISUALS: readonly EnemyVisualProfile[] = [
  { tier: 1, radius: 18, textureKey: getEnemyPixelArt('NORMAL', 1).textureKey, fillColor: 0xff446c, strokeColor: 0xffafbd, strokeWidth: 3 },
  { tier: 2, radius: 19, textureKey: getEnemyPixelArt('NORMAL', 2).textureKey, fillColor: 0xf33d78, strokeColor: 0xffb2d0, strokeWidth: 3 },
  { tier: 3, radius: 20, textureKey: getEnemyPixelArt('NORMAL', 3).textureKey, fillColor: 0xdc358b, strokeColor: 0xf8b4ff, strokeWidth: 4 },
  { tier: 4, radius: 21, textureKey: getEnemyPixelArt('NORMAL', 4).textureKey, fillColor: 0xc42fa0, strokeColor: 0xeab7ff, strokeWidth: 4 },
  { tier: 5, radius: 22, textureKey: getEnemyPixelArt('NORMAL', 5).textureKey, fillColor: 0xa92db5, strokeColor: 0xffd0ff, strokeWidth: 5 },
];

const CAPTAIN_VISUALS: readonly EnemyVisualProfile[] = [
  { tier: 1, radius: 31, textureKey: getEnemyPixelArt('CAPTAIN', 1).textureKey, fillColor: 0x8f233f, strokeColor: 0xffd65a, strokeWidth: 6 },
  { tier: 2, radius: 33, textureKey: getEnemyPixelArt('CAPTAIN', 2).textureKey, fillColor: 0x8d2050, strokeColor: 0xffdc72, strokeWidth: 7 },
  { tier: 3, radius: 35, textureKey: getEnemyPixelArt('CAPTAIN', 3).textureKey, fillColor: 0x84205f, strokeColor: 0xffe28a, strokeWidth: 7 },
  { tier: 4, radius: 37, textureKey: getEnemyPixelArt('CAPTAIN', 4).textureKey, fillColor: 0x75216f, strokeColor: 0xffe8a3, strokeWidth: 8 },
  { tier: 5, radius: 39, textureKey: getEnemyPixelArt('CAPTAIN', 5).textureKey, fillColor: 0x64227e, strokeColor: 0xffefbd, strokeWidth: 8 },
];

export function calculateEnemyVisualTier(stage: number): number {
  const safeStage = Math.min(100, Math.max(1, Math.floor(stage)));
  return Math.min(5, Math.floor((safeStage - 1) / 20) + 1);
}

export function getEnemyVisualProfile(stage: number, rank: EnemyData['rank']): EnemyVisualProfile {
  const tier = calculateEnemyVisualTier(stage);
  return (rank === 'CAPTAIN' ? CAPTAIN_VISUALS : NORMAL_VISUALS)[tier - 1]!;
}

export function calculateCaptainSpawnChance(stage: number): number {
  const integerStage = Number.isFinite(stage) ? Math.floor(stage) : 1;
  const safeStage = Math.min(100, Math.max(1, integerStage));
  return (safeStage - 1) / 99 * 0.35;
}

export function selectEnemyData(stage: number, randomRoll: number): Readonly<EnemyData> {
  const safeRoll = Math.min(1, Math.max(0, randomRoll));
  return safeRoll < calculateCaptainSpawnChance(stage) ? CAPTAIN_ENEMY : BASIC_ENEMY;
}
