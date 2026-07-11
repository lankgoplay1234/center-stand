import { describe, expect, it } from 'vitest';
import { scaleGameDelta, toggleGameSpeed } from './GameSpeedSystem';

describe('GameSpeedSystem', () => {
  it('toggles only between normal and double speed', () => {
    expect(toggleGameSpeed(1)).toBe(2);
    expect(toggleGameSpeed(2)).toBe(1);
  });

  it('doubles the capped simulation delta without changing the real frame cap', () => {
    expect(scaleGameDelta(20, 1)).toBe(20);
    expect(scaleGameDelta(20, 2)).toBe(40);
    expect(scaleGameDelta(100, 1)).toBe(50);
    expect(scaleGameDelta(100, 2)).toBe(100);
  });
});
