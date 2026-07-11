import type Phaser from 'phaser';
import type { Enemy } from '../entities/Enemy';
import { ProjectilePool } from '../pools/ProjectilePool';

export class ProjectileManager {
  private readonly pool: ProjectilePool;

  constructor(
    scene: Phaser.Scene,
    private readonly onHit: (enemy: Enemy, damage: number) => void,
  ) {
    this.pool = new ProjectilePool(scene, 48);
  }

  get activeCount(): number {
    return this.pool.activeCount;
  }

  fire(x: number, y: number, target: Enemy, damage: number, speed: number): void {
    this.pool.acquire(x, y, target, damage, speed);
  }

  update(delta: number): void {
    for (const projectile of this.pool.getActive()) {
      const target = projectile.target;
      if (!target?.isAlive) {
        projectile.deactivate();
        continue;
      }
      const dx = target.x - projectile.x;
      const dy = target.y - projectile.y;
      const distanceSquared = dx * dx + dy * dy;
      const hitDistance = target.radius + projectile.radius + 3;
      if (distanceSquared <= hitDistance * hitDistance) {
        this.onHit(target, projectile.damage);
        projectile.deactivate();
        continue;
      }
      const distance = Math.sqrt(distanceSquared) || 1;
      const step = Math.min(distance, projectile.speed * delta / 1000);
      projectile.x += dx / distance * step;
      projectile.y += dy / distance * step;
    }
  }

  destroyAll(): void {
    this.pool.releaseAll();
  }
}
