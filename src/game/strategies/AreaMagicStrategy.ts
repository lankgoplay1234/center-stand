import { selectAllUniqueTargetsInRange, selectNearestUniqueTargets, type TargetCandidate } from '../systems/TargetingSystem';
import type { AttackContext, AttackStrategy } from './AttackStrategy';

export class AreaMagicStrategy<T extends TargetCandidate> implements AttackStrategy<T> {
  readonly type = 'AREA_MAGIC' as const;

  execute(context: AttackContext<T>): number {
    const center = selectNearestUniqueTargets(
      context.candidates,
      context.attacker.x,
      context.attacker.y,
      context.attacker.attackRange,
      1,
    )[0];
    if (!center) return 0;

    const targets = selectAllUniqueTargetsInRange(
      context.candidates,
      center.x,
      center.y,
      context.attacker.attackAreaRadius,
    );
    context.emitEffect({ type: 'AREA_MAGIC', x: center.x, y: center.y, radius: context.attacker.attackAreaRadius });
    for (const target of targets) context.applyInstantDamage(target, context.attacker.attackDamage);
    return targets.length;
  }
}
