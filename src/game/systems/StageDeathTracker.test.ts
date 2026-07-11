import { describe, expect, it } from 'vitest';
import { StageDeathTracker } from './StageDeathTracker';

describe('StageDeathTracker', () => {
  it('starts recommending on the fifth death and keeps recommending afterward', () => {
    const tracker = new StageDeathTracker();
    for (let death = 1; death <= 4; death += 1) {
      expect(tracker.recordDeath(1)).toBe(death);
      expect(tracker.shouldRecommend).toBe(false);
    }
    expect(tracker.recordDeath(1)).toBe(5);
    expect(tracker.shouldRecommend).toBe(true);
    expect(tracker.recordDeath(1)).toBe(6);
    expect(tracker.shouldRecommend).toBe(true);
  });

  it('resets when the stage changes', () => {
    const tracker = new StageDeathTracker();
    for (let death = 0; death < 5; death += 1) tracker.recordDeath(7);
    expect(tracker.shouldRecommend).toBe(true);
    tracker.enterStage(8);
    expect(tracker.currentStage).toBe(8);
    expect(tracker.deathCount).toBe(0);
    expect(tracker.shouldRecommend).toBe(false);
  });
});
