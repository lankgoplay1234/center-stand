import { describe, expect, it } from 'vitest';
import {
  REVIVE_ENEMY_SEPARATION_RADIUS,
  separateEnemiesForRevive,
  type ReviveSeparationEnemy,
} from './ReviveEnemySeparationSystem';

const bounds = { minX: 0, maxX: 720, minY: 0, maxY: 1_000 };

function enemy(poolId: number, x: number, y: number, isAlive = true): ReviveSeparationEnemy {
  return { poolId, x, y, contactRange: 44, isAlive };
}

describe('separateEnemiesForRevive', () => {
  it('spreads exact overlaps to unique positions on a circular ring', () => {
    const enemies = [0, 1, 2, 3].map((poolId) => enemy(poolId, 360, 500));
    expect(separateEnemiesForRevive(enemies, 360, 500, bounds)).toBe(4);
    const positions = new Set(enemies.map(({ x, y }) => `${x.toFixed(3)},${y.toFixed(3)}`));
    expect(positions.size).toBe(4);
    for (const target of enemies) {
      expect(Math.hypot(target.x - 360, target.y - 500)).toBeCloseTo(REVIVE_ENEMY_SEPARATION_RADIUS);
    }
  });

  it('moves only alive enemies inside their contact range', () => {
    const touching = enemy(1, 390, 500);
    const outside = enemy(2, 405, 500);
    const inactive = enemy(3, 360, 500, false);
    expect(separateEnemiesForRevive([touching, outside, inactive], 360, 500, bounds)).toBe(1);
    expect(touching).toEqual(expect.objectContaining({ x: 640, y: 500 }));
    expect(outside).toEqual(expect.objectContaining({ x: 405, y: 500 }));
    expect(inactive).toEqual(expect.objectContaining({ x: 360, y: 500 }));
  });

  it('respects screen bounds and does not move the same enemies twice', () => {
    const enemies = [enemy(1, 20, 20), enemy(2, 20, 20)];
    expect(separateEnemiesForRevive(enemies, 20, 20, bounds)).toBe(2);
    for (const target of enemies) {
      expect(target.x).toBeGreaterThanOrEqual(bounds.minX);
      expect(target.y).toBeGreaterThanOrEqual(bounds.minY);
    }
    const positions = enemies.map(({ x, y }) => ({ x, y }));
    expect(separateEnemiesForRevive(enemies, 20, 20, bounds)).toBe(0);
    expect(enemies.map(({ x, y }) => ({ x, y }))).toEqual(positions);
  });
});
