import { describe, expect, it } from 'vitest';
import { calculateStageStats } from './StageData';

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
});
