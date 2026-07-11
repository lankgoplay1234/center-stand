import { describe, expect, it } from 'vitest';
import {
  BASE_CRITICAL_CHANCE,
  CRITICAL_CHANCE_PER_ATTACK_RANGE_LEVEL,
  MAX_BASE_CRITICAL_CHANCE,
  calculateExpectedCriticalDamageMultiplier,
  calculatePlayerCriticalChance,
  formatCriticalChance,
} from './CriticalHitData';

describe('critical hit progression', () => {
  it('adds 0.2 percentage points per attack-range level', () => {
    expect(BASE_CRITICAL_CHANCE).toBe(0.08);
    expect(MAX_BASE_CRITICAL_CHANCE).toBe(0.2);
    expect(CRITICAL_CHANCE_PER_ATTACK_RANGE_LEVEL).toBe(0.002);
    expect(calculatePlayerCriticalChance(0.08, 0)).toBe(0.08);
    expect(calculatePlayerCriticalChance(0.08, 1)).toBeCloseTo(0.082);
    expect(calculatePlayerCriticalChance(0.08, 99)).toBeCloseTo(0.278);
  });

  it('normalizes levels and formats a visible percentage', () => {
    expect(calculatePlayerCriticalChance(-1, -4)).toBe(0);
    expect(calculatePlayerCriticalChance(0.08, 1.9)).toBeCloseTo(0.082);
    expect(calculatePlayerCriticalChance(1, 0)).toBe(0.2);
    expect(formatCriticalChance(calculatePlayerCriticalChance(0.08, 1))).toBe('8.2%');
  });

  it('converts critical chance into deterministic expected damage', () => {
    expect(calculateExpectedCriticalDamageMultiplier(0)).toBe(1);
    expect(calculateExpectedCriticalDamageMultiplier(0.2)).toBe(1.15);
    expect(calculateExpectedCriticalDamageMultiplier(1)).toBe(1.75);
  });
});
