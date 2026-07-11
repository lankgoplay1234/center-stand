import { selectChainTargets, type TargetCandidate } from '../systems/TargetingSystem';
import type { AttackContext, AttackStrategy } from './AttackStrategy';

export class ChainStrategy<T extends TargetCandidate> implements AttackStrategy<T> {
  readonly type = 'CHAIN' as const;

  execute(context: AttackContext<T>): number {
    const targets = selectChainTargets(
      context.candidates,
      context.attacker.x,
      context.attacker.y,
      context.attacker.attackRange,
      context.attacker.attackAreaRadius,
      context.attacker.totalTargetCount,
    );
    if (targets.length === 0) return 0;
    context.emitEffect({
      type: 'CHAIN',
      points: [{ x: context.attacker.x, y: context.attacker.y }, ...targets.map(({ x, y }) => ({ x, y }))],
    });
    for (const target of targets) context.applyInstantDamage(target, context.attacker.attackDamage);
    return targets.length;
  }
}
