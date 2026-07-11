import Phaser from 'phaser';
import { getCharacterVisualTier } from '../data/CharacterVisualData';
import { getCharacterVisualAsset } from '../data/VisualAssetData';
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
  attackArcDegrees: number | null;
  attackAreaRadius: number;
  baseTargetCount: number;
  bonusTargetCount = 0;
  projectileSpeed: number;
  knockbackForce: number;
  specialAbilityLevel = 0;
  visualTier = 0;
  totalUpgradeLevels = 0;
  readonly upgradeEfficiency: Readonly<Record<UpgradeId, number>>;

  private readonly aura: Phaser.GameObjects.Arc;
  private readonly core: Phaser.GameObjects.Arc;
  private readonly sight: Phaser.GameObjects.Triangle;
  readonly sprite: Phaser.GameObjects.Image;
  private readonly ornaments: Phaser.GameObjects.Arc[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number, character: CharacterData) {
    super(scene, x, y);
    this.character = character;
    this.health = character.maxHealth;
    this.maxHealth = character.maxHealth;
    this.defense = character.defense;
    this.attackDamage = character.attackDamage;
    this.attackSpeed = character.attackSpeed;
    this.attackRange = character.attackRange;
    this.attackArcDegrees = character.attackArcDegrees;
    this.attackAreaRadius = character.attackAreaRadius;
    this.baseTargetCount = character.baseTargetCount;
    this.projectileSpeed = character.projectileSpeed;
    this.knockbackForce = character.knockbackForce;
    this.upgradeEfficiency = character.upgradeEfficiency;

    const { primaryColor, accentColor } = character.attackMotion;
    this.aura = scene.add.circle(0, 0, 43, primaryColor, 0.14).setStrokeStyle(2, accentColor, 0.45);
    this.core = scene.add.circle(0, 0, 25, primaryColor).setStrokeStyle(5, accentColor, 0.9);
    this.sight = scene.add.triangle(8, -2, 0, 0, 24, 7, 0, 14, accentColor, 0.9);
    this.sprite = scene.add.image(0, -8, getCharacterVisualAsset(character.id).textureKey).setScale(0.76);
    for (let i = 0; i < 6; i += 1) {
      this.ornaments.push(scene.add.circle(0, 0, 3, primaryColor, 0.9)
        .setStrokeStyle(2, accentColor, 0.9).setVisible(false));
    }
    this.core.setAlpha(0.34);
    this.add([this.aura, ...this.ornaments, this.core, this.sprite, this.sight]);
    scene.add.existing(this);
    this.applyUpgradeVisual(0);
    scene.tweens.add({ targets: this.aura, scale: 1.18, alpha: 0.2, duration: 720, yoyo: true, repeat: -1 });
  }

  get totalTargetCount(): number {
    return calculateTotalTargetCount(this.baseTargetCount, this.bonusTargetCount);
  }

  get visualStats(): { tier: number; totalUpgradeLevels: number; ornamentCount: number; coreRadius: number; auraRadius: number } {
    return {
      tier: this.visualTier,
      totalUpgradeLevels: this.totalUpgradeLevels,
      ornamentCount: this.ornaments.filter((ornament) => ornament.visible).length,
      coreRadius: this.core.radius,
      auraRadius: this.aura.radius,
    };
  }

  applyUpgradeVisual(totalUpgradeLevels: number): void {
    const visual = getCharacterVisualTier(totalUpgradeLevels);
    const { primaryColor, accentColor } = this.character.attackMotion;
    const finalAccent = visual.ascendedAccent ? 0xfff0a3 : accentColor;
    this.totalUpgradeLevels = Math.max(0, Math.floor(totalUpgradeLevels));
    this.visualTier = visual.tier;
    this.core.setRadius(visual.coreRadius).setFillStyle(primaryColor)
      .setStrokeStyle(visual.coreStrokeWidth, finalAccent, 0.95);
    this.aura.setRadius(visual.auraRadius).setFillStyle(primaryColor, 0.14)
      .setStrokeStyle(visual.auraStrokeWidth, finalAccent, visual.ascendedAccent ? 0.85 : 0.5);
    for (let index = 0; index < this.ornaments.length; index += 1) {
      const ornament = this.ornaments[index]!;
      const visible = index < visual.ornamentCount;
      const angle = index / Math.max(1, visual.ornamentCount) * Math.PI * 2;
      ornament.setVisible(visible).setRadius(visual.ornamentRadius)
        .setPosition(Math.cos(angle) * visual.ornamentDistance, Math.sin(angle) * visual.ornamentDistance)
        .setFillStyle(primaryColor, 0.92).setStrokeStyle(2, finalAccent, 0.95);
    }
    this.sprite.setScale(0.76 + visual.tier * 0.025);
  }

  playAttackMotion(target?: { x: number; y: number }): void {
    if (target) {
      this.sight.setRotation(Math.atan2(target.y - this.y, target.x - this.x));
      this.sprite.setFlipX(target.x < this.x);
    }
    const { durationMs, pulseScale } = this.character.attackMotion;
    this.scene.tweens.killTweensOf(this.core);
    this.scene.tweens.killTweensOf(this.sight);
    this.scene.tweens.killTweensOf(this.sprite);
    this.core.setScale(1).setAlpha(1);
    this.sight.setScale(1).setAlpha(1);
    this.sprite.setPosition(0, -8).setAngle(0).setAlpha(1);
    const motion = this.character.attackMotion.style;
    const spriteTargets = motion === 'BLADE_SWEEP'
      ? { x: 15, angle: 12, scaleX: this.sprite.scaleX * 1.08, scaleY: this.sprite.scaleY * 0.94 }
      : motion === 'RUNE_CAST' || motion === 'STORM_SURGE'
        ? { y: -18, angle: motion === 'RUNE_CAST' ? -7 : 7, scaleX: this.sprite.scaleX * 1.08, scaleY: this.sprite.scaleY * 1.08 }
        : { x: -9, angle: motion === 'NEEDLE_BURST' ? -4 : 3, scaleX: this.sprite.scaleX * 0.96, scaleY: this.sprite.scaleY * 1.04 };
    this.scene.tweens.add({
      targets: this.sprite,
      ...spriteTargets,
      duration: durationMs / 2,
      yoyo: true,
      ease: 'Back.easeOut',
      onComplete: () => this.sprite.setPosition(0, -8).setAngle(0).setScale(0.76 + this.visualTier * 0.025),
    });
    this.scene.tweens.add({
      targets: [this.core, this.sight],
      scaleX: pulseScale,
      scaleY: 0.82,
      alpha: 0.72,
      duration: durationMs / 2,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.core.setScale(1).setAlpha(1);
        this.sight.setScale(1).setAlpha(1);
      },
    });
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
      onComplete: () => this.core.setFillStyle(this.character.attackMotion.primaryColor).setAlpha(1),
    });
    return applied;
  }
}
