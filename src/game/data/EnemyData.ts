import type { EnemyData } from '../types/GameTypes';

export const BASIC_ENEMY: Readonly<EnemyData> = {
  id: 'void-runner',
  health: 54,
  attackDamage: 9,
  moveSpeed: 66,
  attackInterval: 850,
  goldReward: 6,
  contactRange: 44,
};
