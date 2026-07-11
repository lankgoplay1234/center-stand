import { describe, expect, it, vi } from 'vitest';
import { MOB_CLEAR_BASE_COST, MOB_CLEAR_MAX_USES, calculateMobClearCost } from '../data/MobClearData';
import { MobClearSystem } from './MobClearSystem';

describe('MobClearSystem', () => {
  it('rejects empty fields and insufficient gold without charging', () => {
    const clear = vi.fn(() => ({ clearedEnemies: 3, rewardGold: 27, stageKills: 3 }));
    const system = new MobClearSystem();
    expect(system.purchase(MOB_CLEAR_BASE_COST, 0, clear)).toEqual({
      success: false, gold: MOB_CLEAR_BASE_COST, clearedEnemies: 0, rewardGold: 0, stageKills: 0,
    });
    expect(system.purchase(MOB_CLEAR_BASE_COST - 1, 3, clear)).toEqual({
      success: false, gold: MOB_CLEAR_BASE_COST - 1, clearedEnemies: 0, rewardGold: 0, stageKills: 0,
    });
    expect(clear).not.toHaveBeenCalled();
  });

  it('charges once, clears the current wave, and raises the next price', () => {
    const system = new MobClearSystem();
    const clear = vi.fn(() => ({ clearedEnemies: 100, rewardGold: 1_800, stageKills: 76 }));
    const result = system.purchase(10_000, 100, clear);
    expect(result).toEqual({
      success: true,
      gold: 10_000 - MOB_CLEAR_BASE_COST + 1_800,
      clearedEnemies: 100,
      rewardGold: 1_800,
      stageKills: 76,
    });
    expect(system.state).toEqual({
      usageCount: 1,
      currentCost: calculateMobClearCost(1),
      maxUses: MOB_CLEAR_MAX_USES,
      isMaxed: false,
    });
    expect(clear).toHaveBeenCalledOnce();
  });

  it('does not charge when the clear callback reports no enemies', () => {
    const system = new MobClearSystem();
    expect(system.purchase(5_000, 2, () => ({ clearedEnemies: 0, rewardGold: 0, stageKills: 0 }))).toEqual({
      success: false, gold: 5_000, clearedEnemies: 0, rewardGold: 0, stageKills: 0,
    });
    expect(system.state.usageCount).toBe(0);
  });

  it('allows ten uses and rejects every later purchase without clearing or charging', () => {
    const system = new MobClearSystem();
    const clear = vi.fn(() => ({ clearedEnemies: 1, rewardGold: 0, stageKills: 1 }));
    for (let usage = 0; usage < MOB_CLEAR_MAX_USES; usage += 1) {
      expect(system.purchase(1_000_000, 1, clear).success).toBe(true);
    }
    expect(system.state).toEqual({
      usageCount: MOB_CLEAR_MAX_USES,
      currentCost: calculateMobClearCost(MOB_CLEAR_MAX_USES),
      maxUses: MOB_CLEAR_MAX_USES,
      isMaxed: true,
    });
    clear.mockClear();
    expect(system.purchase(1_000_000, 1, clear)).toEqual({
      success: false,
      gold: 1_000_000,
      clearedEnemies: 0,
      rewardGold: 0,
      stageKills: 0,
    });
    expect(clear).not.toHaveBeenCalled();
  });
});
