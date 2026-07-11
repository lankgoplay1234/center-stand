import { describe, expect, it } from 'vitest';
import { calculateAppliedDamage } from './DamageSystem';

describe('calculateAppliedDamage', () => {
  it('returns the requested damage while enough health remains', () => {
    expect(calculateAppliedDamage(50, 12)).toBe(12);
  });

  it('shows only remaining health for an overkill hit', () => {
    expect(calculateAppliedDamage(5, 40)).toBe(5);
  });

  it('never returns negative damage', () => {
    expect(calculateAppliedDamage(50, -10)).toBe(0);
    expect(calculateAppliedDamage(0, 10)).toBe(0);
  });
});
