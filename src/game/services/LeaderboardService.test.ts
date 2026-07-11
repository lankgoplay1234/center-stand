import { describe, expect, it, vi } from 'vitest';
import type { GameResult, RankedLeaderboardEntry } from '../types/GameTypes';
import {
  LOCAL_LEADERBOARD_STORAGE_KEY,
  LeaderboardService,
  LeaderboardServiceError,
  type LeaderboardStorage,
  validateLeaderboardNickname,
} from './LeaderboardService';

const result: GameResult = {
  characterId: 'arc-ranger', characterName: '아크 레인저', completed: true, deaths: 3,
  survivalSeconds: 2_400.9, stage: 100, kills: 1_000, earnedGold: 5_000, bestSeconds: 2_400,
  leaderboardRunId: 'run_1234567890123456', leaderboardVerificationToken: 'proof_1234567890123456',
};

const entry: RankedLeaderboardEntry = {
  id: 'entry-1', nickname: '용사', characterId: 'arc-ranger', deaths: 3,
  completionTimeSeconds: 2_400, completedAt: 1_000, rank: 1,
};

describe('LeaderboardService', () => {
  it('validates one to five Unicode nickname characters', () => {
    expect(validateLeaderboardNickname('용')).toBeNull();
    expect(validateLeaderboardNickname('ABCDE')).toBeNull();
    expect(validateLeaderboardNickname('')).toContain('1~5자');
    expect(validateLeaderboardNickname('123456')).toContain('1~5자');
  });

  it('uploads a normalized verified result and reads at most ten entries', async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') return Response.json({ entry }, { status: 201 });
      return Response.json({ entries: Array.from({ length: 12 }, (_, index) => ({ ...entry, id: `entry-${index}` })) });
    });
    const service = new LeaderboardService('https://ranking.test/', fetcher);
    await expect(service.submit(result, ' 용사 ')).resolves.toEqual(entry);
    const request = fetcher.mock.calls[0];
    expect(JSON.parse(request?.[1]?.body as string)).toEqual(expect.objectContaining({
      nickname: '용사', completionTimeSeconds: 2_400, verificationToken: 'proof_1234567890123456',
    }));
    await expect(service.list()).resolves.toHaveLength(10);
  });

  it('persists and ranks successful local records when no server is configured', async () => {
    const values = new Map<string, string>();
    const storage: LeaderboardStorage = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => { values.set(key, value); },
    };
    const local = new LeaderboardService('', vi.fn(), storage, () => 1_000);
    await expect(local.submit(result, '용사')).resolves.toEqual(expect.objectContaining({
      nickname: '용사', deaths: 3, rank: 1,
    }));
    expect(values.get(LOCAL_LEADERBOARD_STORAGE_KEY)).toContain('용사');
    const reloaded = new LeaderboardService('', vi.fn(), storage, () => 2_000);
    await expect(reloaded.list()).resolves.toEqual([
      expect.objectContaining({ nickname: '용사', characterId: 'arc-ranger', rank: 1 }),
    ]);
  });

  it('keeps missing remote proofs as recoverable errors', async () => {
    const service = new LeaderboardService('https://ranking.test', vi.fn());
    await expect(service.submit({ ...result, leaderboardVerificationToken: undefined }, '용사'))
      .rejects.toMatchObject({ code: 'MISSING_PROOF' });
    expect(LeaderboardServiceError).toBeDefined();
  });

  it('reports HTTP failures so the UI can retry without affecting the local result', async () => {
    const service = new LeaderboardService('https://ranking.test', vi.fn(async () => new Response(null, { status: 503 })));
    await expect(service.submit(result, '용사')).rejects.toMatchObject({ code: 'REQUEST_FAILED' });
    await expect(service.list()).rejects.toMatchObject({ code: 'REQUEST_FAILED' });
  });
});
