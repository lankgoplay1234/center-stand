import { describe, expect, it } from 'vitest';
import { calculateAppliedDamage, calculateDamageAfterDefense } from './DamageSystem';

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

describe('calculateDamageAfterDefense', () => {
  it('subtracts defense while preserving at least one damage from a positive hit', () => {
    expect(calculateDamageAfterDefense(25, 9)).toBe(16);
    expect(calculateDamageAfterDefense(9, 99)).toBe(1);
  });

  it('does not turn zero or invalid negative damage into a hit', () => {
    expect(calculateDamageAfterDefense(0, 5)).toBe(0);
    expect(calculateDamageAfterDefense(-10, 5)).toBe(0);
  });
});
