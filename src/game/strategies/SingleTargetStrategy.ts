import { selectNearestUniqueTargets, type TargetCandidate } from '../systems/TargetingSystem';
import type { AttackContext, AttackStrategy } from './AttackStrategy';

export class SingleTargetStrategy<T extends TargetCandidate> implements AttackStrategy<T> {
  readonly type = 'SINGLE_TARGET' as const;

  execute(context: AttackContext<T>): number {
    const targets = selectNearestUniqueTargets(
      context.candidates,
      context.attacker.x,
      context.attacker.y,
      context.attacker.attackRange,
      1,
    );
    const target = targets[0];
    if (!target) return 0;
    context.fireProjectile(target, context.attacker.attackDamage, context.attacker.projectileSpeed);
    return 1;
  }
}
