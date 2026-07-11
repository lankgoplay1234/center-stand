import type { EnemyData } from '../types/GameTypes';

export interface EnemyPixelArtDefinition {
  textureKey: string;
  rank: EnemyData['rank'];
  tier: number;
  width: number;
  height: number;
  outlineColor: number;
  bodyColor: number;
  armorColor: number;
  glowColor: number;
}

const NORMAL_PALETTES = [
  [0x34152a, 0x8f294e, 0xc94772, 0xff8fb2],
  [0x32142f, 0x852457, 0xcf397d, 0xff82bd],
  [0x2e1436, 0x76215e, 0xc93691, 0xff79d2],
  [0x29153c, 0x652064, 0xbb35a3, 0xf881ec],
  [0x221641, 0x51216b, 0xa63cba, 0xff9dff],
] as const;

const CAPTAIN_PALETTES = [
  [0x241323, 0x672039, 0xa74654, 0xffd15a],
  [0x241329, 0x642044, 0xa34267, 0xffd96d],
  [0x21132f, 0x5b204f, 0x98437b, 0xffdf82],
  [0x1d1436, 0x4d225d, 0x87478d, 0xffe79b],
  [0x18143d, 0x3d266b, 0x7652a5, 0xfff0bb],
] as const;

export const ENEMY_PIXEL_ART: readonly EnemyPixelArtDefinition[] = [
  ...NORMAL_PALETTES.map((palette, index) => ({
    textureKey: `enemy-normal-${index + 1}`,
    rank: 'NORMAL' as const,
    tier: index + 1,
    width: 32,
    height: 32,
    outlineColor: palette[0],
    bodyColor: palette[1],
    armorColor: palette[2],
    glowColor: palette[3],
  })),
  ...CAPTAIN_PALETTES.map((palette, index) => ({
    textureKey: `enemy-captain-${index + 1}`,
    rank: 'CAPTAIN' as const,
    tier: index + 1,
    width: 48,
    height: 48,
    outlineColor: palette[0],
    bodyColor: palette[1],
    armorColor: palette[2],
    glowColor: palette[3],
  })),
];

export function getEnemyPixelArt(rank: EnemyData['rank'], tier: number): EnemyPixelArtDefinition {
  const safeTier = Math.min(5, Math.max(1, Math.floor(tier)));
  const definition = ENEMY_PIXEL_ART.find((entry) => entry.rank === rank && entry.tier === safeTier);
  if (!definition) throw new Error(`Missing enemy pixel art: ${rank} tier ${safeTier}`);
  return definition;
}
