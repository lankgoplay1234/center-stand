import { describe, expect, it } from 'vitest';
import { formatLeaderboardEntry, formatLeaderboardTime } from './LeaderboardPresentation';

describe('leaderboard presentation', () => {
  it('formats whole-minute and fractional durations as MM:SS', () => {
    expect(formatLeaderboardTime(0)).toBe('00:00');
    expect(formatLeaderboardTime(1_500)).toBe('25:00');
    expect(formatLeaderboardTime(1_234.9)).toBe('20:34');
  });

  it('formats every public completion field in one ranking row', () => {
    expect(formatLeaderboardEntry({
      id: 'entry-1', nickname: '용사', characterId: 'arc-ranger', deaths: 3,
      completionTimeSeconds: 1_234, completedAt: 1_000, rank: 2,
    }, '아크 레인저')).toBe('2. 용사 · 아크 레인저 · 사망 3회 · 20:34');
  });
});
