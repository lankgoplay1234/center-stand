import { describe, expect, it, vi } from 'vitest';
import { TOTAL_STAGE_DURATION_MS, getStageDurationMs } from '../data/StageData';
import { FINAL_STAGE, StageManager } from './StageManager';

describe('StageManager', () => {
  it('advances stages at the configured duration boundary', () => {
    const onChanged = vi.fn();
    const manager = new StageManager(onChanged, vi.fn());
    manager.update(getStageDurationMs(1) - 1);
    expect(manager.currentStage).toBe(1);
    manager.update(1);
    expect(manager.currentStage).toBe(2);
    expect(onChanged).toHaveBeenCalledWith(2);
  });

  it('runs stage 100 fully and completes only once', () => {
    const onCompleted = vi.fn();
    const manager = new StageManager(vi.fn(), onCompleted);
    manager.update(TOTAL_STAGE_DURATION_MS - getStageDurationMs(FINAL_STAGE));
    expect(manager.currentStage).toBe(FINAL_STAGE);
    expect(manager.isComplete).toBe(false);
    manager.update(getStageDurationMs(FINAL_STAGE));
    expect(manager.isComplete).toBe(true);
    expect(onCompleted).toHaveBeenCalledOnce();
    manager.update(TOTAL_STAGE_DURATION_MS);
    expect(onCompleted).toHaveBeenCalledOnce();
    expect(manager.currentStage).toBe(FINAL_STAGE);
  });

  it('uses each segment duration when one update crosses multiple boundaries', () => {
    const onChanged = vi.fn();
    const manager = new StageManager(onChanged, vi.fn());
    manager.update(20 * getStageDurationMs(1) + getStageDurationMs(21));
    expect(manager.currentStage).toBe(22);
    expect(onChanged).toHaveBeenCalledTimes(21);
    expect(onChanged).toHaveBeenLastCalledWith(22);
  });
});
