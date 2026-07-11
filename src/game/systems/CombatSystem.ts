import type { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';
import type { EnemyManager } from '../managers/EnemyManager';
import type { ProjectileManager } from '../managers/ProjectileManager';
import type { AttackEffect, AttackStrategy } from '../strategies/AttackStrategy';
import { createAttackStrategy } from '../strategies/AttackStrategyFactory';

export interface CombatSystemCallbacks {
  applyInstantDamage: (enemy: Enemy, damage: number) => void;
  emitEffect: (effect: AttackEffect) => void;
}

export function calculateAttackIntervalMs(attackSpeed: number): number {
  return 1000 / Math.max(0.01, attackSpeed);
}

export class CombatSystem {
  private nextAttackAt = 0;
  private readonly strategy: AttackStrategy<Enemy>;

  constructor(
    private readonly player: Player,
    private readonly enemies: EnemyManager,
    private readonly projectiles: ProjectileManager,
    private readonly callbacks: CombatSystemCallbacks,
  ) {
    this.strategy = createAttackStrategy<Enemy>(player.character.attackType);
  }

  update(time: number): void {
    if (time < this.nextAttackAt) return;
    const attacked = this.strategy.execute({
      attacker: this.player,
      candidates: this.enemies.activeEnemies,
      fireProjectile: (target, damage, speed) => this.projectiles.fire(this.player.x, this.player.y, target, damage, speed),
      applyInstantDamage: this.callbacks.applyInstantDamage,
      emitEffect: this.callbacks.emitEffect,
    });
    if (attacked > 0) this.nextAttackAt = time + calculateAttackIntervalMs(this.player.attackSpeed);
  }
}
