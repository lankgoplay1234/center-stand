import type Phaser from 'phaser';
import { DamageTextPool } from '../pools/DamageTextPool';
import type { AttackEffect, AttackEffectPoint, CharacterMotionEffect } from '../strategies/AttackStrategy';
import type { AttackMotionStyle } from '../types/GameTypes';

export class EffectsManager {
  private readonly damageTexts: DamageTextPool;
  private readonly particles: Phaser.GameObjects.Arc[] = [];
  private readonly effectLines: Phaser.GameObjects.Graphics[] = [];
  private totalAttackMotionsShown = 0;
  private lastAttackMotionStyle: AttackMotionStyle | null = null;

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

  get attackMotionStats(): { active: number; poolSize: number; totalShown: number; lastStyle: AttackMotionStyle | null } {
    return {
      active: this.effectLines.filter((line) => line.active).length,
      poolSize: this.effectLines.length,
      totalShown: this.totalAttackMotionsShown,
      lastStyle: this.lastAttackMotionStyle,
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

  showStageClear(x: number, y: number): void {
    this.showAreaWave(x, y, 280, 0x5be6e6, 0xd8fdff);
    this.showAreaWave(x, y, 430, 0x8b72ff, 0xfff2a8);
  }

  showAttackEffect(effect: AttackEffect): void {
    switch (effect.type) {
      case 'CHARACTER_MOTION':
        this.showCharacterMotion(effect);
        break;
      case 'ARC_OVERCHARGE':
        this.showAreaWave(effect.x, effect.y, effect.radius, 0x45e7ff, 0xfff2a8);
        break;
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

  private showCharacterMotion(effect: CharacterMotionEffect): void {
    this.totalAttackMotionsShown += 1;
    this.lastAttackMotionStyle = effect.motion.style;
    switch (effect.motion.style) {
      case 'ARC_SHOT':
        this.showArcShot(effect);
        break;
      case 'BLADE_SWEEP':
        this.showBladeSweep(effect);
        break;
      case 'BASTION_VOLLEY':
        this.showBastionVolley(effect);
        break;
      case 'RUNE_CAST':
        this.showRuneCast(effect);
        break;
      case 'NEEDLE_BURST':
        this.showNeedleBurst(effect);
        break;
      case 'STORM_SURGE':
        this.showStormSurge(effect);
        break;
    }
  }

  private showArcShot(effect: CharacterMotionEffect): void {
    const target = this.firstTargetOrForward(effect);
    const direction = this.direction(effect.from, target);
    const line = this.acquireLine();
    const startX = effect.from.x + direction.x * 24;
    const startY = effect.from.y + direction.y * 24;
    const endX = effect.from.x + direction.x * 92;
    const endY = effect.from.y + direction.y * 92;
    line.lineStyle(13, effect.motion.primaryColor, 0.2).lineBetween(startX, startY, endX, endY);
    line.lineStyle(4, effect.motion.accentColor, 1).lineBetween(startX, startY, endX, endY);
    this.showMotionFlash(startX, startY, effect.motion.primaryColor, effect.motion.accentColor, effect.motion.durationMs);
    this.fadeLine(line, effect.motion.durationMs);
  }

  private showBladeSweep(effect: CharacterMotionEffect): void {
    const target = this.firstTargetOrForward(effect);
    const angle = Math.atan2(target.y - effect.from.y, target.x - effect.from.x);
    const radius = Math.min(175, Math.max(72, effect.radius));
    const line = this.acquireLine().setPosition(effect.from.x, effect.from.y);
    line.lineStyle(18, effect.motion.primaryColor, 0.18)
      .beginPath().arc(0, 0, radius, angle - 1.15, angle + 1.15).strokePath();
    line.lineStyle(7, effect.motion.accentColor, 0.95)
      .beginPath().arc(0, 0, radius, angle - 1.08, angle + 1.08).strokePath();
    this.scene.tweens.add({
      targets: line,
      angle: 18,
      alpha: 0,
      duration: effect.motion.durationMs,
      ease: 'Quad.easeOut',
      onComplete: () => line.clear().setVisible(false).setActive(false),
    });
  }

  private showBastionVolley(effect: CharacterMotionEffect): void {
    const line = this.acquireLine();
    const targetCount = Math.min(3, effect.targets.length);
    for (let i = 0; i < targetCount; i += 1) {
      const target = effect.targets[i]!;
      const direction = this.direction(effect.from, target);
      const perpendicularX = -direction.y * (i - 1) * 7;
      const perpendicularY = direction.x * (i - 1) * 7;
      const startX = effect.from.x + direction.x * 25 + perpendicularX;
      const startY = effect.from.y + direction.y * 25 + perpendicularY;
      const endX = effect.from.x + direction.x * 78 + perpendicularX;
      const endY = effect.from.y + direction.y * 78 + perpendicularY;
      line.lineStyle(9, effect.motion.primaryColor, 0.32).lineBetween(startX, startY, endX, endY);
      line.lineStyle(3, effect.motion.accentColor, 1).lineBetween(startX, startY, endX, endY);
      this.showMotionFlash(startX, startY, effect.motion.primaryColor, effect.motion.accentColor, effect.motion.durationMs);
    }
    this.fadeLine(line, effect.motion.durationMs);
  }

  private showRuneCast(effect: CharacterMotionEffect): void {
    const line = this.acquireLine().setPosition(effect.from.x, effect.from.y);
    const x = 0;
    const y = 0;
    line.lineStyle(6, effect.motion.primaryColor, 0.7).strokeCircle(0, 0, 48);
    line.lineStyle(3, effect.motion.accentColor, 0.95)
      .beginPath().moveTo(x, y - 42).lineTo(x + 42, y).lineTo(x, y + 42).lineTo(x - 42, y).closePath().strokePath();
    line.lineBetween(x - 55, y, x + 55, y).lineBetween(x, y - 55, x, y + 55);
    this.scene.tweens.add({
      targets: line,
      angle: 35,
      scale: 1.32,
      alpha: 0,
      duration: effect.motion.durationMs,
      ease: 'Quad.easeOut',
      onComplete: () => line.clear().setVisible(false).setActive(false),
    });
  }

  private showNeedleBurst(effect: CharacterMotionEffect): void {
    const target = this.firstTargetOrForward(effect);
    const direction = this.direction(effect.from, target);
    const perpendicularX = -direction.y;
    const perpendicularY = direction.x;
    const line = this.acquireLine();
    for (const offset of [-7, 0, 7]) {
      const startX = effect.from.x + direction.x * 22 + perpendicularX * offset;
      const startY = effect.from.y + direction.y * 22 + perpendicularY * offset;
      const endX = target.x + perpendicularX * offset;
      const endY = target.y + perpendicularY * offset;
      line.lineStyle(offset === 0 ? 4 : 2, offset === 0 ? effect.motion.accentColor : effect.motion.primaryColor, 0.95)
        .lineBetween(startX, startY, endX, endY);
    }
    this.fadeLine(line, effect.motion.durationMs);
  }

  private showStormSurge(effect: CharacterMotionEffect): void {
    const line = this.acquireLine();
    const x = effect.from.x;
    const y = effect.from.y;
    line.lineStyle(9, effect.motion.primaryColor, 0.3).strokeCircle(x, y, 52);
    line.lineStyle(3, effect.motion.accentColor, 0.95).strokeCircle(x, y, 38);
    const targetCount = Math.min(3, effect.targets.length);
    for (let i = 0; i < targetCount; i += 1) {
      const target = effect.targets[i]!;
      const midpointX = (x + target.x) / 2 + (i % 2 ? -14 : 14);
      const midpointY = (y + target.y) / 2 + (i % 2 ? 12 : -12);
      line.beginPath().moveTo(x, y).lineTo(midpointX, midpointY).lineTo(target.x, target.y).strokePath();
    }
    this.fadeLine(line, effect.motion.durationMs);
  }

  private firstTargetOrForward(effect: CharacterMotionEffect): AttackEffectPoint {
    return effect.targets[0] ?? effect.from;
  }

  private direction(from: AttackEffectPoint, to: AttackEffectPoint): AttackEffectPoint {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.sqrt(dx * dx + dy * dy) || 1;
    return { x: dx / length, y: dy / length };
  }

  private showMotionFlash(
    x: number,
    y: number,
    primaryColor: number,
    accentColor: number,
    duration: number,
  ): void {
    const flash = this.acquireParticle();
    flash.setPosition(x, y).setRadius(8).setFillStyle(primaryColor, 0.85).setStrokeStyle(3, accentColor, 0.95)
      .setAlpha(1).setScale(1).setVisible(true).setActive(true);
    this.scene.tweens.add({
      targets: flash,
      scale: 2.4,
      alpha: 0,
      duration,
      ease: 'Quad.easeOut',
      onComplete: () => flash.setVisible(false).setActive(false),
    });
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
    return line.clear().setPosition(0, 0).setAlpha(1).setScale(1).setRotation(0).setVisible(true).setActive(true);
  }
}
