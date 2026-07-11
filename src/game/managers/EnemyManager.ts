import Phaser from 'phaser';
import { selectEnemyData } from '../data/EnemyData';
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

  get activeCaptainCount(): number {
    return this.pool.activeCaptainCount;
  }

  update(time: number, delta: number, stageStats: StageStats, spawnBudget = Number.POSITIVE_INFINITY): void {
    this.spawnAccumulator += delta;
    let remainingBudget = Math.max(0, Math.floor(spawnBudget));
    while (this.spawnAccumulator >= stageStats.spawnInterval
      && this.activeCount < stageStats.maxActiveEnemies
      && remainingBudget > 0) {
      this.spawnAccumulator -= stageStats.spawnInterval;
      this.spawn(stageStats);
      remainingBudget -= 1;
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
      enemy.restoreVisual();
    }
  }

  spawnBurst(count: number, stageStats: StageStats): void {
    for (let i = 0; i < count; i += 1) {
      this.spawn(stageStats, i, (i + 0.5) / Math.max(1, count), false);
    }
  }

  release(enemy: Enemy): void {
    enemy.deactivate();
  }

  destroyAll(): number {
    const clearedCount = this.activeCount;
    this.pool.releaseAll();
    this.spawnAccumulator = 0;
    return clearedCount;
  }

  clearWithRewards(): { clearedEnemies: number; rewardGold: number; stageKills: number } {
    const activeEnemies = this.activeEnemies;
    const rewardGold = activeEnemies.reduce((sum, enemy) => sum + enemy.goldReward, 0);
    const stageKills = activeEnemies.reduce((sum, enemy) => sum + (enemy.countsTowardStage ? 1 : 0), 0);
    const clearedEnemies = activeEnemies.length;
    this.pool.releaseAll();
    this.spawnAccumulator = 0;
    return { clearedEnemies, rewardGold, stageKills };
  }

  clearForStageTransition(delayMs: number): number {
    const clearedCount = this.activeCount;
    this.pool.releaseAll();
    this.spawnAccumulator = -Math.max(0, delayMs);
    return clearedCount;
  }

  private spawn(stageStats: StageStats, burstIndex = -1, forcedRoll?: number, countsTowardStage = true): void {
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
    const enemyData = selectEnemyData(stageStats.stage, forcedRoll ?? Math.random());
    const enemy = this.pool.acquire(
      point.x,
      point.y,
      enemyData,
      stageStats.stage,
      stageStats.enemyHealthMultiplier,
      stageStats.enemyDamageMultiplier,
      stageStats.enemySpeedMultiplier,
    );
    enemy.countsTowardStage = countsTowardStage;
  }
}
