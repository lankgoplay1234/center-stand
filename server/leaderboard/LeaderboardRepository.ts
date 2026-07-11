import type { LeaderboardRecord } from '../../src/game/types/GameTypes';

export interface LeaderboardRepository {
  findByRunId(runId: string): Promise<LeaderboardRecord | null>;
  list(): Promise<readonly LeaderboardRecord[]>;
  save(record: LeaderboardRecord): Promise<void>;
}

export class MemoryLeaderboardRepository implements LeaderboardRepository {
  private readonly records: LeaderboardRecord[] = [];

  async findByRunId(runId: string): Promise<LeaderboardRecord | null> {
    return this.records.find((record) => record.runId === runId) ?? null;
  }

  async list(): Promise<readonly LeaderboardRecord[]> {
    return this.records;
  }

  async save(record: LeaderboardRecord): Promise<void> {
    this.records.push(record);
  }
}
