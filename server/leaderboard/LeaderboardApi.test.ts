import { describe, expect, it, vi } from 'vitest';
import type { LeaderboardSubmission } from '../../src/game/types/GameTypes';
import { createLeaderboardApi, FixedWindowRateLimiter } from './LeaderboardApi';
import { MemoryLeaderboardRepository } from './LeaderboardRepository';

const allowedCharacterIds = new Set(['arc-ranger', 'blade-warden']);

function submission(overrides: Partial<LeaderboardSubmission> = {}): LeaderboardSubmission {
  return {
    nickname: '용사',
    characterId: 'arc-ranger',
    deaths: 12,
    completionTimeSeconds: 2_400,
    runId: 'run_1234567890123456',
    verificationToken: 'proof_1234567890123456',
    ...overrides,
  };
}

function post(body: unknown, ip = '127.0.0.1'): Request {
  return new Request('https://example.test/leaderboard', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
  });
}

function createApi(options: { verifier?: (value: LeaderboardSubmission) => Promise<boolean>; maxRequests?: number } = {}) {
  const repository = new MemoryLeaderboardRepository();
  let sequence = 0;
  return {
    repository,
    handler: createLeaderboardApi({
      repository,
      allowedCharacterIds,
      verifier: { verify: options.verifier ?? vi.fn(async () => true) },
      rateLimiter: new FixedWindowRateLimiter(options.maxRequests ?? 5, 60_000),
      now: () => 1_000,
      createId: () => `entry-${sequence += 1}`,
    }),
  };
}

describe('LeaderboardApi', () => {
  it('accepts a verified anonymous completion and strips the proof from storage', async () => {
    const { handler, repository } = createApi();
    const response = await handler(post(submission()));
    expect(response.status).toBe(201);
    expect(await repository.list()).toEqual([expect.objectContaining({ nickname: '용사', deaths: 12 })]);
    const body = await response.json();
    expect(body).not.toHaveProperty('entry.verificationToken');
    expect(body).not.toHaveProperty('entry.runId');
  });

  it('rejects invalid nicknames, characters, metrics and unverified runs', async () => {
    const invalid = createApi();
    const invalidResponse = await invalid.handler(post(submission({
      nickname: '관리자', characterId: 'unknown', deaths: -1, completionTimeSeconds: 1,
    })));
    expect(invalidResponse.status).toBe(400);
    expect(await invalidResponse.json()).toEqual(expect.objectContaining({ error: 'invalid_submission' }));

    const unverified = createApi({ verifier: vi.fn(async () => false) });
    expect((await unverified.handler(post(submission()))).status).toBe(422);
  });

  it('rejects duplicate run ids without storing a second score', async () => {
    const { handler, repository } = createApi();
    expect((await handler(post(submission()))).status).toBe(201);
    expect((await handler(post(submission({ nickname: '다른이' })))).status).toBe(409);
    expect(await repository.list()).toHaveLength(1);
  });

  it('returns only the top ten sorted by deaths, time, completion and id', async () => {
    const { handler } = createApi({ maxRequests: 20 });
    for (let index = 0; index < 12; index += 1) {
      const response = await handler(post(submission({
        nickname: `용${index}`.slice(0, 5),
        deaths: 12 - index,
        completionTimeSeconds: 2_400 + index,
        runId: `run_${String(index).padStart(16, '0')}`,
      })));
      expect(response.status).toBe(201);
    }
    const response = await handler(new Request('https://example.test/leaderboard'));
    const body = await response.json() as { entries: Array<{ deaths: number; rank: number }> };
    expect(body.entries).toHaveLength(10);
    expect(body.entries.map((entry) => entry.deaths)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(body.entries.map((entry) => entry.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('rate limits repeated submissions per forwarded client address', async () => {
    const { handler } = createApi({ maxRequests: 2 });
    expect((await handler(post(submission(), '203.0.113.1'))).status).toBe(201);
    expect((await handler(post(submission({ runId: 'run_2234567890123456' }), '203.0.113.1'))).status).toBe(201);
    const blocked = await handler(post(submission({ runId: 'run_3234567890123456' }), '203.0.113.1'));
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('retry-after')).toBe('60');
  });
});
