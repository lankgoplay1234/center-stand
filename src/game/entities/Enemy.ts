import Phaser from 'phaser';
import { calculateAppliedDamage, type DamageResult } from '../systems/DamageSystem';
import { calculateKnockbackPosition } from '../systems/KnockbackSystem';
import type { EnemyData } from '../types/GameTypes';

export class Enemy extends Phaser.GameObjects.Arc {
  readonly poolId: number;
  health = 0;
  maxHealth = 0;
  attackDamage = 0;
  moveSpeed = 0;
  attackInterval = 0;
  goldReward = 0;
  contactRange = 0;
  isAlive = false;
  lastAttackAt = 0;

  constructor(scene: Phaser.Scene, poolId: number) {
    super(scene, 0, 0, 18, 0, 360, false, 0xff446c, 1);
    this.poolId = poolId;
    this.setStrokeStyle(3, 0xffafbd, 0.8).setVisible(false).setActive(false).setDepth(4);
    scene.add.existing(this);
  }

  activate(x: number, y: number, data: EnemyData, healthMultiplier: number, damageMultiplier: number, speedMultiplier: number): void {
    this.setPosition(x, y).setScale(1).setAlpha(1).setFillStyle(0xff446c).setVisible(true).setActive(true);
    this.maxHealth = Math.round(data.health * healthMultiplier);
    this.health = this.maxHealth;
    this.attackDamage = Math.round(data.attackDamage * damageMultiplier);
    this.moveSpeed = data.moveSpeed * speedMultiplier;
    this.attackInterval = data.attackInterval;
    this.goldReward = data.goldReward;
    this.contactRange = data.contactRange;
    this.isAlive = true;
    this.lastAttackAt = 0;
  }

  deactivate(): void {
    this.isAlive = false;
    this.setActive(false).setVisible(false);
  }

  takeDamage(damage: number): DamageResult {
    if (!this.isAlive) return { appliedDamage: 0, died: false };
    const appliedDamage = calculateAppliedDamage(this.health, damage);
    this.health -= appliedDamage;
    if (this.health <= 0) {
      this.health = 0;
      this.isAlive = false;
      return { appliedDamage, died: true };
    }
    if (appliedDamage > 0) this.setFillStyle(0xffffff);
    return { appliedDamage, died: false };
  }

  applyKnockback(originX: number, originY: number, force: number): boolean {
    const margin = 60;
    const next = calculateKnockbackPosition(
      this,
      { x: originX, y: originY },
      force,
      {
        minX: -margin,
        maxX: this.scene.scale.width + margin,
        minY: -margin,
        maxY: this.scene.scale.height + margin,
      },
    );
    if (next.x === this.x && next.y === this.y) return false;
    this.setPosition(next.x, next.y);
    return true;
  }
}
