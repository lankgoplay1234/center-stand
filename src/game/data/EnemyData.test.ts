import { describe, expect, it } from 'vitest';
import {
  BASIC_ENEMY,
  CAPTAIN_ENEMY,
  calculateCaptainSpawnChance,
  calculateEnemyVisualTier,
  getEnemyVisualProfile,
  selectEnemyData,
} from './EnemyData';

describe('enemy stage progression', () => {
  it('uses five stronger visual tiers across stages 1 to 100', () => {
    expect([1, 20, 21, 40, 41, 60, 61, 80, 81, 100].map(calculateEnemyVisualTier))
      .toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
    const first = getEnemyVisualProfile(1, 'NORMAL');
    const final = getEnemyVisualProfile(100, 'NORMAL');
    expect(final.radius).toBeGreaterThan(first.radius);
    expect(final.strokeWidth).toBeGreaterThan(first.strokeWidth);
    expect(final.fillColor).not.toBe(first.fillColor);
    expect(final.textureKey).not.toBe(first.textureKey);
  });

  it('makes captain visuals larger and more heavily outlined at every tier', () => {
    for (const stage of [1, 20, 40, 60, 80, 100]) {
      const normal = getEnemyVisualProfile(stage, 'NORMAL');
      const captain = getEnemyVisualProfile(stage, 'CAPTAIN');
      expect(captain.radius).toBeGreaterThan(normal.radius);
      expect(captain.strokeWidth).toBeGreaterThan(normal.strokeWidth);
      expect(captain.strokeColor).not.toBe(normal.strokeColor);
      expect(captain.textureKey).not.toBe(normal.textureKey);
    }
  });

  it('defines captains at more than ten times normal health and damage', () => {
    expect(CAPTAIN_ENEMY.health).toBeGreaterThanOrEqual(BASIC_ENEMY.health * 10);
    expect(CAPTAIN_ENEMY.attackDamage).toBeGreaterThanOrEqual(BASIC_ENEMY.attackDamage * 10);
    expect(CAPTAIN_ENEMY.goldReward).toBeGreaterThan(BASIC_ENEMY.goldReward);
  });

  it('starts captain spawns at stage 10 and reaches two percent at stage 100', () => {
    expect(calculateCaptainSpawnChance(1)).toBe(0);
    expect(calculateCaptainSpawnChance(9)).toBe(0);
    expect(calculateCaptainSpawnChance(10)).toBeCloseTo(0.002);
    expect(calculateCaptainSpawnChance(50)).toBeGreaterThan(calculateCaptainSpawnChance(10));
    expect(calculateCaptainSpawnChance(100)).toBeCloseTo(0.02);
  });

  it('selects a captain only when the random roll is inside the current chance', () => {
    expect(selectEnemyData(9, 0)).toBe(BASIC_ENEMY);
    expect(selectEnemyData(10, 0.001)).toBe(CAPTAIN_ENEMY);
    expect(selectEnemyData(10, 0.003)).toBe(BASIC_ENEMY);
    expect(selectEnemyData(100, 0.019)).toBe(CAPTAIN_ENEMY);
    expect(selectEnemyData(100, 0.02)).toBe(BASIC_ENEMY);
  });
});
