import Phaser from 'phaser';
import type { Enemy } from './Enemy';

export class Projectile extends Phaser.GameObjects.Arc {
  target: Enemy | null = null;
  damage = 0;
  speed = 0;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0, 7, 0, 360, false, 0x8ff7ff, 1);
    this.setBlendMode(Phaser.BlendModes.ADD).setDepth(6).setVisible(false).setActive(false);
    scene.add.existing(this);
  }

  launch(x: number, y: number, target: Enemy, damage: number, speed: number): void {
    this.target = target;
    this.damage = damage;
    this.speed = speed;
    this.setPosition(x, y).setVisible(true).setActive(true).setAlpha(1).setScale(1);
  }

  deactivate(): void {
    this.target = null;
    this.setVisible(false).setActive(false);
  }
}
