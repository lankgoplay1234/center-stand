import type Phaser from 'phaser';
import { Enemy } from '../entities/Enemy';
import type { EnemyData } from '../types/GameTypes';

export class EnemyPool {
  private readonly items: Enemy[] = [];

  constructor(
    scene: Phaser.Scene,
    initialSize = 120,
    private readonly renderLayer?: Phaser.GameObjects.Container,
  ) {
    for (let i = 0; i < initialSize; i += 1) this.items.push(this.createEnemy(scene));
  }

  acquire(
    x: number,
    y: number,
    data: EnemyData,
    stage: number,
    healthMultiplier: number,
    attackBonus: number,
    defenseBonus: number,
    speedMultiplier: number,
  ): Enemy {
    let enemy = this.items.find((item) => !item.active);
    if (!enemy) {
      enemy = this.createEnemy(this.items[0]?.scene ?? (() => { throw new Error('Enemy pool has no scene'); })());
      this.items.push(enemy);
    }
    enemy.activate(x, y, data, stage, healthMultiplier, attackBonus, defenseBonus, speedMultiplier);
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

  get activeCaptainCount(): number {
    let count = 0;
    for (const item of this.items) {
      if (item.active && item.isAlive && item.rank === 'CAPTAIN') count += 1;
    }
    return count;
  }

  releaseAll(): void {
    for (const item of this.items) item.deactivate();
  }

  private createEnemy(scene: Phaser.Scene): Enemy {
    const enemy = new Enemy(scene, this.items.length);
    this.renderLayer?.add(enemy);
    return enemy;
  }
}
