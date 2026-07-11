import { calculateOverchargeDamageMultiplier } from '../data/SpecialAbilityData';
import type { TargetCandidate } from '../systems/TargetingSystem';
import type { ArcOverchargeAbilityData, SpecialAbilityData } from '../types/GameTypes';
import type { AttackContext, AttackStrategy } from '../strategies/AttackStrategy';

export class SpecialAbilitySystem<T extends TargetCandidate> {
  private successfulAttackCount = 0;

  constructor(
    private readonly ability: SpecialAbilityData | null,
    private readonly getLevel: () => number,
    private readonly getEfficiency: () => number,
  ) {}

  execute(strategy: AttackStrategy<T>, context: AttackContext<T>): number {
    if (this.ability?.type !== 'ARC_OVERCHARGE') return strategy.execute(context);
    return this.executeArcOvercharge(this.ability, strategy, context);
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
