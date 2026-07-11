import { describe, expect, it } from 'vitest';
import {
  STAGE_DURATION_SEGMENTS,
  TOTAL_STAGE_DURATION_MS,
  calculateStageStats,
  calculateTotalStageDurationMs,
  getStageDurationMs,
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
  });

  it('uses progressively longer stage duration segments', () => {
    expect(STAGE_DURATION_SEGMENTS).toHaveLength(3);
    expect(getStageDurationMs(1)).toBe(18_000);
    expect(getStageDurationMs(20)).toBe(18_000);
    expect(getStageDurationMs(21)).toBe(23_000);
    expect(getStageDurationMs(60)).toBe(23_000);
    expect(getStageDurationMs(61)).toBe(26_500);
    expect(getStageDurationMs(100)).toBe(26_500);
  });

  it('clamps duration lookups to the playable stage range', () => {
    expect(getStageDurationMs(0)).toBe(getStageDurationMs(1));
    expect(getStageDurationMs(101)).toBe(getStageDurationMs(100));
    expect(getStageDurationMs(Number.NaN)).toBe(getStageDurationMs(1));
  });

  it('sets the uninterrupted 1 to 100 run time to 39 minutes', () => {
    expect(TOTAL_STAGE_DURATION_MS).toBe(39 * 60_000);
    expect(calculateTotalStageDurationMs(1, 100)).toBe(TOTAL_STAGE_DURATION_MS);
    expect(TOTAL_STAGE_DURATION_MS).toBeGreaterThanOrEqual(38 * 60_000);
    expect(TOTAL_STAGE_DURATION_MS).toBeLessThanOrEqual(42 * 60_000);
  });
});
