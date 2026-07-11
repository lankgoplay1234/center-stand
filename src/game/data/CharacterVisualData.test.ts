import { describe, expect, it } from 'vitest';
import { CHARACTER_VISUAL_TIERS, getCharacterVisualTier } from './CharacterVisualData';

describe('character visual progression', () => {
  it('uses six visual tiers from zero to the 400-upgrade completion point', () => {
    expect(CHARACTER_VISUAL_TIERS.map((tier) => tier.minTotalUpgradeLevels))
      .toEqual([0, 80, 160, 240, 320, 400]);
    expect([0, 79, 80, 159, 160, 239, 240, 319, 320, 399, 400, 594].map(
      (level) => getCharacterVisualTier(level).tier,
    )).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  });

  it('makes every tier visibly stronger without creating more than six ornaments', () => {
    for (let index = 1; index < CHARACTER_VISUAL_TIERS.length; index += 1) {
      const previous = CHARACTER_VISUAL_TIERS[index - 1]!;
      const current = CHARACTER_VISUAL_TIERS[index]!;
      expect(current.coreRadius).toBeGreaterThan(previous.coreRadius);
      expect(current.auraRadius).toBeGreaterThan(previous.auraRadius);
      expect(current.coreStrokeWidth).toBeGreaterThanOrEqual(previous.coreStrokeWidth);
      expect(current.ornamentCount).toBeGreaterThan(previous.ornamentCount);
    }
    expect(Math.max(...CHARACTER_VISUAL_TIERS.map((tier) => tier.ornamentCount))).toBe(6);
  });

  it('clamps invalid negative progress to the initial appearance', () => {
    expect(getCharacterVisualTier(-100).tier).toBe(0);
  });
});
