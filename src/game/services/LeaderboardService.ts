import type { GameResult, LeaderboardSubmission, RankedLeaderboardEntry } from '../types/GameTypes';

export type LeaderboardErrorCode = 'NOT_CONFIGURED' | 'INVALID_NICKNAME' | 'MISSING_PROOF' | 'REQUEST_FAILED';

export class LeaderboardServiceError extends Error {
  constructor(readonly code: LeaderboardErrorCode, message: string) {
    super(message);
    this.name = 'LeaderboardServiceError';
  }
}

export type LeaderboardFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export class LeaderboardService {
  private readonly baseUrl: string;

  constructor(endpoint: string, private readonly fetcher: LeaderboardFetch = fetch) {
    this.baseUrl = endpoint.trim().replace(/\/$/, '');
  }

  get isConfigured(): boolean {
    return this.baseUrl.length > 0;
  }

  async list(): Promise<RankedLeaderboardEntry[]> {
    this.requireConfigured();
    const response = await this.fetcher(`${this.baseUrl}/leaderboard`, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new LeaderboardServiceError('REQUEST_FAILED', `랭킹 조회 실패 (${response.status})`);
    const body = await response.json() as { entries?: RankedLeaderboardEntry[] };
    return Array.isArray(body.entries) ? body.entries.slice(0, 10) : [];
  }

  async submit(result: GameResult, nickname: string): Promise<RankedLeaderboardEntry> {
    this.requireConfigured();
    const nicknameError = validateLeaderboardNickname(nickname);
    if (nicknameError) throw new LeaderboardServiceError('INVALID_NICKNAME', nicknameError);
    if (!result.leaderboardRunId || !result.leaderboardVerificationToken) {
      throw new LeaderboardServiceError('MISSING_PROOF', '서버 발급 완주 인증 정보가 없습니다.');
    }
    const submission: LeaderboardSubmission = {
      nickname: nickname.trim(),
      characterId: result.characterId,
      deaths: result.deaths,
      completionTimeSeconds: Math.floor(result.survivalSeconds),
      runId: result.leaderboardRunId,
      verificationToken: result.leaderboardVerificationToken,
    };
    const response = await this.fetcher(`${this.baseUrl}/leaderboard`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(submission),
    });
    if (!response.ok) throw new LeaderboardServiceError('REQUEST_FAILED', `기록 업로드 실패 (${response.status})`);
    const body = await response.json() as { entry?: RankedLeaderboardEntry };
    if (!body.entry) throw new LeaderboardServiceError('REQUEST_FAILED', '서버 응답에 기록이 없습니다.');
    return body.entry;
  }

  private requireConfigured(): void {
    if (!this.isConfigured) throw new LeaderboardServiceError('NOT_CONFIGURED', '랭킹 서버가 아직 설정되지 않았습니다.');
  }
}

export function validateLeaderboardNickname(nickname: string): string | null {
  const length = [...nickname.trim()].length;
  if (length < 1 || length > 5) return '닉네임은 1~5자로 입력해 주세요.';
  return null;
}
