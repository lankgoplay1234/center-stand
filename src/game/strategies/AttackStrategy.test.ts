import { describe, expect, it, vi } from 'vitest';
import { calculateAttackIntervalMs } from '../systems/CombatSystem';
import type { TargetCandidate } from '../systems/TargetingSystem';
import type { AttackType } from '../types/GameTypes';
import { createAttackStrategy } from './AttackStrategyFactory';
import type { AttackContext, AttackSource } from './AttackStrategy';

interface FakeTarget extends TargetCandidate {
  label: string;
}

const target = (poolId: number, x: number, y = 0): FakeTarget => ({
  poolId,
  x,
  y,
  isAlive: true,
  label: `target-${poolId}`,
});

const attacker = (overrides: Partial<AttackSource> = {}): AttackSource => ({
  x: 0,
  y: 0,
  attackDamage: 10,
  attackSpeed: 2,
  attackRange: 100,
  attackArcDegrees: null,
  attackAreaRadius: 35,
  totalTargetCount: 3,
  projectileSpeed: 500,
  ...overrides,
});

function context(
  source: AttackSource,
  candidates: readonly FakeTarget[],
): AttackContext<FakeTarget> & {
  fireProjectile: ReturnType<typeof vi.fn>;
  applyInstantDamage: ReturnType<typeof vi.fn>;
  emitEffect: ReturnType<typeof vi.fn>;
} {
  return {
    attacker: source,
    candidates,
    fireProjectile: vi.fn(),
    applyInstantDamage: vi.fn(),
    emitEffect: vi.fn(),
  };
}

describe('attack strategy factory', () => {
  it.each<AttackType>(['SINGLE_TARGET', 'MULTI_TARGET', 'AREA_MELEE', 'AREA_MAGIC', 'PIERCING', 'CHAIN'])(
    'selects the %s strategy from attackType',
    (attackType) => {
      expect(createAttackStrategy<FakeTarget>(attackType).type).toBe(attackType);
    },
  );
});

describe('damage delivery coverage', () => {
  it.each<AttackType>(['SINGLE_TARGET', 'MULTI_TARGET', 'AREA_MELEE', 'AREA_MAGIC', 'PIERCING', 'CHAIN'])(
    '%s delivers one damage event for every selected enemy',
    (attackType) => {
      const deliveredIds: number[] = [];
      const attack = context(
        attacker({ attackRange: 120, attackAreaRadius: 60, totalTargetCount: 3 }),
        [target(1, 20), target(2, 45), target(3, 70)],
      );
      attack.fireProjectile.mockImplementation((selected: FakeTarget) => deliveredIds.push(selected.poolId));
      attack.applyInstantDamage.mockImplementation((selected: FakeTarget) => deliveredIds.push(selected.poolId));
      const count = createAttackStrategy<FakeTarget>(attackType).execute(attack);
      expect(deliveredIds).toHaveLength(count);
      expect(new Set(deliveredIds).size).toBe(deliveredIds.length);
    },
  );
});

describe('SINGLE_TARGET', () => {
  it('attacks only the nearest enemy even when totalTargetCount is upgraded', () => {
    const attack = context(attacker({ totalTargetCount: 8 }), [target(1, 70), target(2, 20), target(3, 40)]);
    const count = createAttackStrategy<FakeTarget>('SINGLE_TARGET').execute(attack);
    expect(count).toBe(1);
    expect(attack.fireProjectile).toHaveBeenCalledTimes(1);
    expect(attack.fireProjectile).toHaveBeenCalledWith(expect.objectContaining({ poolId: 2 }), 10, 500);
  });

  it('does nothing safely when no enemy is in range', () => {
    const attack = context(attacker(), []);
    expect(createAttackStrategy<FakeTarget>('SINGLE_TARGET').execute(attack)).toBe(0);
    expect(attack.fireProjectile).not.toHaveBeenCalled();
  });
});

describe('MULTI_TARGET', () => {
  it('respects totalTargetCount and never selects the same enemy twice', () => {
    const duplicate = target(1, 10);
    const attack = context(attacker({ totalTargetCount: 2 }), [duplicate, duplicate, target(2, 20), target(3, 30)]);
    const count = createAttackStrategy<FakeTarget>('MULTI_TARGET').execute(attack);
    expect(count).toBe(2);
    const attackedIds = attack.fireProjectile.mock.calls.map((call) => (call[0] as FakeTarget).poolId);
    expect(attackedIds).toEqual([1, 2]);
    expect(new Set(attackedIds).size).toBe(attackedIds.length);
  });

  it('limits a cone volley by range, 90-degree arc, and totalTargetCount', () => {
    const attack = context(attacker({ attackRange: 50, attackArcDegrees: 90, totalTargetCount: 2 }), [
      target(1, 20, 0),
      target(2, 30, 25),
      target(3, 30, -25),
      target(4, 0, 20),
      target(5, 51, 0),
    ]);
    expect(createAttackStrategy<FakeTarget>('MULTI_TARGET').execute(attack)).toBe(2);
    expect(attack.fireProjectile).toHaveBeenCalledTimes(2);
    expect(attack.emitEffect).toHaveBeenCalledWith(expect.objectContaining({
      type: 'BASTION_CONE', radius: 50, arcDegrees: 90,
    }));
  });
});

describe('AREA_MELEE', () => {
  it('hits every unique enemy in range and excludes enemies outside it', () => {
    const duplicate = target(1, 25);
    const attack = context(attacker({ attackRange: 50, totalTargetCount: 1 }), [
      duplicate,
      duplicate,
      target(2, 45),
      target(3, 51),
    ]);
    const count = createAttackStrategy<FakeTarget>('AREA_MELEE').execute(attack);
    expect(count).toBe(2);
    expect(attack.applyInstantDamage).toHaveBeenCalledTimes(2);
    expect(attack.emitEffect).toHaveBeenCalledWith(expect.objectContaining({ type: 'AREA_MELEE', radius: 50 }));
  });

  it('hits only enemies inside the aimed 45-degree blade cone', () => {
    const withinAngle = 20 * Math.PI / 180;
    const outsideAngle = 30 * Math.PI / 180;
    const attack = context(attacker({ attackRange: 70, attackArcDegrees: 45 }), [
      target(1, 50, 0),
      target(2, Math.cos(withinAngle) * 55, Math.sin(withinAngle) * 55),
      target(3, Math.cos(outsideAngle) * 55, Math.sin(outsideAngle) * 55),
      target(4, -50, 0),
    ]);
    expect(createAttackStrategy<FakeTarget>('AREA_MELEE').execute(attack)).toBe(2);
    const attackedIds = attack.applyInstantDamage.mock.calls.map((call) => (call[0] as FakeTarget).poolId);
    expect(attackedIds).toEqual([1, 2]);
    expect(attack.emitEffect).toHaveBeenCalledWith(expect.objectContaining({
      type: 'AREA_MELEE', radius: 70, arcDegrees: 45, targetX: 50, targetY: 0,
    }));
  });
});

describe('AREA_MAGIC', () => {
  it('explodes around the nearest target and excludes enemies outside the blast radius', () => {
    const attack = context(attacker({ attackRange: 100, attackAreaRadius: 25 }), [
      target(1, 60),
      target(2, 80),
      target(3, 86),
    ]);
    expect(createAttackStrategy<FakeTarget>('AREA_MAGIC').execute(attack)).toBe(2);
    expect(attack.applyInstantDamage).toHaveBeenCalledTimes(2);
    expect(attack.emitEffect).toHaveBeenCalledWith({ type: 'AREA_MAGIC', x: 60, y: 0, radius: 25 });
  });
});

describe('PIERCING', () => {
  it('hits unique enemies along the line up to totalTargetCount', () => {
    const duplicate = target(1, 20);
    const attack = context(attacker({ attackRange: 100, attackAreaRadius: 8, totalTargetCount: 3 }), [
      duplicate,
      duplicate,
      target(2, 45, 5),
      target(3, 70, -6),
      target(4, 50, 12),
    ]);
    expect(createAttackStrategy<FakeTarget>('PIERCING').execute(attack)).toBe(3);
    const attackedIds = attack.applyInstantDamage.mock.calls.map((call) => (call[0] as FakeTarget).poolId);
    expect(attackedIds).toEqual([1, 2, 3]);
    expect(attack.emitEffect).toHaveBeenCalledWith(expect.objectContaining({ type: 'PIERCING' }));
  });
});

describe('CHAIN', () => {
  it('jumps to nearby unique enemies and stops when the chain range is broken', () => {
    const attack = context(attacker({ attackRange: 50, attackAreaRadius: 35, totalTargetCount: 5 }), [
      target(1, 30),
      target(2, 60),
      target(3, 92),
      target(4, 140),
    ]);
    expect(createAttackStrategy<FakeTarget>('CHAIN').execute(attack)).toBe(3);
    expect(attack.applyInstantDamage).toHaveBeenCalledTimes(3);
    expect(attack.emitEffect).toHaveBeenCalledWith(expect.objectContaining({ type: 'CHAIN' }));
  });
});

describe('live upgraded combat stats', () => {
  it('uses upgraded damage, range, projectile speed and target count without recreating the strategy', () => {
    const source = attacker({ attackDamage: 5, attackRange: 10, totalTargetCount: 1, projectileSpeed: 100 });
    const strategy = createAttackStrategy<FakeTarget>('MULTI_TARGET');
    const first = context(source, [target(1, 5), target(2, 15)]);
    expect(strategy.execute(first)).toBe(1);
    expect(first.fireProjectile).toHaveBeenCalledWith(expect.objectContaining({ poolId: 1 }), 5, 100);

    source.attackDamage = 12;
    source.attackRange = 20;
    source.totalTargetCount = 2;
    source.projectileSpeed = 240;
    const upgraded = context(source, [target(1, 5), target(2, 15)]);
    expect(strategy.execute(upgraded)).toBe(2);
    expect(upgraded.fireProjectile).toHaveBeenCalledWith(expect.objectContaining({ poolId: 2 }), 12, 240);
  });

  it('shortens the attack interval when attack speed increases', () => {
    expect(calculateAttackIntervalMs(4)).toBe(calculateAttackIntervalMs(2) / 2);
  });
});
