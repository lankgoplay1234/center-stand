import type Phaser from 'phaser';
import { Projectile } from '../entities/Projectile';
import type { Enemy } from '../entities/Enemy';

export class ProjectilePool {
  private readonly items: Projectile[] = [];

  constructor(private readonly scene: Phaser.Scene, initialSize = 48) {
    for (let i = 0; i < initialSize; i += 1) this.items.push(new Projectile(scene));
  }

  acquire(x: number, y: number, target: Enemy, damage: number, speed: number): Projectile {
    let projectile = this.items.find((item) => !item.active);
    if (!projectile) {
      projectile = new Projectile(this.scene);
      this.items.push(projectile);
    }
    projectile.launch(x, y, target, damage, speed);
    return projectile;
  }

  getActive(): Projectile[] {
    return this.items.filter((item) => item.active);
  }

  get activeCount(): number {
    let count = 0;
    for (const item of this.items) if (item.active) count += 1;
    return count;
  }

  releaseAll(): void {
    for (const item of this.items) item.deactivate();
  }
}
