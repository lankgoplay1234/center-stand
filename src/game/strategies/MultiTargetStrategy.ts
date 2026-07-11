import { selectNearestUniqueTargets, selectNearestUniqueTargetsInCone, type TargetCandidate } from '../systems/TargetingSystem';
import type { AttackContext, AttackStrategy } from './AttackStrategy';

export class MultiTargetStrategy<T extends TargetCandidate> implements AttackStrategy<T> {
  readonly type = 'MULTI_TARGET' as const;

  execute(context: AttackContext<T>): number {
    const arcDegrees = context.attacker.attackArcDegrees;
    const targets = arcDegrees === null
      ? selectNearestUniqueTargets(
        context.candidates,
        context.attacker.x,
        context.attacker.y,
        context.attacker.attackRange,
        context.attacker.totalTargetCount,
      )
      : selectNearestUniqueTargetsInCone(
        context.candidates,
        context.attacker.x,
        context.attacker.y,
        context.attacker.attackRange,
        arcDegrees,
        context.attacker.totalTargetCount,
      );
    if (targets.length > 0 && arcDegrees !== null) {
      context.emitEffect({
        type: 'BASTION_CONE',
        x: context.attacker.x,
        y: context.attacker.y,
        targetX: targets[0]!.x,
        targetY: targets[0]!.y,
        radius: context.attacker.attackRange,
        arcDegrees,
      });
    }
    for (const target of targets) {
      context.fireProjectile(target, context.attacker.attackDamage, context.attacker.projectileSpeed);
    }
    return targets.length;
  }
}
