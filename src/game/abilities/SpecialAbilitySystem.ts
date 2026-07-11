import { calculateBladeFuryDamageMultiplier, calculateOverchargeDamageMultiplier } from '../data/SpecialAbilityData';
import type { TargetCandidate } from '../systems/TargetingSystem';
import type { ArcOverchargeAbilityData, BladeFuryAbilityData, SpecialAbilityData } from '../types/GameTypes';
import type { AttackContext, AttackStrategy } from '../strategies/AttackStrategy';

export class SpecialAbilitySystem<T extends TargetCandidate> {
  private successfulAttackCount = 0;

  constructor(
    private readonly ability: SpecialAbilityData | null,
    private readonly getLevel: () => number,
    private readonly getEfficiency: () => number,
  ) {}

  execute(strategy: AttackStrategy<T>, context: AttackContext<T>): number {
    if (this.ability?.type === 'ARC_OVERCHARGE') return this.executeArcOvercharge(this.ability, strategy, context);
    if (this.ability?.type === 'BLADE_FURY') return this.executeBladeFury(this.ability, strategy, context);
    return strategy.execute(context);
  }

  private executeBladeFury(
    ability: BladeFuryAbilityData,
    strategy: AttackStrategy<T>,
    context: AttackContext<T>,
  ): number {
    const shouldTrigger = (this.successfulAttackCount + 1) % ability.triggerEveryAttacks === 0;
    const multiplier = shouldTrigger
      ? calculateBladeFuryDamageMultiplier(ability, this.getLevel(), this.getEfficiency())
      : 1;
    const attackContext = shouldTrigger ? {
      ...context,
      applyInstantDamage: (target: T, damage: number) => context.applyInstantDamage(target, damage * multiplier),
    } : context;
    const attacked = strategy.execute(attackContext);
    if (attacked <= 0) return attacked;
    this.successfulAttackCount += 1;
    if (shouldTrigger) {
      context.emitEffect({
        type: 'BLADE_FURY',
        x: context.attacker.x,
        y: context.attacker.y,
        radius: context.attacker.attackRange,
      });
    }
    return attacked;
  }

  private executeArcOvercharge(
    ability: ArcOverchargeAbilityData,
    strategy: AttackStrategy<T>,
    context: AttackContext<T>,
  ): number {
    const shouldTrigger = (this.successfulAttackCount + 1) % ability.triggerEveryAttacks === 0;
    let enhanced = false;
    const attackContext = shouldTrigger ? {
      ...context,
      fireProjectile: (target: T, damage: number, speed: number) => {
        if (enhanced) {
          context.fireProjectile(target, damage, speed);
          return;
        }
        enhanced = true;
        const multiplier = calculateOverchargeDamageMultiplier(ability, this.getLevel(), this.getEfficiency());
        context.fireProjectile(target, damage * multiplier, speed);
      },
    } : context;

    const attacked = strategy.execute(attackContext);
    if (attacked <= 0) return attacked;
    this.successfulAttackCount += 1;
    if (shouldTrigger && enhanced) {
      context.emitEffect({ type: 'ARC_OVERCHARGE', x: context.attacker.x, y: context.attacker.y, radius: 62 });
    }
    return attacked;
  }
}
