import type { RankedLeaderboardEntry } from '../types/GameTypes';

export function formatLeaderboardTime(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60).toString().padStart(2, '0');
  const seconds = (safeSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export function formatLeaderboardEntry(entry: RankedLeaderboardEntry, characterName: string): string {
  return `${entry.rank}. ${entry.nickname} · ${characterName} · 사망 ${entry.deaths}회 · ${formatLeaderboardTime(entry.completionTimeSeconds)}`;
}
