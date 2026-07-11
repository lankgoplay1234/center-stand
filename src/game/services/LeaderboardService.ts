import type { GameResult, LeaderboardRecord, LeaderboardSubmission, RankedLeaderboardEntry } from '../types/GameTypes';

export type LeaderboardErrorCode = 'NOT_CONFIGURED' | 'INVALID_NICKNAME' | 'MISSING_PROOF' | 'REQUEST_FAILED';

export class LeaderboardServiceError extends Error {
  constructor(readonly code: LeaderboardErrorCode, message: string) {
    super(message);
    this.name = 'LeaderboardServiceError';
  }
}

export type LeaderboardFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface LeaderboardStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const LOCAL_LEADERBOARD_STORAGE_KEY = 'center-stand:leaderboard:v1';

export class LeaderboardService {
  private readonly baseUrl: string;
  private memoryRecords: LeaderboardRecord[] = [];

  constructor(
    endpoint: string,
    private readonly fetcher: LeaderboardFetch = fetch,
    private readonly storage: LeaderboardStorage | null = defaultStorage(),
    private readonly now: () => number = Date.now,
  ) {
    this.baseUrl = endpoint.trim().replace(/\/$/, '');
  }

  get isConfigured(): boolean {
    return this.baseUrl.length > 0;
  }

  async list(): Promise<RankedLeaderboardEntry[]> {
    if (!this.isConfigured) return rankLocalRecords(this.readLocalRecords());
    const response = await this.fetcher(`${this.baseUrl}/leaderboard`, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new LeaderboardServiceError('REQUEST_FAILED', `랭킹 조회 실패 (${response.status})`);
    const body = await response.json() as { entries?: RankedLeaderboardEntry[] };
    return Array.isArray(body.entries) ? body.entries.slice(0, 10) : [];
  }

  async submit(result: GameResult, nickname: string): Promise<RankedLeaderboardEntry> {
    const nicknameError = validateLeaderboardNickname(nickname);
    if (nicknameError) throw new LeaderboardServiceError('INVALID_NICKNAME', nicknameError);
    if (!this.isConfigured) return this.submitLocal(result, nickname.trim());
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

  private submitLocal(result: GameResult, nickname: string): RankedLeaderboardEntry {
    const records = this.readLocalRecords();
    const runId = result.leaderboardRunId
      ?? `local_${result.characterId}_${Math.floor(result.survivalSeconds)}_${result.deaths}_${result.kills}`;
    const existing = records.find((record) => record.runId === runId);
    if (!existing) {
      records.push({
        id: `local-${this.now()}-${records.length + 1}`,
        nickname,
        characterId: result.characterId,
        deaths: result.deaths,
        completionTimeSeconds: Math.floor(result.survivalSeconds),
        runId,
        completedAt: this.now(),
      });
      this.writeLocalRecords(records);
    }
    const ranked = rankLocalRecords(records);
    return ranked.find((entry) => entry.id === existing?.id || entry.id === records.at(-1)?.id) ?? ranked[0]!;
  }

  private readLocalRecords(): LeaderboardRecord[] {
    if (!this.storage) return [...this.memoryRecords];
    try {
      const parsed = JSON.parse(this.storage.getItem(LOCAL_LEADERBOARD_STORAGE_KEY) ?? '[]') as unknown;
      return Array.isArray(parsed) ? parsed.filter(isLeaderboardRecord) : [];
    } catch {
      return [];
    }
  }

  private writeLocalRecords(records: LeaderboardRecord[]): void {
    const topRecords = [...records]
      .sort(compareRecords)
      .slice(0, 10);
    this.memoryRecords = topRecords;
    this.storage?.setItem(LOCAL_LEADERBOARD_STORAGE_KEY, JSON.stringify(topRecords));
  }
}

function defaultStorage(): LeaderboardStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function compareRecords(left: LeaderboardRecord, right: LeaderboardRecord): number {
  return left.deaths - right.deaths
    || left.completionTimeSeconds - right.completionTimeSeconds
    || left.completedAt - right.completedAt
    || left.id.localeCompare(right.id);
}

function rankLocalRecords(records: readonly LeaderboardRecord[]): RankedLeaderboardEntry[] {
  return [...records].sort(compareRecords).slice(0, 10).map((record, index) => ({
    id: record.id,
    nickname: record.nickname,
    characterId: record.characterId,
    deaths: record.deaths,
    completionTimeSeconds: record.completionTimeSeconds,
    completedAt: record.completedAt,
    rank: index + 1,
  }));
}

function isLeaderboardRecord(value: unknown): value is LeaderboardRecord {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Partial<LeaderboardRecord>;
  return typeof record.id === 'string'
    && typeof record.nickname === 'string'
    && typeof record.characterId === 'string'
    && Number.isInteger(record.deaths)
    && Number.isInteger(record.completionTimeSeconds)
    && typeof record.runId === 'string'
    && Number.isFinite(record.completedAt);
}

export function validateLeaderboardNickname(nickname: string): string | null {
  const length = [...nickname.trim()].length;
  if (length < 1 || length > 5) return '닉네임은 1~5자로 입력해 주세요.';
  return null;
}
