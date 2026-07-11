import { describe, expect, it, vi } from 'vitest';
import type { GameResult, RankedLeaderboardEntry } from '../types/GameTypes';
import { LeaderboardService, LeaderboardServiceError, validateLeaderboardNickname } from './LeaderboardService';

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

  it('keeps unavailable servers and missing proofs as recoverable errors', async () => {
    await expect(new LeaderboardService('').list()).rejects.toMatchObject({ code: 'NOT_CONFIGURED' });
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
