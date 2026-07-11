export interface CharacterVisualAsset {
  characterId: string;
  textureKey: string;
  path: string;
}

export interface StageTheme {
  id: string;
  minStage: number;
  textureKey: string;
  path: string;
  accentColor: number;
}

export const CHARACTER_VISUAL_ASSETS: readonly CharacterVisualAsset[] = [
  { characterId: 'arc-ranger', textureKey: 'character-arc-ranger', path: 'assets/characters/arc-ranger.png' },
  { characterId: 'blade-warden', textureKey: 'character-blade-warden', path: 'assets/characters/blade-warden.png' },
  { characterId: 'bastion-gunner', textureKey: 'character-bastion-gunner', path: 'assets/characters/bastion-gunner.png' },
  { characterId: 'rune-mage', textureKey: 'character-rune-mage', path: 'assets/characters/rune-mage.png' },
  { characterId: 'needle-striker', textureKey: 'character-needle-striker', path: 'assets/characters/needle-striker.png' },
  { characterId: 'storm-conductor', textureKey: 'character-storm-conductor', path: 'assets/characters/storm-conductor.png' },
];

export const STAGE_THEMES: readonly StageTheme[] = [
  { id: 'steel-vault', minStage: 1, textureKey: 'stage-theme-01', path: 'assets/backgrounds/stage-01.png', accentColor: 0x49dce5 },
  { id: 'ember-foundry', minStage: 21, textureKey: 'stage-theme-21', path: 'assets/backgrounds/stage-21.png', accentColor: 0xe48a4b },
  { id: 'violet-ruins', minStage: 41, textureKey: 'stage-theme-41', path: 'assets/backgrounds/stage-41.png', accentColor: 0xa77bff },
  { id: 'storm-deck', minStage: 61, textureKey: 'stage-theme-61', path: 'assets/backgrounds/stage-61.png', accentColor: 0x66a9ff },
  { id: 'last-citadel', minStage: 81, textureKey: 'stage-theme-81', path: 'assets/backgrounds/stage-81.png', accentColor: 0xe5bd59 },
];

export function getCharacterVisualAsset(characterId: string): CharacterVisualAsset {
  const asset = CHARACTER_VISUAL_ASSETS.find((entry) => entry.characterId === characterId);
  if (!asset) throw new Error(`Missing character visual asset: ${characterId}`);
  return asset;
}

export function getStageTheme(stage: number): StageTheme {
  const safeStage = Math.max(1, Math.floor(stage));
  let theme = STAGE_THEMES[0]!;
  for (const candidate of STAGE_THEMES) {
    if (safeStage < candidate.minStage) break;
    theme = candidate;
  }
  return theme;
}
