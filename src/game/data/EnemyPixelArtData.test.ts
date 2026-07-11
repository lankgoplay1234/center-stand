import { describe, expect, it } from 'vitest';
import { ENEMY_PIXEL_ART, getEnemyPixelArt } from './EnemyPixelArtData';

describe('enemy pixel art data', () => {
  it('defines five normal and five captain textures with unique keys', () => {
    expect(ENEMY_PIXEL_ART).toHaveLength(10);
    expect(new Set(ENEMY_PIXEL_ART.map((entry) => entry.textureKey)).size).toBe(10);
    expect(ENEMY_PIXEL_ART.filter((entry) => entry.rank === 'NORMAL')).toHaveLength(5);
    expect(ENEMY_PIXEL_ART.filter((entry) => entry.rank === 'CAPTAIN')).toHaveLength(5);
  });

  it('keeps every generated source texture at 48 pixels or smaller', () => {
    for (const definition of ENEMY_PIXEL_ART) {
      expect(definition.width).toBeLessThanOrEqual(48);
      expect(definition.height).toBeLessThanOrEqual(48);
      expect(definition.width * definition.height).toBeLessThanOrEqual(48 * 48);
    }
  });

  it('uses a larger source canvas and brighter core for captains', () => {
    for (let tier = 1; tier <= 5; tier += 1) {
      const normal = getEnemyPixelArt('NORMAL', tier);
      const captain = getEnemyPixelArt('CAPTAIN', tier);
      expect(captain.width).toBeGreaterThan(normal.width);
      expect(captain.textureKey).not.toBe(normal.textureKey);
      expect(captain.glowColor).not.toBe(normal.glowColor);
    }
  });
});
