import { describe, expect, it } from 'vitest';
import { calculateKnockbackPosition } from './KnockbackSystem';

describe('calculateKnockbackPosition', () => {
  it('pushes a target directly away from the attacker', () => {
    expect(calculateKnockbackPosition({ x: 30, y: 40 }, { x: 0, y: 0 }, 10)).toEqual({ x: 36, y: 48 });
  });

  it('does not move area attacks configured with zero force', () => {
    expect(calculateKnockbackPosition({ x: 30, y: 40 }, { x: 0, y: 0 }, 0)).toEqual({ x: 30, y: 40 });
  });

  it('stays inside the configured offscreen safety bounds', () => {
    expect(calculateKnockbackPosition(
      { x: 95, y: 50 },
      { x: 50, y: 50 },
      20,
      { minX: -10, maxX: 100, minY: -10, maxY: 110 },
    )).toEqual({ x: 100, y: 50 });
  });

  it('handles overlapping attacker and target positions safely', () => {
    expect(calculateKnockbackPosition({ x: 10, y: 10 }, { x: 10, y: 10 }, 30)).toEqual({ x: 10, y: 10 });
  });
});
