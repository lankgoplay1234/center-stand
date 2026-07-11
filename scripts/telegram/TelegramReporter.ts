export type ReportKind =
  | 'TASK_STARTED'
  | 'TASK_COMPLETED'
  | 'BUILD_SUCCEEDED'
  | 'BUILD_FAILED'
  | 'TEST_RESULT'
  | 'PROJECT_STATUS';

export interface TelegramReport {
  kind: ReportKind;
  title: string;
  summary: string;
  changedFiles?: readonly string[];
  deploymentUrl?: string;
  timestamp: string;
}

export interface TelegramReporter {
  report(message: TelegramReport): Promise<void>;
}

export class NoopTelegramReporter implements TelegramReporter {
  async report(_message: TelegramReport): Promise<void> {
    void _message;
    return Promise.resolve();
  }
}

export type TelegramFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export class TelegramReportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TelegramReportError';
  }
}

export class BotTelegramReporter implements TelegramReporter {
  constructor(
    private readonly token: string,
    private readonly chatId: string,
    private readonly fetcher: TelegramFetch = fetch,
  ) {}

  async report(message: TelegramReport): Promise<void> {
    try {
      const response = await this.fetcher(`https://api.telegram.org/bot${this.token}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.chatId,
          text: formatTelegramReport(message),
          disable_web_page_preview: true,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new TelegramReportError(`Telegram request failed (${response.status})`);
    } catch (error) {
      if (error instanceof TelegramReportError) throw error;
      throw new TelegramReportError('Telegram request failed');
    }
  }
}

export function createTelegramReporter(
  environment: Readonly<Record<string, string | undefined>> = process.env,
  fetcher: TelegramFetch = fetch,
): TelegramReporter {
  const token = environment.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = environment.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) return new NoopTelegramReporter();
  return new BotTelegramReporter(token, chatId, fetcher);
}

export function formatTelegramReport(message: TelegramReport): string {
  const lines = [
    `[${message.kind}] ${message.title}`,
    message.summary,
    `시간: ${message.timestamp}`,
  ];
  if (message.changedFiles?.length) {
    lines.push('변경 파일:', ...message.changedFiles.map((file) => `- ${file}`));
  }
  if (message.deploymentUrl) lines.push(`배포: ${message.deploymentUrl}`);
  return lines.join('\n').slice(0, 4_096);
}
