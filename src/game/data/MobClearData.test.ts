import { describe, expect, it } from 'vitest';
import { MOB_CLEAR_BASE_COST, MOB_CLEAR_COST_GROWTH, MOB_CLEAR_MAX_USES, calculateMobClearCost } from './MobClearData';

describe('mob clear cost', () => {
  it('starts at 300 gold and doubles after every use', () => {
    expect(calculateMobClearCost(0)).toBe(MOB_CLEAR_BASE_COST);
    expect(MOB_CLEAR_BASE_COST).toBe(300);
    expect(MOB_CLEAR_COST_GROWTH).toBe(2);
    expect(MOB_CLEAR_MAX_USES).toBe(10);
    expect(calculateMobClearCost(1)).toBe(600);
    expect(calculateMobClearCost(2)).toBe(1_200);
    expect(calculateMobClearCost(9)).toBe(153_600);
  });

  it('normalizes invalid usage counts', () => {
    expect(calculateMobClearCost(-3)).toBe(MOB_CLEAR_BASE_COST);
    expect(calculateMobClearCost(1.9)).toBe(calculateMobClearCost(1));
  });
});
