import { describe, expect, it, vi } from 'vitest';
import { getStageKillTarget } from '../data/StageData';
import { FINAL_STAGE, StageManager } from './StageManager';

describe('StageManager', () => {
  it('does not advance from time and advances exactly at the kill target', () => {
    const onChanged = vi.fn();
    const manager = new StageManager(onChanged, vi.fn());
    manager.update(3_600_000);
    expect(manager.currentStage).toBe(1);
    manager.recordKills(manager.targetKills - 1);
    expect(manager.currentStage).toBe(1);
    manager.recordKills(1);
    expect(manager.currentStage).toBe(2);
    expect(onChanged).toHaveBeenCalledWith(2);
  });

  it('does not carry excess batch kills into the next stage', () => {
    const manager = new StageManager(vi.fn(), vi.fn());
    manager.recordKills(getStageKillTarget(1) + 100);
    expect(manager.currentStage).toBe(2);
    expect(manager.defeatedKills).toBe(0);
    expect(manager.remainingKills).toBe(getStageKillTarget(2));
  });

  it('limits spawn budget to unspawned stage enemies', () => {
    const manager = new StageManager(vi.fn(), vi.fn());
    expect(manager.remainingSpawnCount(0)).toBe(manager.targetKills);
    expect(manager.remainingSpawnCount(5)).toBe(manager.targetKills - 5);
    manager.recordKills(3);
    expect(manager.remainingSpawnCount(5)).toBe(manager.targetKills - 8);
  });

  it('completes stage 100 only once', () => {
    const onCompleted = vi.fn();
    const manager = new StageManager(vi.fn(), onCompleted);
    manager.currentStage = FINAL_STAGE;
    manager.recordKills(getStageKillTarget(FINAL_STAGE));
    expect(manager.isComplete).toBe(true);
    expect(manager.currentStage).toBe(FINAL_STAGE);
    expect(onCompleted).toHaveBeenCalledOnce();
    manager.recordKills(999);
    manager.update(999_999);
    expect(onCompleted).toHaveBeenCalledOnce();
  });
});
