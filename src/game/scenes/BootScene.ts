import Phaser from 'phaser';
import { CHARACTER_VISUAL_ASSETS, STAGE_THEMES } from '../data/VisualAssetData';
import { ENEMY_PIXEL_ART, type EnemyPixelArtDefinition } from '../data/EnemyPixelArtData';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    for (const asset of CHARACTER_VISUAL_ASSETS) this.load.image(asset.textureKey, asset.path);
    for (const theme of STAGE_THEMES) this.load.image(theme.textureKey, theme.path);
  }

  create(): void {
    this.createEnemyPixelTextures();
    for (const asset of CHARACTER_VISUAL_ASSETS) {
      this.textures.get(asset.textureKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    for (const enemy of ENEMY_PIXEL_ART) {
      this.textures.get(enemy.textureKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    this.cameras.main.setBackgroundColor('#090d1a');
    this.scene.start('CharacterSelectScene');
  }

  private createEnemyPixelTextures(): void {
    const graphics = this.make.graphics({ x: 0, y: 0 });
    for (const definition of ENEMY_PIXEL_ART) {
      if (this.textures.exists(definition.textureKey)) continue;
      graphics.clear();
      if (definition.rank === 'CAPTAIN') this.drawCaptain(graphics, definition);
      else this.drawNormal(graphics, definition);
      graphics.generateTexture(definition.textureKey, definition.width, definition.height);
    }
    graphics.destroy();
  }

  private drawNormal(graphics: Phaser.GameObjects.Graphics, definition: EnemyPixelArtDefinition): void {
    const tier = definition.tier;
    graphics.fillStyle(definition.outlineColor, 1);
    graphics.fillRect(5, 9, 20, 15).fillRect(21, 7, 7, 14);
    graphics.fillRect(7, 23, 5, 5).fillRect(19, 23, 5, 5);
    graphics.fillRect(2, 13, 5, 5).fillRect(7, 6, 5, 5);
    if (tier >= 2) graphics.fillRect(12, 4, 5, 7);
    if (tier >= 3) graphics.fillRect(16, 2, 5, 8).fillRect(3, 20, 6, 4);
    if (tier >= 4) graphics.fillRect(24, 4, 5, 6).fillRect(10, 26, 4, 4);
    if (tier >= 5) graphics.fillRect(4, 4, 5, 7).fillRect(14, 0, 4, 6).fillRect(22, 0, 4, 8);

    graphics.fillStyle(definition.bodyColor, 1);
    graphics.fillRect(7, 11, 17, 11).fillRect(22, 9, 4, 10);
    graphics.fillRect(8, 23, 3, 3).fillRect(20, 23, 3, 3);

    graphics.fillStyle(definition.armorColor, 1);
    graphics.fillRect(9, 9, 7 + tier, 4).fillRect(7, 15, 5, 5);
    if (tier >= 3) graphics.fillRect(15, 18, 8, 4);
    if (tier >= 4) graphics.fillRect(12, 6, 4, 4);
    if (tier >= 5) graphics.fillRect(18, 5, 4, 5).fillRect(3, 14, 4, 3);

    graphics.fillStyle(definition.glowColor, 1);
    graphics.fillRect(22, 11, 3, 3).fillRect(13, 15, 4, 4);
    if (tier >= 4) graphics.fillRect(18, 16, 2, 2);
    if (tier >= 5) graphics.fillRect(5, 5, 2, 3).fillRect(23, 2, 2, 3);
  }

  private drawCaptain(graphics: Phaser.GameObjects.Graphics, definition: EnemyPixelArtDefinition): void {
    const tier = definition.tier;
    graphics.fillStyle(definition.outlineColor, 1);
    graphics.fillRect(7, 14, 32, 23).fillRect(31, 10, 11, 23);
    graphics.fillRect(10, 35, 8, 8).fillRect(29, 35, 8, 8);
    graphics.fillRect(3, 18, 7, 13).fillRect(14, 8, 8, 8).fillRect(28, 5, 7, 9);
    graphics.fillRect(34, 4, 5, 9).fillRect(39, 8, 5, 8);
    if (tier >= 2) graphics.fillRect(8, 8, 6, 9).fillRect(21, 4, 6, 11);
    if (tier >= 3) graphics.fillRect(2, 10, 6, 11).fillRect(6, 4, 6, 10);
    if (tier >= 4) graphics.fillRect(14, 1, 6, 10).fillRect(38, 1, 6, 11);
    if (tier >= 5) graphics.fillRect(24, 0, 5, 9).fillRect(0, 23, 6, 7).fillRect(41, 30, 6, 8);

    graphics.fillStyle(definition.bodyColor, 1);
    graphics.fillRect(10, 17, 27, 17).fillRect(33, 13, 6, 17);
    graphics.fillRect(12, 35, 5, 5).fillRect(30, 35, 5, 5);

    graphics.fillStyle(definition.armorColor, 1);
    graphics.fillRect(9, 14, 12, 8).fillRect(25, 12, 10, 9);
    graphics.fillRect(7, 23, 8, 9).fillRect(32, 22, 8, 10);
    if (tier >= 3) graphics.fillRect(17, 31, 14, 6);
    if (tier >= 4) graphics.fillRect(15, 8, 6, 7).fillRect(29, 6, 5, 7);
    if (tier >= 5) graphics.fillRect(3, 19, 6, 10).fillRect(38, 14, 6, 8);

    graphics.fillStyle(definition.glowColor, 1);
    graphics.fillRect(34, 15, 4, 4).fillRect(20, 22, 8, 8);
    graphics.fillRect(22, 24, 4, 4);
    if (tier >= 3) graphics.fillRect(10, 25, 3, 4).fillRect(34, 25, 3, 4);
    if (tier >= 5) graphics.fillRect(16, 3, 3, 5).fillRect(40, 4, 3, 5);
  }
}
