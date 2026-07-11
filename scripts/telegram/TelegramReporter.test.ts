import { describe, expect, it, vi } from 'vitest';
import {
  BotTelegramReporter,
  NoopTelegramReporter,
  createTelegramReporter,
  formatTelegramReport,
  type TelegramReport,
} from './TelegramReporter';

const report: TelegramReport = {
  kind: 'TASK_COMPLETED',
  title: '랭킹 API 완료',
  summary: '검사 성공',
  changedFiles: ['server/leaderboard/LeaderboardApi.ts'],
  deploymentUrl: 'https://example.test/game',
  timestamp: '2026-07-12T00:00:00.000Z',
};

describe('TelegramReporter', () => {
  it('safely skips delivery when either environment value is missing', async () => {
    const fetcher = vi.fn();
    const reporter = createTelegramReporter({ TELEGRAM_BOT_TOKEN: '', TELEGRAM_CHAT_ID: '' }, fetcher);
    expect(reporter).toBeInstanceOf(NoopTelegramReporter);
    await reporter.report(report);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('posts a bounded report with changed files and deployment URL', async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => {
      void _input;
      void _init;
      return new Response('{}', { status: 200 });
    });
    const reporter = createTelegramReporter({ TELEGRAM_BOT_TOKEN: 'secret-token', TELEGRAM_CHAT_ID: '1234' }, fetcher);
    await reporter.report(report);
    expect(reporter).toBeInstanceOf(BotTelegramReporter);
    const [url, request] = fetcher.mock.calls[0]!;
    expect(String(url)).toContain('/botsecret-token/sendMessage');
    expect(JSON.parse(request?.body as string)).toEqual(expect.objectContaining({
      chat_id: '1234',
      text: expect.stringContaining('server/leaderboard/LeaderboardApi.ts'),
    }));
    expect(formatTelegramReport({ ...report, summary: 'x'.repeat(5_000) })).toHaveLength(4_096);
  });

  it('never exposes the token or response body in HTTP and network errors', async () => {
    const http = new BotTelegramReporter('top-secret', '1234', vi.fn(async () => new Response('sensitive body', { status: 401 })));
    await expect(http.report(report)).rejects.toThrow('Telegram request failed (401)');
    await expect(http.report(report)).rejects.not.toThrow('top-secret');
    await expect(http.report(report)).rejects.not.toThrow('sensitive body');

    const network = new BotTelegramReporter('top-secret', '1234', vi.fn(async () => {
      throw new Error('request to bot top-secret failed');
    }));
    await expect(network.report(report)).rejects.toThrow('Telegram request failed');
    await expect(network.report(report)).rejects.not.toThrow('top-secret');
  });
});
