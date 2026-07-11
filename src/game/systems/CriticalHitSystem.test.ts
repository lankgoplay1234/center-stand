import { describe, expect, it } from 'vitest';
import { resolveCriticalHit } from './CriticalHitSystem';

describe('CriticalHitSystem', () => {
  it('keeps normal damage outside the critical chance', () => {
    expect(resolveCriticalHit(20, 0.5, 0.1, 2)).toEqual({ damage: 20, isCritical: false });
  });

  it('multiplies damage inside the critical chance', () => {
    expect(resolveCriticalHit(20, 0.05, 0.1, 1.75)).toEqual({ damage: 35, isCritical: true });
  });

  it('never turns zero critical chance into a critical hit', () => {
    expect(resolveCriticalHit(20, 0, 0, 2)).toEqual({ damage: 20, isCritical: false });
  });
});
