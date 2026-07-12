import { describe, expect, it } from 'vitest';
import { formatSingleDecimalStat, formatWholeStat, roundStat } from './StatPrecisionData';

describe('character stat precision', () => {
  it('rounds internal values to at most three decimal places', () => {
    expect(roundStat(12.34549)).toBe(12.345);
    expect(roundStat(12.3455)).toBe(12.346);
    expect(roundStat(-1.2345)).toBe(-1.234);
  });

  it('formats whole and single-decimal player-facing stats', () => {
    expect(formatWholeStat(175.5)).toBe('176');
    expect(formatWholeStat(175.49)).toBe('175');
    expect(formatSingleDecimalStat(2.04)).toBe('2.0');
    expect(formatSingleDecimalStat(2.05)).toBe('2.1');
  });
});
