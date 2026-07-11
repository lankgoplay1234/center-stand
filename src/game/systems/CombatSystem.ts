import type { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';
import type { EnemyManager } from '../managers/EnemyManager';
import type { ProjectileManager } from '../managers/ProjectileManager';
import type {
  AttackEffect,
  AttackEffectPoint,
  AttackStrategy,
  CharacterMotionEffect,
} from '../strategies/AttackStrategy';
import type { AttackMotionStyle } from '../types/GameTypes';
import { createAttackStrategy } from '../strategies/AttackStrategyFactory';
import { SpecialAbilitySystem } from '../abilities/SpecialAbilitySystem';

export interface CombatSystemCallbacks {
  applyInstantDamage: (enemy: Enemy, damage: number) => void;
  emitEffect: (effect: AttackEffect) => void;
  playAttackSound?: (style: AttackMotionStyle) => void;
}

export function calculateAttackIntervalMs(attackSpeed: number): number {
  return 1000 / Math.max(0.01, attackSpeed);
}

export class CombatSystem {
  private nextAttackAt = 0;
  private readonly strategy: AttackStrategy<Enemy>;
  private readonly specialAbility: SpecialAbilitySystem<Enemy>;
  private readonly motionTargets: AttackEffectPoint[] = [];
  private readonly motionEffect: CharacterMotionEffect;

  constructor(
    private readonly player: Player,
    private readonly enemies: EnemyManager,
    private readonly projectiles: ProjectileManager,
    private readonly callbacks: CombatSystemCallbacks,
  ) {
    this.strategy = createAttackStrategy<Enemy>(player.character.attackType);
    this.motionEffect = {
      type: 'CHARACTER_MOTION',
      motion: player.character.attackMotion,
      from: player,
      targets: this.motionTargets,
      radius: player.attackAreaRadius,
    };
    this.specialAbility = new SpecialAbilitySystem<Enemy>(
      player.character.specialAbility,
      () => player.specialAbilityLevel,
      () => player.upgradeEfficiency.specialAbility,
    );
  }

  update(time: number): void {
    if (time < this.nextAttackAt) return;
    this.motionTargets.length = 0;
    const attacked = this.specialAbility.execute(this.strategy, {
      attacker: this.player,
      candidates: this.enemies.activeEnemies,
      fireProjectile: (target, damage, speed) => {
        this.motionTargets.push(target);
        this.projectiles.fire(this.player.x, this.player.y, target, damage, speed);
      },
      applyInstantDamage: (target, damage) => {
        this.motionTargets.push(target);
        this.callbacks.applyInstantDamage(target, damage);
      },
      emitEffect: this.callbacks.emitEffect,
    });
    if (attacked <= 0) return;
    this.motionEffect.radius = this.player.attackAreaRadius;
    this.player.playAttackMotion(this.motionTargets[0]);
    this.callbacks.playAttackSound?.(this.player.character.attackMotion.style);
    this.callbacks.emitEffect(this.motionEffect);
    this.nextAttackAt = time + calculateAttackIntervalMs(this.player.attackSpeed);
  }
}
