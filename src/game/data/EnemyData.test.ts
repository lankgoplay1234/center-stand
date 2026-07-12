import { describe, expect, it } from 'vitest';
import {
  BASIC_ENEMY,
  CAPTAIN_ENEMY,
  calculateCaptainSpawnChance,
  calculateEnemyGoldReward,
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
    expect(CAPTAIN_ENEMY.goldRewardPerStage).toBe(BASIC_ENEMY.goldRewardPerStage * 10);
    expect(CAPTAIN_ENEMY.defense).toBeGreaterThan(BASIC_ENEMY.defense);
  });

  it('rounds stage-scaled normal and captain rewards up to whole gold', () => {
    expect(calculateEnemyGoldReward(1, BASIC_ENEMY)).toBe(1);
    expect(calculateEnemyGoldReward(5, BASIC_ENEMY)).toBe(1);
    expect(calculateEnemyGoldReward(6, BASIC_ENEMY)).toBe(2);
    expect(calculateEnemyGoldReward(10, BASIC_ENEMY)).toBe(2);
    expect(calculateEnemyGoldReward(100, BASIC_ENEMY)).toBe(20);
    expect(calculateEnemyGoldReward(1, CAPTAIN_ENEMY)).toBe(2);
    expect(calculateEnemyGoldReward(10, CAPTAIN_ENEMY)).toBe(20);
    expect(calculateEnemyGoldReward(100, CAPTAIN_ENEMY)).toBe(200);
    expect(calculateEnemyGoldReward(0, BASIC_ENEMY)).toBe(1);
    expect(calculateEnemyGoldReward(Number.NaN, CAPTAIN_ENEMY)).toBe(2);
  });

  it('increases captain chance linearly from zero to 35 percent', () => {
    expect(calculateCaptainSpawnChance(1)).toBe(0);
    expect(calculateCaptainSpawnChance(50)).toBeCloseTo(49 / 99 * 0.35);
    expect(calculateCaptainSpawnChance(100)).toBeCloseTo(0.35);
    for (let stage = 2; stage <= 100; stage += 1) {
      expect(calculateCaptainSpawnChance(stage)).toBeGreaterThan(calculateCaptainSpawnChance(stage - 1));
    }
  });

  it('selects a captain only when the random roll is inside the current chance', () => {
    expect(selectEnemyData(1, 0)).toBe(BASIC_ENEMY);
    expect(selectEnemyData(50, 0.17)).toBe(CAPTAIN_ENEMY);
    expect(selectEnemyData(50, 0.18)).toBe(BASIC_ENEMY);
    expect(selectEnemyData(100, 0.349)).toBe(CAPTAIN_ENEMY);
    expect(selectEnemyData(100, 0.35)).toBe(BASIC_ENEMY);
  });
});
