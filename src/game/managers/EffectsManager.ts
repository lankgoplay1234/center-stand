import type Phaser from 'phaser';
import { DamageTextPool } from '../pools/DamageTextPool';
import type { AttackEffect } from '../strategies/AttackStrategy';

export class EffectsManager {
  private readonly damageTexts: DamageTextPool;
  private readonly particles: Phaser.GameObjects.Arc[] = [];
  private readonly effectLines: Phaser.GameObjects.Graphics[] = [];

  constructor(private readonly scene: Phaser.Scene) {
    this.damageTexts = new DamageTextPool(scene, 48, 120);
    for (let i = 0; i < 64; i += 1) {
      this.particles.push(scene.add.circle(0, 0, 4, 0xffd56a).setDepth(8).setVisible(false).setActive(false));
    }
    for (let i = 0; i < 12; i += 1) {
      this.effectLines.push(scene.add.graphics().setDepth(9).setVisible(false).setActive(false));
    }
  }

  showDamage(x: number, y: number, amount: number, color?: string): void {
    this.damageTexts.show(x, y, amount, color);
  }

  get damageTextStats(): { active: number; poolSize: number; totalShown: number } {
    return {
      active: this.damageTexts.activeCount,
      poolSize: this.damageTexts.size,
      totalShown: this.damageTexts.totalShown,
    };
  }

  showHit(x: number, y: number): void {
    const flash = this.acquireParticle();
    flash.setPosition(x, y).setRadius(10).setFillStyle(0xffffff).setStrokeStyle()
      .setAlpha(0.9).setScale(1).setVisible(true).setActive(true);
    this.scene.tweens.add({
      targets: flash, scale: 2, alpha: 0, duration: 110,
      onComplete: () => flash.setVisible(false).setActive(false),
    });
  }

  showExplosion(x: number, y: number): void {
    for (let i = 0; i < 6; i += 1) {
      const particle = this.acquireParticle();
      const angle = i / 6 * Math.PI * 2 + Math.random() * 0.35;
      const distance = 24 + Math.random() * 24;
      particle.setPosition(x, y).setRadius(3 + Math.random() * 4).setFillStyle(i % 2 ? 0xff5d7a : 0xffcf5a)
        .setStrokeStyle().setAlpha(1).setScale(1).setVisible(true).setActive(true);
      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        scale: 0.2,
        alpha: 0,
        duration: 240,
        ease: 'Quad.easeOut',
        onComplete: () => particle.setVisible(false).setActive(false),
      });
    }
  }

  showAttackEffect(effect: AttackEffect): void {
    switch (effect.type) {
      case 'AREA_MELEE':
        this.showAreaWave(effect.x, effect.y, effect.radius, 0x63f4ff, 0xa8fbff);
        break;
      case 'AREA_MAGIC':
        this.showAreaWave(effect.x, effect.y, effect.radius, 0x9d63ff, 0xe0b5ff);
        break;
      case 'PIERCING':
        this.showPiercingLine(effect.from.x, effect.from.y, effect.to.x, effect.to.y);
        break;
      case 'CHAIN':
        this.showChainLines(effect.points);
        break;
    }
  }

  private showAreaWave(x: number, y: number, radius: number, fillColor: number, strokeColor: number): void {
    const wave = this.acquireParticle();
    wave.setPosition(x, y).setRadius(18).setFillStyle(fillColor, 0.1).setStrokeStyle(5, strokeColor, 0.9)
      .setAlpha(1).setScale(1).setVisible(true).setActive(true);
    this.scene.tweens.add({
      targets: wave,
      scale: radius / 18,
      alpha: 0,
      duration: 230,
      ease: 'Quad.easeOut',
      onComplete: () => wave.setVisible(false).setActive(false),
    });
  }

  private showPiercingLine(fromX: number, fromY: number, toX: number, toY: number): void {
    const line = this.acquireLine();
    line.lineStyle(16, 0x59eaff, 0.18).lineBetween(fromX, fromY, toX, toY);
    line.lineStyle(5, 0xd8fdff, 0.95).lineBetween(fromX, fromY, toX, toY);
    this.fadeLine(line, 150);
  }

  private showChainLines(points: readonly { x: number; y: number }[]): void {
    if (points.length < 2) return;
    const line = this.acquireLine();
    line.lineStyle(11, 0x8b72ff, 0.2).beginPath().moveTo(points[0]!.x, points[0]!.y);
    for (let i = 1; i < points.length; i += 1) line.lineTo(points[i]!.x, points[i]!.y);
    line.strokePath();
    line.lineStyle(4, 0xd9d2ff, 0.95).beginPath().moveTo(points[0]!.x, points[0]!.y);
    for (let i = 1; i < points.length; i += 1) line.lineTo(points[i]!.x, points[i]!.y);
    line.strokePath();
    this.fadeLine(line, 180);
  }

  private fadeLine(line: Phaser.GameObjects.Graphics, duration: number): void {
    this.scene.tweens.add({
      targets: line,
      alpha: 0,
      duration,
      ease: 'Quad.easeOut',
      onComplete: () => line.clear().setVisible(false).setActive(false),
    });
  }

  private acquireParticle(): Phaser.GameObjects.Arc {
    const particle = this.particles.find((item) => !item.active) ?? this.particles[0]!;
    this.scene.tweens.killTweensOf(particle);
    return particle;
  }

  private acquireLine(): Phaser.GameObjects.Graphics {
    const line = this.effectLines.find((item) => !item.active) ?? this.effectLines[0]!;
    this.scene.tweens.killTweensOf(line);
    return line.clear().setAlpha(1).setVisible(true).setActive(true);
  }
}
