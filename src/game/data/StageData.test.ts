import { describe, expect, it } from 'vitest';
import {
  STAGE_KILL_TARGET_SEGMENTS,
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
    expect(fifth.enemyHealthMultiplier).toBeGreaterThan(first.enemyHealthMultiplier);
    expect(fifth.enemyDamageMultiplier).toBeGreaterThan(first.enemyDamageMultiplier);
    expect(fifth.spawnInterval).toBeLessThan(first.spawnInterval);
    expect(fifth.maxActiveEnemies).toBeGreaterThan(first.maxActiveEnemies);
  });

  it('clamps invalid stages to stage one', () => {
    expect(calculateStageStats(0)).toEqual(calculateStageStats(1));
    expect(getStageKillTarget(0)).toBe(getStageKillTarget(1));
    expect(getStageKillTarget(Number.NaN)).toBe(getStageKillTarget(1));
  });

  it('uses increasing kill targets instead of fixed stage durations', () => {
    expect(STAGE_KILL_TARGET_SEGMENTS).toHaveLength(3);
    expect(getStageKillTarget(1)).toBe(18);
    expect(getStageKillTarget(5)).toBe(27);
    expect(getStageKillTarget(10)).toBe(45);
    expect(getStageKillTarget(15)).toBe(75);
    expect(getStageKillTarget(20)).toBe(75);
    expect(getStageKillTarget(21)).toBe(96);
    expect(getStageKillTarget(60)).toBe(96);
    expect(getStageKillTarget(61)).toBe(111);
    expect(getStageKillTarget(100)).toBe(111);
  });

  it('sets a finite 100-stage target and an approximately 20-minute theoretical floor', () => {
    expect(TOTAL_STAGE_KILL_TARGET).toBe(9_264);
    expect(calculateTotalStageKillTarget()).toBe(TOTAL_STAGE_KILL_TARGET);
    expect(calculateTheoreticalFastestClearMs()).toBe(THEORETICAL_FASTEST_CLEAR_MS);
    expect(THEORETICAL_FASTEST_CLEAR_MS).toBeGreaterThanOrEqual(19 * 60_000);
    expect(THEORETICAL_FASTEST_CLEAR_MS).toBeLessThanOrEqual(21 * 60_000);
  });
});
