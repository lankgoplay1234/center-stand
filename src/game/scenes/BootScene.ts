import Phaser from 'phaser';
import { CHARACTER_VISUAL_ASSETS, STAGE_THEMES } from '../data/VisualAssetData';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    for (const asset of CHARACTER_VISUAL_ASSETS) this.load.image(asset.textureKey, asset.path);
    for (const theme of STAGE_THEMES) this.load.image(theme.textureKey, theme.path);
  }

  create(): void {
    for (const asset of CHARACTER_VISUAL_ASSETS) {
      this.textures.get(asset.textureKey).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    this.cameras.main.setBackgroundColor('#090d1a');
    this.scene.start('CharacterSelectScene');
  }
}
