import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FileLeaderboardRepository } from './FileLeaderboardRepository';

describe('FileLeaderboardRepository', () => {
  it('persists records so a new repository instance can read them', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'center-stand-ranking-'));
    const file = join(directory, 'leaderboard.json');
    const record = {
      id: 'entry-1', nickname: '용사', characterId: 'arc-ranger', deaths: 4,
      completionTimeSeconds: 1_500, runId: 'run_1234567890123456', completedAt: 1_000,
    };
    await new FileLeaderboardRepository(file).save(record);
    await expect(new FileLeaderboardRepository(file).list()).resolves.toEqual([record]);
    expect(await readFile(file, 'utf8')).toContain('용사');
  });
});
