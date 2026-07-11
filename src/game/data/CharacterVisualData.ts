export interface CharacterVisualTier {
  tier: number;
  minTotalUpgradeLevels: number;
  coreRadius: number;
  auraRadius: number;
  coreStrokeWidth: number;
  auraStrokeWidth: number;
  ornamentCount: number;
  ornamentRadius: number;
  ornamentDistance: number;
  ascendedAccent: boolean;
}

export const CHARACTER_VISUAL_TIERS: readonly CharacterVisualTier[] = [
  {
    tier: 0, minTotalUpgradeLevels: 0, coreRadius: 25, auraRadius: 43,
    coreStrokeWidth: 5, auraStrokeWidth: 2, ornamentCount: 0, ornamentRadius: 3,
    ornamentDistance: 42, ascendedAccent: false,
  },
  {
    tier: 1, minTotalUpgradeLevels: 80, coreRadius: 27, auraRadius: 47,
    coreStrokeWidth: 5, auraStrokeWidth: 3, ornamentCount: 2, ornamentRadius: 4,
    ornamentDistance: 48, ascendedAccent: false,
  },
  {
    tier: 2, minTotalUpgradeLevels: 160, coreRadius: 29, auraRadius: 51,
    coreStrokeWidth: 6, auraStrokeWidth: 4, ornamentCount: 3, ornamentRadius: 4,
    ornamentDistance: 52, ascendedAccent: false,
  },
  {
    tier: 3, minTotalUpgradeLevels: 240, coreRadius: 31, auraRadius: 56,
    coreStrokeWidth: 7, auraStrokeWidth: 5, ornamentCount: 4, ornamentRadius: 5,
    ornamentDistance: 57, ascendedAccent: false,
  },
  {
    tier: 4, minTotalUpgradeLevels: 320, coreRadius: 33, auraRadius: 61,
    coreStrokeWidth: 8, auraStrokeWidth: 6, ornamentCount: 5, ornamentRadius: 5,
    ornamentDistance: 62, ascendedAccent: true,
  },
  {
    tier: 5, minTotalUpgradeLevels: 400, coreRadius: 35, auraRadius: 67,
    coreStrokeWidth: 9, auraStrokeWidth: 7, ornamentCount: 6, ornamentRadius: 6,
    ornamentDistance: 68, ascendedAccent: true,
  },
];

export function getCharacterVisualTier(totalUpgradeLevels: number): CharacterVisualTier {
  const safeLevels = Math.max(0, Math.floor(totalUpgradeLevels));
  let result = CHARACTER_VISUAL_TIERS[0]!;
  for (const tier of CHARACTER_VISUAL_TIERS) {
    if (safeLevels < tier.minTotalUpgradeLevels) break;
    result = tier;
  }
  return result;
}
