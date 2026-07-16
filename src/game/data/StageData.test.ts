import { describe, expect, it } from 'vitest';
import {
  FINAL_STAGE_KILL_TARGET,
  FINAL_STAGE_SPAWN_RATE,
  FIRST_STAGE_KILL_TARGET,
  FIRST_STAGE_SPAWN_RATE,
  THEORETICAL_FASTEST_CLEAR_MS,
  TOTAL_STAGE_KILL_TARGET,
  calculateStageStats,
  calculateTheoreticalFastestClearMs,
  calculateTotalStageKillTarget,
  getStageKillTarget,
} from './StageData';

describe('stage difficulty', () => {
  it('raises health and lowers spawn interval', () => {
    const first = calculateStageStats(1);
    const fifth = calculateStageStats(5);
    const sixth = calculateStageStats(6);
    const final = calculateStageStats(100);
    expect(final.enemyHealthMultiplier).toBeGreaterThan(sixth.enemyHealthMultiplier);
    expect(fifth.enemyAttackBonus).toBeCloseTo(first.enemyAttackBonus + 2);
    expect(fifth.enemyDefenseBonus).toBe(first.enemyDefenseBonus);
    expect(final.enemyAttackBonus).toBeGreaterThan(sixth.enemyAttackBonus);
    expect(final.enemyDefenseBonus).toBeGreaterThan(sixth.enemyDefenseBonus);
    expect(fifth.spawnInterval).toBeLessThan(first.spawnInterval);
    expect(fifth.maxActiveEnemies).toBeGreaterThan(first.maxActiveEnemies);
    expect(first.enemyAttackBonus).toBeCloseTo(-6);
    expect(first.enemyDefenseBonus).toBe(0);
    expect(final.enemyAttackBonus).toBe(99);
    expect(final.enemyDefenseBonus).toBe(99);
  });

  it('clamps invalid stages to stage one', () => {
    expect(calculateStageStats(0)).toEqual(calculateStageStats(1));
    expect(getStageKillTarget(0)).toBe(getStageKillTarget(1));
    expect(getStageKillTarget(Number.NaN)).toBe(getStageKillTarget(1));
  });

  it('uses increasing kill targets instead of fixed stage durations', () => {
    expect(getStageKillTarget(1)).toBe(FIRST_STAGE_KILL_TARGET);
    expect(getStageKillTarget(50)).toBe(174);
    expect(getStageKillTarget(100)).toBe(FINAL_STAGE_KILL_TARGET);
    for (let stage = 2; stage <= 100; stage += 1) {
      expect(getStageKillTarget(stage)).toBeGreaterThan(getStageKillTarget(stage - 1));
    }
  });

  it('scales spawn rate linearly from 10 to 100 enemies per second', () => {
    expect(1_000 / calculateStageStats(1).spawnInterval).toBeCloseTo(FIRST_STAGE_SPAWN_RATE);
    expect(1_000 / calculateStageStats(50).spawnInterval).toBeCloseTo(54.54545);
    expect(1_000 / calculateStageStats(100).spawnInterval).toBeCloseTo(FINAL_STAGE_SPAWN_RATE);
  });

  it('sets a finite 17,500-enemy 100-stage target and theoretical spawn floor', () => {
    expect(TOTAL_STAGE_KILL_TARGET).toBe(17_500);
    expect(calculateTotalStageKillTarget()).toBe(TOTAL_STAGE_KILL_TARGET);
    expect(calculateTheoreticalFastestClearMs()).toBe(THEORETICAL_FASTEST_CLEAR_MS);
    expect(THEORETICAL_FASTEST_CLEAR_MS).toBeGreaterThan(5 * 60_000);
    expect(THEORETICAL_FASTEST_CLEAR_MS).toBeLessThan(6 * 60_000);
  });
});
