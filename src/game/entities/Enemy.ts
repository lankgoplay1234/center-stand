import Phaser from 'phaser';
import { calculateAppliedDamage, calculateDamageAfterDefense, type DamageResult } from '../systems/DamageSystem';
import { calculateEffectiveKnockbackForce } from '../systems/KnockbackSystem';
import { calculateEnemyGoldReward, getEnemyVisualProfile } from '../data/EnemyData';
import type { EnemyData } from '../types/GameTypes';

export class Enemy extends Phaser.GameObjects.Image {
  readonly poolId: number;
  health = 0;
  maxHealth = 0;
  attackDamage = 0;
  defense = 0;
  moveSpeed = 0;
  attackInterval = 0;
  goldReward = 0;
  contactRange = 0;
  rank: EnemyData['rank'] = 'NORMAL';
  visualTier = 1;
  radius = 18;
  isAlive = false;
  countsTowardStage = true;
  lastAttackAt = 0;
  knockbackX = 0;
  knockbackY = 0;
  knockbackDuration = 0;
  constructor(scene: Phaser.Scene, poolId: number) {
    super(scene, 0, 0, 'enemy-normal-1');
    this.poolId = poolId;
    this.setOrigin(0.5).setVisible(false).setActive(false).setDepth(4);
    scene.add.existing(this);
  }

  activate(
    x: number,
    y: number,
    data: EnemyData,
    stage: number,
    healthMultiplier: number,
    attackBonus: number,
    defenseBonus: number,
    speedMultiplier: number,
  ): void {
    const visual = getEnemyVisualProfile(stage, data.rank);
    this.rank = data.rank;
    this.visualTier = visual.tier;
    this.radius = visual.radius;
    this.setTexture(visual.textureKey).setDisplaySize(visual.radius * 2, visual.radius * 2);
    this.clearTint();
    this.setPosition(x, y).setScale(1).setAlpha(1)
      .setVisible(true).setActive(true);
    this.maxHealth = Math.round(data.health * healthMultiplier);
    this.health = this.maxHealth;
    this.attackDamage = Math.round(data.attackDamage + attackBonus);
    this.defense = Math.round(data.defense + defenseBonus);
    this.moveSpeed = data.moveSpeed * speedMultiplier;
    this.attackInterval = data.attackInterval;
    this.goldReward = calculateEnemyGoldReward(stage, data);
    this.contactRange = data.contactRange;
    this.isAlive = true;
    this.countsTowardStage = true;
    this.lastAttackAt = 0;
    this.knockbackX = 0;
    this.knockbackY = 0;
    this.knockbackDuration = 0;
  }

  deactivate(): void {
    this.isAlive = false;
    this.clearTint();
    this.setActive(false).setVisible(false);
    this.knockbackX = 0;
    this.knockbackY = 0;
    this.knockbackDuration = 0;
  }

  restoreVisual(): void {
    if (this.isTinted) this.clearTint();
  }

  takeDamage(damage: number): DamageResult {
    if (!this.isAlive) return { appliedDamage: 0, died: false };
    const appliedDamage = calculateAppliedDamage(
      this.health,
      calculateDamageAfterDefense(damage, this.defense),
    );
    this.health -= appliedDamage;
    if (this.health <= 0) {
      this.health = 0;
      this.isAlive = false;
      return { appliedDamage, died: true };
    }
    if (appliedDamage > 0) this.setTintFill(0xffffff);
    return { appliedDamage, died: false };
  }

  applyKnockback(originX: number, originY: number, force: number): boolean {
    const safeForce = calculateEffectiveKnockbackForce(force);
    if (safeForce <= 0) return false;
    const dx = this.x - originX;
    const dy = this.y - originY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const unitX = distance > 0.0001 ? dx / distance : 1;
    const unitY = distance > 0.0001 ? dy / distance : 0;
    const duration = 200;
    this.knockbackX = unitX * (safeForce / (duration / 1000));
    this.knockbackY = unitY * (safeForce / (duration / 1000));
    this.knockbackDuration = duration;
    return true;
  }

  updateKnockback(delta: number): void {
    if (this.knockbackDuration <= 0) return;
    const dt = delta / 1000;
    let nextX = this.x + this.knockbackX * dt;
    let nextY = this.y + this.knockbackY * dt;
    const margin = 60;
    const minX = -margin;
    const maxX = this.scene.scale.width + margin;
    const minY = -margin;
    const maxY = this.scene.scale.height + margin;
    nextX = Math.max(minX, Math.min(maxX, nextX));
    nextY = Math.max(minY, Math.min(maxY, nextY));
    this.setPosition(nextX, nextY);
    this.knockbackX *= Math.pow(0.01, dt);
    this.knockbackY *= Math.pow(0.01, dt);
    this.knockbackDuration -= delta;
    if (this.knockbackDuration <= 0) {
      this.knockbackX = 0;
      this.knockbackY = 0;
      this.knockbackDuration = 0;
    }
  }
}
