import { describe, expect, it } from 'vitest';
import {
  BASE_CRITICAL_CHANCE,
  CRITICAL_CHANCE_PER_ATTACK_RANGE_LEVEL,
  calculatePlayerCriticalChance,
  formatCriticalChance,
} from './CriticalHitData';

describe('critical hit progression', () => {
  it('adds 0.2 percentage points per attack-range level', () => {
    expect(BASE_CRITICAL_CHANCE).toBe(0.08);
    expect(CRITICAL_CHANCE_PER_ATTACK_RANGE_LEVEL).toBe(0.002);
    expect(calculatePlayerCriticalChance(0)).toBe(0.08);
    expect(calculatePlayerCriticalChance(1)).toBeCloseTo(0.082);
    expect(calculatePlayerCriticalChance(99)).toBeCloseTo(0.278);
  });

  it('normalizes levels and formats a visible percentage', () => {
    expect(calculatePlayerCriticalChance(-4)).toBe(0.08);
    expect(calculatePlayerCriticalChance(1.9)).toBeCloseTo(0.082);
    expect(formatCriticalChance(calculatePlayerCriticalChance(1))).toBe('8.2%');
  });
});
