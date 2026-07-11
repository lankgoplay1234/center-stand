import Phaser from 'phaser';
import { calculateTotalTargetCount } from '../systems/TargetingSystem';
import type { CharacterData, UpgradeId } from '../types/GameTypes';

export class Player extends Phaser.GameObjects.Container {
  readonly character: CharacterData;
  health: number;
  maxHealth: number;
  defense: number;
  attackDamage: number;
  attackSpeed: number;
  attackRange: number;
  attackAreaRadius: number;
  baseTargetCount: number;
  bonusTargetCount = 0;
  projectileSpeed: number;
  knockbackForce: number;
  readonly upgradeEfficiency: Readonly<Record<UpgradeId, number>>;

  private readonly core: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, x: number, y: number, character: CharacterData) {
    super(scene, x, y);
    this.character = character;
    this.health = character.maxHealth;
    this.maxHealth = character.maxHealth;
    this.defense = character.defense;
    this.attackDamage = character.attackDamage;
    this.attackSpeed = character.attackSpeed;
    this.attackRange = character.attackRange;
    this.attackAreaRadius = character.attackAreaRadius;
    this.baseTargetCount = character.baseTargetCount;
    this.projectileSpeed = character.projectileSpeed;
    this.knockbackForce = character.knockbackForce;
    this.upgradeEfficiency = character.upgradeEfficiency;

    const aura = scene.add.circle(0, 0, 43, 0x35d9ff, 0.14).setStrokeStyle(2, 0x72e7ff, 0.45);
    this.core = scene.add.circle(0, 0, 25, 0x35d9ff).setStrokeStyle(5, 0xe5fbff, 0.9);
    const sight = scene.add.triangle(8, -2, 0, 0, 24, 7, 0, 14, 0xffffff, 0.9);
    this.add([aura, this.core, sight]);
    scene.add.existing(this);
    scene.tweens.add({ targets: aura, scale: 1.18, alpha: 0.2, duration: 720, yoyo: true, repeat: -1 });
  }

  get totalTargetCount(): number {
    return calculateTotalTargetCount(this.baseTargetCount, this.bonusTargetCount);
  }

  takeDamage(rawDamage: number): number {
    const applied = Math.max(1, rawDamage - this.defense);
    this.health = Math.max(0, this.health - applied);
    this.scene.tweens.killTweensOf(this.core);
    this.core.setFillStyle(0xff5d7a);
    this.scene.tweens.add({
      targets: this.core,
      alpha: 0.4,
      duration: 70,
      yoyo: true,
      onComplete: () => this.core.setFillStyle(0x35d9ff).setAlpha(1),
    });
    return applied;
  }
}
