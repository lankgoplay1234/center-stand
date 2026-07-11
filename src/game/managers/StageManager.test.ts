import { describe, expect, it, vi } from 'vitest';
import { STAGE_DURATION_MS } from '../data/StageData';
import { FINAL_STAGE, StageManager } from './StageManager';

describe('StageManager', () => {
  it('advances stages at fixed duration boundaries', () => {
    const onChanged = vi.fn();
    const manager = new StageManager(onChanged, vi.fn());
    manager.update(STAGE_DURATION_MS - 1);
    expect(manager.currentStage).toBe(1);
    manager.update(1);
    expect(manager.currentStage).toBe(2);
    expect(onChanged).toHaveBeenCalledWith(2);
  });

  it('runs stage 100 fully and completes only once', () => {
    const onCompleted = vi.fn();
    const manager = new StageManager(vi.fn(), onCompleted);
    manager.update(STAGE_DURATION_MS * (FINAL_STAGE - 1));
    expect(manager.currentStage).toBe(FINAL_STAGE);
    expect(manager.isComplete).toBe(false);
    manager.update(STAGE_DURATION_MS);
    expect(manager.isComplete).toBe(true);
    expect(onCompleted).toHaveBeenCalledOnce();
    manager.update(STAGE_DURATION_MS * 10);
    expect(onCompleted).toHaveBeenCalledOnce();
    expect(manager.currentStage).toBe(FINAL_STAGE);
  });
});
