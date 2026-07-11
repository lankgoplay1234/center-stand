import type Phaser from 'phaser';
import { Enemy } from '../entities/Enemy';
import type { EnemyData } from '../types/GameTypes';

export class EnemyPool {
  private readonly items: Enemy[] = [];

  constructor(scene: Phaser.Scene, initialSize = 120) {
    for (let i = 0; i < initialSize; i += 1) this.items.push(new Enemy(scene, i));
  }

  acquire(x: number, y: number, data: EnemyData, healthMultiplier: number, damageMultiplier: number, speedMultiplier: number): Enemy {
    let enemy = this.items.find((item) => !item.active);
    if (!enemy) {
      enemy = new Enemy(this.items[0]?.scene ?? (() => { throw new Error('Enemy pool has no scene'); })(), this.items.length);
      this.items.push(enemy);
    }
    enemy.activate(x, y, data, healthMultiplier, damageMultiplier, speedMultiplier);
    return enemy;
  }

  getActive(): Enemy[] {
    return this.items.filter((item) => item.active && item.isAlive);
  }

  get activeCount(): number {
    let count = 0;
    for (const item of this.items) if (item.active && item.isAlive) count += 1;
    return count;
  }

  releaseAll(): void {
    for (const item of this.items) item.deactivate();
  }
}
