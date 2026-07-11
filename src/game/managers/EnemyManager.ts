import Phaser from 'phaser';
import { BASIC_ENEMY } from '../data/EnemyData';
import type { Enemy } from '../entities/Enemy';
import type { Player } from '../entities/Player';
import { EnemyPool } from '../pools/EnemyPool';
import type { StageStats } from '../types/GameTypes';

export interface EnemyManagerCallbacks {
  onPlayerHit: (damage: number, x: number, y: number) => void;
}

export class EnemyManager {
  private readonly pool: EnemyPool;
  private spawnAccumulator = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Player,
    private readonly callbacks: EnemyManagerCallbacks,
  ) {
    this.pool = new EnemyPool(scene, 120);
  }

  get activeEnemies(): Enemy[] {
    return this.pool.getActive();
  }

  get activeCount(): number {
    return this.pool.activeCount;
  }

  update(time: number, delta: number, stageStats: StageStats): void {
    this.spawnAccumulator += delta;
    while (this.spawnAccumulator >= stageStats.spawnInterval && this.activeCount < stageStats.maxActiveEnemies) {
      this.spawnAccumulator -= stageStats.spawnInterval;
      this.spawn(stageStats);
    }

    for (const enemy of this.activeEnemies) {
      const dx = this.player.x - enemy.x;
      const dy = this.player.y - enemy.y;
      const distanceSquared = dx * dx + dy * dy;
      const contactSquared = enemy.contactRange * enemy.contactRange;
      if (distanceSquared > contactSquared) {
        const distance = Math.sqrt(distanceSquared) || 1;
        const step = enemy.moveSpeed * delta / 1000;
        enemy.x += dx / distance * step;
        enemy.y += dy / distance * step;
        enemy.rotation = Math.atan2(dy, dx);
      } else if (time - enemy.lastAttackAt >= enemy.attackInterval) {
        enemy.lastAttackAt = time;
        this.callbacks.onPlayerHit(enemy.attackDamage, enemy.x, enemy.y);
      }
      if (enemy.fillColor === 0xffffff) enemy.setFillStyle(0xff446c);
    }
  }

  spawnBurst(count: number, stageStats: StageStats): void {
    for (let i = 0; i < count; i += 1) this.spawn(stageStats, i);
  }

  release(enemy: Enemy): void {
    enemy.deactivate();
  }

  destroyAll(): void {
    this.pool.releaseAll();
    this.spawnAccumulator = 0;
  }

  clearForStageTransition(delayMs: number): number {
    const clearedCount = this.activeCount;
    this.pool.releaseAll();
    this.spawnAccumulator = -Math.max(0, delayMs);
    return clearedCount;
  }

  private spawn(stageStats: StageStats, burstIndex = -1): void {
    const margin = 45;
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const side = burstIndex >= 0 ? burstIndex % 4 : Phaser.Math.Between(0, 3);
    const positions = [
      { x: Phaser.Math.Between(0, width), y: -margin },
      { x: width + margin, y: Phaser.Math.Between(80, height - 250) },
      { x: Phaser.Math.Between(0, width), y: height + margin },
      { x: -margin, y: Phaser.Math.Between(80, height - 250) },
    ];
    const point = positions[side]!;
    this.pool.acquire(
      point.x,
      point.y,
      BASIC_ENEMY,
      stageStats.enemyHealthMultiplier,
      stageStats.enemyDamageMultiplier,
      stageStats.enemySpeedMultiplier,
    );
  }
}
