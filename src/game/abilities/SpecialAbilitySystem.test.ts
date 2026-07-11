import { describe, expect, it, vi } from 'vitest';
import { ARC_OVERCHARGE } from '../data/SpecialAbilityData';
import { SingleTargetStrategy } from '../strategies/SingleTargetStrategy';
import type { AttackContext, AttackSource } from '../strategies/AttackStrategy';
import type { TargetCandidate } from '../systems/TargetingSystem';
import { SpecialAbilitySystem } from './SpecialAbilitySystem';

interface FakeTarget extends TargetCandidate {
  label: string;
}

const attacker: AttackSource = {
  x: 0,
  y: 0,
  attackDamage: 10,
  attackSpeed: 2,
  attackRange: 100,
  attackAreaRadius: 20,
  totalTargetCount: 1,
  projectileSpeed: 500,
};

const enemy: FakeTarget = { poolId: 1, x: 20, y: 0, isAlive: true, label: 'enemy' };

function createContext(candidates: readonly FakeTarget[] = [enemy]): AttackContext<FakeTarget> & {
  fireProjectile: ReturnType<typeof vi.fn>;
  emitEffect: ReturnType<typeof vi.fn>;
} {
  return {
    attacker,
    candidates,
    fireProjectile: vi.fn(),
    applyInstantDamage: vi.fn(),
    emitEffect: vi.fn(),
  };
}

describe('SpecialAbilitySystem', () => {
  it('boosts only the fifth successful Arc Ranger projectile without duplicating the target', () => {
    const system = new SpecialAbilitySystem<FakeTarget>(ARC_OVERCHARGE, () => 0, () => 1);
    const strategy = new SingleTargetStrategy<FakeTarget>();

    for (let attackIndex = 1; attackIndex <= 5; attackIndex += 1) {
      const attack = createContext();
      expect(system.execute(strategy, attack)).toBe(1);
      expect(attack.fireProjectile).toHaveBeenCalledTimes(1);
      const damage = attack.fireProjectile.mock.calls[0]![1];
      expect(damage).toBe(attackIndex === 5 ? 16 : 10);
      expect(attack.emitEffect).toHaveBeenCalledTimes(attackIndex === 5 ? 1 : 0);
    }
  });

  it('does not advance the trigger counter when no enemy is attacked', () => {
    const ability = { ...ARC_OVERCHARGE, triggerEveryAttacks: 2 };
    const system = new SpecialAbilitySystem<FakeTarget>(ability, () => 0, () => 1);
    const strategy = new SingleTargetStrategy<FakeTarget>();

    expect(system.execute(strategy, createContext([]))).toBe(0);
    const firstHit = createContext();
    system.execute(strategy, firstHit);
    expect(firstHit.fireProjectile).toHaveBeenCalledWith(enemy, 10, 500);
    const secondHit = createContext();
    system.execute(strategy, secondHit);
    expect(secondHit.fireProjectile).toHaveBeenCalledWith(enemy, 16, 500);
  });

  it('uses the live special upgrade level and efficiency on the trigger attack', () => {
    const ability = { ...ARC_OVERCHARGE, triggerEveryAttacks: 1 };
    const system = new SpecialAbilitySystem<FakeTarget>(ability, () => 5, () => 2);
    const attack = createContext();

    system.execute(new SingleTargetStrategy<FakeTarget>(), attack);
    expect(attack.fireProjectile).toHaveBeenCalledWith(enemy, 18, 500);
  });

  it('keeps the original strategy behavior when no unique ability is configured', () => {
    const system = new SpecialAbilitySystem<FakeTarget>(null, () => 99, () => 2);
    const attack = createContext();

    system.execute(new SingleTargetStrategy<FakeTarget>(), attack);
    expect(attack.fireProjectile).toHaveBeenCalledWith(enemy, 10, 500);
    expect(attack.emitEffect).not.toHaveBeenCalled();
  });
});
