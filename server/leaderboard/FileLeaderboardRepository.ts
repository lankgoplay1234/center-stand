import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { LeaderboardRecord } from '../../src/game/types/GameTypes';
import type { LeaderboardRepository } from './LeaderboardRepository';

export class FileLeaderboardRepository implements LeaderboardRepository {
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  async findByRunId(runId: string): Promise<LeaderboardRecord | null> {
    return (await this.list()).find((record) => record.runId === runId) ?? null;
  }

  async list(): Promise<readonly LeaderboardRecord[]> {
    try {
      const parsed = JSON.parse(await readFile(this.filePath, 'utf8')) as unknown;
      return Array.isArray(parsed) ? parsed.filter(isLeaderboardRecord) : [];
    } catch (error) {
      if (isMissingFileError(error)) return [];
      throw error;
    }
  }

  async save(record: LeaderboardRecord): Promise<void> {
    this.writeQueue = this.writeQueue.then(async () => {
      const records = await this.list();
      await mkdir(dirname(this.filePath), { recursive: true });
      await writeFile(this.filePath, JSON.stringify([...records, record], null, 2), 'utf8');
    });
    await this.writeQueue;
  }
}

function isMissingFileError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
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
