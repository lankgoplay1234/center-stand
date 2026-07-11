import type { LeaderboardRecord, LeaderboardSubmission } from '../../src/game/types/GameTypes';
import type { LeaderboardRepository } from './LeaderboardRepository';
import { LEADERBOARD_LIMIT, rankLeaderboard, validateLeaderboardSubmission } from './LeaderboardPolicy';

export interface CompletionVerifier {
  verify(submission: LeaderboardSubmission): Promise<boolean>;
}

export interface SubmissionRateLimiter {
  allow(key: string, now: number): boolean;
}

export class FixedWindowRateLimiter implements SubmissionRateLimiter {
  private readonly windows = new Map<string, { startedAt: number; count: number }>();

  constructor(private readonly maxRequests = 5, private readonly windowMs = 60_000) {}

  allow(key: string, now: number): boolean {
    const current = this.windows.get(key);
    if (!current || now - current.startedAt >= this.windowMs) {
      this.windows.set(key, { startedAt: now, count: 1 });
      return true;
    }
    if (current.count >= this.maxRequests) return false;
    current.count += 1;
    return true;
  }
}

export interface LeaderboardApiDependencies {
  repository: LeaderboardRepository;
  verifier: CompletionVerifier;
  allowedCharacterIds: ReadonlySet<string>;
  rateLimiter?: SubmissionRateLimiter;
  now?: () => number;
  createId?: () => string;
}

export function createLeaderboardApi(dependencies: LeaderboardApiDependencies): (request: Request) => Promise<Response> {
  const rateLimiter = dependencies.rateLimiter ?? new FixedWindowRateLimiter();
  const now = dependencies.now ?? Date.now;
  const createId = dependencies.createId ?? (() => crypto.randomUUID());

  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    if (url.pathname !== '/leaderboard') return json({ error: 'not_found' }, 404);
    if (request.method === 'GET') {
      const entries = rankLeaderboard(await dependencies.repository.list(), LEADERBOARD_LIMIT);
      return json({ entries });
    }
    if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, { Allow: 'GET, POST' });

    const clientKey = getClientKey(request);
    if (!rateLimiter.allow(clientKey, now())) return json({ error: 'rate_limited' }, 429, { 'Retry-After': '60' });
    if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) {
      return json({ error: 'content_type_required' }, 415);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'invalid_json' }, 400);
    }
    const validation = validateLeaderboardSubmission(body, { allowedCharacterIds: dependencies.allowedCharacterIds });
    if (!validation.value) return json({ error: 'invalid_submission', details: validation.errors }, 400);
    if (await dependencies.repository.findByRunId(validation.value.runId)) return json({ error: 'duplicate_run' }, 409);
    if (!await dependencies.verifier.verify(validation.value)) return json({ error: 'unverified_run' }, 422);

    const record: LeaderboardRecord = {
      id: createId(),
      nickname: validation.value.nickname,
      characterId: validation.value.characterId,
      deaths: validation.value.deaths,
      completionTimeSeconds: validation.value.completionTimeSeconds,
      runId: validation.value.runId,
      completedAt: now(),
    };
    await dependencies.repository.save(record);
    return json({ entry: rankLeaderboard([record], 1)[0] }, 201);
  };
}

function getClientKey(request: Request): string {
  return request.headers.get('cf-connecting-ip')
    ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? 'unknown';
}

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}
