import { selectNearestUniqueTargetsInCone, type TargetCandidate } from '../systems/TargetingSystem';
import type { AttackContext, AttackStrategy } from './AttackStrategy';

export class AreaMeleeStrategy<T extends TargetCandidate> implements AttackStrategy<T> {
  readonly type = 'AREA_MELEE' as const;

  execute(context: AttackContext<T>): number {
    const arcDegrees = context.attacker.attackArcDegrees ?? 360;
    const targets = selectNearestUniqueTargetsInCone(
      context.candidates,
      context.attacker.x,
      context.attacker.y,
      context.attacker.attackRange,
      arcDegrees,
    );
    if (targets.length === 0) return 0;
    context.emitEffect({
      type: 'AREA_MELEE',
      x: context.attacker.x,
      y: context.attacker.y,
      targetX: targets[0]!.x,
      targetY: targets[0]!.y,
      radius: context.attacker.attackRange,
      arcDegrees,
    });
    for (const target of targets) context.applyInstantDamage(target, context.attacker.attackDamage);
    return targets.length;
  }
}
