import { describe, expect, it } from 'vitest';
import { MOB_CLEAR_BASE_COST, calculateMobClearCost } from './MobClearData';

describe('mob clear cost', () => {
  it('starts at 1,000 gold and grows by 30% after every use', () => {
    expect(calculateMobClearCost(0)).toBe(MOB_CLEAR_BASE_COST);
    expect(MOB_CLEAR_BASE_COST).toBe(1_000);
    expect(calculateMobClearCost(1)).toBe(1_300);
    expect(calculateMobClearCost(2)).toBe(1_690);
  });

  it('normalizes invalid usage counts', () => {
    expect(calculateMobClearCost(-3)).toBe(MOB_CLEAR_BASE_COST);
    expect(calculateMobClearCost(1.9)).toBe(calculateMobClearCost(1));
  });
});
