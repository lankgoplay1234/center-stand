import { describe, expect, it } from 'vitest';
import { CHARACTERS } from './CharacterData';
import { CHARACTER_VISUAL_ASSETS, getStageTheme, STAGE_THEMES } from './VisualAssetData';

describe('VisualAssetData', () => {
  it('maps every character to one unique pixel-art texture', () => {
    expect(CHARACTER_VISUAL_ASSETS).toHaveLength(CHARACTERS.length);
    expect(new Set(CHARACTER_VISUAL_ASSETS.map((asset) => asset.characterId))).toEqual(
      new Set(CHARACTERS.map((character) => character.id)),
    );
    expect(new Set(CHARACTER_VISUAL_ASSETS.map((asset) => asset.textureKey)).size).toBe(CHARACTERS.length);
  });

  it('changes the arena theme after each block of 20 stages', () => {
    expect(STAGE_THEMES.map((theme) => theme.minStage)).toEqual([1, 21, 41, 61, 81]);
    expect(getStageTheme(1).id).toBe('steel-vault');
    expect(getStageTheme(20).id).toBe('steel-vault');
    expect(getStageTheme(21).id).toBe('ember-foundry');
    expect(getStageTheme(40).id).toBe('ember-foundry');
    expect(getStageTheme(41).id).toBe('violet-ruins');
    expect(getStageTheme(100).id).toBe('last-citadel');
  });
});
