import { selectNearestUniqueTargets, type TargetCandidate } from '../systems/TargetingSystem';
import type { AttackContext, AttackStrategy } from './AttackStrategy';

export class MultiTargetStrategy<T extends TargetCandidate> implements AttackStrategy<T> {
  readonly type = 'MULTI_TARGET' as const;

  execute(context: AttackContext<T>): number {
    const targets = selectNearestUniqueTargets(
      context.candidates,
      context.attacker.x,
      context.attacker.y,
      context.attacker.attackRange,
      context.attacker.totalTargetCount,
    );
    for (const target of targets) {
      context.fireProjectile(target, context.attacker.attackDamage, context.attacker.projectileSpeed);
    }
    return targets.length;
  }
}
