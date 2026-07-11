import { selectPiercingTargets, type TargetCandidate } from '../systems/TargetingSystem';
import type { AttackContext, AttackStrategy } from './AttackStrategy';

export class PiercingStrategy<T extends TargetCandidate> implements AttackStrategy<T> {
  readonly type = 'PIERCING' as const;

  execute(context: AttackContext<T>): number {
    const result = selectPiercingTargets(
      context.candidates,
      context.attacker.x,
      context.attacker.y,
      context.attacker.attackRange,
      context.attacker.attackAreaRadius,
      context.attacker.totalTargetCount,
    );
    if (!result) return 0;
    context.emitEffect({
      type: 'PIERCING',
      from: { x: context.attacker.x, y: context.attacker.y },
      to: result.end,
    });
    for (const target of result.targets) context.applyInstantDamage(target, context.attacker.attackDamage);
    return result.targets.length;
  }
}
